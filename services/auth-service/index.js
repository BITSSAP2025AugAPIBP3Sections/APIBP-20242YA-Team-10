const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool, initDB } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.use(cors({
  origin: '*', // allow all origins (for testing). For production, restrict to your Redocly/frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies with increased limit and timeout
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Set server timeout to 30 seconds
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000); // 30 seconds
  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

const Joi = require('joi');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

// Validation schema using Joi
const registerSchema = Joi.object({
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: true } })
    .lowercase()
    .trim()
    .required(),
  password: Joi.string().min(8).max(64).required(),
  firstName: Joi.string().min(2).max(50).trim().required(),
  lastName: Joi.string().min(2).max(50).trim().required(),
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  const client = await pool.connect();
  const startTime = Date.now();

  try {
    console.log('Registration request received:', { email: req.body.email });

    // ✨ Validate request body
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      console.log('Validation failed:', error.details.map(d => d.message));
      return res.status(400).json({
        error: "Invalid input",
        details: error.details.map(d => d.message)
      });
    }

    const { email, password, firstName, lastName } = value;

    // Check if user already exists
    console.log('Checking if user exists...');
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existingUser.rowCount > 0) {
      console.log('User already exists');
      return res.status(409).json({ error: 'User already exists' });
    }

    // Secure password hashing with lower cost for faster response
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    console.log('Inserting user into database...');
    const result = await client.query(
      `INSERT INTO users (email, password, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name`,
      [email, hashedPassword, firstName, lastName]
    );

    const duration = Date.now() - startTime;
    console.log(`Registration successful in ${duration}ms for user:`, result.rows[0].id);

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
      }
    });

  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`Register Error after ${duration}ms:`, err.message);

    // 🤖 Handle common DB errors
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    if (err.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Email already registered' });
    }

    return res.status(500).json({ error: 'Internal server error', details: err.message });
  } finally {
    client.release();
  }
});

const loginSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string().min(8).max(64).required()
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const client = await pool.connect();

  try {
    // Step 1: Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Invalid input",
        details: error.details.map(d => d.message),
      });
    }

    const { email, password } = value;

    // Step 2: Fetch user (limit 1)
    const result = await client.query(
      'SELECT id, email, password FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );

    // Step 3: Timing-safe invalid credential response
    if (result.rowCount === 0) {
      // Perform dummy compare to avoid timing attack
      await bcrypt.compare(password, "$2b$12$invalidinvalidinvalidinvalidinv");
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Step 4: Validate password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Step 5: Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
    });

  } catch (err) {
    console.error("Login error:", err);

    if (err.code === "ECONNREFUSED") {
      return res.status(503).json({ error: "Database unavailable" });
    }

    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// Verify token endpoint
app.post('/api/auth/verify', async (req, res) => {
  const client = await pool.connect();

  try {
    const authHeader = req.headers["authorization"];

    // Validate auth header
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token required in 'Authorization: Bearer <token>' header" });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      // Verify token safely
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    // Fetch user
    const result = await client.query(
      `SELECT id, email, first_name, last_name
       FROM users
       WHERE id = $1 LIMIT 1`,
      [decoded.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name
    });

  } catch (error) {
    console.error("Verify error:", error);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// Get profile endpoint
app.get('/api/auth/profile', async (req, res) => {
  const client = await pool.connect();
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid token' });
      }

      const result = await client.query(
        'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];
      res.json({
        _id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      });
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).trim(),
  lastName: Joi.string().min(2).max(50).trim()
});

// Update profile endpoint
app.put('/api/auth/profile', async (req, res) => {
  const client = await pool.connect();
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid token' });
      }

      const { error, value } = updateProfileSchema.validate(req.body);
            if (error) {
              return res.status(400).json({
                error: "Invalid input",
                details: error.details.map(d => d.message),
              });
            }

      const { firstName, lastName } = req.body;

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (firstName) {
        updates.push(`first_name = $${paramCount++}`);
        values.push(firstName);
      }
      if (lastName) {
        updates.push(`last_name = $${paramCount++}`);
        values.push(lastName);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(decoded.userId);

      await client.query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${paramCount}`,
        values
      );

      res.json({ message: 'Profile updated successfully' });
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

// ==================== SAGA PATTERN: COMPENSATION ENDPOINT ====================

// Delete user (for Saga compensation)
app.delete('/api/auth/users/:userId', async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = parseInt(req.params.userId);

    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ 
      message: 'User deleted successfully (compensation)',
      userId 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize gRPC server
const { startGrpcServer } = require('./grpc-server');

// Initialize database and start server
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Auth Service REST API running on port ${PORT}`);
    });
    
    // Start gRPC server
    startGrpcServer();
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;
