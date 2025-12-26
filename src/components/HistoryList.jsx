// src/components/HistoryList.jsx
import React from 'react';

const HistoryList = ({ servers, onSelect }) => {
  if (servers.length === 0) {
    return (
      <div className="bg-minecraft-dark/50 backdrop-blur-sm border border-minecraft-green/30 rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
          </svg>
          Recent Checks
        </h3>
        <p className="text-gray-400 text-center py-8">No recent server checks</p>
      </div>
    );
  }

  return (
    <div className="bg-minecraft-dark/50 backdrop-blur-sm border border-minecraft-green/30 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
          </svg>
          Recent Checks
        </h3>
        <button 
          onClick={() => {
            localStorage.removeItem('ndiicloud_recent_servers');
            window.location.reload();
          }}
          className="text-sm text-gray-400 hover:text-white transition"
        >
          Clear All
        </button>
      </div>
      
      <div className="space-y-3">
        {servers.map((server, index) => (
          <div
            key={index}
            onClick={() => onSelect(server.address)}
            className="p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition cursor-pointer group"
          >
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${server.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="font-medium truncate">{server.address}</span>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-minecraft-green transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            <div className="flex justify-between text-sm text-gray-400">
              <div>
                {server.online ? (
                  <span className="text-green-400">
                    {server.players} player{server.players !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="text-red-400">Offline</span>
                )}
              </div>
              <div title={new Date(server.timestamp).toLocaleString()}>
                {timeAgo(new Date(server.timestamp))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function for time ago
function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + 'y ago';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + 'mo ago';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + 'd ago';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + 'h ago';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + 'm ago';
  
  return Math.floor(seconds) + 's ago';
}

export default HistoryList;
