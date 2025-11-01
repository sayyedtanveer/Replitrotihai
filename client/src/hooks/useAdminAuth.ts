import { useState, useEffect } from "react";
import { useLocation } from "wouter";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

export function useAdminAuth() {
  const [, setLocation] = useLocation();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const adminUserStr = localStorage.getItem("adminUser");
    const token = localStorage.getItem("adminToken");

    if (adminUserStr && token) {
      setAdmin(JSON.parse(adminUserStr));
    }
    setIsLoading(false);
  }, []);

  const refreshToken = async (): Promise<string | null> => {
    try {
      const response = await fetch("/api/admin/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const data = await response.json();
      localStorage.setItem("adminToken", data.accessToken);
      localStorage.setItem("adminUser", JSON.stringify(data.admin));
      setAdmin(data.admin);
      return data.accessToken;
    } catch (error) {
      console.error("Token refresh failed:", error);
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      setAdmin(null);
      setLocation("/admin/login");
      return null;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST", credentials: "include" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      setAdmin(null);
      setLocation("/admin/login");
    }
  };

  return {
    admin,
    isLoading,
    isAuthenticated: !!admin,
    refreshToken,
    logout,
  };
}

export async function adminApiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem("adminToken");

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    const refreshResponse = await fetch("/api/admin/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (refreshResponse.ok) {
      const data = await refreshResponse.json();
      localStorage.setItem("adminToken", data.accessToken);
      localStorage.setItem("adminUser", JSON.stringify(data.admin));

      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${data.accessToken}`,
        },
      });
    } else {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      window.location.href = "/admin/login";
      throw new Error("Session expired");
    }
  }

  return response;
}
