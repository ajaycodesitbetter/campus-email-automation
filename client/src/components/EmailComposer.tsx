import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Edit, Eye, Send, Radio, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: sections } = useQuery({
    queryKey: ["/api/sections", campaignId],
    queryFn: () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      return fetch(`/api/sections${params}`).then(res => res.json());
    },
    enabled: !!campaignId,
  });

  const { data: students } = useQuery({
    queryKey: ["/api/students", selectedSection, campaignId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (campaignId) params.append('campaignId', campaignId.toString());
      if (selectedSection !== 'all') params.append('section', selectedSection);
      return fetch(`/api/students?${params}`).then(res => res.json());
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
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
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

    const testSubject = subject.replace('{{Section}}', 'TEST_SECTION')
                             .replace('{{Name}}', 'Test User')
                             .replace('{{Email}}', testEmail);
    
    const testMessage = message.replace(/{{Name}}/g, 'Test User')
                              .replace(/{{Section}}/g, 'TEST_SECTION')
                              .replace(/{{Email}}/g, testEmail);

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

  const placeholders = ["{{Name}}", "{{Section}}", "{{Email}}"];

  if (!campaignId) {
    return (
      <Card className="shadow-sm border border-orange-200 bg-orange-50">
        <CardContent className="p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-orange-400 mb-4" />
          <h3 className="text-lg font-medium text-orange-800 mb-2">No Campaign Selected</h3>
          <p className="text-orange-600">Please select or create a campaign from the sidebar to compose emails.</p>
        </CardContent>
      </Card>
    );
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
          <Button
            variant="outline"
            className="flex-1"
onClick={() => {
              if (!subject.trim() || !message.trim()) {
                toast({
                  title: "Validation Error",
                  description: "Subject and message are required.",
                  variant: "destructive",
                });
                return;
              }

              const previewContent = message.replace(/{{Name}}/g, 'John Doe')
                                           .replace(/{{Section}}/g, 'A2')
                                           .replace(/\n/g, '<br>');

              const previewWindow = window.open('', '_blank');
              if (previewWindow) {
                previewWindow.document.write(`
                  <html>
                    <head>
                      <title>Email Preview</title>
                      <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .subject { font-weight: bold; margin-bottom: 10px; }
                        .message { white-space: pre-wrap; }
                      </style>
                    </head>
                    <body>
                      <div class="subject">${subject}</div>
                      <div class="message">${previewContent}</div>
                    </body>
                  </html>
                `);
                previewWindow.document.close();
              } else {
                toast({
                  title: "Preview Failed",
                  description: "Unable to open preview window. Please check your browser settings.",
                  variant: "destructive",
                });
              }
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview Email
          </Button>
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
