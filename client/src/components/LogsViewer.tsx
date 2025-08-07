import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Mail, Activity, Search, Download, Filter, X } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface LogsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LogsViewer({ open, onOpenChange }: LogsViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("email");
  const { toast } = useToast();

  const { data: emailLogs, isLoading: emailLogsLoading } = useQuery({
    queryKey: ["/api/email-logs"],
    queryFn: () => fetch(getApiUrl("/api/email-logs")).then(res => res.json()),
    enabled: open,
  });

  const { data: activityLogs, isLoading: activityLogsLoading } = useQuery({
    queryKey: ["/api/activity-logs", 100],
    queryFn: () => fetch(getApiUrl("/api/activity-logs?limit=100")).then(res => res.json()),
    enabled: open,
  });

  const handleExportLogs = async () => {
    try {
      const response = await fetch(getApiUrl("/api/export-logs"));
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Complete",
        description: "All logs exported successfully!",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export logs",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "bg-green-100 text-green-800";
      case "failed": return "bg-red-100 text-red-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case "BULK_EMAIL_SENT": return "bg-blue-500";
      case "TEST_EMAIL_SENT": return "bg-green-500";
      case "CSV_UPLOAD": return "bg-purple-500";
      case "CAMPAIGN_CREATED": return "bg-indigo-500";
      case "CAMPAIGN_DELETED": return "bg-red-500";
      case "DATA_CLEARED": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const filteredEmailLogs = emailLogs?.filter((log: any) => {
    const matchesSearch = log.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || log.status === filterStatus;
    return matchesSearch && matchesStatus;
  }) || [];

  const filteredActivityLogs = activityLogs?.filter((log: any) => {
    return log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           log.action?.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Complete Logs Viewer
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 h-full">
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExportLogs} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export All
            </Button>
          </div>

          {/* Tabs for different log types */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Logs ({emailLogs?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Activity Logs ({activityLogs?.length || 0})
              </TabsTrigger>
            </TabsList>

            {/* Email Logs Tab */}
            <TabsContent value="email" className="mt-4">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {emailLogsLoading ? (
                  <div className="text-center py-8">Loading email logs...</div>
                ) : filteredEmailLogs.length > 0 ? (
                  filteredEmailLogs.map((log: any) => (
                    <Card key={log.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getStatusColor(log.status)}>
                                {log.status}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {formatTimestamp(log.sentAt)}
                              </span>
                            </div>
                            <p className="font-medium text-gray-900">{log.email}</p>
                            <p className="text-sm text-gray-600 mb-2">{log.subject}</p>
                            {log.error && (
                              <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                Error: {log.error}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Campaign #{log.campaignId}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No email logs found matching your criteria
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Activity Logs Tab */}
            <TabsContent value="activity" className="mt-4">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {activityLogsLoading ? (
                  <div className="text-center py-8">Loading activity logs...</div>
                ) : filteredActivityLogs.length > 0 ? (
                  filteredActivityLogs.map((log: any) => (
                    <Card key={log.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className={`w-3 h-3 ${getActivityColor(log.action)} rounded-full mt-1`}></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-gray-900">{log.description}</p>
                              <span className="text-xs text-gray-500">
                                {formatTimestamp(log.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{log.action}</p>
                            {log.metadata && (
                              <div className="mt-2 text-xs text-gray-500">
                                <pre className="bg-gray-50 p-2 rounded text-xs">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No activity logs found matching your criteria
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
