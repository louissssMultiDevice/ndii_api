// server.js
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS.split(','),
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connections
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB connected');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

// Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});
redisClient.connect().then(() => {
  console.log('✅ Redis connected');
}).catch(err => {
  console.error('❌ Redis connection error:', err);
});

// Import routes
const apiRoutes = require('./src/routes/api');
const adminRoutes = require('./src/routes/admin');
const websocketRoutes = require('./src/routes/websocket');

// Routes
app.use('/api/v1', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/socket.io', websocketRoutes(io));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.API_VERSION
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR'
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`🚀 NdiiClouD API running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/docs`);
});
