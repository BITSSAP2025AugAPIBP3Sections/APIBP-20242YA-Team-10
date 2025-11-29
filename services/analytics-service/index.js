const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { pool, initDB } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || 'http://localhost:3002';
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:3004';

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/verify`, {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    req.user = { userId: response.data._id };
    next();
  } catch (error) {
    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Track viewing activity (called by streaming service)
app.post('/api/analytics/track', async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId, videoId, watchTime, revenue } = req.body;

    if (!userId || !videoId) {
      return res.status(400).json({ error: 'userId and videoId required' });
    }

    await client.query('BEGIN');

    // Update or create video analytics
    const videoAnalytics = await client.query(
      'SELECT id FROM video_analytics WHERE video_id = $1',
      [videoId]
    );

    if (videoAnalytics.rows.length === 0) {
      await client.query(
        `INSERT INTO video_analytics (video_id, total_views, total_watch_time, total_revenue)
         VALUES ($1, 1, $2, $3)`,
        [videoId, watchTime || 0, revenue || 0]
      );
    } else {
      await client.query(
        `UPDATE video_analytics
         SET total_watch_time = total_watch_time + $1,
             total_revenue = total_revenue + $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE video_id = $3`,
        [watchTime || 0, revenue || 0, videoId]
      );
    }

    // Record user activity
    await client.query(
      `INSERT INTO user_activities (user_id, video_id, watch_time, revenue)
       VALUES ($1, $2, $3, $4)`,
      [userId, videoId, watchTime || 0, revenue || 0]
    );

    // Update platform metrics for today
    const today = new Date().toISOString().split('T')[0];
    const metricsCheck = await client.query(
      'SELECT id FROM platform_metrics WHERE metric_date = $1',
      [today]
    );

    if (metricsCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO platform_metrics (metric_date, total_watch_time, total_revenue)
         VALUES ($1, $2, $3)`,
        [today, watchTime || 0, revenue || 0]
      );
    } else {
      await client.query(
        `UPDATE platform_metrics
         SET total_watch_time = total_watch_time + $1,
             total_revenue = total_revenue + $2
         WHERE metric_date = $3`,
        [watchTime || 0, revenue || 0, today]
      );
    }

    await client.query('COMMIT');

    res.json({ message: 'Analytics tracked successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Track analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get platform dashboard metrics
app.get('/api/analytics/dashboard', async (req, res) => {
  const client = await pool.connect();
  try {
    // Get total users from auth service (simulated)
    const totalUsers = 0; // Would call auth service in production

    // Get video analytics summary
    const videoStats = await client.query(
      `SELECT
        SUM(total_views) as total_views,
        SUM(total_watch_time) as total_watch_time,
        SUM(total_revenue) as total_revenue
       FROM video_analytics`
    );

    // Get revenue from billing service
    let totalRevenue = 0;
    try {
      const revenueResponse = await axios.get(`${BILLING_SERVICE_URL}/api/billing/revenue/total`);
      totalRevenue = revenueResponse.data.totalRevenue || 0;
    } catch (error) {
      console.error('Error fetching revenue:', error.message);
    }

    res.json({
      totalViews: parseInt(videoStats.rows[0].total_views) || 0,
      totalUsers: totalUsers,
      totalRevenue: totalRevenue,
      totalWatchTime: parseInt(videoStats.rows[0].total_watch_time) || 0
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get analytics for specific video
app.get('/api/analytics/videos/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM video_analytics WHERE video_id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        videoId: req.params.id,
        totalViews: 0,
        totalWatchTime: 0,
        totalRevenue: 0,
        completionRate: 0
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Video analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get user activity history
app.get('/api/analytics/user', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const activities = await client.query(
      `SELECT * FROM user_activities
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.userId]
    );

    const totalWatchTime = activities.rows.reduce((sum, a) => sum + (a.watch_time || 0), 0);
    const totalSpent = activities.rows.reduce((sum, a) => sum + (a.revenue || 0), 0);

    res.json({
      userId: req.user.userId,
      totalWatchTime,
      totalSpent,
      history: activities.rows
    });
  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get top videos
app.get('/api/analytics/top-videos', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM video_analytics
       ORDER BY total_views DESC
       LIMIT 10`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Top videos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get revenue report
app.get('/api/analytics/revenue', async (req, res) => {
  const client = await pool.connect();
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const dailyResult = await client.query(
      'SELECT SUM(total_revenue) as revenue FROM platform_metrics WHERE metric_date = $1',
      [today]
    );

    const weeklyResult = await client.query(
      'SELECT SUM(total_revenue) as revenue FROM platform_metrics WHERE metric_date >= $1',
      [weekAgo]
    );

    const monthlyResult = await client.query(
      'SELECT SUM(total_revenue) as revenue FROM platform_metrics WHERE metric_date >= $1',
      [monthAgo]
    );

    res.json({
      daily: parseInt(dailyResult.rows[0].revenue) || 0,
      weekly: parseInt(weeklyResult.rows[0].revenue) || 0,
      monthly: parseInt(monthlyResult.rows[0].revenue) || 0
    });
  } catch (error) {
    console.error('Revenue report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get period-based reports
app.get('/api/analytics/reports/:period', async (req, res) => {
  const client = await pool.connect();
  try {
    const { period } = req.params;

    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    let dateFilter;
    const today = new Date().toISOString().split('T')[0];

    if (period === 'daily') {
      dateFilter = today;
    } else if (period === 'weekly') {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    const result = await client.query(
      `SELECT
        SUM(total_views) as total_views,
        SUM(total_watch_time) as total_watch_time,
        SUM(total_revenue) as total_revenue
       FROM platform_metrics
       WHERE metric_date >= $1`,
      [dateFilter]
    );

    res.json({
      totalViews: parseInt(result.rows[0].total_views) || 0,
      totalUsers: 0, // Would get from auth service
      totalRevenue: parseInt(result.rows[0].total_revenue) || 0,
      totalWatchTime: parseInt(result.rows[0].total_watch_time) || 0
    });
  } catch (error) {
    console.error('Period report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'analytics-service',
    timestamp: new Date().toISOString()
  });
});

// ==================== SAGA PATTERN ENDPOINTS ====================

// Create analytics profile (for Saga pattern)
app.post('/api/analytics/profile/create', async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Check if profile already exists
    const existing = await client.query(
      'SELECT user_id FROM analytics_profiles WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      return res.json({ message: 'Analytics profile already exists' });
    }

    await client.query(
      'INSERT INTO analytics_profiles (user_id) VALUES ($1)',
      [userId]
    );

    res.status(201).json({
      message: 'Analytics profile created successfully',
      userId
    });
  } catch (error) {
    console.error('Create analytics profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Delete analytics profile (for Saga compensation)
app.delete('/api/analytics/profile/:userId', async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = parseInt(req.params.userId);

    await client.query(
      'DELETE FROM analytics_profiles WHERE user_id = $1',
      [userId]
    );

    res.json({ message: 'Analytics profile deleted successfully' });
  } catch (error) {
    console.error('Delete analytics profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// ==================== CQRS PATTERN ENDPOINTS ====================

const { AnalyticsCQRS } = require('./cqrs');
const cqrs = new AnalyticsCQRS(pool);

// CQRS Command: Record view
app.post('/api/analytics/cqrs/record-view', async (req, res) => {
  try {
    const { userId, videoId, watchTime } = req.body;

    if (!userId || !videoId || !watchTime) {
      return res.status(400).json({ error: 'userId, videoId, and watchTime required' });
    }

    const result = await cqrs.recordView(userId, videoId, watchTime);
    res.json(result);
  } catch (error) {
    console.error('CQRS record view error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CQRS Query: Get video stats
app.get('/api/analytics/cqrs/video/:videoId/stats', async (req, res) => {
  try {
    const videoId = parseInt(req.params.videoId);
    const stats = await cqrs.getVideoStats(videoId);
    res.json(stats);
  } catch (error) {
    console.error('CQRS get video stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CQRS Query: Get user viewing history
app.get('/api/analytics/cqrs/user/:userId/history', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const history = await cqrs.getUserViewingHistory(userId);
    res.json(history);
  } catch (error) {
    console.error('CQRS get user history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CQRS Query: Get platform stats
app.get('/api/analytics/cqrs/platform/stats', async (req, res) => {
  try {
    const stats = await cqrs.getPlatformStats();
    res.json(stats);
  } catch (error) {
    console.error('CQRS get platform stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CQRS: Replay events (admin only)
app.post('/api/analytics/cqrs/replay-events', async (req, res) => {
  try {
    const { fromTimestamp } = req.body;
    const result = await cqrs.replayEvents(fromTimestamp);
    res.json(result);
  } catch (error) {
    console.error('CQRS replay events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Analytics Service running on port ${PORT}`);
      console.log(`   - CQRS Pattern: Enabled`);
      console.log(`   - Saga Pattern: Enabled`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;
