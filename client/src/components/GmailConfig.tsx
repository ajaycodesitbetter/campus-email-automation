import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Mail, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface GmailConfigProps {
  expanded?: boolean;
}

export default function GmailConfig({ expanded = false }: GmailConfigProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [senderEmail, setSenderEmail] = useState("");
  const [senderPassword, setSenderPassword] = useState("");
  const [dailyLimit, setDailyLimit] = useState(1500);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery({
    queryKey: ["/api/email-config"],
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (data: { senderEmail: string; senderPassword?: string; dailyLimit: number }) => {
      return apiRequest("POST", "/api/email-config", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Gmail configuration updated successfully!",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/email-config"] });
    },
    onError: (error: any) => {
      console.error('Gmail configuration error:', error);
      let errorMessage = "Failed to update Gmail configuration";
      
      if (error?.message) {
        if (error.message.includes('Invalid email configuration')) {
          errorMessage = "Invalid Gmail credentials. Please check your email and app password.";
        } else if (error.message.includes('Missing credentials')) {
          errorMessage = "Please provide both email address and app password.";
        } else if (error.message.includes('535')) {
          errorMessage = "Gmail authentication failed. Please verify your app password.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Configuration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    // Only require password if email is being changed or if no config exists
    const isNewConfig = !config || !(config as any)?.configured;
    const isEmailChanged = senderEmail !== (config as any)?.senderEmail;
    
    if (!senderEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Email address is required.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if ((isNewConfig || isEmailChanged) && !senderPassword.trim()) {
      toast({
        title: "Validation Error",
        description: "Password is required when setting up or changing email.",
        variant: "destructive",
      });
      return;
    }

    const updateData: any = {
      senderEmail,
      dailyLimit,
    };

    // Only include password if it's provided
    if (senderPassword.trim()) {
      updateData.senderPassword = senderPassword;
    }

    updateConfigMutation.mutate(updateData);
  };

  const handleEdit = () => {
    if (config) {
      setSenderEmail((config as any)?.senderEmail || '');
      setDailyLimit((config as any)?.dailyLimit || 1500);
      setSenderPassword(''); // Don't prefill password for security
    }
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border">
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const usagePercentage = config ? Math.round((((config as any)?.usedToday || 0) / ((config as any)?.dailyLimit || 1500)) * 100) : 0;

  return (
    <Card className="shadow-sm border">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
          <Mail className="mr-2 text-primary h-5 w-5" />
          Gmail Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Gmail Address</Label>
              <Input
                id="email"
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="admin@college.edu"
              />
            </div>
            <div>
              <Label htmlFor="password">App Password</Label>
              <Input
                id="password"
                type="password"
                value={senderPassword}
                onChange={(e) => setSenderPassword(e.target.value)}
                placeholder={config && (config as any)?.configured ? "Leave blank to keep existing password" : "Enter Gmail App Password"}
              />
              <p className="text-xs text-gray-500 mt-1">
                {config && (config as any)?.configured 
                  ? "Leave blank to keep existing password" 
                  : "Use Gmail App Password, not your regular password"}
              </p>
            </div>
            <div>
              <Label htmlFor="limit">Daily Limit</Label>
              <Input
                id="limit"
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(parseInt(e.target.value) || 1500)}
                min="1"
                max="10000"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={updateConfigMutation.isPending}
                className="flex-1"
              >
                {updateConfigMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium text-gray-900">
                  {(config as any)?.senderEmail || 'Not configured'}
                </p>
                <p className="text-sm text-gray-500">
                  {(config as any)?.configured ? 'Connected via App Password' : 'Not connected'}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${(config as any)?.configured ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>

            {(config as any)?.configured && (
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Daily Limit</span>
                  <span className="text-sm font-medium">{(config as any)?.dailyLimit}/day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Used Today</span>
                  <span className="text-sm font-medium">{(config as any)?.usedToday || 0}</span>
                </div>
                <Progress value={usagePercentage} className="h-2" />
              </div>
            )}

            <Button
              onClick={handleEdit}
              variant="outline"
              className="w-full"
            >
              <Settings className="mr-2 h-4 w-4" />
              {(config as any)?.configured ? 'Update Settings' : 'Configure Gmail'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
