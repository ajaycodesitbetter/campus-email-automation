import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Search, Filter, Calendar, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActivityLog {
  id: number;
  action: string;
  description: string;
  createdAt: string;
  metadata?: any;
}

interface ActivityLogViewerProps {
  trigger?: React.ReactNode;
}

export default function ActivityLogViewer({ trigger }: ActivityLogViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [limit, setLimit] = useState(50);
  const { toast } = useToast();

  const { data: activities = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs", limit],
    queryFn: async () => {
      const response = await fetch(`/api/activity-logs?limit=${limit}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch activity logs');
      return response.json();
    },
    enabled: isOpen,
  });

  // Filter activities based on search and action filter
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === "all" || activity.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  // Get unique action types for filter dropdown
  const actionTypes = ["all", ...Array.from(new Set(activities.map(a => a.action)))];

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'USER_LOGIN': return '🔐';
      case 'USER_LOGOUT': return '🚪';
      case 'CAMPAIGN_CREATED': return '📁';
      case 'CAMPAIGN_DELETED': return '🗑️';
      case 'CSV_UPLOAD': return '📤';
      case 'BULK_EMAIL_SENT': return '📧';
      case 'TEST_EMAIL_SENT': return '🧪';
      case 'EMAIL_FAILED': return '❌';
      case 'DATA_CLEARED': return '🗑️';
      case 'CONFIG_UPDATED': return '⚙️';
      default: return '📝';
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'USER_LOGIN':
      case 'CAMPAIGN_CREATED':
      case 'CSV_UPLOAD': return 'bg-blue-100 text-blue-800';
      case 'BULK_EMAIL_SENT':
      case 'TEST_EMAIL_SENT': return 'bg-green-100 text-green-800';
      case 'EMAIL_FAILED': return 'bg-red-100 text-red-800';
      case 'USER_LOGOUT':
      case 'CAMPAIGN_DELETED':
      case 'DATA_CLEARED': return 'bg-orange-100 text-orange-800';
      case 'CONFIG_UPDATED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      relative: getRelativeTime(date)
    };
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const hours = Math.floor(diffInMinutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  };

  const exportLogs = () => {
    if (!filteredActivities.length) {
      toast({
        title: "No Data",
        description: "No activity logs to export.",
        variant: "destructive"
      });
      return;
    }

    const headers = ['ID', 'Action', 'Description', 'Date', 'Time', 'Metadata'];
    const csvContent = [
      headers.join(','),
      ...filteredActivities.map(log => {
        const formatted = formatDate(log.createdAt);
        return [
          log.id,
          log.action,
          `"${log.description.replace(/"/g, '""')}"`,
          formatted.date,
          formatted.time,
          log.metadata ? `"${JSON.stringify(log.metadata).replace(/"/g, '""')}"` : 'None'
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `${filteredActivities.length} activity logs exported successfully.`,
    });
  };

  const defaultTrigger = (
    <Button variant="ghost" className="w-full text-primary hover:bg-blue-50">
      View All Logs
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity Logs
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Action</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actionTypes.map(action => (
                    <SelectItem key={action} value={action}>
                      <div className="flex items-center gap-2">
                        {action !== "all" && <span>{getActivityIcon(action)}</span>}
                        <span className="capitalize">
                          {action === "all" ? "All Actions" : action.replace(/_/g, ' ').toLowerCase()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Limit</label>
              <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">Last 25</SelectItem>
                  <SelectItem value="50">Last 50</SelectItem>
                  <SelectItem value="100">Last 100</SelectItem>
                  <SelectItem value="500">Last 500</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary */}
          <div className="flex justify-between items-center py-2 border-y">
            <div className="text-sm text-gray-600">
              Showing {filteredActivities.length} of {activities.length} activities
            </div>
            <Button onClick={exportLogs} variant="outline" size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Activity List */}
          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-start space-x-3 p-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredActivities.length > 0 ? (
              <div className="space-y-2">
                {filteredActivities.map((activity) => {
                  const formatted = formatDate(activity.createdAt);
                  return (
                    <div key={activity.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="text-lg mt-0.5">
                          {getActivityIcon(activity.action)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{activity.description}</span>
                            <Badge variant="outline" className={`text-xs ${getActivityColor(activity.action)}`}>
                              {activity.action.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>#{activity.id}</span>
                            <span>{formatted.date} at {formatted.time}</span>
                            <span>{formatted.relative}</span>
                          </div>
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                              <strong>Details:</strong> {JSON.stringify(activity.metadata, null, 2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <History className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>No activities found matching your filters.</p>
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
