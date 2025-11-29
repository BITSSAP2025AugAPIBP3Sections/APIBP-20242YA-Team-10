/**
 * CQRS Pattern Implementation for Analytics Service
 * 
 * Separates Command (Write) operations from Query (Read) operations
 * 
 * Command Side: Handles writes and emits events
 * Query Side: Handles reads from optimized read models
 * 
 * Event Store: Stores all events for event sourcing
 */

const { pool } = require('./db');

class AnalyticsCQRS {
  constructor(dbPool) {
    this.pool = dbPool || pool;
  }

  // ==================== COMMAND SIDE ====================

  /**
   * Command: Record Video View
   * This is a write operation that creates an event
   */
  async recordView(userId, videoId, watchTime) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Create event in event store
      const eventResult = await client.query(
        `INSERT INTO analytics_events 
         (event_type, aggregate_id, aggregate_type, user_id, video_id, event_data, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, occurred_at`,
        [
          'VIDEO_VIEWED',
          `video-${videoId}`,
          'video',
          userId,
          videoId,
          JSON.stringify({ watchTime })
        ]
      );

      // 2. Insert into write model (normalized)
      await client.query(
        `INSERT INTO video_views (user_id, video_id, watch_time)
         VALUES ($1, $2, $3)`,
        [userId, videoId, watchTime]
      );

      // 3. Update read model (denormalized for fast queries)
      await this.updateReadModel(client, videoId, userId, watchTime);

      await client.query('COMMIT');

      console.log(`✅ CQRS Command: Video view recorded (Event ID: ${eventResult.rows[0].id})`);

      return {
        success: true,
        eventId: eventResult.rows[0].id,
        timestamp: eventResult.rows[0].occurred_at
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ CQRS Command Error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update Read Model - Denormalized view for fast queries
   */
  async updateReadModel(client, videoId, userId, watchTime) {
    // Update video statistics (read model)
    await client.query(
      `INSERT INTO video_stats_read_model (video_id, total_views, unique_viewers, total_watch_time, last_updated)
       VALUES ($1, 1, 1, $2, NOW())
       ON CONFLICT (video_id) 
       DO UPDATE SET 
         total_views = video_stats_read_model.total_views + 1,
         total_watch_time = video_stats_read_model.total_watch_time + $2,
         last_updated = NOW()`,
      [videoId, watchTime]
    );

    // Update unique viewers count separately
    await client.query(
      `INSERT INTO unique_viewers (video_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (video_id, user_id) DO NOTHING`,
      [videoId, userId]
    );

    // Update user viewing history (read model)
    await client.query(
      `INSERT INTO user_viewing_history_read_model (user_id, videos_watched, total_time_spent, last_updated)
       VALUES ($1, 1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         videos_watched = user_viewing_history_read_model.videos_watched + 1,
         total_time_spent = user_viewing_history_read_model.total_time_spent + $2,
         last_updated = NOW()`,
      [userId, watchTime]
    );
  }

  // ==================== QUERY SIDE ====================

  /**
   * Query: Get Video Statistics
   * This reads from the optimized read model
   */
  async getVideoStats(videoId) {
    try {
      const result = await this.pool.query(
        `SELECT 
           vs.video_id,
           vs.total_views,
           vs.total_watch_time,
           vs.last_updated,
           (SELECT COUNT(DISTINCT user_id) FROM unique_viewers WHERE video_id = $1) as unique_viewers
         FROM video_stats_read_model vs
         WHERE vs.video_id = $1`,
        [videoId]
      );

      if (result.rows.length === 0) {
        return {
          videoId,
          totalViews: 0,
          uniqueViewers: 0,
          totalWatchTime: 0,
          averageWatchTime: 0
        };
      }

      const stats = result.rows[0];
      return {
        videoId: stats.video_id,
        totalViews: parseInt(stats.total_views),
        uniqueViewers: parseInt(stats.unique_viewers),
        totalWatchTime: parseInt(stats.total_watch_time),
        averageWatchTime: stats.total_views > 0 
          ? parseFloat((stats.total_watch_time / stats.total_views).toFixed(2))
          : 0,
        lastUpdated: stats.last_updated
      };
    } catch (error) {
      console.error('❌ CQRS Query Error:', error);
      throw error;
    }
  }

  /**
   * Query: Get User Viewing History
   */
  async getUserViewingHistory(userId) {
    try {
      const result = await this.pool.query(
        `SELECT 
           user_id,
           videos_watched,
           total_time_spent,
           last_updated
         FROM user_viewing_history_read_model
         WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return {
          userId,
          videosWatched: 0,
          totalTimeSpent: 0
        };
      }

      return {
        userId: result.rows[0].user_id,
        videosWatched: parseInt(result.rows[0].videos_watched),
        totalTimeSpent: parseInt(result.rows[0].total_time_spent),
        lastUpdated: result.rows[0].last_updated
      };
    } catch (error) {
      console.error('❌ CQRS Query Error:', error);
      throw error;
    }
  }

  /**
   * Query: Get Platform Statistics (Aggregated)
   */
  async getPlatformStats() {
    try {
      const result = await this.pool.query(
        `SELECT 
           COUNT(DISTINCT video_id) as total_videos_viewed,
           SUM(total_views) as total_views,
           SUM(total_watch_time) as total_watch_time,
           (SELECT COUNT(DISTINCT user_id) FROM user_viewing_history_read_model) as total_active_users
         FROM video_stats_read_model`
      );

      const stats = result.rows[0];
      return {
        totalVideosViewed: parseInt(stats.total_videos_viewed) || 0,
        totalViews: parseInt(stats.total_views) || 0,
        totalWatchTime: parseInt(stats.total_watch_time) || 0,
        totalActiveUsers: parseInt(stats.total_active_users) || 0,
        averageViewsPerVideo: stats.total_videos_viewed > 0
          ? parseFloat((stats.total_views / stats.total_videos_viewed).toFixed(2))
          : 0
      };
    } catch (error) {
      console.error('❌ CQRS Query Error:', error);
      throw error;
    }
  }

  /**
   * Event Sourcing: Replay Events
   * Rebuild read model from event store
   */
  async replayEvents(fromTimestamp = null) {
    const client = await this.pool.connect();
    try {
      console.log('🔄 Replaying events to rebuild read model...');

      // Clear read models
      await client.query('TRUNCATE TABLE video_stats_read_model, user_viewing_history_read_model, unique_viewers CASCADE');

      // Get all events
      const query = fromTimestamp
        ? 'SELECT * FROM analytics_events WHERE occurred_at >= $1 ORDER BY occurred_at ASC'
        : 'SELECT * FROM analytics_events ORDER BY occurred_at ASC';
      
      const params = fromTimestamp ? [fromTimestamp] : [];
      const eventsResult = await client.query(query, params);

      // Replay each event
      for (const event of eventsResult.rows) {
        if (event.event_type === 'VIDEO_VIEWED') {
          const data = JSON.parse(event.event_data);
          await this.updateReadModel(client, event.video_id, event.user_id, data.watchTime);
        }
      }

      console.log(`✅ Replayed ${eventsResult.rows.length} events`);
      return { success: true, eventsReplayed: eventsResult.rows.length };
    } catch (error) {
      console.error('❌ Event Replay Error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = { AnalyticsCQRS };
