import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface AutoRefreshOptions {
  enabled?: boolean;
  onRefresh?: () => void;
}

export function useAutoRefresh(options: AutoRefreshOptions = {}) {
  const { enabled = true, onRefresh } = options;
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [settings, setSettings] = useState({
    autoRefreshInterval: 30,
    enableAnalytics: true,
  });

  // Load settings from localStorage and listen for changes
  useEffect(() => {
    const loadSettings = () => {
      const savedSettings = localStorage.getItem('systemSettings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings(prevSettings => ({
            ...prevSettings,
            ...parsed,
          }));
        } catch (error) {
          console.error('Failed to parse system settings:', error);
        }
      }
    };

    // Load initial settings
    loadSettings();

    // Listen for settings changes
    const handleSettingsChange = (event: CustomEvent) => {
      setSettings(prevSettings => ({
        ...prevSettings,
        ...event.detail,
      }));
    };

    window.addEventListener('systemSettingsChanged', handleSettingsChange as EventListener);

    return () => {
      window.removeEventListener('systemSettingsChanged', handleSettingsChange as EventListener);
    };
  }, []);

  // Set up auto-refresh interval
  useEffect(() => {
    if (!enabled || !settings.autoRefreshInterval || settings.autoRefreshInterval < 10) {
      return;
    }

    const refreshData = async () => {
      if (!document.hidden) { // Only refresh when tab is visible
        setIsAutoRefreshing(true);
        try {
          await queryClient.invalidateQueries();
          onRefresh?.();
        } catch (error) {
          console.error('Auto-refresh failed:', error);
        } finally {
          // Add a small delay to show the refresh indicator
          setTimeout(() => setIsAutoRefreshing(false), 1000);
        }
      }
    };

    // Set up interval
    const intervalMs = settings.autoRefreshInterval * 1000;
    intervalRef.current = setInterval(refreshData, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, settings.autoRefreshInterval, queryClient, onRefresh]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const manualRefresh = async () => {
    setIsAutoRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      onRefresh?.();
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setTimeout(() => setIsAutoRefreshing(false), 500);
    }
  };

  return {
    isAutoRefreshing,
    autoRefreshInterval: settings.autoRefreshInterval,
    manualRefresh,
  };
}
