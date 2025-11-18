const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { pool, initDB } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

// Middleware
app.use(cors());
app.use(express.json());

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/videos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Authentication middleware - verifies token with auth service
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify token with auth service
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

// Get all videos with filtering and pagination
app.get('/api/videos', async (req, res) => {
  const client = await pool.connect();
  try {
    const { category, search, page = 1 } = req.query;
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    let query = 'SELECT * FROM videos WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (category) {
      query += ` AND category = $${paramCount++}`;
      params.push(category);
    }

    if (search) {
      query += ` AND (title ILIKE $${paramCount++} OR description ILIKE $${paramCount++})`;
      params.push(`%${search}%`, `%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(pageSize, offset);

    const result = await client.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Upload new video
app.post('/api/videos', authenticateToken, upload.single('videoFile'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { title, description, category = 'general', pricePerMinute = 10 } = req.body;

    if (!title || !req.file) {
      return res.status(400).json({ error: 'Title and video file are required' });
    }

    const result = await client.query(
      `INSERT INTO videos (title, description, category, duration, price_per_minute, filename, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description || '', category, 300, parseInt(pricePerMinute), req.file.filename, req.user.userId]
    );

    res.status(201).json({ 
      message: 'Video uploaded successfully',
      video: result.rows[0]
    });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get specific video by ID
app.get('/api/videos/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM videos WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update video metadata
app.put('/api/videos/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { title, description } = req.body;

    // Check if video exists and user owns it
    const videoCheck = await client.query(
      'SELECT uploaded_by FROM videos WHERE id = $1',
      [req.params.id]
    );

    if (videoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (videoCheck.rows[0].uploaded_by !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to edit this video' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);

    await client.query(
      `UPDATE videos SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramCount}`,
      values
    );

    res.json({ message: 'Video updated successfully' });
  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Delete video
app.delete('/api/videos/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    // Check if video exists and user owns it
    const videoCheck = await client.query(
      'SELECT uploaded_by, filename FROM videos WHERE id = $1',
      [req.params.id]
    );

    if (videoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (videoCheck.rows[0].uploaded_by !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this video' });
    }

    // Delete from database
    await client.query('DELETE FROM videos WHERE id = $1', [req.params.id]);

    // Delete file
    const filePath = path.join(__dirname, 'uploads/videos', videoCheck.rows[0].filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'video-service',
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
      console.log(`Video Service running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;
