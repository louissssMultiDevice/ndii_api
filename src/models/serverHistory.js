// src/models/serverHistory.js
const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: String,
  uuid: String,
  joined_at: Date
});

const serverHistorySchema = new mongoose.Schema({
  server_address: {
    type: String,
    required: true,
    index: true
  },
  server_port: {
    type: Number,
    required: true
  },
  online: {
    type: Boolean,
    required: true
  },
  version: String,
  software: String,
  players: {
    online: Number,
    max: Number,
    sample: [playerSchema]
  },
  motd: {
    raw: [String],
    clean: [String],
    html: [String]
  },
  plugins: [{
    name: String,
    version: String
  }],
  mods: [{
    name: String,
    version: String
  }],
  performance_metrics: {
    response_time: Number,
    tps: Number,
    memory_usage: Number
  },
  checked_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  ndiicloud_meta: {
    cache_hit: Boolean,
    processing_time: Number,
    protocol_used: String // 'ping', 'query', 'bedrock'
  }
}, {
  timestamps: true
});

// Indexes for faster queries
serverHistorySchema.index({ server_address: 1, checked_at: -1 });
serverHistorySchema.index({ checked_at: -1 });
serverHistorySchema.index({ online: 1 });

// TTL index - auto delete after 30 days
serverHistorySchema.index({ checked_at: 1 }, { 
  expireAfterSeconds: 30 * 24 * 60 * 60 
});

module.exports = mongoose.model('ServerHistory', serverHistorySchema);
