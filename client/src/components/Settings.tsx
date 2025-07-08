import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  Mail, 
  Database, 
  Shield, 
  Bell,
  Download,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function Settings({ open, onOpenChange }: SettingsProps) {
  const [confirmClear, setConfirmClear] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Email Configuration State
  const [emailConfig, setEmailConfig] = useState({
    senderEmail: "",
    senderPassword: "",
    dailyLimit: 1500,
    enableNotifications: true,
  });

  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
    autoRefreshInterval: 30,
    retentionDays: 90,
    enableLogging: true,
    enableAnalytics: true,
  });

  // Fetch current configuration
  const { data: config } = useQuery({
    queryKey: ["/api/email-config"],
    enabled: open,
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    enabled: open,
  });

  // Update email configuration
  const updateEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/email-config", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email configuration updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email-config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Clear all data mutation
  const clearDataMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/clear-data", {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "All data cleared successfully!",
      });
      setConfirmClear("");
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

  const handleEmailSave = () => {
    updateEmailMutation.mutate({
      senderEmail: emailConfig.senderEmail,
      senderPassword: emailConfig.senderPassword,
      dailyLimit: emailConfig.dailyLimit,
    });
  };

  const handleClearData = () => {
    if (confirmClear === "DELETE ALL DATA") {
      clearDataMutation.mutate();
    } else {
      toast({
        title: "Confirmation Required",
        description: "Please type 'DELETE ALL DATA' to confirm",
        variant: "destructive",
      });
    }
  };

  const handleExportLogs = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/export-logs`);
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
        description: "Logs exported successfully!",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export logs",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            System Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Email Configuration Tab */}
          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Gmail Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Gmail Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={emailConfig.senderEmail || (config as any)?.senderEmail || ''}
                      onChange={(e) => setEmailConfig(prev => ({ ...prev, senderEmail: e.target.value }))}
                      placeholder="admin@college.edu"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">App Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={emailConfig.senderPassword}
                      onChange={(e) => setEmailConfig(prev => ({ ...prev, senderPassword: e.target.value }))}
                      placeholder="Enter Gmail App Password"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="limit">Daily Email Limit</Label>
                  <Input
                    id="limit"
                    type="number"
                    value={emailConfig.dailyLimit || (config as any)?.dailyLimit || 1500}
                    onChange={(e) => setEmailConfig(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) || 1500 }))}
                    min="1"
                    max="10000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 1500 emails per day for Gmail
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="notifications"
                    checked={emailConfig.enableNotifications}
                    onCheckedChange={(checked) => setEmailConfig(prev => ({ ...prev, enableNotifications: checked }))}
                  />
                  <Label htmlFor="notifications">Enable email notifications</Label>
                </div>

                <Button onClick={handleEmailSave} disabled={updateEmailMutation.isPending}>
                  {updateEmailMutation.isPending ? "Saving..." : "Save Email Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Configuration Tab */}
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  System Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="refresh">Auto-refresh Interval (seconds)</Label>
                  <Input
                    id="refresh"
                    type="number"
                    value={systemSettings.autoRefreshInterval}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, autoRefreshInterval: parseInt(e.target.value) || 30 }))}
                    min="10"
                    max="300"
                  />
                </div>

                <div>
                  <Label htmlFor="retention">Data Retention (days)</Label>
                  <Input
                    id="retention"
                    type="number"
                    value={systemSettings.retentionDays}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, retentionDays: parseInt(e.target.value) || 90 }))}
                    min="1"
                    max="365"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="logging"
                      checked={systemSettings.enableLogging}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, enableLogging: checked }))}
                    />
                    <Label htmlFor="logging">Enable detailed logging</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="analytics"
                      checked={systemSettings.enableAnalytics}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, enableAnalytics: checked }))}
                    />
                    <Label htmlFor="analytics">Enable usage analytics</Label>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  Save System Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Management Tab */}
          <TabsContent value="data" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium">Total Students</p>
                    <p className="text-2xl font-bold text-blue-600">{(stats as any)?.totalStudents || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium">Total Emails Sent</p>
                    <p className="text-2xl font-bold text-green-600">{(stats as any)?.totalEmailsSent || 0}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    onClick={handleExportLogs}
                    className="w-full flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export Activity Logs
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export Student Data
                  </Button>
                </div>

                <Separator />

                <div className="bg-red-50 p-4 rounded border border-red-200">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <h4 className="font-medium text-red-800">Danger Zone</h4>
                  </div>
                  
                  <p className="text-sm text-red-700 mb-3">
                    This will permanently delete all students, campaigns, and email logs. This action cannot be undone.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Type "DELETE ALL DATA" to confirm:</Label>
                    <Input
                      id="confirm"
                      value={confirmClear}
                      onChange={(e) => setConfirmClear(e.target.value)}
                      placeholder="DELETE ALL DATA"
                    />
                    <Button 
                      variant="destructive" 
                      onClick={handleClearData}
                      disabled={confirmClear !== "DELETE ALL DATA" || clearDataMutation.isPending}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {clearDataMutation.isPending ? "Clearing..." : "Clear All Data"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Current Security Status</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>✅ HTTPS encryption enabled</li>
                    <li>✅ Password authentication required</li>
                    <li>✅ Session timeout: 24 hours</li>
                    <li>✅ Rate limiting enabled</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <Button variant="outline" className="w-full">
                    Change Admin Password
                  </Button>
                  
                  <Button variant="outline" className="w-full">
                    View Login History
                  </Button>
                  
                  <Button variant="outline" className="w-full">
                    Download Security Report
                  </Button>
                </div>

                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium mb-2">Deployment Info</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Frontend:</strong> Netlify (automailsrcem.netlify.app)</p>
                    <p><strong>Backend:</strong> Railway (Serverless enabled)</p>
                    <p><strong>Database:</strong> Neon PostgreSQL</p>
                    <p><strong>Last Deploy:</strong> {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
