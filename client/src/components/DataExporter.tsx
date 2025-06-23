import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Database, Filter, Calendar, CheckCircle } from "lucide-react";

interface DataExporterProps {
  campaignId?: number | null;
}

interface ExportOptions {
  format: 'csv' | 'json';
  dataType: 'students' | 'emails' | 'logs' | 'all';
  includeMetadata: boolean;
  filterBySection: string;
  filterByStatus: string;
  dateRange: string;
}

export default function DataExporter({ campaignId }: DataExporterProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    dataType: 'students',
    includeMetadata: true,
    filterBySection: 'all',
    filterByStatus: 'all',
    dateRange: 'all'
  });
  const [isExporting, setIsExporting] = useState(false);
  
  const { toast } = useToast();

  const { data: students } = useQuery({
    queryKey: ["/api/students", campaignId],
    queryFn: () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      return fetch(`/api/students${params}`).then(res => res.json());
    },
    enabled: !!campaignId,
  });

  const { data: emailLogs } = useQuery({
    queryKey: ["/api/email-logs", campaignId],
    queryFn: () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      return fetch(`/api/email-logs${params}`).then(res => res.json());
    },
    enabled: !!campaignId,
  });

  const { data: sections } = useQuery({
    queryKey: ["/api/sections", campaignId],
    queryFn: () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      return fetch(`/api/sections${params}`).then(res => res.json());
    },
    enabled: !!campaignId,
  });

  const { data: activityLogs } = useQuery({
    queryKey: ["/api/activity-logs", campaignId],
    queryFn: () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      return fetch(`/api/activity-logs${params}`).then(res => res.json());
    },
    enabled: !!campaignId,
  });

  const formatStudentData = (students: any[], includeMetadata: boolean) => {
    return students.map(student => {
      const base = {
        name: student.name,
        email: student.email,
        section: student.section,
      };
      
      if (includeMetadata) {
        return {
          ...base,
          id: student.id,
          campaignId: student.campaignId,
          createdAt: student.createdAt,
          updatedAt: student.updatedAt
        };
      }
      
      return base;
    });
  };

  const formatEmailLogData = (logs: any[], includeMetadata: boolean) => {
    return logs.map(log => {
      const base = {
        recipientEmail: log.recipientEmail,
        subject: log.subject,
        status: log.status,
        sentAt: log.sentAt,
      };
      
      if (includeMetadata) {
        return {
          ...base,
          id: log.id,
          studentId: log.studentId,
          campaignId: log.campaignId,
          errorMessage: log.errorMessage,
          retryCount: log.retryCount
        };
      }
      
      return base;
    });
  };

  const formatActivityLogData = (logs: any[], includeMetadata: boolean) => {
    return logs.map(log => {
      const base = {
        action: log.action,
        description: log.description,
        timestamp: log.timestamp,
      };
      
      if (includeMetadata) {
        return {
          ...base,
          id: log.id,
          userId: log.userId,
          campaignId: log.campaignId,
          metadata: log.metadata
        };
      }
      
      return base;
    });
  };

  const applyFilters = (data: any[], type: string) => {
    let filtered = [...data];

    // Filter by section
    if (exportOptions.filterBySection !== 'all' && type === 'students') {
      filtered = filtered.filter(item => item.section === exportOptions.filterBySection);
    }

    // Filter by status
    if (exportOptions.filterByStatus !== 'all' && type === 'emails') {
      filtered = filtered.filter(item => item.status === exportOptions.filterByStatus);
    }

    // Filter by date range
    if (exportOptions.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (exportOptions.dateRange) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.sentAt || item.timestamp || item.createdAt);
        return itemDate >= startDate;
      });
    }

    return filtered;
  };

  const generateCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (!campaignId) {
      toast({
        title: "No Campaign Selected",
        description: "Please select a campaign to export data",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      let exportData: any[] = [];
      let filename = '';

      switch (exportOptions.dataType) {
        case 'students':
          if (!students?.length) {
            toast({
              title: "No Data",
              description: "No student data found to export",
              variant: "destructive",
            });
            setIsExporting(false);
            return;
          }
          exportData = formatStudentData(
            applyFilters(students, 'students'), 
            exportOptions.includeMetadata
          );
          filename = `students_campaign_${campaignId}`;
          break;

        case 'emails':
          if (!emailLogs?.length) {
            toast({
              title: "No Data",
              description: "No email log data found to export",
              variant: "destructive",
            });
            setIsExporting(false);
            return;
          }
          exportData = formatEmailLogData(
            applyFilters(emailLogs, 'emails'), 
            exportOptions.includeMetadata
          );
          filename = `email_logs_campaign_${campaignId}`;
          break;

        case 'logs':
          if (!activityLogs?.length) {
            toast({
              title: "No Data",
              description: "No activity log data found to export",
              variant: "destructive",
            });
            setIsExporting(false);
            return;
          }
          exportData = formatActivityLogData(
            applyFilters(activityLogs, 'logs'), 
            exportOptions.includeMetadata
          );
          filename = `activity_logs_campaign_${campaignId}`;
          break;

        case 'all':
          const allData = {
            students: students ? formatStudentData(
              applyFilters(students, 'students'), 
              exportOptions.includeMetadata
            ) : [],
            emailLogs: emailLogs ? formatEmailLogData(
              applyFilters(emailLogs, 'emails'), 
              exportOptions.includeMetadata
            ) : [],
            activityLogs: activityLogs ? formatActivityLogData(
              applyFilters(activityLogs, 'logs'), 
              exportOptions.includeMetadata
            ) : [],
            exportInfo: {
              campaignId,
              exportedAt: new Date().toISOString(),
              filters: exportOptions
            }
          };
          
          if (exportOptions.format === 'json') {
            downloadFile(
              JSON.stringify(allData, null, 2),
              `complete_export_campaign_${campaignId}.json`,
              'application/json'
            );
          } else {
            // For CSV, export each data type as separate files
            if (allData.students.length > 0) {
              downloadFile(
                generateCSV(allData.students),
                `students_campaign_${campaignId}.csv`,
                'text/csv'
              );
            }
            if (allData.emailLogs.length > 0) {
              downloadFile(
                generateCSV(allData.emailLogs),
                `email_logs_campaign_${campaignId}.csv`,
                'text/csv'
              );
            }
            if (allData.activityLogs.length > 0) {
              downloadFile(
                generateCSV(allData.activityLogs),
                `activity_logs_campaign_${campaignId}.csv`,
                'text/csv'
              );
            }
          }
          
          toast({
            title: "Export Complete",
            description: `All data exported successfully for campaign ${campaignId}`,
          });
          setIsExporting(false);
          return;
      }

      // Generate and download single file
      if (exportData.length === 0) {
        toast({
          title: "No Data",
          description: "No data matches the selected filters",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const fullFilename = `${filename}_${timestamp}.${exportOptions.format}`;

      if (exportOptions.format === 'json') {
        const jsonData = {
          data: exportData,
          metadata: {
            campaignId,
            dataType: exportOptions.dataType,
            exportedAt: new Date().toISOString(),
            recordCount: exportData.length,
            filters: exportOptions
          }
        };
        
        downloadFile(
          JSON.stringify(jsonData, null, 2),
          fullFilename,
          'application/json'
        );
      } else {
        downloadFile(
          generateCSV(exportData),
          fullFilename,
          'text/csv'
        );
      }

      toast({
        title: "Export Successful",
        description: `${exportData.length} records exported as ${exportOptions.format.toUpperCase()}`,
      });

    } catch (error) {
      toast({
        title: "Export Failed",
        description: "An error occurred during export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getRecordCount = () => {
    switch (exportOptions.dataType) {
      case 'students':
        return students?.length || 0;
      case 'emails':
        return emailLogs?.length || 0;
      case 'logs':
        return activityLogs?.length || 0;
      case 'all':
        return (students?.length || 0) + (emailLogs?.length || 0) + (activityLogs?.length || 0);
      default:
        return 0;
    }
  };

  if (!campaignId) {
    return (
      <Card className="shadow-sm border border-orange-200 bg-orange-50">
        <CardContent className="p-6 text-center">
          <Database className="mx-auto h-12 w-12 text-orange-400 mb-4" />
          <h3 className="text-lg font-medium text-orange-800 mb-2">No Campaign Selected</h3>
          <p className="text-orange-600">Please select a campaign to export data.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
          <Download className="mr-2 text-primary h-5 w-5" />
          Data Export Center
          <Badge className="ml-2 bg-blue-100 text-blue-800">
            <FileText className="mr-1 h-3 w-3" />
            Advanced Export
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Export Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Export Format
          </label>
          <div className="flex gap-2">
            <Button
              variant={exportOptions.format === 'csv' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExportOptions(prev => ({ ...prev, format: 'csv' }))}
            >
              📊 CSV
            </Button>
            <Button
              variant={exportOptions.format === 'json' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExportOptions(prev => ({ ...prev, format: 'json' }))}
            >
              🔗 JSON
            </Button>
          </div>
        </div>

        {/* Data Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data to Export
          </label>
          <Select
            value={exportOptions.dataType}
            onValueChange={(value: any) => setExportOptions(prev => ({ ...prev, dataType: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="students">
                👥 Student Records ({students?.length || 0})
              </SelectItem>
              <SelectItem value="emails">
                📧 Email Logs ({emailLogs?.length || 0})
              </SelectItem>
              <SelectItem value="logs">
                📋 Activity Logs ({activityLogs?.length || 0})
              </SelectItem>
              <SelectItem value="all">
                🗂️ Complete Export (All Data)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filters */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center mb-3">
            <Filter className="mr-2 h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Export Filters</span>
          </div>

          {/* Section Filter */}
          {exportOptions.dataType === 'students' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Filter by Section
              </label>
              <Select
                value={exportOptions.filterBySection}
                onValueChange={(value) => setExportOptions(prev => ({ ...prev, filterBySection: value }))}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections?.map((section: string) => (
                    <SelectItem key={section} value={section}>
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status Filter */}
          {exportOptions.dataType === 'emails' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Filter by Status
              </label>
              <Select
                value={exportOptions.filterByStatus}
                onValueChange={(value) => setExportOptions(prev => ({ ...prev, filterByStatus: value }))}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="sent">✅ Sent</SelectItem>
                  <SelectItem value="failed">❌ Failed</SelectItem>
                  <SelectItem value="pending">⏳ Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Range Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Date Range
            </label>
            <Select
              value={exportOptions.dateRange}
              onValueChange={(value) => setExportOptions(prev => ({ ...prev, dateRange: value }))}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Include Metadata */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="metadata"
              checked={exportOptions.includeMetadata}
              onCheckedChange={(checked) => 
                setExportOptions(prev => ({ ...prev, includeMetadata: checked as boolean }))
              }
            />
            <label htmlFor="metadata" className="text-xs text-gray-600">
              Include technical metadata (IDs, timestamps, etc.)
            </label>
          </div>
        </div>

        {/* Export Summary */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">
                Export Preview
              </p>
              <p className="text-xs text-blue-600">
                {getRecordCount()} records • {exportOptions.format.toUpperCase()} format
                {exportOptions.includeMetadata ? ' • With metadata' : ' • Without metadata'}
              </p>
            </div>
            <CheckCircle className="h-5 w-5 text-blue-600" />
          </div>
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={isExporting || getRecordCount() === 0}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          size="lg"
        >
          <Download className="mr-2 h-5 w-5" />
          {isExporting ? 'Exporting...' : 'Export Data'}
        </Button>
      </CardContent>
    </Card>
  );
}
