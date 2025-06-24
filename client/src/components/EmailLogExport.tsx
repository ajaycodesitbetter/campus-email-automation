import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Table, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailLogExportProps {
  campaignId?: number | null;
}

interface EmailLog {
  id: number;
  email: string;
  subject: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  sentAt: string | null;
  errorMessage: string | null;
  studentName: string;
  studentSection: string;
}

export default function EmailLogExport({ campaignId }: EmailLogExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed' | 'pending'>('all');
  const { toast } = useToast();

  const { data: emailLogs, isLoading } = useQuery({
    queryKey: ["/api/email-logs", campaignId],
    queryFn: async () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      const response = await fetch(`/api/email-logs${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch email logs');
      return response.json();
    },
    enabled: isOpen && !!campaignId,
  });

  const filteredLogs = emailLogs?.filter((log: EmailLog) => 
    statusFilter === 'all' ? true : log.status === statusFilter
  ) || [];

  const exportToCSV = (logs: EmailLog[]) => {
    if (!logs.length) {
      toast({
        title: "No Data",
        description: "No email logs to export.",
        variant: "destructive"
      });
      return;
    }

    const headers = [
      'ID',
      'Student Name',
      'Email',
      'Section', 
      'Subject',
      'Status',
      'Sent At',
      'Error Message'
    ];

    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        log.id,
        `"${log.studentName || 'N/A'}"`,
        log.email,
        log.studentSection || 'N/A',
        `"${log.subject.replace(/"/g, '""')}"`,
        log.status,
        log.sentAt ? new Date(log.sentAt).toLocaleString() : 'N/A',
        log.errorMessage ? `"${log.errorMessage.replace(/"/g, '""')}"` : 'N/A'
      ].join(','))
    ].join('\n');

    downloadFile(csvContent, `email-logs-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  const exportToJSON = (logs: EmailLog[]) => {
    if (!logs.length) {
      toast({
        title: "No Data",
        description: "No email logs to export.",
        variant: "destructive"
      });
      return;
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      campaignId,
      totalRecords: logs.length,
      statusFilter,
      logs: logs.map(log => ({
        id: log.id,
        studentName: log.studentName || 'N/A',
        email: log.email,
        section: log.studentSection || 'N/A',
        subject: log.subject,
        message: log.message,
        status: log.status,
        sentAt: log.sentAt,
        errorMessage: log.errorMessage
      }))
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, `email-logs-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Email logs exported as ${filename}`,
    });

    setIsOpen(false);
  };

  const handleExport = () => {
    if (exportFormat === 'csv') {
      exportToCSV(filteredLogs);
    } else {
      exportToJSON(filteredLogs);
    }
  };

  const getStatusCount = (status: string) => {
    if (status === 'all') return emailLogs?.length || 0;
    return emailLogs?.filter((log: EmailLog) => log.status === status).length || 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Logs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Email Logs
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Statistics */}
          {emailLogs && (
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">Total</div>
                <div className="text-lg font-semibold">{getStatusCount('all')}</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="text-sm text-green-600">Sent</div>
                <div className="text-lg font-semibold text-green-700">{getStatusCount('sent')}</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <div className="text-sm text-red-600">Failed</div>
                <div className="text-lg font-semibold text-red-700">{getStatusCount('failed')}</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded">
                <div className="text-sm text-yellow-600">Pending</div>
                <div className="text-lg font-semibold text-yellow-700">{getStatusCount('pending')}</div>
              </div>
            </div>
          )}

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Filter by Status:</label>
            <div className="flex gap-2 flex-wrap">
              {['all', 'sent', 'failed', 'pending'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status as any)}
                  className="capitalize"
                >
                  {status} ({getStatusCount(status)})
                </Button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Format:</label>
            <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    CSV (Excel Compatible)
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    JSON (Developer Format)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {filteredLogs.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Preview ({filteredLogs.length} records):</label>
              <div className="border rounded p-3 bg-gray-50 max-h-32 overflow-y-auto">
                <div className="space-y-1 text-xs">
                  {filteredLogs.slice(0, 3).map((log: EmailLog) => (
                    <div key={log.id} className="flex justify-between items-center">
                      <span className="truncate flex-1">{log.email}</span>
                      <Badge className={`ml-2 ${getStatusColor(log.status)}`} variant="secondary">
                        {log.status}
                      </Badge>
                    </div>
                  ))}
                  {filteredLogs.length > 3 && (
                    <div className="text-gray-500 text-center">
                      ... and {filteredLogs.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleExport}
              disabled={isLoading || filteredLogs.length === 0}
              className="flex-1"
            >
              {isLoading ? "Loading..." : `Export ${filteredLogs.length} Records`}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
