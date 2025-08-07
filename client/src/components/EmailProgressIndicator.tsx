import React from 'react';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Mail, CheckCircle, AlertCircle, Clock, Loader2 } from "lucide-react";
import { useRealTimeEmailStatus, EmailProgress } from "@/hooks/useRealTimeEmailStatus";

interface EmailProgressIndicatorProps {
  campaignId?: number | null;
  show?: boolean;
  onProgressUpdate?: (progress: EmailProgress) => void;
  className?: string;
}

export function EmailProgressIndicator({ 
  campaignId, 
  show = true,
  onProgressUpdate,
  className = "" 
}: EmailProgressIndicatorProps) {
  const { emailProgress, isRefreshing, refreshNow, isProcessing } = useRealTimeEmailStatus({
    campaignId,
    enabled: show,
    onProgress: onProgressUpdate,
    refreshInterval: 5000, // 5 seconds
  });

  // Don't show if no emails to track
  if (!show || emailProgress.total === 0) {
    return null;
  }

  const getStatusColor = () => {
    if (isProcessing) return "bg-blue-500";
    if (emailProgress.failed > 0) return "bg-orange-500";
    return "bg-green-500";
  };

  const getStatusIcon = () => {
    if (isProcessing) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (emailProgress.failed > 0) return <AlertCircle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (isProcessing) return "Sending emails...";
    if (emailProgress.percentage === 100) return "All emails processed";
    return "Email sending completed";
  };

  return (
    <div className={`bg-white rounded-lg border shadow-sm p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Mail className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Email Progress</h3>
          {isProcessing && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Live
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshNow}
          disabled={isRefreshing}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">{getStatusText()}</span>
          <span className="text-sm font-medium text-gray-900">
            {emailProgress.percentage}%
          </span>
        </div>
        <Progress 
          value={emailProgress.percentage} 
          className="h-2"
        />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-3">
        {/* Total */}
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {emailProgress.total}
          </div>
          <div className="text-xs text-gray-500 flex items-center justify-center">
            <Mail className="h-3 w-3 mr-1" />
            Total
          </div>
        </div>

        {/* Sent */}
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">
            {emailProgress.sent}
          </div>
          <div className="text-xs text-gray-500 flex items-center justify-center">
            <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
            Sent
          </div>
        </div>

        {/* Pending */}
        <div className="text-center">
          <div className={`text-lg font-semibold ${
            isProcessing ? 'text-blue-600 animate-pulse' : 'text-gray-600'
          }`}>
            {emailProgress.pending}
          </div>
          <div className="text-xs text-gray-500 flex items-center justify-center">
            <Clock className={`h-3 w-3 mr-1 ${
              isProcessing ? 'text-blue-500 animate-pulse' : 'text-gray-400'
            }`} />
            Pending
          </div>
        </div>

        {/* Failed */}
        <div className="text-center">
          <div className={`text-lg font-semibold ${
            emailProgress.failed > 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {emailProgress.failed}
          </div>
          <div className="text-xs text-gray-500 flex items-center justify-center">
            <AlertCircle className={`h-3 w-3 mr-1 ${
              emailProgress.failed > 0 ? 'text-red-500' : 'text-gray-400'
            }`} />
            Failed
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mt-3 pt-3 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm text-gray-600">
              {isProcessing ? 'Processing...' : 'Complete'}
            </span>
          </div>
          
          {isRefreshing && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Updating...</span>
            </div>
          )}
          
          {!isRefreshing && !isProcessing && (
            <div className="text-xs text-gray-500">
              Auto-refresh: 5s
            </div>
          )}
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <div className="mt-2">
            <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-md">
              <div className="flex-shrink-0">
                <div className={`w-2 h-2 ${getStatusColor()} rounded-full animate-pulse`}></div>
              </div>
              <div className="text-xs text-blue-700">
                Emails are being sent in real-time. Status updates automatically every 5 seconds.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailProgressIndicator;
