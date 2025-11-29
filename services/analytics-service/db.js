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
  const fs = require('fs');
  const path = require('path');
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS video_analytics (
        id SERIAL PRIMARY KEY,
        video_id INTEGER NOT NULL,
        total_views INTEGER DEFAULT 0,
        total_watch_time INTEGER DEFAULT 0,
        total_revenue INTEGER DEFAULT 0,
        completion_rate DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        video_id INTEGER NOT NULL,
        watch_time INTEGER DEFAULT 0,
        revenue INTEGER DEFAULT 0,
        session_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS platform_metrics (
        id SERIAL PRIMARY KEY,
        metric_date DATE NOT NULL,
        total_views INTEGER DEFAULT 0,
        total_users INTEGER DEFAULT 0,
        total_revenue INTEGER DEFAULT 0,
        total_watch_time INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_video_analytics_video_id ON video_analytics(video_id);
      CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_activities_video_id ON user_activities(video_id);
      CREATE INDEX IF NOT EXISTS idx_platform_metrics_date ON platform_metrics(metric_date);
    `);
    
    // Load and execute CQRS schema
    try {
      const cqrsSchemaPath = path.join(__dirname, 'cqrs-schema.sql');
      if (fs.existsSync(cqrsSchemaPath)) {
        const cqrsSchema = fs.readFileSync(cqrsSchemaPath, 'utf8');
        await client.query(cqrsSchema);
        console.log('✅ CQRS tables initialized successfully');
      }
    } catch (cqrsError) {
      console.log('⚠️  CQRS schema file not found or error loading it');
    }
    
    console.log('Analytics database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
