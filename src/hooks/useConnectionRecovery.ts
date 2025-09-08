import { useEffect, useCallback } from 'react';
import { testConnection } from '../lib/supabase';

interface UseConnectionRecoveryOptions {
  onConnectionLost?: () => void;
  onConnectionRestored?: () => void;
  checkInterval?: number;
}

export const useConnectionRecovery = (options: UseConnectionRecoveryOptions = {}) => {
  const {
    onConnectionLost,
    onConnectionRestored,
    checkInterval = 30000, // 30 seconds
  } = options;

  const checkConnectionStatus = useCallback(async () => {
    try {
      const isConnected = await testConnection();
      
      if (!isConnected && onConnectionLost) {
        onConnectionLost();
      } else if (isConnected && onConnectionRestored) {
        onConnectionRestored();
      }
      
      return isConnected;
    } catch (error) {
      console.error('Connection check failed:', error);
      if (onConnectionLost) {
        onConnectionLost();
      }
      return false;
    }
  }, [onConnectionLost, onConnectionRestored]);

  useEffect(() => {
    // Initial connection check
    checkConnectionStatus();

    // Set up periodic checks
    const interval = setInterval(checkConnectionStatus, checkInterval);

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('Browser came online, checking connection...');
      checkConnectionStatus();
    };

    const handleOffline = () => {
      console.log('Browser went offline');
      if (onConnectionLost) {
        onConnectionLost();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnectionStatus, checkInterval]);

  return { checkConnectionStatus };
};