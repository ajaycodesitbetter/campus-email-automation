import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, LogOut, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// NOTE: Removed useAutoRefresh hook to isolate white screen issue
// Import components but wrap them in error boundaries
import CampaignSidebar from "@/components/CampaignSidebar";
import CampaignMetrics from "@/components/CampaignMetrics";
import StatsCards from "@/components/StatsCards";
import FileUpload from "@/components/FileUpload";
import EmailComposer from "@/components/EmailComposer";
import GmailConfig from "@/components/GmailConfig";
import Settings from "@/components/Settings";
import StudentTable from "@/components/StudentTable";
import RecentActivity from "@/components/RecentActivity";
import ThemeToggle from "@/components/ThemeToggle";

export default function SafeDashboard() {
  const [showSettings, setShowSettings] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { logout, isLoggingOut } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: config } = useQuery({
    queryKey: ["/api/email-config"],
  });

  const { data: selectedCampaignData } = useQuery({
    queryKey: ["/api/campaigns", selectedCampaign],
    enabled: !!selectedCampaign,
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      toast({
        title: "Data Refreshed",
        description: "All data has been refreshed successfully!",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex transition-colors duration-300">
      {/* Campaign Sidebar with Error Boundary */}
      <ErrorBoundary componentName="CampaignSidebar">
        <CampaignSidebar 
          selectedCampaign={selectedCampaign} 
          onSelectCampaign={setSelectedCampaign} 
        />
      </ErrorBoundary>

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <div className="px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <GraduationCap className="text-primary text-2xl mr-3 h-8 w-8" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                    {selectedCampaign ? (selectedCampaignData as any)?.name || 'Campaign' : 'Campus Email Automation'}
                  </h1>
                  {selectedCampaign && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">Campaign Dashboard</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="mr-2">📧</span>
                  <span>{(config as any)?.senderEmail || 'admin@college.edu'}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="bg-blue-100 hover:bg-blue-200 p-2 text-blue-600"
                  title="Refresh All Data"
                >
                  <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
                <ErrorBoundary componentName="ThemeToggle">
                  <ThemeToggle />
                </ErrorBoundary>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="bg-gray-100 hover:bg-gray-200 p-2 text-gray-600 font-bold"
                  title="Settings"
                >
                  ⚙️
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  disabled={isLoggingOut}
                  className="bg-red-100 hover:bg-red-200 p-2 text-red-600"
                  title="Logout"
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
          <ErrorBoundary componentName="StatsCards">
            <StatsCards campaignId={selectedCampaign} />
          </ErrorBoundary>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* Left Panel - Upload & Compose */}
            <div className="lg:col-span-2 space-y-6">
              <ErrorBoundary componentName="FileUpload">
                <FileUpload campaignId={selectedCampaign} />
              </ErrorBoundary>
              <ErrorBoundary componentName="EmailComposer">
                <EmailComposer campaignId={selectedCampaign} />
              </ErrorBoundary>
            </div>

            {/* Right Panel - Config & Activity */}
            <div className="space-y-6">
              {selectedCampaign && (
                <ErrorBoundary componentName="CampaignMetrics">
                  <CampaignMetrics campaignId={selectedCampaign} />
                </ErrorBoundary>
              )}
              <ErrorBoundary componentName="GmailConfig">
                <GmailConfig />
              </ErrorBoundary>
              <ErrorBoundary componentName="RecentActivity">
                <RecentActivity selectedCampaign={selectedCampaign} />
              </ErrorBoundary>
            </div>
          </div>

          {/* Data Table Section */}
          <ErrorBoundary componentName="StudentTable">
            <StudentTable campaignId={selectedCampaign} />
          </ErrorBoundary>
        </div>
      </div>
      
      {/* Settings Modal */}
      <ErrorBoundary componentName="Settings">
        <Settings 
          open={showSettings} 
          onOpenChange={setShowSettings} 
        />
      </ErrorBoundary>
    </div>
  );
}
