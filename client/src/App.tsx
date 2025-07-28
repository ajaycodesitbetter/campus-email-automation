import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import TestDashboard from "@/pages/TestDashboard";
import MinimalDashboard from "@/pages/MinimalDashboard";
import SafeDashboard from "@/pages/SafeDashboard";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";

function AuthenticatedApp() {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={login} />;
  }

  return (
    <Switch>
      <Route path="/" component={SafeDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AuthenticatedApp />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
