import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Edit, Send, AlertCircle, Users, Eye, Sparkles, Radio } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/api";
import NoCampaignSelected from "@/components/NoCampaignSelected";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface EmailComposerProps {
  campaignId?: number | null;
}

export default function EmailComposer({ campaignId }: EmailComposerProps) {
  const [subject, setSubject] = useState("Important Placement Drive Information - {{Section}}");
  const [message, setMessage] = useState(`Dear {{Name}},

We are pleased to inform you about an upcoming placement drive for {{Section}} students. This is an excellent opportunity to connect with leading companies in your field.

Event Details:
- Date: January 25, 2024
- Time: 10:00 AM onwards
- Venue: Main Auditorium

Please ensure you attend with your updated resume and formal attire.

Best regards,
Placement Cell`);
  const [selectedSection, setSelectedSection] = useState("all");
  const [testEmail, setTestEmail] = useState("");
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sections } = useQuery({
    queryKey: ["/api/sections", campaignId],
    queryFn: () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      return fetch(getApiUrl(`/api/sections${params}`)).then(res => res.json());
    },
    enabled: !!campaignId,
  });

  const { data: students } = useQuery({
    queryKey: ["/api/students", selectedSection, campaignId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (campaignId) params.append('campaignId', campaignId.toString());
      if (selectedSection !== 'all') params.append('section', selectedSection);
      return fetch(getApiUrl(`/api/students?${params}`)).then(res => res.json());
    },
    enabled: !!campaignId,
  });

  // Fetch dynamic placeholders for the current campaign
  const { data: placeholdersData } = useQuery({
    queryKey: ["/api/placeholders", campaignId],
    queryFn: () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      return fetch(getApiUrl(`/api/placeholders${params}`)).then(res => res.json());
    },
    enabled: !!campaignId,
  });

  const sendTestMutation = useMutation({
    mutationFn: async (data: { testEmail: string; subject: string; message: string }) => {
      return apiRequest("POST", "/api/send-test", data);
    },
    onSuccess: () => {
      toast({
        title: "Test Email Sent",
        description: `Test email sent successfully to ${testEmail}`,
      });
      setShowTestDialog(false);
      setTestEmail("");
      // Refresh all data after sending test email
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email-config"] });
    },
    onError: (error: any) => {
      toast({
        title: "Test Email Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendBulkMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string; targetSection: string }) => {
      return apiRequest("POST", "/api/send-bulk", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bulk email sending initiated successfully!",
      });
      // Refresh all data after bulk email sending
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Send Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendTest = () => {
    if (!testEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter a test email address.",
        variant: "destructive",
      });
      return;
    }

    // Replace all placeholders with test values
    let testSubject = subject;
    let testMessage = message;
    
    // Replace standard placeholders
    testSubject = testSubject.replace(/{{Section}}/g, 'TEST_SECTION')
                            .replace(/{{Name}}/g, 'Test User')
                            .replace(/{{Email}}/g, testEmail);
    
    testMessage = testMessage.replace(/{{Name}}/g, 'Test User')
                            .replace(/{{Section}}/g, 'TEST_SECTION')
                            .replace(/{{Email}}/g, testEmail);
    
    // Replace dynamic placeholders with sample values
    if (placeholdersData?.fieldMapping) {
      Object.keys(placeholdersData.fieldMapping).forEach(key => {
        const placeholder = `{{${placeholdersData.fieldMapping[key]}}}`;
        const testValue = `TEST_${key.toUpperCase()}`;
        testSubject = testSubject.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), testValue);
        testMessage = testMessage.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), testValue);
      });
    }

    sendTestMutation.mutate({
      testEmail,
      subject: testSubject,
      message: testMessage,
    });
  };

  const handleSendBulk = () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Validation Error",
        description: "Subject and message are required.",
        variant: "destructive",
      });
      return;
    }

    sendBulkMutation.mutate({
      subject,
      message,
      targetSection: selectedSection,
    });
  };

  const getSectionCount = (section: string) => {
    if (section === "all") {
      return students?.length || 0;
    }
    return students?.filter((s: any) => s.section === section).length || 0;
  };

  // Use dynamic placeholders from API, with fallback to default ones
  const placeholders = placeholdersData?.availableFields?.map((field: string) => `{{${field}}}`) || ["{{Name}}", "{{Section}}", "{{Email}}"];

  if (!campaignId) {
    return <NoCampaignSelected action="compose" />;
  }

  return (
    <Card className="shadow-sm border">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-900">
          <div className="flex items-center">
            <Edit className="mr-2 text-primary h-5 w-5" />
            Email Composer
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Campaign Email
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Section Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Section
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedSection === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSection("all")}
              className={selectedSection === "all" ? "bg-primary text-white" : ""}
            >
              All Sections ({getSectionCount("all")})
            </Button>
            {sections?.map((section: string) => (
              <Button
                key={section}
                variant={selectedSection === section ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSection(section)}
                className={selectedSection === section ? "bg-primary text-white" : ""}
              >
                {section} ({getSectionCount(section)})
              </Button>
            ))}
          </div>
        </div>

        {/* Subject Line */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject Line
          </label>
          <Input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject..."
            className="w-full"
          />
        </div>

        {/* Message Body */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message Body
          </label>
          <Textarea
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Compose your message..."
            className="w-full"
          />
        </div>

        {/* Placeholder Helper */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800 font-medium mb-2">
            Available Placeholders:
          </p>
          <div className="flex flex-wrap gap-2">
            {placeholders.map((placeholder) => (
              <Badge
                key={placeholder}
                variant="secondary"
                className="bg-blue-100 text-blue-800 font-mono cursor-pointer"
                onClick={() => {
                  // Insert placeholder at cursor position
                  const textarea = document.querySelector('textarea');
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const newMessage = message.substring(0, start) + placeholder + message.substring(end);
                    setMessage(newMessage);
                  }
                }}
              >
                {placeholder}
              </Badge>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview Email
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Email Preview</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Subject:</h3>
                  <p className="text-sm bg-white p-2 rounded border">
                    {(() => {
                      let previewSubject = subject;
                      // Replace standard placeholders
                      previewSubject = previewSubject.replace(/{{Section}}/g, selectedSection === 'all' ? 'ALL_SECTIONS' : selectedSection)
                                                   .replace(/{{Name}}/g, 'John Doe')
                                                   .replace(/{{Email}}/g, 'john.doe@example.com');
                      
                      // Replace dynamic placeholders with sample values
                      if (placeholdersData?.fieldMapping) {
                        Object.keys(placeholdersData.fieldMapping).forEach(key => {
                          const placeholder = `{{${placeholdersData.fieldMapping[key]}}}`;
                          const sampleValue = key === 'cgpa' ? '3.8' : `SAMPLE_${key.toUpperCase()}`;
                          previewSubject = previewSubject.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), sampleValue);
                        });
                      }
                      
                      return previewSubject;
                    })()}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Message:</h3>
                  <div className="bg-white p-4 rounded border text-sm whitespace-pre-wrap">
                    {(() => {
                      let previewMessage = message;
                      // Replace standard placeholders
                      previewMessage = previewMessage.replace(/{{Name}}/g, 'John Doe')
                                                   .replace(/{{Section}}/g, selectedSection === 'all' ? 'ALL_SECTIONS' : selectedSection)
                                                   .replace(/{{Email}}/g, 'john.doe@example.com');
                      
                      // Replace dynamic placeholders with sample values
                      if (placeholdersData?.fieldMapping) {
                        Object.keys(placeholdersData.fieldMapping).forEach(key => {
                          const placeholder = `{{${placeholdersData.fieldMapping[key]}}}`;
                          const sampleValue = key === 'cgpa' ? '3.8' : `SAMPLE_${key.toUpperCase()}`;
                          previewMessage = previewMessage.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), sampleValue);
                        });
                      }
                      
                      return previewMessage;
                    })()}
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-700">
                    📧 This preview shows how the email will look with sample data.
                    Placeholders will be replaced with actual student information when sent.
                  </p>
                </div>
                <Button
                  onClick={() => setShowPreviewDialog(false)}
                  className="w-full"
                >
                  Close Preview
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200"
              >
                <Send className="mr-2 h-4 w-4" />
                Send Test Email
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Send Test Email</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="testEmail">Test Email Address</Label>
                  <Input
                    id="testEmail"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Placeholders will be replaced with test values
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSendTest}
                    disabled={sendTestMutation.isPending}
                    className="flex-1"
                  >
                    {sendTestMutation.isPending ? "Sending..." : "Send Test"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowTestDialog(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleSendBulk}
            disabled={sendBulkMutation.isPending || !students?.length}
          >
            <Radio className="mr-2 h-4 w-4" />
            {sendBulkMutation.isPending ? "Sending..." : "Send to All"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
