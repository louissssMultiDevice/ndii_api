// src/components/ServerResult.jsx
import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ServerResult = ({ data, realTimeUpdate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  const result = realTimeUpdate || data;
  
  if (!result) return null;

  const isOnline = result.online;

  // Prepare chart data for history
  const historyData = {
    labels: ['1h', '2h', '3h', '4h', '5h', '6h'],
    datasets: [
      {
        label: 'Players Online',
        data: [12, 19, 15, 25, 22, 30],
        borderColor: '#55FF55',
        backgroundColor: 'rgba(85, 255, 85, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#999'
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#999'
        }
      }
    }
  };

  const renderPlayers = () => {
    if (!result.players?.list?.length) {
      return (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-600">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
            </svg>
          </div>
          <p className="text-gray-400">No players online or player list hidden</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {result.players.list.map((player, index) => (
          <div key={index} className="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-800 transition">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-minecraft-green to-minecraft-blue rounded flex items-center justify-center">
                <span className="font-bold">{player.name.charAt(0)}</span>
              </div>
              <div>
                <div className="font-medium truncate">{player.name}</div>
                {player.uuid && (
                  <div className="text-xs text-gray-400 truncate" title={player.uuid}>
                    {player.uuid.substring(0, 8)}...
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPluginsMods = () => {
    const items = [...(result.plugins || []), ...(result.mods || [])];
    
    if (!items.length) {
      return <p className="text-gray-400 text-center py-8">No plugins or mods detected</p>;
    }

    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition">
            <div>
              <div className="font-medium">{item.name}</div>
              {item.version && (
                <div className="text-sm text-gray-400">v{item.version}</div>
              )}
            </div>
            <span className={`px-2 py-1 text-xs rounded ${item.name.includes('Plugin') ? 'bg-blue-900/30 text-blue-300' : 'bg-purple-900/30 text-purple-300'}`}>
              {item.name.includes('Plugin') ? 'Plugin' : 'Mod'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-minecraft-dark/50 backdrop-blur-sm border border-minecraft-green/30 rounded-2xl overflow-hidden">
      {/* Status Header */}
      <div className={`p-6 ${isOnline ? 'bg-gradient-to-r from-green-900/30 to-minecraft-dark' : 'bg-gradient-to-r from-red-900/30 to-minecraft-dark'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <h2 className="text-2xl font-bold truncate">{result.hostname || result.ip}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-gray-800 rounded-lg text-sm">
                {result.ip}:{result.port}
              </span>
              {result.version && (
                <span className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-lg text-sm">
                  {result.version}
                </span>
              )}
              {result.software && (
                <span className="px-3 py-1 bg-purple-900/30 text-purple-300 rounded-lg text-sm">
                  {result.software}
                </span>
              )}
              {realTimeUpdate && (
                <span className="px-3 py-1 bg-green-900/30 text-green-300 rounded-lg text-sm animate-pulse">
                  LIVE
                </span>
              )}
            </div>
          </div>
          
          <div className="text-right">
            {isOnline ? (
              <>
                <div className="text-4xl font-bold text-green-400">
                  {result.players?.online || 0}<span className="text-2xl text-gray-400">/{result.players?.max || 0}</span>
                </div>
                <p className="text-gray-400">Players Online</p>
              </>
            ) : (
              <div className="text-2xl font-bold text-red-400">OFFLINE</div>
            )}
          </div>
        </div>
      </div>

      {/* MOTD */}
      {result.motd && (
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-lg font-bold mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
            Server MOTD
          </h3>
          <div className="bg-black/50 p-4 rounded-lg border border-gray-700">
            <div className="font-minecraft whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: result.motd.html?.join('<br/>') || result.motd.clean?.join('<br/>') }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <nav className="flex overflow-x-auto">
          {['overview', 'players', 'plugins', 'history', 'debug'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 font-medium whitespace-nowrap transition ${activeTab === tab ? 'border-b-2 border-minecraft-green text-minecraft-green' : 'text-gray-400 hover:text-white'}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Server Icon */}
            {result.icon && (
              <div className="flex justify-center">
                <div className="relative">
                  <img 
                    src={result.icon} 
                    alt="Server Icon" 
                    className="w-32 h-32 rounded-2xl border-4 border-gray-800"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-minecraft-green text-minecraft-dark px-3 py-1 rounded-lg font-bold text-sm">
                    ICON
                  </div>
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-900/50 p-4 rounded-xl">
                <div className="text-sm text-gray-400 mb-1">Protocol</div>
                <div className="text-xl font-bold">
                  {result.debug?.ping ? 'Ping' : result.debug?.query ? 'Query' : result.debug?.bedrock ? 'Bedrock' : 'Unknown'}
                </div>
              </div>
              <div className="bg-gray-900/50 p-4 rounded-xl">
                <div className="text-sm text-gray-400 mb-1">Response Time</div>
                <div className="text-xl font-bold text-green-400">
                  {result.ndiicloud_meta?.processed_in || 'N/A'}
                </div>
              </div>
              <div className="bg-gray-900/50 p-4 rounded-xl">
                <div className="text-sm text-gray-400 mb-1">Cache</div>
                <div className="text-xl font-bold">
                  <span className={result.debug?.cachehit ? 'text-green-400' : 'text-yellow-400'}>
                    {result.debug?.cachehit ? 'HIT' : 'MISS'}
                  </span>
                </div>
              </div>
              <div className="bg-gray-900/50 p-4 rounded-xl">
                <div className="text-sm text-gray-400 mb-1">API Version</div>
                <div className="text-xl font-bold">v{result.debug?.apiversion || '1.0'}</div>
              </div>
            </div>

            {/* Map Info */}
            {result.map && (
              <div className="bg-gray-900/30 p-4 rounded-xl">
                <h4 className="font-bold mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd"/>
                  </svg>
                  Current Map
                </h4>
                <p className="text-gray-300">{result.map.clean || result.map.raw}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'players' && (
          <div>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-bold">Online Players</h4>
                <div className="text-2xl font-bold">
                  {result.players?.online || 0}<span className="text-lg text-gray-400">/{result.players?.max || 0}</span>
                </div>
              </div>
              {renderPlayers()}
            </div>
          </div>
        )}

        {activeTab === 'plugins' && (
          <div>
            <h4 className="text-lg font-bold mb-4">Plugins & Mods</h4>
            {renderPluginsMods()}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h4 className="text-lg font-bold mb-4">Player Activity (Last 6 Hours)</h4>
            <div className="h-64">
              <Line data={historyData} options={chartOptions} />
            </div>
          </div>
        )}

        {activeTab === 'debug' && (
          <div className="space-y-4">
            <h4 className="text-lg font-bold">Debug Information</h4>
            <div className="bg-black/50 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm text-gray-300">
                {JSON.stringify(result.debug, null, 2)}
              </pre>
            </div>
            
            {result.ndiicloud_meta && (
              <div className="bg-black/50 p-4 rounded-lg">
                <h5 className="font-bold mb-2 text-minecraft-green">NdiiClouD Meta</h5>
                <pre className="text-sm text-gray-300">
                  {JSON.stringify(result.ndiicloud_meta, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-t border-gray-800 bg-gray-900/20">
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center transition"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
            </svg>
            Copy JSON
          </button>
          
          <button 
            onClick={() => window.open(`https://mcsrvstat.us/server/${result.ip}:${result.port}`, '_blank')}
            className="px-4 py-2 bg-blue-900/30 hover:bg-blue-800/30 text-blue-300 rounded-lg flex items-center transition"
          >
            Compare with mcsrvstat.us
          </button>
          
          <button 
            onClick={() => window.open(`/api/v1/icon/${result.ip}:${result.port}`, '_blank')}
            className="px-4 py-2 bg-purple-900/30 hover:bg-purple-800/30 text-purple-300 rounded-lg flex items-center transition"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
            </svg>
            Download Icon
          </button>
          
          <button 
            onClick={() => window.open(`/api/v1/history/${result.ip}:${result.port}`, '_blank')}
            className="px-4 py-2 bg-green-900/30 hover:bg-green-800/30 text-green-300 rounded-lg flex items-center transition"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
            </svg>
            View History
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServerResult;
