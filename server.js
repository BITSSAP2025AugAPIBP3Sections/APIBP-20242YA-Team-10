const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage (replace with database in production)
const users = [];
const videos = [];
const streamSessions = [];
const billingAccounts = [];
const analytics = {
  totalViews: 0,
  totalUsers: 0,
  totalRevenue: 0,
  totalWatchTime: 0,
  videoStats: {},
  userActivities: {}
};

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

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Utility functions
const generateId = () => Math.random().toString(36).substr(2, 9);
const generateSessionId = () => Math.random().toString(36).substr(2, 16);

// Auth Service Endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      _id: generateId(),
      email,
      password: hashedPassword,
      firstName,
      lastName,
      createdAt: new Date()
    };

    users.push(user);

    // Create billing account
    billingAccounts.push({
      userId: user._id,
      balance: 0 // Balance in cents
    });

    // Update analytics
    analytics.totalUsers++;

    res.status(201).json({ 
      message: 'User created successfully',
      userId: user._id 
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/verify', authenticateToken, (req, res) => {
  const user = users.find(u => u._id === req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    _id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName
  });
});

app.get('/api/auth/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u._id === req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    _id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName
  });
});

app.put('/api/auth/profile', authenticateToken, (req, res) => {
  const { firstName, lastName } = req.body;
  const userIndex = users.findIndex(u => u._id === req.user.userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (firstName) users[userIndex].firstName = firstName;
  if (lastName) users[userIndex].lastName = lastName;

  res.json({ message: 'Profile updated successfully' });
});

// Video Service Endpoints
app.get('/api/videos', (req, res) => {
  const { category, search, page = 1 } = req.query;
  let filteredVideos = [...videos];

  if (category) {
    filteredVideos = filteredVideos.filter(v => v.category === category);
  }

  if (search) {
    filteredVideos = filteredVideos.filter(v => 
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.description.toLowerCase().includes(search.toLowerCase())
    );
  }

  const pageSize = 10;
  const startIndex = (page - 1) * pageSize;
  const paginatedVideos = filteredVideos.slice(startIndex, startIndex + pageSize);

  res.json(paginatedVideos);
});

app.post('/api/videos', authenticateToken, upload.single('videoFile'), (req, res) => {
  try {
    const { title, description, category = 'general', pricePerMinute = 10 } = req.body;

    if (!title || !req.file) {
      return res.status(400).json({ error: 'Title and video file are required' });
    }

    const video = {
      _id: generateId(),
      title,
      description: description || '',
      category,
      duration: 300, // Mock duration in seconds (5 minutes)
      pricePerMinute: parseInt(pricePerMinute),
      filename: req.file.filename,
      uploadedBy: req.user.userId,
      createdAt: new Date()
    };

    videos.push(video);

    // Initialize analytics for this video
    analytics.videoStats[video._id] = {
      videoId: video._id,
      totalViews: 0,
      totalWatchTime: 0,
      totalRevenue: 0,
      completionRate: 0
    };

    res.status(201).json({ 
      message: 'Video uploaded successfully',
      video: video 
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/videos/:id', (req, res) => {
  const video = videos.find(v => v._id === req.params.id);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }
  res.json(video);
});

app.put('/api/videos/:id', authenticateToken, (req, res) => {
  const { title, description } = req.body;
  const videoIndex = videos.findIndex(v => v._id === req.params.id);

  if (videoIndex === -1) {
    return res.status(404).json({ error: 'Video not found' });
  }

  // Check if user owns the video
  if (videos[videoIndex].uploadedBy !== req.user.userId) {
    return res.status(403).json({ error: 'Unauthorized to edit this video' });
  }

  if (title) videos[videoIndex].title = title;
  if (description) videos[videoIndex].description = description;

  res.json({ message: 'Video updated successfully' });
});

app.delete('/api/videos/:id', authenticateToken, (req, res) => {
  const videoIndex = videos.findIndex(v => v._id === req.params.id);

  if (videoIndex === -1) {
    return res.status(404).json({ error: 'Video not found' });
  }

  // Check if user owns the video
  if (videos[videoIndex].uploadedBy !== req.user.userId) {
    return res.status(403).json({ error: 'Unauthorized to delete this video' });
  }

  videos.splice(videoIndex, 1);
  res.status(204).send();
});

// Streaming Service Endpoints
app.post('/api/stream/start/:videoId', authenticateToken, (req, res) => {
  const video = videos.find(v => v._id === req.params.videoId);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }

  // Check user balance
  const userBilling = billingAccounts.find(b => b.userId === req.user.userId);
  const requiredAmount = video.pricePerMinute * Math.ceil(video.duration / 60);

  if (!userBilling || userBilling.balance < requiredAmount) {
    return res.status(402).json({ error: 'Insufficient funds' });
  }

  const sessionId = generateSessionId();
  const streamSession = {
    sessionId,
    videoId: video._id,
    userId: req.user.userId,
    startTime: new Date(),
    watchedTime: 0,
    isActive: true
  };

  streamSessions.push(streamSession);

  res.json({
    sessionId,
    streamUrl: `/api/stream/url/${sessionId}`,
    videoDetails: video
  });
});

app.get('/api/stream/url/:sessionId', (req, res) => {
  const session = streamSessions.find(s => s.sessionId === req.params.sessionId);
  if (!session || !session.isActive) {
    return res.status(404).json({ error: 'Stream session not found' });
  }

  const video = videos.find(v => v._id === session.videoId);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const videoPath = path.join(__dirname, 'uploads/videos', video.filename);
  
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
});

app.put('/api/stream/heartbeat/:sessionId', authenticateToken, (req, res) => {
  const sessionIndex = streamSessions.findIndex(s => s.sessionId === req.params.sessionId);
  if (sessionIndex === -1) {
    return res.status(404).json({ error: 'Stream session not found' });
  }

  const session = streamSessions[sessionIndex];
  if (session.userId !== req.user.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Update watched time (mock: add 30 seconds per heartbeat)
  session.watchedTime += 30;
  session.lastHeartbeat = new Date();

  // Calculate billing
  const video = videos.find(v => v._id === session.videoId);
  const watchedMinutes = Math.ceil(session.watchedTime / 60);
  const cost = video.pricePerMinute * watchedMinutes;

  // Deduct from user balance
  const userBilling = billingAccounts.find(b => b.userId === req.user.userId);
  if (userBilling && userBilling.balance >= cost) {
    userBilling.balance -= cost;
    
    // Update analytics
    analytics.totalRevenue += cost;
    analytics.totalWatchTime += 30;
    if (analytics.videoStats[video._id]) {
      analytics.videoStats[video._id].totalWatchTime += 30;
      analytics.videoStats[video._id].totalRevenue += cost;
    }
  }

  res.json({ message: 'Heartbeat successful', watchedTime: session.watchedTime });
});

// Billing Service Endpoints
app.get('/api/billing/balance', authenticateToken, (req, res) => {
  const userBilling = billingAccounts.find(b => b.userId === req.user.userId);
  if (!userBilling) {
    return res.status(404).json({ error: 'Billing account not found' });
  }

  res.json({
    userId: req.user.userId,
    balance: userBilling.balance
  });
});

app.post('/api/billing/deposit', authenticateToken, (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const userBillingIndex = billingAccounts.findIndex(b => b.userId === req.user.userId);
  if (userBillingIndex === -1) {
    return res.status(404).json({ error: 'Billing account not found' });
  }

  billingAccounts[userBillingIndex].balance += amount;

  res.json({ 
    message: 'Deposit successful',
    newBalance: billingAccounts[userBillingIndex].balance 
  });
});

// Analytics Service Endpoints
app.get('/api/analytics/dashboard', (req, res) => {
  res.json(analytics);
});

app.get('/api/analytics/videos/:id', (req, res) => {
  const videoAnalytics = analytics.videoStats[req.params.id];
  if (!videoAnalytics) {
    return res.status(404).json({ error: 'Video analytics not found' });
  }

  res.json(videoAnalytics);
});

app.get('/api/analytics/user', authenticateToken, (req, res) => {
  const userSessions = streamSessions.filter(s => s.userId === req.user.userId);
  const totalWatchTime = userSessions.reduce((sum, s) => sum + s.watchedTime, 0);
  
  const userBilling = billingAccounts.find(b => b.userId === req.user.userId);
  const totalSpent = userSessions.reduce((sum, s) => {
    const video = videos.find(v => v._id === s.videoId);
    return sum + (video ? video.pricePerMinute * Math.ceil(s.watchedTime / 60) : 0);
  }, 0);

  res.json({
    userId: req.user.userId,
    totalWatchTime,
    totalSpent,
    history: userSessions.map(s => ({
      sessionId: s.sessionId,
      videoId: s.videoId,
      watchedTime: s.watchedTime,
      startTime: s.startTime
    }))
  });
});

app.get('/api/analytics/top-videos', (req, res) => {
  const topVideos = Object.values(analytics.videoStats)
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 10);

  res.json(topVideos);
});

app.get('/api/analytics/revenue', (req, res) => {
  // Mock revenue data
  const now = new Date();
  const daily = analytics.totalRevenue * 0.1;
  const weekly = analytics.totalRevenue * 0.4;
  const monthly = analytics.totalRevenue;

  res.json({
    daily: Math.round(daily),
    weekly: Math.round(weekly),
    monthly: Math.round(monthly)
  });
});

app.get('/api/analytics/reports/:period', (req, res) => {
  const { period } = req.params;
  
  if (!['daily', 'weekly', 'monthly'].includes(period)) {
    return res.status(400).json({ error: 'Invalid period' });
  }

  // Mock report data based on period
  const multiplier = period === 'daily' ? 0.1 : period === 'weekly' ? 0.4 : 1;
  
  res.json({
    totalViews: Math.round(analytics.totalViews * multiplier),
    totalUsers: Math.round(analytics.totalUsers * multiplier),
    totalRevenue: Math.round(analytics.totalRevenue * multiplier),
    totalWatchTime: Math.round(analytics.totalWatchTime * multiplier)
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Streamify API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
