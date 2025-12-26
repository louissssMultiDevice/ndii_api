// src/routes/api.js
const express = require('express');
const router = express.Router();
const serverController = require('../controllers/serverController');
const rateLimit = require('../middleware/rateLimit');

// Rate limiting middleware
router.use(rateLimit);

// Main endpoints
router.get('/status/:address', serverController.checkServer);
router.get('/simple/:address', serverController.simpleStatus);
router.get('/icon/:address', serverController.getIcon);
router.get('/history/:address', serverController.getHistory);
router.get('/stats', serverController.getStats);

// Batch endpoint
router.post('/batch/status', serverController.batchCheck);

// Debug endpoints
router.get('/debug/ping/:address', async (req, res) => {
  // Debug implementation
});

router.get('/debug/query/:address', async (req, res) => {
  // Debug implementation
});

// Documentation
router.get('/docs', (req, res) => {
  res.json({
    name: 'NdiiClouD Minecraft Status API',
    version: process.env.API_VERSION,
    endpoints: {
      status: {
        url: '/status/:server',
        method: 'GET',
        description: 'Get full server status',
        parameters: {
          server: 'Server address (domain:port or IP:port)',
          cache: 'boolean (default: true) - Use cache',
          protocols: 'string (default: "ping,query") - Protocols to try'
        }
      },
      simple: {
        url: '/simple/:server',
        method: 'GET',
        description: 'HTTP status code only (200 = online, 404 = offline)'
      },
      icon: {
        url: '/icon/:server',
        method: 'GET',
        description: 'Get server icon as PNG'
      },
      batch: {
        url: '/batch/status',
        method: 'POST',
        description: 'Check multiple servers',
        body: {
          servers: 'array of server addresses'
        }
      },
      history: {
        url: '/history/:server',
        method: 'GET',
        description: 'Get server history',
        parameters: {
          limit: 'number (default: 100)',
          hours: 'number (default: 24)'
        }
      }
    }
  });
});

module.exports = router;
