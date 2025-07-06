import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Table2, Search, RotateCcw, Eye, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/api";

interface StudentTableProps {
  campaignId?: number | null;
}

export default function StudentTable({ campaignId }: StudentTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSection, setSelectedSection] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const itemsPerPage = 25;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: students, isLoading } = useQuery({
    queryKey: ["/api/students", selectedSection, campaignId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (campaignId) params.append('campaignId', campaignId.toString());
      if (selectedSection !== 'all') params.append('section', selectedSection);
      return fetch(getApiUrl(`/api/students?${params}`)).then(res => res.json());
    },
    enabled: !!campaignId,
  });

  const { data: sections } = useQuery({
    queryKey: ["/api/sections", campaignId],
    queryFn: () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      return fetch(getApiUrl(`/api/sections${params}`)).then(res => res.json());
    },
    enabled: !!campaignId,
  });

  const { data: emailLogs } = useQuery({
    queryKey: ["/api/email-logs", campaignId],
    queryFn: () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      return fetch(getApiUrl(`/api/email-logs${params}`)).then(res => res.json());
    },
    enabled: !!campaignId,
  });

  const resendMutation = useMutation({
    mutationFn: async (studentId: number) => {
      return apiRequest("POST", "/api/send-individual", {
        studentId,
        subject: "Resent Email - {{Section}}",
        message: "This is a resent email for {{Name}} from {{Section}} section.",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email resent successfully!",
      });
      // Refresh all data after resending email
      queryClient.invalidateQueries({ queryKey: ["/api/email-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Resend Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter and paginate students
  const filteredStudents = students?.filter((student: any) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get email status for a student
  const getEmailStatus = (studentId: number) => {
    const studentLogs = emailLogs?.filter((log: any) => log.studentId === studentId) || [];
    if (studentLogs.length === 0) return { status: 'pending', lastSent: null };
    
    const latestLog = studentLogs.sort((a: any, b: any) => 
      new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    )[0];
    
    return {
      status: latestLog.status,
      lastSent: latestLog.sentAt,
      errorMessage: latestLog.errorMessage,
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="mr-1 h-3 w-3" />
            Sent
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const getSectionBadge = (section: string) => {
    const colors: Record<string, string> = {
      'CSE': 'bg-blue-100 text-blue-800',
      'ECE': 'bg-purple-100 text-purple-800',
      'MBA': 'bg-green-100 text-green-800',
      'CIVIL': 'bg-orange-100 text-orange-800',
    };
    
    return (
      <Badge className={`${colors[section] || 'bg-gray-100 text-gray-800'} hover:${colors[section] || 'bg-gray-100'}`}>
        {section}
      </Badge>
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(new Set(paginatedStudents.map((s: any) => s.id)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  const handleSelectStudent = (studentId: number, checked: boolean) => {
    const newSelected = new Set(selectedStudents);
    if (checked) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudents(newSelected);
  };

  if (!campaignId) {
    return (
      <Card className="mt-8 shadow-sm border border-orange-200 bg-orange-50">
        <CardContent className="p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-orange-400 mb-4" />
          <h3 className="text-lg font-medium text-orange-800 mb-2">No Campaign Selected</h3>
          <p className="text-orange-600">Please select a campaign to view student records and email status.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="mt-8 shadow-sm border">
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-64"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8 shadow-sm border">
      <CardHeader className="border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center text-lg font-semibold text-gray-900 mb-4 sm:mb-0">
            <Table2 className="mr-2 text-primary h-5 w-5" />
            Student Records & Email Status
          </CardTitle>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-40">
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
        </div>
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <Checkbox
                  checked={selectedStudents.size === paginatedStudents.length && paginatedStudents.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Section
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Sent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedStudents.map((student: any) => {
              const emailStatus = getEmailStatus(student.id);
              const initials = student.name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
              
              return (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Checkbox
                      checked={selectedStudents.has(student.id)}
                      onCheckedChange={(checked) => handleSelectStudent(student.id, checked as boolean)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {initials}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getSectionBadge(student.section)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(emailStatus.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {emailStatus.lastSent 
                      ? new Date(emailStatus.lastSent).toLocaleString()
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resendMutation.mutate(student.id)}
                      disabled={resendMutation.isPending}
                      className="text-primary hover:text-blue-700 mr-3"
                    >
                      <RotateCcw className="mr-1 h-4 w-4" />
                      {emailStatus.status === 'failed' ? 'Retry' : 'Resend'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-700">
            Showing{' '}
            <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredStudents.length)}</span>{' '}
            to{' '}
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span>{' '}
            of{' '}
            <span className="font-medium">{filteredStudents.length}</span>{' '}
            results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={currentPage === page ? "bg-primary text-white" : ""}
                >
                  {page}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
