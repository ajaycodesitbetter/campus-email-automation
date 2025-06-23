import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getApiUrl } from "@/lib/api";

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
}

interface LoginData {
  username: string;
  password: string;
}

// API functions
const authApi = {
  login: async (credentials: LoginData): Promise<{ user: User }> => {
    const response = await fetch(getApiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    return response.json();
  },

  logout: async (): Promise<void> => {
    const response = await fetch(getApiUrl("/api/auth/logout"), {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Logout failed");
    }
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    const response = await fetch(getApiUrl("/api/auth/me"), {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Not authenticated");
    }

    return response.json();
  },
};

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Query to get current user
  const {
    data: authData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        return await authApi.getCurrentUser();
      } catch (error) {
        // Return null instead of throwing for 401 errors
        // This allows the hook to resolve loading state properly
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    // Ensure we don't throw errors that would cause infinite loading
    throwOnError: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      queryClient.invalidateQueries({ queryKey: ["/api"] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
      setLocation("/login");
    },
  });

  return {
    user: authData?.user,
    isLoading,
    isAuthenticated: !!authData?.user,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
