import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Users, Mail, Target } from "lucide-react";
import { getApiUrl } from "@/lib/api";

interface CampaignMetricsProps {
  campaignId: number;
}

export default function CampaignMetrics({ campaignId }: CampaignMetricsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/campaign-stats", campaignId],
    queryFn: () => fetch(getApiUrl(`/api/campaigns/${campaignId}/stats`), { credentials: "include", signal: AbortSignal.timeout(15000) }).then(res => res.json()),
  });

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

  const successRate = stats?.totalStudents > 0 
    ? Math.round((stats.emailsSent / stats.totalStudents) * 100) 
    : 0;

  return (
    <Card className="shadow-sm border">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
          <BarChart3 className="mr-2 text-primary h-5 w-5" />
          Campaign report
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-5 w-5 text-blue-500 mr-1" />
              <span className="text-2xl font-bold text-gray-900">{stats?.totalStudents || 0}</span>
            </div>
            <p className="text-sm text-gray-600">Total Students</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Mail className="h-5 w-5 text-green-500 mr-1" />
              <span className="text-2xl font-bold text-gray-900">{stats?.emailsSent || 0}</span>
            </div>
            <p className="text-sm text-gray-600">Emails Sent</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Sent / contacts</span>
            <span className="text-sm text-gray-600">{successRate}%</span>
          </div>
          <Progress value={successRate} className="h-2" />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Sent</span>
            <Badge className="bg-green-100 text-green-800">
              {stats?.emailsSent || 0}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Failed</span>
            <Badge className="bg-red-100 text-red-800">
              {stats?.emailsFailed || 0}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Queued</span>
            <Badge className="bg-yellow-100 text-yellow-800">
              {stats?.emailsQueued || 0}
            </Badge>
          </div>
        </div>

        {stats?.sections && stats.sections.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Target className="h-4 w-4 mr-1" />
              Sections
            </h4>
            <div className="flex flex-wrap gap-2">
              {stats.sections.map((section: string) => (
                <Badge key={section} variant="outline" className="text-xs">
                  {section}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}