import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Users, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface StatsCardsProps {
  campaignId?: number | null;
}

// Animated counter component
function AnimatedCounter({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      setCount(Math.floor(progress * value));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{count}</span>;
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
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              duration: 0.5, 
              delay: index * 0.1,
              type: "spring",
              stiffness: 100
            }}
            whileHover={{ 
              scale: 1.05, 
              y: -5,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className="p-6 shadow-sm border hover:shadow-lg transition-all duration-300 cursor-pointer bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-white">
              <div className="flex items-center">
                <motion.div 
                  className={`p-3 ${card.bgColor} rounded-lg`}
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Icon className={`${card.iconColor} h-6 w-6`} />
                </motion.div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600 font-medium">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    <AnimatedCounter value={card.value} duration={1500 + index * 200} />
                  </p>
                </div>
              </div>
              
              {/* Animated progress bar for visual appeal */}
              <motion.div
                className="mt-4 h-1 bg-gray-200 rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <motion.div
                  className={`h-full ${card.bgColor.replace('100', '500')} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((card.value / Math.max(...cards.map(c => c.value))) * 100, 100)}%` }}
                  transition={{ 
                    duration: 1.5, 
                    delay: 1 + index * 0.1,
                    ease: "easeOut"
                  }}
                />
              </motion.div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
