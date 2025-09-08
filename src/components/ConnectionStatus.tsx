import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { testConnection } from '../lib/supabase';

const ConnectionStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const connected = await testConnection();
      setIsConnected(connected);
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Check connection on mount
    checkConnection();

    // Set up periodic connection checks
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (isConnected === null) {
    return null; // Don't show anything while initial check is happening
  }

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
      isConnected 
        ? 'bg-green-100 text-green-800 border border-green-200' 
        : 'bg-red-100 text-red-800 border border-red-200'
    }`}>
      {isChecking ? (
        <RefreshCw size={16} className="animate-spin" />
      ) : isConnected ? (
        <Wifi size={16} />
      ) : (
        <WifiOff size={16} />
      )}
      <span>
        {isChecking ? 'Checking...' : isConnected ? 'Connected' : 'Connection Lost'}
      </span>
      {!isConnected && !isChecking && (
        <button
          onClick={checkConnection}
          className="ml-2 text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default ConnectionStatus;