const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { pool, initDB } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || 'http://localhost:3002';
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:3004';
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005';

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

// Generate unique session ID
const generateSessionId = () => Math.random().toString(36).substr(2, 16);

// Start streaming session
app.post('/api/stream/start/:videoId', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    // Get video details from video service
    const videoResponse = await axios.get(`${VIDEO_SERVICE_URL}/api/videos/${req.params.videoId}`);
    const video = videoResponse.data;

    // Check user balance from billing service
    const authHeader = req.headers['authorization'];
    const balanceResponse = await axios.get(`${BILLING_SERVICE_URL}/api/billing/balance`, {
      headers: { 'Authorization': authHeader }
    });

    const requiredAmount = video.price_per_minute * Math.ceil(video.duration / 60);

    if (balanceResponse.data.balance < requiredAmount) {
      return res.status(402).json({ error: 'Insufficient funds' });
    }

    // Create streaming session
    const sessionId = generateSessionId();
    await client.query(
      `INSERT INTO stream_sessions (session_id, video_id, user_id, is_active)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, req.params.videoId, req.user.userId, true]
    );

    res.json({
      sessionId,
      streamUrl: `/api/stream/url/${sessionId}`,
      videoDetails: video
    });
  } catch (error) {
    console.error('Start stream error:', error);
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Video not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get stream URL and serve video file
app.get('/api/stream/url/:sessionId', async (req, res) => {
  const client = await pool.connect();
  try {
    // Get session details
    const sessionResult = await client.query(
      'SELECT * FROM stream_sessions WHERE session_id = $1 AND is_active = true',
      [req.params.sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stream session not found' });
    }

    const session = sessionResult.rows[0];

    // Get video details from video service
    const videoResponse = await axios.get(`${VIDEO_SERVICE_URL}/api/videos/${session.video_id}`);
    const video = videoResponse.data;

    // Construct video file path (assuming shared volume or network storage)
    const videoPath = path.join('/app/uploads/videos', video.filename);
    
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error('Stream URL error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update watch progress (heartbeat)
app.put('/api/stream/heartbeat/:sessionId', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    // Get session
    const sessionResult = await client.query(
      'SELECT * FROM stream_sessions WHERE session_id = $1',
      [req.params.sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stream session not found' });
    }

    const session = sessionResult.rows[0];

    if (session.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update watched time (add 30 seconds per heartbeat)
    const newWatchedTime = session.watched_time + 30;
    
    await client.query(
      `UPDATE stream_sessions 
       SET watched_time = $1, last_heartbeat = CURRENT_TIMESTAMP 
       WHERE session_id = $2`,
      [newWatchedTime, req.params.sessionId]
    );

    // Get video details
    const videoResponse = await axios.get(`${VIDEO_SERVICE_URL}/api/videos/${session.video_id}`);
    const video = videoResponse.data;

    // Calculate billing
    const watchedMinutes = Math.ceil(newWatchedTime / 60);
    const cost = video.price_per_minute * watchedMinutes;

    // Charge user via billing service
    const authHeader = req.headers['authorization'];
    try {
      await axios.post(`${BILLING_SERVICE_URL}/api/billing/charge`, {
        amount: cost,
        userId: req.user.userId,
        sessionId: req.params.sessionId
      }, {
        headers: { 'Authorization': authHeader }
      });
    } catch (billingError) {
      console.error('Billing charge error:', billingError);
    }

    // Update analytics service
    try {
      await axios.post(`${ANALYTICS_SERVICE_URL}/api/analytics/track`, {
        userId: req.user.userId,
        videoId: session.video_id,
        watchTime: 30,
        revenue: cost
      });
    } catch (analyticsError) {
      console.error('Analytics tracking error:', analyticsError);
    }

    res.json({ 
      message: 'Heartbeat successful', 
      watchedTime: newWatchedTime 
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// End streaming session
app.post('/api/stream/end/:sessionId', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE stream_sessions 
       SET is_active = false 
       WHERE session_id = $1 AND user_id = $2 
       RETURNING *`,
      [req.params.sessionId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stream session not found' });
    }

    res.json({ message: 'Stream session ended successfully' });
  } catch (error) {
    console.error('End stream error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'streaming-service',
    timestamp: new Date().toISOString() 
  });
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
      console.log(`Streaming Service running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;
