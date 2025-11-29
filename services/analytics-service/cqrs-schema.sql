-- CQRS Event Store and Read Models for Analytics Service

-- Event Store (Write Model - Event Sourcing)
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(255) NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  user_id INTEGER,
  video_id INTEGER,
  event_data JSONB NOT NULL,
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_video_id ON analytics_events(video_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_occurred_at ON analytics_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_aggregate ON analytics_events(aggregate_id, aggregate_type);

-- Write Model (Normalized)
CREATE TABLE IF NOT EXISTS video_views (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  video_id INTEGER NOT NULL,
  watch_time INTEGER NOT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_video_views_user_id ON video_views(user_id);
CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_viewed_at ON video_views(viewed_at);

-- Read Model: Video Statistics (Denormalized for fast queries)
CREATE TABLE IF NOT EXISTS video_stats_read_model (
  video_id INTEGER PRIMARY KEY,
  total_views INTEGER DEFAULT 0,
  total_watch_time INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_video_stats_total_views ON video_stats_read_model(total_views);
CREATE INDEX IF NOT EXISTS idx_video_stats_last_updated ON video_stats_read_model(last_updated);

-- Read Model: Unique Viewers per Video
CREATE TABLE IF NOT EXISTS unique_viewers (
  video_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  first_view TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (video_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_unique_viewers_video_id ON unique_viewers(video_id);
CREATE INDEX IF NOT EXISTS idx_unique_viewers_user_id ON unique_viewers(user_id);

-- Read Model: User Viewing History (Denormalized)
CREATE TABLE IF NOT EXISTS user_viewing_history_read_model (
  user_id INTEGER PRIMARY KEY,
  videos_watched INTEGER DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_viewing_history_videos_watched ON user_viewing_history_read_model(videos_watched);
CREATE INDEX IF NOT EXISTS idx_user_viewing_history_total_time ON user_viewing_history_read_model(total_time_spent);

-- Analytics Profile (for Saga pattern)
CREATE TABLE IF NOT EXISTS analytics_profiles (
  user_id INTEGER PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE analytics_events IS 'Event store for event sourcing - immutable log of all analytics events';
COMMENT ON TABLE video_views IS 'Write model - normalized storage of video views';
COMMENT ON TABLE video_stats_read_model IS 'Read model - denormalized video statistics for fast queries';
COMMENT ON TABLE unique_viewers IS 'Read model - tracks unique viewers per video';
COMMENT ON TABLE user_viewing_history_read_model IS 'Read model - denormalized user viewing statistics';
