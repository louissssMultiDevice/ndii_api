// src/utils/cache.js
const redis = require('redis');

class CacheService {
  constructor() {
    this.client = redis.createClient({
      url: process.env.REDIS_URL
    });
    this.client.connect();
    this.defaultTTL = parseInt(process.env.CACHE_TTL) || 120;
  }

  async get(key) {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async delete(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached) {
      cached.cache_hit = true;
      return cached;
    }

    const freshData = await fetchFn();
    await this.set(key, freshData, ttl);
    
    freshData.cache_hit = false;
    return freshData;
  }

  // Generate cache key for server status
  generateServerKey(address, port, protocol = 'all') {
    return `server:${address}:${port}:${protocol}:v${process.env.API_VERSION}`;
  }

  // Get cache statistics
  async getStats() {
    try {
      const info = await this.client.info();
      const keys = await this.client.keys('server:*');
      
      return {
        total_cached_servers: keys.length,
        memory_used: info.match(/used_memory_human:(\S+)/)?.[1] || '0',
        hits: parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || 0),
        misses: parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || 0),
        hit_rate: keys.length > 0 ? 
          (parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || 0) / 
           (parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || 0) + 
            parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || 0))).toFixed(2) : 0
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return null;
    }
  }
}

module.exports = new CacheService();
