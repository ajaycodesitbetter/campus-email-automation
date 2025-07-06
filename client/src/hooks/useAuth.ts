import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Check authentication status
  const { data: authStatus } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/auth-status"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: () => {
      setIsAuthenticated(false);
      queryClient.clear(); // Clear all cached data
      window.location.reload(); // Refresh the page
    },
  });

  useEffect(() => {
    if (authStatus !== undefined && authStatus !== null) {
      setIsAuthenticated(authStatus.authenticated ?? false);
      setIsLoading(false);
    }
  }, [authStatus]);

  const login = () => {
    setIsAuthenticated(true);
    queryClient.invalidateQueries(); // Refresh all queries
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
    isLoggingOut: logoutMutation.isPending,
  };
}
