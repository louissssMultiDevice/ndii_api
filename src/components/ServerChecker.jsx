// src/components/ServerChecker.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import ServerResult from './ServerResult';
import HistoryList from './HistoryList';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

const ServerChecker = () => {
  const [serverAddress, setServerAddress] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentServers, setRecentServers] = useState([]);
  const [realTimeUpdates, setRealTimeUpdates] = useState({});
  const socketRef = useRef(null);

  // Contoh server populer
  const popularServers = [
    { name: 'Hypixel', address: 'mc.hypixel.net' },
    { name: 'Mineplex', address: 'us.mineplex.com' },
    { name: 'Cubecraft', address: 'play.cubecraft.net' },
    { name: 'The Hive', address: 'play.hivemc.com' },
  ];

  useEffect(() => {
    // Load recent servers from localStorage
    const saved = localStorage.getItem('ndiicloud_recent_servers');
    if (saved) {
      setRecentServers(JSON.parse(saved));
    }

    // Setup WebSocket connection
    socketRef.current = io(SOCKET_URL);
    
    socketRef.current.on('server_update', (data) => {
      setRealTimeUpdates(prev => ({
        ...prev,
        [data.server]: data
      }));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const checkServer = async (address = serverAddress) => {
    if (!address.trim()) {
      setError('Please enter a server address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_BASE_URL}/status/${address}`, {
        headers: {
          'User-Agent': 'NdiiClouD-Status-Checker/1.0'
        }
      });

      setResult(response.data);

      // Add to recent servers
      const serverInfo = {
        address,
        timestamp: new Date().toISOString(),
        online: response.data.online,
        players: response.data.players?.online || 0
      };

      const updated = [serverInfo, ...recentServers.filter(s => s.address !== address)].slice(0, 10);
      setRecentServers(updated);
      localStorage.setItem('ndiicloud_recent_servers', JSON.stringify(updated));

      // Subscribe to real-time updates
      if (socketRef.current && response.data.online) {
        socketRef.current.emit('subscribe_server', address);
      }

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check server');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    checkServer();
  };

  const handleQuickCheck = (address) => {
    setServerAddress(address);
    checkServer(address);
  };

  const batchCheck = async () => {
    const servers = recentServers.map(s => s.address).slice(0, 5);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/batch/status`, {
        servers
      });
      
      // Update recent servers with new status
      const updated = recentServers.map(server => {
        const batchResult = response.data.results.find(r => r.server === server.address);
        return batchResult ? { ...server, online: batchResult.online } : server;
      });
      
      setRecentServers(updated);
    } catch (err) {
      console.error('Batch check failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-minecraft-dark to-gray-900 text-white">
      {/* Header */}
      <header className="bg-minecraft-dark/90 backdrop-blur-sm border-b border-minecraft-green/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-minecraft-dirt rounded-lg flex items-center justify-center border-2 border-minecraft-green">
                  <span className="text-2xl font-minecraft">N</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-minecraft-green rounded-full border-2 border-minecraft-dark"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold font-minecraft bg-gradient-to-r from-minecraft-green to-minecraft-blue bg-clip-text text-transparent">
                  NdiiClouD Status
                </h1>
                <p className="text-gray-400 text-sm">Advanced Minecraft Server Monitoring</p>
              </div>
            </div>
            <nav className="hidden md:flex space-x-6">
              <a href="#features" className="hover:text-minecraft-green transition">Features</a>
              <a href="#api" className="hover:text-minecraft-green transition">API</a>
              <a href="#about" className="hover:text-minecraft-green transition">About</a>
              <button 
                onClick={batchCheck}
                className="px-4 py-2 bg-minecraft-green text-minecraft-dark font-bold rounded-lg hover:bg-minecraft-blue transition"
              >
                Quick Refresh
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Check <span className="text-minecraft-green">Minecraft Server</span> Status
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Real-time monitoring with advanced features. Better than mcsrvstat.us
            </p>
          </div>

          {/* Search Form */}
          <div className="bg-minecraft-dark/50 backdrop-blur-sm border border-minecraft-green/30 rounded-2xl p-6 mb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-grow">
                  <input
                    type="text"
                    value={serverAddress}
                    onChange={(e) => setServerAddress(e.target.value)}
                    placeholder="Enter server address (e.g., play.server.com or 192.168.1.1:25565)"
                    className="w-full px-6 py-4 bg-gray-900 border-2 border-minecraft-green/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-minecraft-green focus:ring-2 focus:ring-minecraft-green/30 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-4 bg-gradient-to-r from-minecraft-green to-minecraft-blue text-minecraft-dark font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Checking...
                    </>
                  ) : 'Check Status'}
                </button>
              </div>
              
              {error && (
                <div className="p-4 bg-red-900/30 border border-red-500 rounded-xl">
                  <p className="text-red-300">{error}</p>
                </div>
              )}

              {/* Quick Options */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-700">
                <span className="text-gray-400 self-center">Popular:</span>
                {popularServers.map((server) => (
                  <button
                    key={server.address}
                    type="button"
                    onClick={() => handleQuickCheck(server.address)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                  >
                    {server.name}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-minecraft-dark/50 p-4 rounded-xl border border-minecraft-green/20">
              <div className="text-2xl font-bold text-minecraft-green">0</div>
              <div className="text-sm text-gray-400">Servers Online</div>
            </div>
            <div className="bg-minecraft-dark/50 p-4 rounded-xl border border-minecraft-green/20">
              <div className="text-2xl font-bold text-minecraft-blue">0</div>
              <div className="text-sm text-gray-400">Total Players</div>
            </div>
            <div className="bg-minecraft-dark/50 p-4 rounded-xl border border-minecraft-green/20">
              <div className="text-2xl font-bold text-minecraft-red">99.9%</div>
              <div className="text-sm text-gray-400">Uptime Avg</div>
            </div>
            <div className="bg-minecraft-dark/50 p-4 rounded-xl border border-minecraft-green/20">
              <div className="text-2xl font-bold text-ndiicloud-accent">50ms</div>
              <div className="text-sm text-gray-400">Avg Response</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Results */}
          <div className="lg:col-span-2">
            {result ? (
              <ServerResult 
                data={result} 
                realTimeUpdate={realTimeUpdates[result.ip]}
              />
            ) : (
              <div className="bg-minecraft-dark/50 backdrop-blur-sm border border-minecraft-green/30 rounded-2xl p-8 text-center">
                <div className="w-24 h-24 mx-auto mb-6 text-gray-600">
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-2">No Server Checked Yet</h3>
                <p className="text-gray-400 mb-6">
                  Enter a server address above to get detailed status information
                </p>
                <div className="inline-flex items-center space-x-2 text-minecraft-green">
                  <span>Try one of the popular servers</span>
                  <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - History & Tools */}
          <div className="space-y-8">
            <HistoryList 
              servers={recentServers}
              onSelect={handleQuickCheck}
            />

            {/* Quick Tools */}
            <div className="bg-minecraft-dark/50 backdrop-blur-sm border border-minecraft-green/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-minecraft-green" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                </svg>
                Quick Tools
              </h3>
              
              <div className="space-y-3">
                <button 
                  onClick={() => navigator.clipboard.writeText(`${API_BASE_URL}/status/${serverAddress}`)}
                  className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-between transition"
                >
                  <span>Copy API URL</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
                  </svg>
                </button>

                <button 
                  onClick={() => window.open(`/api/v1/icon/${serverAddress}`, '_blank')}
                  className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-between transition"
                >
                  <span>Get Server Icon</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                  </svg>
                </button>

                <button 
                  onClick={() => window.open(`${API_BASE_URL}/history/${serverAddress}`, '_blank')}
                  className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-between transition"
                >
                  <span>View History</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Live Updates */}
            {Object.keys(realTimeUpdates).length > 0 && (
              <div className="bg-minecraft-dark/50 backdrop-blur-sm border border-minecraft-green/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                  <div className="w-3 h-3 bg-minecraft-green rounded-full mr-2 animate-pulse"></div>
                  Live Updates
                </h3>
                <div className="space-y-3">
                  {Object.values(realTimeUpdates).map((update, index) => (
                    <div key={index} className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium truncate">{update.server}</span>
                        <span className="text-xs px-2 py-1 bg-minecraft-green/20 text-minecraft-green rounded">
                          LIVE
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        Players: {update.players?.online || 0}/{update.players?.max || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-minecraft-dark border-t border-gray-800 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-minecraft-dirt rounded flex items-center justify-center">
                  <span className="font-minecraft">N</span>
                </div>
                <span className="text-xl font-bold font-minecraft">NdiiClouD</span>
              </div>
              <p className="text-gray-500 text-sm mt-2">© {new Date().getFullYear()} - Advanced Minecraft Status Service</p>
            </div>
            
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white transition">Documentation</a>
              <a href="#" className="text-gray-400 hover:text-white transition">API Reference</a>
              <a href="#" className="text-gray-400 hover:text-white transition">GitHub</a>
              <a href="#" className="text-gray-400 hover:text-white transition">Support</
