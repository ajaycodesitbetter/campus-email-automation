import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Users, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { getApiUrl } from "@/lib/api";

interface StatsCardsProps {
  campaignId?: number | null;
}

export default function StatsCards({ campaignId }: StatsCardsProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/stats", campaignId],
    queryFn: () => {
      const params = campaignId ? `?campaignId=${campaignId}` : '';
      return fetch(getApiUrl(`/api/stats${params}`)).then(res => res.json());
    },
  });

  const cards = [
    {
      title: "Total Students",
      value: stats?.totalStudents || 0,
      icon: Users,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Emails Sent",
      value: stats?.emailsSent || 0,
      icon: CheckCircle,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Failed",
      value: stats?.emailsFailed || 0,
      icon: AlertTriangle,
      bgColor: "bg-red-100",
      iconColor: "text-red-600",
    },
    {
      title: "Pending",
      value: stats?.emailsPending || 0,
      icon: Clock,
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="flex items-center">
              <div className="p-3 bg-gray-200 rounded-lg w-12 h-12"></div>
              <div className="ml-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-6 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="p-6 shadow-sm border">
            <div className="flex items-center">
              <div className={`p-3 ${card.bgColor} rounded-lg`}>
                <Icon className={`${card.iconColor} h-6 w-6`} />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">{card.title}</p>
                <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
