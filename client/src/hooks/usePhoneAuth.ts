import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "./use-toast";

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

interface LoginTelemetry {
  timestamp: string;
  phone: string;
  success: boolean;
  errorMessage?: string;
  userAgent: string;
}

function logLoginAttempt(telemetry: LoginTelemetry) {
  // Send telemetry to monitoring endpoint (if configured)
  // For now, we'll just log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Auth Telemetry]', telemetry);
  }

  // Store recent attempts in sessionStorage for debugging
  try {
    const recentAttempts = JSON.parse(sessionStorage.getItem('loginAttempts') || '[]');
    recentAttempts.push(telemetry);
    // Keep only last 10 attempts
    sessionStorage.setItem('loginAttempts', JSON.stringify(recentAttempts.slice(-10)));
  } catch (e) {
    // Ignore storage errors
  }
}

export function usePhoneAuth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const userToken = localStorage.getItem("userToken");

  const { data: user, refetch } = useQuery<User>({
    queryKey: ["/api/user/profile", userToken],
    queryFn: async () => {
      const res = await fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("userToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("userData");
        }
        throw new Error("Failed to fetch user profile");
      }
      return res.json();
    },
    enabled: !!userToken,
    retry: false,
  });

  useEffect(() => {
    setIsLoading(false);
    setAuthChecked(true);
  }, [user]);

  const loginMutation = useMutation({
    mutationFn: async ({ phone, password }: { phone: string; password: string }) => {
      const startTime = Date.now();

      try {
        const response = await fetch("/api/user/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, password }),
        });

        if (!response.ok) {
          const error = await response.json();
          const errorMessage = error.message || "Login failed";

          // Log failed attempt
          logLoginAttempt({
            timestamp: new Date().toISOString(),
            phone,
            success: false,
            errorMessage,
            userAgent: navigator.userAgent,
          });

          throw new Error(errorMessage);
        }

        const data = await response.json();

        // Log successful attempt
        logLoginAttempt({
          timestamp: new Date().toISOString(),
          phone,
          success: true,
          userAgent: navigator.userAgent,
        });

        return data;
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Network error during login");
      }
    },
    onSuccess: async (data) => {
      localStorage.setItem("userToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("userData", JSON.stringify(data.user));

      // Refetch user profile without page reload
      await queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      await refetch();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      localStorage.removeItem("userToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userData");
      queryClient.clear();
    },
  });

  const login = async (phone: string, password: string) => {
    return loginMutation.mutateAsync({ phone, password });
  };

  const logout = async () => {
    return logoutMutation.mutateAsync();
  };

  return {
    user,
    isLoading,
    authChecked,
    isAuthenticated: !!user,
    login,
    logout,
    refetch,
  };
}