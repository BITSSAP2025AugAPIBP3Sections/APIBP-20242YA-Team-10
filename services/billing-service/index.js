const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { pool, initDB } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

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

    req.user = { userId: response.data.id };
    next();
  } catch (error) {
    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Create billing account for new user
app.post('/api/billing/account/create', async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Check if account already exists
    const existing = await client.query(
      'SELECT id FROM billing_accounts WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      return res.json({ message: 'Account already exists' });
    }

    await client.query(
      'INSERT INTO billing_accounts (user_id, balance) VALUES ($1, $2)',
      [userId, 0]
    );

    res.status(201).json({ message: 'Billing account created successfully' });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get user balance
app.get('/api/billing/balance', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT balance FROM billing_accounts WHERE user_id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      // Create account if it doesn't exist
      await client.query(
        'INSERT INTO billing_accounts (user_id, balance) VALUES ($1, $2)',
        [req.user.userId, 0]
      );
      return res.json({ userId: req.user.userId, balance: 0 });
    }

    res.json({
      userId: req.user.userId,
      balance: result.rows[0].balance
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Deposit funds
app.post('/api/billing/deposit', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    await client.query('BEGIN');

    // Ensure account exists
    const accountCheck = await client.query(
      'SELECT balance FROM billing_accounts WHERE user_id = $1',
      [req.user.userId]
    );

    if (accountCheck.rows.length === 0) {
      await client.query(
        'INSERT INTO billing_accounts (user_id, balance) VALUES ($1, $2)',
        [req.user.userId, amount]
      );
    } else {
      // Update balance
      await client.query(
        'UPDATE billing_accounts SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [amount, req.user.userId]
      );
    }

    // Record transaction
    await client.query(
      `INSERT INTO transactions (user_id, amount, transaction_type, description)
       VALUES ($1, $2, $3, $4)`,
      [req.user.userId, amount, 'deposit', 'Funds deposit']
    );

    await client.query('COMMIT');

    // Get new balance
    const balanceResult = await client.query(
      'SELECT balance FROM billing_accounts WHERE user_id = $1',
      [req.user.userId]
    );

    res.json({
      message: 'Deposit successful',
      newBalance: balanceResult.rows[0].balance
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Charge user (called by streaming service)
app.post('/api/billing/charge', async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount, userId, sessionId } = req.body;

    if (!amount || !userId) {
      return res.status(400).json({ error: 'Amount and userId required' });
    }

    await client.query('BEGIN');

    // Get current balance
    const balanceResult = await client.query(
      'SELECT balance FROM billing_accounts WHERE user_id = $1',
      [userId]
    );

    if (balanceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Billing account not found' });
    }

    const currentBalance = balanceResult.rows[0].balance;

    if (currentBalance < amount) {
      await client.query('ROLLBACK');
      return res.status(402).json({ error: 'Insufficient funds' });
    }

    // Deduct amount
    await client.query(
      'UPDATE billing_accounts SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [amount, userId]
    );

    // Record transaction
    await client.query(
      `INSERT INTO transactions (user_id, amount, transaction_type, description, session_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, -amount, 'charge', 'Video streaming charge', sessionId]
    );

    await client.query('COMMIT');

    res.json({ message: 'Charge successful', remainingBalance: currentBalance - amount });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Charge error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get transaction history
app.get('/api/billing/transactions', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await client.query(
      `SELECT * FROM transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get total revenue (for analytics)
app.get('/api/billing/revenue/total', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT SUM(ABS(amount)) as total_revenue 
       FROM transactions 
       WHERE transaction_type = 'charge'`
    );

    res.json({
      totalRevenue: result.rows[0].total_revenue || 0
    });
  } catch (error) {
    console.error('Get revenue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'billing-service',
    timestamp: new Date().toISOString()
  });
});

// ==================== SAGA PATTERN: COMPENSATION ENDPOINT ====================

// Delete billing account (for Saga compensation)
app.delete('/api/billing/account/:userId', async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = parseInt(req.params.userId);

    // Delete transactions first (foreign key constraint)
    await client.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
    
    // Delete billing account
    await client.query('DELETE FROM billing_accounts WHERE user_id = $1', [userId]);

    res.json({ 
      message: 'Billing account deleted successfully (compensation)',
      userId 
    });
  } catch (error) {
    console.error('Delete billing account error:', error);
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

// Initialize database and start server
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Billing Service running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;
