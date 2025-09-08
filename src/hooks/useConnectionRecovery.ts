import { useEffect, useCallback } from 'react';
import { testConnection } from '../lib/supabase';

interface UseConnectionRecoveryOptions {
  onConnectionActive?: () => void;
  checkInterval?: number;
}

export const useConnectionRecovery = (options: UseConnectionRecoveryOptions = {}) => {
  const {
    onConnectionActive,
    checkInterval = 10000, // 10 seconds for active monitoring
  } = options;

  const maintainConnection = useCallback(async () => {
    try {
      const isConnected = await testConnection();
      
      if (isConnected && onConnectionActive) {
        onConnectionActive();
      }
      
      return isConnected;
    } catch (error) {
      // Silent handling - connection pool will manage retries
      return false;
    }
  }, [onConnectionActive]);

  useEffect(() => {
    // Immediate connection check
    maintainConnection();

    // Regular connection maintenance
    const interval = setInterval(maintainConnection, checkInterval);

    // Maintain connection on browser focus
    const handleFocus = () => {
      maintainConnection();
    };

    // Maintain connection on page visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        maintainConnection();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [maintainConnection, checkInterval]);

  return { maintainConnection };
};