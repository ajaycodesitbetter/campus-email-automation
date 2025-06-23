import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle, Mail, Sparkles, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface EmailValidatorProps {
  campaignId?: number | null;
}

interface ValidationResult {
  email: string;
  isValid: boolean;
  suggestion?: string;
  issues: string[];
  score: number;
}

const commonDomains = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com',
  'icloud.com', 'protonmail.com', 'aol.com', 'mail.com', 'zoho.com'
];

const getLevenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + substitutionCost
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

const suggestDomain = (domain: string): string | null => {
  let bestSuggestion = null;
  let minDistance = Infinity;
  
  for (const commonDomain of commonDomains) {
    const distance = getLevenshteinDistance(domain.toLowerCase(), commonDomain);
    if (distance < minDistance && distance <= 2) {
      minDistance = distance;
      bestSuggestion = commonDomain;
    }
  }
  
  return bestSuggestion;
};

const validateEmail = (email: string): ValidationResult => {
  const issues: string[] = [];
  let score = 100;
  
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    issues.push("Invalid email format");
    score -= 50;
  }
  
  const [localPart, domain] = email.split('@');
  
  // Check for common issues
  if (localPart?.length === 0) {
    issues.push("Missing local part");
    score -= 30;
  }
  
  if (domain?.length === 0) {
    issues.push("Missing domain");
    score -= 30;
  }
  
  if (email.includes('..')) {
    issues.push("Consecutive dots detected");
    score -= 20;
  }
  
  if (email.startsWith('.') || email.endsWith('.')) {
    issues.push("Email cannot start or end with a dot");
    score -= 20;
  }
  
  if (email.includes(' ')) {
    issues.push("Spaces are not allowed");
    score -= 25;
  }
  
  if (localPart && localPart.length > 64) {
    issues.push("Local part too long (max 64 characters)");
    score -= 15;
  }
  
  if (domain && domain.length > 253) {
    issues.push("Domain too long (max 253 characters)");
    score -= 15;
  }
  
  // Check for typos in domain
  let suggestion: string | undefined = undefined;
  if (domain) {
    const suggestedDomain = suggestDomain(domain);
    if (suggestedDomain && suggestedDomain !== domain) {
      suggestion = `${localPart}@${suggestedDomain}`;
      issues.push(`Possible typo in domain. Did you mean ${suggestedDomain}?`);
      score -= 10;
    }
  }
  
  return {
    email,
    isValid: score >= 70 && issues.length === 0,
    suggestion,
    issues,
    score: Math.max(0, score)
  };
};

export default function EmailValidator({ campaignId }: EmailValidatorProps) {
  const [singleEmail, setSingleEmail] = useState("");
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: students } = useQuery({
    queryKey: ["/api/students", campaignId],
    queryFn: () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      return fetch(`/api/students${params}`).then(res => res.json());
    },
    enabled: !!campaignId,
  });

  const validateBulkMutation = useMutation({
    mutationFn: async () => {
      if (!students?.length) return [];
      
      const results = students.map((student: any) => 
        validateEmail(student.email)
      );
      
      return results;
    },
    onSuccess: (results) => {
      setValidationResults(results);
      setShowResults(true);
      
      const invalidCount = results.filter((r: ValidationResult) => !r.isValid).length;
      const typoCount = results.filter((r: ValidationResult) => r.suggestion).length;
      
      toast({
        title: "Validation Complete",
        description: `Found ${invalidCount} invalid emails and ${typoCount} potential typos`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Validation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleValidateSingle = () => {
    if (!singleEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to validate",
        variant: "destructive",
      });
      return;
    }
    
    const result = validateEmail(singleEmail.trim());
    setValidationResults([result]);
    setShowResults(true);
    
    if (result.isValid) {
      toast({
        title: "Valid Email",
        description: "This email address is valid!",
      });
    } else {
      toast({
        title: "Invalid Email",
        description: `Found ${result.issues.length} issue(s)`,
        variant: "destructive",
      });
    }
  };

  const handleValidateBulk = () => {
    if (!students?.length) {
      toast({
        title: "No Data",
        description: "No student emails found to validate",
        variant: "destructive",
      });
      return;
    }
    
    validateBulkMutation.mutate();
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const clearResults = () => {
    setValidationResults([]);
    setShowResults(false);
    setSingleEmail("");
  };

  if (!campaignId) {
    return (
      <Card className="shadow-sm border border-orange-200 bg-orange-50">
        <CardContent className="p-6 text-center">
          <Mail className="mx-auto h-12 w-12 text-orange-400 mb-4" />
          <h3 className="text-lg font-medium text-orange-800 mb-2">No Campaign Selected</h3>
          <p className="text-orange-600">Please select a campaign to validate email addresses.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
            <ShieldCheck className="mr-2 text-primary h-5 w-5" />
            Email Address Validator
            <Badge className="ml-2 bg-purple-100 text-purple-800">
              <Sparkles className="mr-1 h-3 w-3" />
              AI-Powered
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Single Email Validation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Validate Single Email
            </label>
            <div className="flex gap-3">
              <Input
                type="email"
                value={singleEmail}
                onChange={(e) => setSingleEmail(e.target.value)}
                placeholder="Enter email address to validate..."
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleValidateSingle()}
              />
              <Button
                onClick={handleValidateSingle}
                disabled={!singleEmail.trim()}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Validate
              </Button>
            </div>
          </div>

          {/* Bulk Validation */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Bulk Email Validation</h3>
                <p className="text-xs text-gray-500">
                  Validate all {students?.length || 0} student emails in this campaign
                </p>
              </div>
              <div className="flex gap-2">
                {showResults && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearResults}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                )}
                <Button
                  onClick={handleValidateBulk}
                  disabled={validateBulkMutation.isPending || !students?.length}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {validateBulkMutation.isPending ? "Validating..." : "Validate All Emails"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {showResults && validationResults.length > 0 && (
        <Card className="shadow-sm border">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-900">
              <span>Validation Results</span>
              <div className="flex gap-2">
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  {validationResults.filter(r => r.isValid).length} Valid
                </Badge>
                <Badge className="bg-red-100 text-red-800">
                  <XCircle className="mr-1 h-3 w-3" />
                  {validationResults.filter(r => !r.isValid).length} Invalid
                </Badge>
                <Badge className="bg-yellow-100 text-yellow-800">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {validationResults.filter(r => r.suggestion).length} Suggestions
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {validationResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.isValid 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      {result.isValid ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mr-2" />
                      )}
                      <span className="font-mono text-sm">{result.email}</span>
                    </div>
                    <Badge className={getScoreBadge(result.score)}>
                      Score: {result.score}%
                    </Badge>
                  </div>
                  
                  {result.suggestion && (
                    <div className="mb-2 p-2 bg-yellow-100 rounded border border-yellow-200">
                      <div className="flex items-center text-yellow-800">
                        <Sparkles className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">Suggestion:</span>
                        <span className="ml-2 font-mono text-sm">{result.suggestion}</span>
                      </div>
                    </div>
                  )}
                  
                  {result.issues.length > 0 && (
                    <div className="space-y-1">
                      {result.issues.map((issue, issueIndex) => (
                        <div key={issueIndex} className="flex items-center text-sm text-gray-600">
                          <AlertTriangle className="h-3 w-3 mr-2 text-yellow-500" />
                          {issue}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
