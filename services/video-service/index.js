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

// -------------------------
// Middleware
// -------------------------
app.use(cors());
app.use(express.json());


// ------------------------------------------------------
// Central response helper
// ------------------------------------------------------
const sendError = (res, status, message) => {
  console.error("❌ ERROR:", message);
  return res.status(status).json({ error: message });
};


// ------------------------------------------------------
// Authentication middleware
// ------------------------------------------------------
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return sendError(res, 401, "Access token required");

    const token = authHeader.split(" ")[1];
    if (!token) return sendError(res, 401, "Invalid Authorization header format");

    const result = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/verify`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    req.user = { userId: result.data.id };
    next();

  } catch (error) {
    if (error.response?.status === 403)
      return sendError(res, 403, "Invalid token");

    return sendError(res, 401, "Authentication failed");
  }
};


// ------------------------------------------------------
// Multer upload config
// ------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/videos";
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `video-${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });


// ------------------------------------------------------
// GET: List videos with filters & pagination
// ------------------------------------------------------
app.get('/api/videos', async (req, res) => {
  const client = await pool.connect();
  try {
    const { category, search, page = 1 } = req.query;
    const pageSize = 10;
    const offset = (Number(page) - 1) * pageSize;

    let query = `SELECT * FROM videos WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (category) {
      query += ` AND category = $${idx++}`;
      params.push(category);
    }

    if (search) {
      query += ` AND (title ILIKE $${idx} OR description ILIKE $${idx + 1})`;
      params.push(`%${search}%`, `%${search}%`);
      idx += 2;
    }

    query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    params.push(pageSize, offset);

    const result = await client.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    sendError(res, 500, "Failed to fetch videos");
  } finally {
    client.release();
  }
});


// ------------------------------------------------------
// POST: Upload a video
// ------------------------------------------------------
app.post('/api/videos', authenticateToken, upload.single('videoFile'), async (req, res) => {
  const client = await pool.connect();

  try {
    const { title, description = '', category = 'general', pricePerMinute = 10 } = req.body;

    if (!title) return sendError(res, 400, "Title is required");
    if (!req.file) return sendError(res, 400, "Video file is required");

    const price = Number(pricePerMinute);
    if (isNaN(price) || price < 0)
      return sendError(res, 400, "Invalid pricePerMinute");

    const result = await client.query(
      `INSERT INTO videos (title, description, category, duration, price_per_minute, filename, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        title,
        description,
        category,
        300,                          // Hardcoded duration
        price,
        req.file.filename,
        req.user.userId
      ]
    );

    res.status(201).json({
      message: "Video uploaded successfully",
      video: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    sendError(res, 500, "Failed to upload video");
  } finally {
    client.release();
  }
});


// ------------------------------------------------------
// GET: Single video by ID
// ------------------------------------------------------
app.get('/api/videos/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    const id = req.params.id;

    const result = await client.query(`SELECT * FROM videos WHERE id = $1`, [id]);
    if (result.rows.length === 0)
      return sendError(res, 404, "Video not found");

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    sendError(res, 500, "Error retrieving video");
  } finally {
    client.release();
  }
});


// ------------------------------------------------------
// PUT: Update video metadata
// ------------------------------------------------------
app.put('/api/videos/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { title, description } = req.body;

    const check = await client.query(`SELECT uploaded_by FROM videos WHERE id = $1`, [req.params.id]);
    if (check.rows.length === 0) return sendError(res, 404, "Video not found");

    if (check.rows[0].uploaded_by !== req.user.userId)
      return sendError(res, 403, "Unauthorized to edit this video");

    const updates = [];
    const values = [];
    let idx = 1;

    if (title) { updates.push(`title = $${idx++}`); values.push(title); }
    if (description) { updates.push(`description = $${idx++}`); values.push(description); }

    if (updates.length === 0)
      return sendError(res, 400, "No fields to update");

    values.push(req.params.id);

    await client.query(
      `UPDATE videos SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
      values
    );

    res.json({ message: "Video updated successfully" });

  } catch (err) {
    console.error(err);
    sendError(res, 500, "Failed to update video");
  } finally {
    client.release();
  }
});


// ------------------------------------------------------
// DELETE: Remove video
// ------------------------------------------------------
app.delete('/api/videos/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const check = await client.query(
      `SELECT uploaded_by, filename FROM videos WHERE id = $1`,
      [req.params.id]
    );

    if (check.rows.length === 0)
      return sendError(res, 404, "Video not found");

    if (check.rows[0].uploaded_by !== req.user.userId)
      return sendError(res, 403, "Unauthorized to delete this video");

    await client.query(`DELETE FROM videos WHERE id = $1`, [req.params.id]);

    const filepath = path.join(__dirname, 'uploads/videos', check.rows[0].filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

    res.status(204).send();

  } catch (err) {
    console.error(err);
    sendError(res, 500, "Failed to delete video");
  } finally {
    client.release();
  }
});


// ------------------------------------------------------
// Health Check
// ------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'video-service',
    timestamp: new Date().toISOString()
  });
});


// ------------------------------------------------------
// Start Server
// ------------------------------------------------------
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🎬 Video Service running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("Failed to initialize DB", err);
    process.exit(1);
  });

module.exports = app;
