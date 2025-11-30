import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

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

interface UseAuthReturn {
  user: User | undefined;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<any>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
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

  const login = async (phone: string, password: string) => {
    const response = await fetch('/api/user/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Invalid phone number or password');
    }

    const data = await response.json();
    
    // Store the access token (backend returns accessToken, not token)
    localStorage.setItem('userToken', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    if (data.user) {
      localStorage.setItem('userData', JSON.stringify(data.user));
    }

    // Invalidate and refetch the user profile
    await queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });

    return data;
  };

  const logout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
    setLocation('/');
  };

  return { 
    user, 
    isLoading, 
    error, 
    isAuthenticated,
    login,
    logout
  };
}