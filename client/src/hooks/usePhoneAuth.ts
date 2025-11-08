import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function usePhoneAuth() {
  const userToken = localStorage.getItem("userToken");
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/user/profile"],
    enabled: !!userToken,
    retry: false,
    queryFn: async () => {
      const response = await fetch("/api/user/profile", {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid, logout user
          localStorage.removeItem("userToken");
          localStorage.removeItem("userRefreshToken");
          localStorage.removeItem("userData");
          throw new Error("Session expired");
        }
        throw new Error("Failed to fetch profile");
      }

      return response.json();
    },
  });

  // Auto-logout on session expiration
  useEffect(() => {
    if (error && userToken) {
      localStorage.removeItem("userToken");
      localStorage.removeItem("userRefreshToken");
      localStorage.removeItem("userData");
      window.location.reload();
    }
  }, [error, userToken]);

  return {
    isAuthenticated: !!userToken && !error,
    user,
    isLoading,
    logout: () => {
      localStorage.removeItem("userToken");
      localStorage.removeItem("userRefreshToken");
      localStorage.removeItem("userData");
      window.location.href = "/";
    },
  };
}
