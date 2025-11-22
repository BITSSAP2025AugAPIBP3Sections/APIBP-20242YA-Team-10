const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize database schema
const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS stream_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        video_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        watched_time INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON stream_sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON stream_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_video_id ON stream_sessions(video_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON stream_sessions(is_active);
    `);
    console.log('Streaming database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
