import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Settings, LogOut, User } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../hooks/useAuth";
import CampaignSidebar from "../components/CampaignSidebar";
import CampaignMetrics from "../components/CampaignMetrics";
import StatsCards from "../components/StatsCards";
import FileUpload from "../components/FileUpload";
import EmailComposer from "../components/EmailComposer";
import GmailConfig from "../components/GmailConfig";
import StudentTable from "../components/StudentTable";
import RecentActivity from "../components/RecentActivity";

export default function Dashboard() {
  const [showConfig, setShowConfig] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const { user, logout, isLoggingOut } = useAuth();
  
  interface EmailConfig {
    senderEmail: string;
    dailyLimit: number;
    usedToday: number;
    configured: boolean;
  }
  
  interface Campaign {
    id: number;
    name: string;
    description: string;
    emoji: string;
    createdAt: string;
  }
  
  const { data: config } = useQuery<EmailConfig>({
    queryKey: ["/api/email-config"],
  });
  
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });
  
  const selectedCampaignData = campaigns.find(c => c.id === selectedCampaign);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Campaign Sidebar */}
      <CampaignSidebar 
        selectedCampaign={selectedCampaign} 
        onSelectCampaign={setSelectedCampaign} 
      />

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <GraduationCap className="text-primary text-2xl mr-3 h-8 w-8" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    {selectedCampaign ? selectedCampaignData?.name || 'Campaign' : 'Campus Email Automation'}
                  </h1>
                  {selectedCampaign && (
                    <p className="text-sm text-gray-500">Campaign Dashboard</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm text-gray-600">
                  <User className="mr-2 h-4 w-4" />
                  <span>{user?.fullName || user?.username}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="mr-2">📧</span>
                  <span>{config?.senderEmail || 'Not configured'}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfig(!showConfig)}
                  className="bg-gray-100 hover:bg-gray-200 p-2"
                >
                  <Settings className="text-gray-600 h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="bg-red-50 hover:bg-red-100 text-red-600 p-2"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Container */}
        <div className="px-6 lg:px-8 py-6">
          {/* Dashboard Stats */}
          <StatsCards campaignId={selectedCampaign} />

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* Left Panel - Upload & Compose */}
            <div className="lg:col-span-2 space-y-6">
              <FileUpload campaignId={selectedCampaign} />
              <EmailComposer campaignId={selectedCampaign} />
            </div>

            {/* Right Panel - Config & Activity */}
            <div className="space-y-6">
              {selectedCampaign && <CampaignMetrics campaignId={selectedCampaign} />}
              <GmailConfig expanded={showConfig} />
              <RecentActivity />
            </div>
          </div>

          {/* Data Table Section */}
          <StudentTable campaignId={selectedCampaign} />
        </div>
      </div>
    </div>
  );
}
