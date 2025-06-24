import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, User, Mail } from "lucide-react";

interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  message: string;
  campaignId?: number | null;
}

interface Student {
  id: number;
  name: string;
  email: string;
  section: string;
}

export default function EmailPreviewDialog({
  open,
  onOpenChange,
  subject,
  message,
  campaignId
}: EmailPreviewDialogProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("sample");

  const { data: students } = useQuery({
    queryKey: ["/api/students", campaignId],
    queryFn: async () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      const response = await fetch(`/api/students${params}`);
      return response.json();
    },
    enabled: !!campaignId && open,
  });

  // Create a sample student for demo purposes
  const sampleStudent = {
    id: 0,
    name: "Sample Student",
    email: "sample@example.com",
    section: "SAMPLE_SECTION"
  };

  const getSelectedStudent = (): Student => {
    if (selectedStudentId === "sample") {
      return sampleStudent;
    }
    return students?.find((s: Student) => s.id.toString() === selectedStudentId) || sampleStudent;
  };

  const personalizeText = (text: string, student: Student): string => {
    return text
      .replace(/\{\{Name\}\}/g, student.name)
      .replace(/\{\{Section\}\}/g, student.section)
      .replace(/\{\{Email\}\}/g, student.email);
  };

  const selectedStudent = getSelectedStudent();
  const personalizedSubject = personalizeText(subject, selectedStudent);
  const personalizedMessage = personalizeText(message, selectedStudent);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Email Preview
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Student Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Preview with student data:</label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a student..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sample">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Sample Student (Demo)
                  </div>
                </SelectItem>
                {students?.slice(0, 10).map((student: Student) => (
                  <SelectItem key={student.id} value={student.id.toString()}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {student.name} ({student.section})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Student Info */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {selectedStudent.name}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {selectedStudent.email}
            </Badge>
            <Badge variant="outline">
              {selectedStudent.section}
            </Badge>
          </div>

          {/* Email Preview */}
          <div className="border rounded-lg overflow-hidden">
            {/* Email Header */}
            <div className="bg-gray-50 p-4 border-b">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-600">From:</p>
                    <p className="font-medium">SRCEM Mail Administrator &lt;worktestingajay@gmail.com&gt;</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">To:</p>
                  <p className="font-medium">{selectedStudent.name} &lt;{selectedStudent.email}&gt;</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Subject:</p>
                  <p className="font-medium text-lg">{personalizedSubject}</p>
                </div>
              </div>
            </div>

            {/* Email Body */}
            <div className="p-6 bg-white">
              <div className="prose max-w-none">
                {personalizedMessage.split('\n').map((line, index) => (
                  <p key={index} className="mb-2 last:mb-0">
                    {line || '\u00A0'} {/* Non-breaking space for empty lines */}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Placeholder Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Placeholder Replacements:</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="font-mono text-blue-700">{"{{Name}}"}</span>
                <span className="text-blue-600">→ {selectedStudent.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-blue-700">{"{{Section}}"}</span>
                <span className="text-blue-600">→ {selectedStudent.section}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono text-blue-700">{"{{Email}}"}</span>
                <span className="text-blue-600">→ {selectedStudent.email}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Close Preview
            </Button>
            <Button 
              onClick={() => {
                // Copy to clipboard functionality
                const emailContent = `Subject: ${personalizedSubject}\n\n${personalizedMessage}`;
                navigator.clipboard.writeText(emailContent);
              }}
              variant="outline"
              className="flex-1"
            >
              Copy Preview
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
