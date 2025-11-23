import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

// Centralized 401 error handler for all user types
export function handle401Error(userType: "user" | "admin" | "partner" | "delivery" = "user") {
  console.warn(`🔒 401 Unauthorized - Logging out ${userType}`);

  switch (userType) {
    case "user":
      localStorage.removeItem("userToken");
      localStorage.removeItem("userData");
      window.location.href = "/";
      break;
    case "admin":
      localStorage.removeItem("adminToken");
      window.location.href = "/admin/login";
      break;
    case "partner":
      localStorage.removeItem("partnerToken");
      localStorage.removeItem("partnerChefName");
      window.location.href = "/partner/login";
      break;
    case "delivery":
      localStorage.removeItem("deliveryToken");
      localStorage.removeItem("deliveryPersonName");
      window.location.href = "/delivery/login";
      break;
  }
}

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  walletBalance: number;
  referralCode?: string;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['/api/user/profile'],
    queryFn: async () => {
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          handle401Error("user");
          throw new Error('Session expired');
        }
        throw new Error('Failed to fetch user profile');
      }

      return response.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
    enabled: !!localStorage.getItem('userToken'),
  });

  const isAuthenticated = !!user && !!localStorage.getItem('userToken');

  return { 
    user, 
    isLoading, 
    error, 
    isAuthenticated 
  };
}