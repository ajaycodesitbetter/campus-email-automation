import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SquareCheck, Mail, AlertTriangle, CheckCircle, XCircle, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailValidatorProps {
  campaignId?: number | null;
}

interface Student {
  id: number;
  name: string;
  email: string;
  section: string;
}

interface ValidationResult {
  email: string;
  isValid: boolean;
  reason?: string;
  suggestions?: string[];
  studentName: string;
  studentId: number;
}

export default function EmailValidator({ campaignId }: EmailValidatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();

  const { data: students, isLoading } = useQuery({
    queryKey: ["/api/students", campaignId],
    queryFn: async () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      const response = await fetch(`/api/students${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch students');
      return response.json();
    },
    enabled: isOpen && !!campaignId,
  });

  // Advanced email validation function
  const validateEmail = (email: string, name: string): ValidationResult => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const result: ValidationResult = {
      email,
      isValid: false,
      studentName: name,
      studentId: 0
    };

    // Basic format check
    if (!emailRegex.test(email)) {
      result.reason = 'Invalid email format';
      result.suggestions = [
        'Check for missing @ symbol',
        'Ensure domain has extension (.com, .edu, etc.)',
        'Remove any spaces or special characters'
      ];
      return result;
    }

    // Check for common typos in domains
    const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'edu.in'];
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (domain) {
      // Check for common domain typos
      const commonTypos: { [key: string]: string } = {
        'gmial.com': 'gmail.com',
        'gmail.co': 'gmail.com',
        'yahooo.com': 'yahoo.com',
        'yahoo.co': 'yahoo.com',
        'hotmial.com': 'hotmail.com',
        'outlok.com': 'outlook.com',
        'outlook.co': 'outlook.com'
      };

      if (commonTypos[domain]) {
        result.reason = 'Possible domain typo';
        result.suggestions = [`Did you mean: ${email.replace(domain, commonTypos[domain])}?`];
        return result;
      }

      // Check for suspicious patterns
      if (domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) {
        result.reason = 'Invalid domain format';
        result.suggestions = ['Check domain for extra dots or incorrect placement'];
        return result;
      }

      // Check for educational domains
      if (domain.includes('edu') && !domain.endsWith('.edu') && !domain.endsWith('.edu.in')) {
        result.reason = 'Possible educational domain typo';
        result.suggestions = [
          'Educational domains usually end with .edu or .edu.in',
          `Did you mean: ${email.replace(domain, domain + '.in')}?`
        ];
        return result;
      }
    }

    // Check for suspicious local parts
    const localPart = email.split('@')[0];
    if (localPart.includes('..') || localPart.startsWith('.') || localPart.endsWith('.')) {
      result.reason = 'Invalid email format';
      result.suggestions = ['Check for extra dots in email address'];
      return result;
    }

    // Check for placeholder emails
    const placeholders = ['test', 'example', 'sample', 'dummy', 'fake'];
    if (placeholders.some(placeholder => 
      localPart.toLowerCase().includes(placeholder) || 
      domain?.toLowerCase().includes(placeholder)
    )) {
      result.reason = 'Appears to be a placeholder email';
      result.suggestions = ['Replace with actual student email address'];
      return result;
    }

    // If all checks pass
    result.isValid = true;
    return result;
  };

  const runValidation = async () => {
    if (!students || students.length === 0) {
      toast({
        title: "No Data",
        description: "No students found to validate.",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);
    setValidationResults([]);
    setCurrentIndex(0);

    const results: ValidationResult[] = [];

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      setCurrentIndex(i + 1);
      
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const result = validateEmail(student.email, student.name);
      result.studentId = student.id;
      results.push(result);
    }

    setValidationResults(results);
    setIsValidating(false);

    const validCount = results.filter(r => r.isValid).length;
    const invalidCount = results.length - validCount;

    toast({
      title: "Validation Complete",
      description: `${validCount} valid, ${invalidCount} invalid email${invalidCount !== 1 ? 's' : ''} found.`,
    });
  };

  const exportValidationReport = () => {
    if (!validationResults.length) return;

    const headers = ['Student Name', 'Email', 'Status', 'Issues', 'Suggestions'];
    const csvContent = [
      headers.join(','),
      ...validationResults.map(result => [
        `"${result.studentName}"`,
        result.email,
        result.isValid ? 'Valid' : 'Invalid',
        result.reason ? `"${result.reason}"` : 'None',
        result.suggestions ? `"${result.suggestions.join('; ')}"` : 'None'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `email-validation-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Exported",
      description: "Email validation report downloaded successfully.",
    });
  };

  const validEmails = validationResults.filter(r => r.isValid);
  const invalidEmails = validationResults.filter(r => !r.isValid);
  const progress = students ? (currentIndex / students.length) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 p-3 text-left justify-start">
          <SquareCheck className="mr-3 h-4 w-4 text-gray-600" />
          Validate Email Addresses
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SquareCheck className="h-5 w-5" />
            Email Address Validator
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">What does this check?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Email format validation</li>
              <li>• Common domain typos (gmial.com → gmail.com)</li>
              <li>• Placeholder/test email detection</li>
              <li>• Educational domain validation</li>
              <li>• Suspicious patterns identification</li>
            </ul>
          </div>

          {/* Statistics */}
          {students && !isValidating && (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">Total</div>
                <div className="text-lg font-semibold">{students.length}</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-sm text-green-600">Valid</div>
                <div className="text-lg font-semibold text-green-700">{validEmails.length}</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded">
                <div className="text-sm text-red-600">Invalid</div>
                <div className="text-lg font-semibold text-red-700">{invalidEmails.length}</div>
              </div>
            </div>
          )}

          {/* Progress */}
          {isValidating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Validating emails...</span>
                <span>{currentIndex} / {students?.length || 0}</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Results */}
          {validationResults.length > 0 && !isValidating && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Validation Results</h4>
                <Button onClick={exportValidationReport} variant="outline" size="sm">
                  Export Report
                </Button>
              </div>
              
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                {validationResults.map((result, index) => (
                  <div key={index} className="p-3 border-b last:border-b-0 flex items-start gap-3">
                    {result.isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">{result.studentName}</span>
                        <Badge variant={result.isValid ? "default" : "destructive"} className="text-xs">
                          {result.isValid ? "Valid" : "Invalid"}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">{result.email}</div>
                      {result.reason && (
                        <div className="text-xs text-red-600 mb-1">{result.reason}</div>
                      )}
                      {result.suggestions && result.suggestions.length > 0 && (
                        <div className="text-xs text-blue-600">
                          💡 {result.suggestions[0]}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!isValidating && !validationResults.length && (
              <Button 
                onClick={runValidation}
                disabled={isLoading || !students?.length}
                className="flex-1"
              >
                {isLoading ? "Loading..." : `Validate ${students?.length || 0} Emails`}
              </Button>
            )}
            {isValidating && (
              <Button variant="outline" disabled className="flex-1">
                Validating... Please wait
              </Button>
            )}
            {validationResults.length > 0 && !isValidating && (
              <Button onClick={runValidation} variant="outline" className="flex-1">
                Run Again
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
