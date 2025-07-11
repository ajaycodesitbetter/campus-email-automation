import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { History, Download, SquareCheck, Trash, AlertTriangle } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import LogsViewer from "@/components/LogsViewer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RecentActivityProps {
  selectedCampaign: number | null;
}

export default function RecentActivity({ selectedCampaign }: RecentActivityProps) {
  const [showLogsViewer, setShowLogsViewer] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: activities, isLoading } = useQuery({
    queryKey: ["/api/activity-logs"],
  });

  const { data: campaigns } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const clearDataMutation = useMutation({
    mutationFn: async () => {
      const params = selectedCampaign ? `?campaignId=${selectedCampaign}` : '';
      return apiRequest("DELETE", `/api/clear-data${params}`, {});
    },
    onSuccess: () => {
      const message = selectedCampaign 
        ? "Campaign data cleared successfully!" 
        : "All data cleared successfully!";
      toast({
        title: "Success",
        description: message,
      });
      queryClient.invalidateQueries();
    },
    onError: (error: any) => {
      toast({
        title: "Clear Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getSelectedCampaignName = () => {
    if (!selectedCampaign || !campaigns) return null;
    const campaign = (campaigns as any[]).find((c: any) => c.id === selectedCampaign);
    return campaign?.name || 'Selected Campaign';
  };

  const getWarningTitle = () => {
    return selectedCampaign 
      ? "Clear Campaign Data?" 
      : "Clear All Data?";
  };

  const getWarningDescription = () => {
    if (selectedCampaign) {
      const campaignName = getSelectedCampaignName();
      return `This will permanently delete all student data and email logs from the "${campaignName}" campaign. This action cannot be undone.`;
    } else {
      return "This will permanently delete ALL student data and email logs from ALL campaigns. This action cannot be undone.";
    }
  };

  const getButtonText = () => {
    if (clearDataMutation.isPending) {
      return "Clearing...";
    }
    return selectedCampaign 
      ? "Clear Campaign Data" 
      : "Clear All Data";
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'CSV_UPLOAD':
        return '📤';
      case 'BULK_EMAIL_SENT':
        return '✅';
      case 'EMAIL_FAILED':
        return '❌';
      case 'DATA_CLEARED':
        return '🗑️';
      default:
        return '📝';
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'CSV_UPLOAD':
        return 'bg-blue-500';
      case 'BULK_EMAIL_SENT':
        return 'bg-green-500';
      case 'EMAIL_FAILED':
        return 'bg-red-500';
      case 'DATA_CLEARED':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const hours = Math.floor(diffInMinutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border">
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-gray-200 rounded-full mt-2"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Recent Activity */}
      <Card className="shadow-sm border">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
            <History className="mr-2 text-primary h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activities && (activities as any[]).length > 0 ? (
            <div className="space-y-3">
              {(activities as any[]).slice(0, 5).map((activity: any) =>
                <div key={activity.id} className="p-4 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-start space-x-3">
                    <div className={`w-2 h-2 ${getActivityColor(activity.action)} rounded-full mt-2`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">
                        {formatTimeAgo(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="p-4">
                <Button
                  variant="ghost"
                  className="w-full text-primary hover:bg-blue-50"
                  onClick={() => setShowLogsViewer(true)}
                >
                  View All Logs
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <History className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="shadow-sm border">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
            ⚡ Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <Button
            variant="ghost"
            className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 p-3 text-left justify-start"
            onClick={async () => {
              try {
                const response = await fetch(getApiUrl("/api/export-logs"));
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `email-logs-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                toast({
                  title: "Export Complete",
                  description: "Email logs exported successfully!",
                });
              } catch (error) {
                toast({
                  title: "Export Failed",
                  description: "Failed to export email logs",
                  variant: "destructive",
                });
              }
            }}
          >
            <Download className="mr-3 h-4 w-4 text-gray-600" />
            Export Email Logs
          </Button>
          <Button
            variant="ghost"
            className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 p-3 text-left justify-start"
            onClick={() => {
              toast({
                title: "Validate Emails",
                description: "Email validation coming soon!",
              });
            }}
          >
            <SquareCheck className="mr-3 h-4 w-4 text-gray-600" />
            Validate Email Addresses
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full bg-red-50 hover:bg-red-100 text-red-700 p-3 text-left justify-start"
                disabled={clearDataMutation.isPending}
              >
                <Trash className="mr-3 h-4 w-4 text-red-600" />
                {getButtonText()}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
                  {getWarningTitle()}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-600">
                  {getWarningDescription()}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={clearDataMutation.isPending}>
                  No, Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => clearDataMutation.mutate()}
                  disabled={clearDataMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {clearDataMutation.isPending ? "Clearing..." : "Yes, Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
      
      {/* Logs Viewer Dialog */}
      <LogsViewer 
        open={showLogsViewer} 
        onOpenChange={setShowLogsViewer} 
      />
    </>
  );
}
