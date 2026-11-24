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
  const { isAuthenticated, isLoading, login, error, retry } = useAuth();

  if (isLoading) return <div className="fw-connection" role="status"><span className="fw-connection-logo">↗ campusmail</span><h1>Opening your workspace...</h1><p>Checking your secure session.</p></div>;
  if (error) return <div className="fw-connection" role="alert"><span className="fw-connection-logo">↗ campusmail</span><h1>Your workspace is taking a break.</h1><p>We could not reach the app server. Your campaign data has not been changed.</p><button onClick={() => retry()}>Try connecting again</button><small>If this continues, the backend service may be offline.</small></div>;

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
