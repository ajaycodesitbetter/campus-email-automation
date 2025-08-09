import { useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function MinimalDashboard() {
  console.log('MinimalDashboard component rendered');
  
  const { logout, isLoggingOut } = useAuth();
  
  const { data: config, isLoading: configLoading, error: configError } = useQuery({
    queryKey: ["/api/email-config"],
  });
  
  console.log('Config data:', config);
  console.log('Config loading:', configLoading);
  console.log('Config error:', configError);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Test Sidebar</h2>
        <p className="text-sm text-gray-600">If you see this, the layout is working.</p>
      </div>

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
                    Campus Email Automation - Test
                  </h1>
                  <p className="text-sm text-gray-500">Minimal Dashboard</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="mr-2">📧</span>
                  <span>{(config as any)?.senderEmail || 'Loading...'}</span>
                </div>
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
          <div className="bg-white p-8 rounded-lg shadow">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Dashboard Loading Test
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded">
                  <h3 className="font-medium text-blue-900">Config Status</h3>
                  <p className="text-sm text-blue-600">
                    {configLoading ? 'Loading...' : configError ? 'Error' : 'Loaded'}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <h3 className="font-medium text-green-900">API Connection</h3>
                  <p className="text-sm text-green-600">Working</p>
                </div>
                <div className="bg-purple-50 p-4 rounded">
                  <h3 className="font-medium text-purple-900">Authentication</h3>
                  <p className="text-sm text-purple-600">Authenticated</p>
                </div>
              </div>
              
              {configError && (
                <div className="bg-red-50 p-4 rounded border border-red-200">
                  <h4 className="font-medium text-red-800">API Error:</h4>
                  <p className="text-sm text-red-600">{(configError as any)?.message}</p>
                </div>
              )}
              
              {config ? (
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium text-gray-800">Config Data:</h4>
                  <pre className="text-sm text-gray-600 mt-2">
                    {JSON.stringify(config, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
