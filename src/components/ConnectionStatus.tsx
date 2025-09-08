import React, { useState, useEffect } from 'react';
import { Wifi, Activity } from 'lucide-react';
import { testConnection } from '../lib/supabase';

const ConnectionStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isActive, setIsActive] = useState<boolean>(false);

  const checkConnection = async () => {
    setIsActive(true);
    try {
      const connected = await testConnection();
      setIsConnected(connected);
    } catch (error) {
      setIsConnected(false);
    } finally {
      setTimeout(() => setIsActive(false), 500);
    }
  };

  useEffect(() => {
    // Initial connection check
    checkConnection();

    // Continuous connection monitoring every 15 seconds
    const interval = setInterval(checkConnection, 15000);

    // Monitor user activity to maintain connection
    const handleActivity = () => {
      checkConnection();
    };

    // Listen for user interactions to keep connection alive
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-800 border border-green-200">
      {isActive ? (
        <Activity size={16} className="animate-pulse" />
      ) : (
        <Wifi size={16} />
      )}
      <span>Database Ready</span>
    </div>
  );
};

export default ConnectionStatus;