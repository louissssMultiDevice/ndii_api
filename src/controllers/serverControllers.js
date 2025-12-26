// src/controllers/serverController.js
const MinecraftProtocol = require('../services/minecraftProtocol');
const CacheService = require('../utils/cache');
const ServerHistory = require('../models/serverHistory');
const dns = require('dns').promises;

class ServerController {
  constructor() {
    this.protocol = MinecraftProtocol;
    this.cache = CacheService;
  }

  async checkServer(req, res, next) {
    try {
      const { address, port } = this.parseAddress(req.params.address);
      const useCache = req.query.cache !== 'false';
      const protocols = req.query.protocols || 'ping,query';

      // Generate cache key
      const cacheKey = this.cache.generateServerKey(address, port, protocols);

      // Check cache if enabled
      if (useCache) {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          return res.json({
            ...cached,
            ndiicloud_meta: {
              ...cached.ndiicloud_meta,
              request_id: this.generateRequestId(),
              cached: true
            }
          });
        }
      }

      // Check SRV records
      const srvRecord = await this.checkSRVRecord(address);
      const targetAddress = srvRecord?.target || address;
      const targetPort = srvRecord?.port || port;

      // Try protocols in order
      const result = await this.tryProtocols(targetAddress, targetPort, protocols.split(','));
      
      // Save to history
      await this.saveToHistory(targetAddress, targetPort, result);

      // Prepare response
      const response = {
        online: result.online,
        ip: targetAddress,
        port: targetPort,
        hostname: address !== targetAddress ? address : undefined,
        ...result.data,
        debug: {
          ping: result.protocol_used === 'ping',
          query: result.protocol_used === 'query',
          bedrock: result.protocol_used === 'bedrock',
          srv: !!srvRecord,
          cachehit: false,
          cachetime: Math.floor(Date.now() / 1000),
          cacheexpire: Math.floor(Date.now() / 1000) + (parseInt(process.env.CACHE_TTL) || 120),
          apiversion: process.env.API_VERSION
        },
        ndiicloud_meta: {
          request_id: this.generateRequestId(),
          processed_in: `${result.processing_time}ms`,
          cache_status: 'MISS',
          protocols_tried: result.protocols_tried,
          final_protocol: result.protocol_used
        }
      };

      // Cache the result
      if (useCache && result.online) {
        await this.cache.set(cacheKey, response);
      }

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async tryProtocols(address, port, protocols) {
    const startTime = Date.now();
    const triedProtocols = [];
    let lastError = null;

    for (const protocol of protocols) {
      try {
        triedProtocols.push(protocol);
        
        let data;
        switch (protocol) {
          case 'ping':
            data = await this.protocol.pingServer(address, port);
            break;
          case 'query':
            data = await this.protocol.queryServer(address, port);
            break;
          case 'bedrock':
            data = await this.protocol.bedrockPing(address, port);
            break;
          default:
            continue;
        }

        const processingTime = Date.now() - startTime;
        
        return {
          online: true,
          data,
          protocol_used: protocol,
          processing_time: processingTime,
          protocols_tried: triedProtocols
        };
      } catch (error) {
        lastError = error;
        console.log(`Protocol ${protocol} failed:`, error.message);
      }
    }

    const processingTime = Date.now() - startTime;
    
    return {
      online: false,
      data: {
        error: lastError?.message || 'All protocols failed'
      },
      protocol_used: null,
      processing_time: processingTime,
      protocols_tried: triedProtocols
    };
  }

  async checkSRVRecord(address) {
    try {
      const records = await dns.resolveSrv(`_minecraft._tcp.${address}`);
      if (records && records.length > 0) {
        return {
          target: records[0].name,
          port: records[0].port
        };
      }
    } catch (error) {
      // No SRV record found
    }
    return null;
  }

  parseAddress(input) {
    let address = input;
    let port = 25565;

    if (input.includes(':')) {
      const parts = input.split(':');
      address = parts[0];
      port = parseInt(parts[1]) || 25565;
    }

    return { address, port };
  }

  async saveToHistory(address, port, result) {
    try {
      const history = new ServerHistory({
        server_address: address,
        server_port: port,
        online: result.online,
        version: result.data?.version,
        software: result.data?.software,
        players: result.data?.players,
        motd: result.data?.motd,
        plugins: result.data?.plugins,
        mods: result.data?.mods,
        performance_metrics: {
          response_time: result.processing_time,
          tps: result.data?.tps || 0,
          memory_usage: result.data?.memory_usage || 0
        },
        ndiicloud_meta: {
          cache_hit: false,
          processing_time: result.processing_time,
          protocol_used: result.protocol_used
        }
      });

      await history.save();
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Batch check endpoint
  async batchCheck(req, res, next) {
    try {
      const { servers } = req.body;
      
      if (!Array.isArray(servers) || servers.length === 0) {
        return res.status(400).json({
          error: 'Server list is required'
        });
      }

      if (servers.length > 50) {
        return res.status(400).json({
          error: 'Maximum 50 servers per batch'
        });
      }

      const results = await Promise.all(
        servers.map(async (server) => {
          try {
            const { address, port } = this.parseAddress(server);
            const cacheKey = this.cache.generateServerKey(address, port);
            
            const cached = await this.cache.get(cacheKey);
            if (cached) {
              return {
                server,
                ...cached,
                cached: true
              };
            }

            const result = await this.tryProtocols(address, port, ['ping', 'query']);
            
            if (result.online) {
              const response = {
                online: true,
                ip: address,
                port,
                ...result.data
              };
              
              await this.cache.set(cacheKey, response);
              return {
                server,
                ...response,
                cached: false
              };
            }

            return {
              server,
              online: false,
              cached: false
            };
          } catch (error) {
            return {
              server,
              online: false,
              error: error.message
            };
          }
        })
      );

      res.json({
        timestamp: new Date().toISOString(),
        total: results.length,
        online: results.filter(r => r.online).length,
        offline: results.filter(r => !r.online).length,
        results
      });
    } catch (error) {
      next(error);
    }
  }

  // History endpoint
  async getHistory(req, res, next) {
    try {
      const { address } = req.params;
      const limit = parseInt(req.query.limit) || 100;
      const hours = parseInt(req.query.hours) || 24;

      const history = await ServerHistory.find({
        server_address: address,
        checked_at: {
          $gte: new Date(Date.now() - (hours * 60 * 60 * 1000))
        }
      })
      .sort({ checked_at: -1 })
      .limit(limit)
      .lean();

      const stats = {
        total_checks: history.length,
        online_checks: history.filter(h => h.online).length,
        offline_checks: history.filter(h => !h.online).length,
        uptime_percentage: history.length > 0 ? 
          ((history.filter(h => h.online).length / history.length) * 100).toFixed(2) : 0,
        average_response_time: history.length > 0 ?
          (history.reduce((sum, h) => sum + (h.performance_metrics?.response_time || 0), 0) / history.length).toFixed(2) : 0
      };

      res.json({
        server: address,
        stats,
        history: history.map(h => ({
          timestamp: h.checked_at,
          online: h.online,
          players: h.players,
          version: h.version,
          response_time: h.performance_metrics?.response_time
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  // Simple status endpoint (HTTP codes only)
  async simpleStatus(req, res, next) {
    try {
      const { address, port } = this.parseAddress(req.params.address);
      
      const result = await this.tryProtocols(address, port, ['ping']);
      
      if (result.online) {
        res.status(200).send('Online');
      } else {
        res.status(404).send('Offline');
      }
    } catch (error) {
      res.status(404).send('Offline');
    }
  }

  // Icon endpoint
  async getIcon(req, res, next) {
    try {
      const { address, port } = this.parseAddress(req.params.address);
      const cacheKey = `icon:${address}:${port}`;
      
      const cachedIcon = await this.cache.get(cacheKey);
      if (cachedIcon) {
        const img = Buffer.from(cachedIcon.split(',')[1], 'base64');
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': img.length,
          'Cache-Control': `public, max-age=${process.env.CACHE_TTL}`
        });
        return res.end(img);
      }

      const result = await this.tryProtocols(address, port, ['ping']);
      
      if (result.online && result.data.favicon) {
        const base64Data = result.data.favicon.replace(/^data:image\/png;base64,/, '');
        const img = Buffer.from(base64Data, 'base64');
        
        await this.cache.set(cacheKey, result.data.favicon, 3600); // Cache icons longer
        
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': img.length,
          'Cache-Control': 'public, max-age=3600'
        });
        res.end(img);
      } else {
        // Default Minecraft icon
        const defaultIcon = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF' +
          '0mlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0' +
          'wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZX' +
          'RhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDYgNzkuMTY0NzUzLCAyMDIxLzAxL' +
          'zE1LTExOjQwOjAwICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMu' +
          'b3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm9' +
          '1dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE' +
          '1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDov' +
          'L25zLmFkb2JlLm29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtbG5zOmRjPSJod' +
          'HRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQ' +
          'aG90b3Nob3AgMjMuMiAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDI1LTEyLTI1VDE0OjM' +
          'wOjAwKzA3OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyNS0xMi0yNVQxNDozMDowMCswNzowMCIgeG' +
          '1wOk1ldGFkYXRhRGF0ZT0iMjAyNS0xMi0yNVQxNDozMDowMCswNzowMCIgeG1wTU06SW5zdGFuY' +
          '2VJRD0ieG1wLmlpZDowMjgwMTE3NDA3MjA2ODExODIyQTk5Q0UyRUIwRkYwRSIgeG1wTU06RG9j' +
          'dW1lbnRJRD0ieG1wLmRpZDowMjgwMTE3NDA3MjA2ODExODIyQTk5Q0UyRUIwRkYwRSIgeG1wTU0' +
          '6T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjAyODAxMTc0MDcyMDY4MTE4MjJBOTlDRTJFQj' +
          'BGRjBFIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4g' +
          'PHJkZjpsaSBzdEV2dDphY3Rpb249ImNyZWF0ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ' +
          '6MDI4MDExNzQwNzIwNjgxMTgyMkE5OUNFMkFCMEZGMEUiIHN0RXZ0OndoZW49IjIwMjUtMTItMj' +
          'VUMTQ6MzA6MDArMDc6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyM' +
          'y4yIChXaW5kb3dzKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3Rh' +
          'bmNlSUQ9InhtcC5paWQ6MDI4MDExNzQwNzIwNjgxMTgyMkE5OUNFMkFCMEZGMEUiIHN0RXZ0Ond' +
          'oZW49IjIwMjUtMTItMjVUMTQ6MzA6MDArMDc6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2' +
          'JlIFBob3Rvc2hvcCAyMy4yIChXaW5kb3dzKSIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9ye' +
          'T4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBl' +
          'bmQ9InIiPz6hBqYwAAABoUlEQVR42u3bv0vDQBjG8VchVPoPHJx0E8HFwUknB0HQQdDFQURwEE' +
          'QHR8HBwUFFcBAEB0F0cNBJ0MHBQUVwEBRB/0EQRBBEBAeRQtDnJL2m11yupWnS3vd5p0t7l7u8' +
          'ubvcpdcO/pe0dZ7z/NE/jnOvtf6stdY7iYiISCVWgePAFnAOuAQe9E97wV/PA2eBQ8BO4CSwD5' +
          'gBpgv+9hSYA56Ba2AE3JQpQAt4B6aA14L3vgBvgGvgpW4BWsArMF3hO14B54DRXwqQnr1vgIU+'
        , 'base64');
        
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': defaultIcon.length,
          'Cache-Control': 'public, max-age=86400'
        });
        res.end(defaultIcon);
      }
    } catch (error) {
      next(error);
    }
  }

  // Server statistics
  async getStats(req, res, next) {
    try {
      const [cacheStats, totalServers, onlineServers, recentChecks] = await Promise.all([
        this.cache.getStats(),
        ServerHistory.countDocuments(),
        ServerHistory.countDocuments({ online: true }),
        ServerHistory.countDocuments({
          checked_at: { $gte: new Date(Date.now() - 3600000) }
        })
      ]);

      res.json({
        system: {
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          node_version: process.version
        },
        cache: cacheStats,
        database: {
          total_servers_tracked: totalServers,
          currently_online: onlineServers,
          checks_last_hour: recentChecks
        },
        api: {
          version: process.env.API_VERSION,
          endpoints: [
            '/api/v1/status/:server',
            '/api/v1/simple/:server',
            '/api/v1/icon/:server',
            '/api/v1/history/:server',
            '/api/v1/batch/status',
            '/api/v1/stats'
          ]
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ServerController();
