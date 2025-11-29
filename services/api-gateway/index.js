const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Service URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || 'http://localhost:3002';
const STREAMING_SERVICE_URL = process.env.STREAMING_SERVICE_URL || 'http://localhost:3003';
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:3004';
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005';

// Middleware
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Parse JSON for specific routes including saga
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/') || req.path.startsWith('/api/saga')) {
    express.json({ limit: '50mb' })(req, res, next);
  } else {
    next();
  }
});

// Serve static files (frontend)
app.use(express.static('public'));

// ==================== SAGA PATTERN ENDPOINT ====================

// In container: shared is at /app/shared, index.js is at /app/index.js, so use ./shared
// In development: shared is at ../shared relative to this file
const { RegistrationSaga } = require(process.env.NODE_ENV === 'production' ? './shared/registration-saga' : '../shared/registration-saga');

app.post('/api/saga/register', async (req, res) => {
  try {
    const saga = new RegistrationSaga(
      AUTH_SERVICE_URL,
      BILLING_SERVICE_URL,
      ANALYTICS_SERVICE_URL
    );

    const result = await saga.execute(req.body);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Saga execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Saga execution failed',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    services: {
      auth: AUTH_SERVICE_URL,
      video: VIDEO_SERVICE_URL,
      streaming: STREAMING_SERVICE_URL,
      billing: BILLING_SERVICE_URL,
      analytics: ANALYTICS_SERVICE_URL
    }
  });
});

// Circuit breaker stats endpoint
const { getCircuitBreakerStats } = require('./circuit-breaker');

app.get('/api/circuit-breaker/stats', (req, res) => {
  const stats = getCircuitBreakerStats();
  res.json(stats);
});

// Proxy configuration options with increased timeouts
const proxyOptions = {
  changeOrigin: true,
  logLevel: 'debug',
  timeout: 60000,           // 60 seconds timeout
  proxyTimeout: 60000,      // 60 seconds proxy timeout
  ws: true,                 // Enable websocket proxying
  onError: (err, req, res) => {
    console.error('Proxy Error:', err);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Bad Gateway',
        message: 'Service temporarily unavailable',
        details: err.message
      });
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    // Log proxy requests
    console.log(`[${new Date().toISOString()}] Proxying ${req.method} ${req.url}`);

    // Set keep-alive and timeouts
    proxyReq.setHeader('Connection', 'keep-alive');
    proxyReq.setTimeout(60000);

    // Increase socket timeout
    if (proxyReq.socket) {
      proxyReq.socket.setTimeout(60000);
      proxyReq.socket.setKeepAlive(true);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Log proxy responses
    console.log(`[${new Date().toISOString()}] Response ${proxyRes.statusCode} for ${req.method} ${req.url}`);
  }
};

// Auth Service routes
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  ...proxyOptions
}));

// Video Service routes
app.use('/api/videos', createProxyMiddleware({
  target: VIDEO_SERVICE_URL,
  ...proxyOptions
}));

// Streaming Service routes
app.use('/api/stream', createProxyMiddleware({
  target: STREAMING_SERVICE_URL,
  ...proxyOptions
}));

// Billing Service routes
app.use('/api/billing', createProxyMiddleware({
  target: BILLING_SERVICE_URL,
  ...proxyOptions
}));

// Analytics Service routes
app.use('/api/analytics', createProxyMiddleware({
  target: ANALYTICS_SERVICE_URL,
  ...proxyOptions
}));

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Catch-all route for frontend (SPA support)
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Gateway Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Start server
const http = require('http');
const httpServer = http.createServer(app);

// Setup GraphQL
const { setupGraphQL } = require('./graphql');
setupGraphQL(app, httpServer).then(() => {
  httpServer.listen(PORT, () => {
    console.log(`✅ API Gateway running on port ${PORT}`);
    console.log(`   Frontend: http://localhost:${PORT}`);
    console.log(`   REST API: http://localhost:${PORT}/api`);
    console.log(`   GraphQL: http://localhost:${PORT}/graphql`);
    console.log('\n📡 Microservices:');
    console.log(`  - Auth Service: ${AUTH_SERVICE_URL}`);
    console.log(`  - Video Service: ${VIDEO_SERVICE_URL}`);
    console.log(`  - Streaming Service: ${STREAMING_SERVICE_URL}`);
    console.log(`  - Billing Service: ${BILLING_SERVICE_URL}`);
    console.log(`  - Analytics Service: ${ANALYTICS_SERVICE_URL}`);
  });
});

// Set server timeouts
httpServer.timeout = 60000; // 60 seconds
httpServer.keepAliveTimeout = 65000; // 65 seconds (longer than timeout)
httpServer.headersTimeout = 66000; // 66 seconds (longer than keepAliveTimeout)

module.exports = app;
