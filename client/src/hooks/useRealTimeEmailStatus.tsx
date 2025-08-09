import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface EmailProgress {
  pending: number;
  sent: number;
  failed: number;
  total: number;
  percentage: number;
  isProcessing: boolean;
}

interface UseRealTimeEmailStatusOptions {
  campaignId?: number | null;
  enabled?: boolean;
  onProgress?: (progress: EmailProgress) => void;
  refreshInterval?: number; // in milliseconds, default 5000 (5 seconds)
}

export function useRealTimeEmailStatus({
  campaignId,
  enabled = true,
  onProgress,
  refreshInterval = 5000, // 5 seconds for faster updates during email sending
}: UseRealTimeEmailStatusOptions = {}) {
  const queryClient = useQueryClient();
  const [emailProgress, setEmailProgress] = useState<EmailProgress>({
    pending: 0,
    sent: 0,
    failed: 0,
    total: 0,
    percentage: 0,
    isProcessing: false,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressRef = useRef<EmailProgress | null>(null);

  // Function to fetch email status
  const fetchEmailStatus = async (): Promise<EmailProgress | null> => {
    try {
      const statsUrl = campaignId 
        ? `/api/campaigns/${campaignId}/stats`
        : '/api/stats';
      
      const response = await fetch(statsUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch email status: ${response.statusText}`);
      }
      
      const stats = await response.json();
      
      const progress: EmailProgress = {
        pending: stats.emailsPending || 0,
        sent: stats.emailsSent || 0,
        failed: stats.emailsFailed || 0,
        total: (stats.emailsSent || 0) + (stats.emailsFailed || 0) + (stats.emailsPending || 0),
        percentage: 0,
        isProcessing: (stats.emailsPending || 0) > 0,
      };
      
      // Calculate percentage
      if (progress.total > 0) {
        progress.percentage = Math.round(((progress.sent + progress.failed) / progress.total) * 100);
      }
      
      return progress;
    } catch (error) {
      console.error('Error fetching email status:', error);
      return null;
    }
  };

  // Function to update status with smart refresh
  const updateEmailStatus = async (force = false) => {
    if (!enabled || (!force && isRefreshing)) return;
    
    setIsRefreshing(true);
    
    try {
      const progress = await fetchEmailStatus();
      if (progress) {
        // Only update if there's a meaningful change or force update
        const hasChanged = !lastProgressRef.current || 
          lastProgressRef.current.pending !== progress.pending ||
          lastProgressRef.current.sent !== progress.sent ||
          lastProgressRef.current.failed !== progress.failed;
        
        if (hasChanged || force) {
          setEmailProgress(progress);
          lastProgressRef.current = progress;
          onProgress?.(progress);
          
          // Invalidate related queries to update other components
          await queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
          if (campaignId) {
            await queryClient.invalidateQueries({ 
              queryKey: [`/api/campaigns/${campaignId}/stats`] 
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to update email status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Set up auto-refresh with adaptive interval
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    updateEmailStatus(true);

    // Adaptive refresh interval based on processing status
    const getRefreshInterval = () => {
      const currentProgress = lastProgressRef.current;
      if (!currentProgress) return refreshInterval;
      
      // If emails are being processed, refresh more frequently
      if (currentProgress.isProcessing && currentProgress.pending > 0) {
        return Math.min(refreshInterval, 3000); // Max 3 seconds during processing
      }
      
      // If no processing, use normal interval
      return refreshInterval;
    };

    // Set up interval with adaptive timing
    const setupInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      const interval = getRefreshInterval();
      intervalRef.current = setInterval(() => {
        // Only refresh when tab is visible to save resources
        if (!document.hidden) {
          updateEmailStatus();
        }
      }, interval);
    };

    setupInterval();

    // Re-setup interval when progress changes (for adaptive timing)
    const progressChangeHandler = () => {
      setupInterval();
    };

    // Listen for visibility changes to pause/resume
    const handleVisibilityChange = () => {
      if (!document.hidden && enabled) {
        // Tab became visible, refresh immediately
        updateEmailStatus(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, campaignId, refreshInterval]);

  // Manual refresh function
  const refreshNow = async () => {
    await updateEmailStatus(true);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return {
    emailProgress,
    isRefreshing,
    refreshNow,
    isProcessing: emailProgress.isProcessing,
  };
}
