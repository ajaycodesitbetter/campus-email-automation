import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";
export interface EmailProgress {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  percentage: number;
  isProcessing: boolean;
}
export function useRealTimeEmailStatus({
  campaignId,
  enabled = true,
  onProgress,
  refreshInterval = 10000,
}: {
  campaignId?: number | null;
  enabled?: boolean;
  onProgress?: (p: EmailProgress) => void;
  refreshInterval?: number;
}) {
  const query = useQuery({
    queryKey: ["/api/email-progress", campaignId],
    enabled,
    refetchInterval: Math.max(10000, refreshInterval),
    queryFn: async () => {
      const r = await fetch(
        getApiUrl(`/api/stats${campaignId ? `?campaignId=${campaignId}` : ""}`),
        { credentials: "include", signal: AbortSignal.timeout(15000) },
      );
      if (!r.ok) throw new Error("Could not load sending status");
      return r.json();
    },
  });
  const sent = query.data?.emailsSent ?? 0,
    failed = query.data?.emailsFailed ?? 0,
    pending = query.data?.emailsPending ?? 0,
    total = sent + failed + pending;
  const emailProgress = {
    isProcessing: pending > 0,
    total,
    sent,
    failed,
    pending,
    percentage: total ? Math.round(((sent + failed) / total) * 100) : 0,
  };
  useEffect(() => {
    onProgress?.(emailProgress);
  }, [sent, failed, pending, total, onProgress]);
  return {
    emailProgress,
    isRefreshing: query.isFetching,
    refreshNow: () => query.refetch(),
    isProcessing: pending > 0,
    error: query.error,
  };
}
