import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { History, Download, SquareCheck, Trash } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function RecentActivity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: activities, isLoading } = useQuery({
    queryKey: ["/api/activity-logs"],
  });

  const clearDataMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/clear-data", {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "All data cleared successfully!",
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
                  onClick={() => {
                    toast({
                      title: "View All Logs",
                      description: "Full log viewer coming soon!",
                    });
                  }}
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
            onClick={() => {
              toast({
                title: "Export Logs",
                description: "Export functionality coming soon!",
              });
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
          <Button
            variant="ghost"
            className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 p-3 text-left justify-start"
            onClick={() => clearDataMutation.mutate()}
            disabled={clearDataMutation.isPending}
          >
            <Trash className="mr-3 h-4 w-4 text-gray-600" />
            {clearDataMutation.isPending ? "Clearing..." : "Clear All Data"}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
