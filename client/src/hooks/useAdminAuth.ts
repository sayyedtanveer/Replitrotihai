import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("adminToken");
      setIsAuthenticated(!!token);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const logout = () => {
    localStorage.removeItem("adminToken");
    setIsAuthenticated(false);
    setLocation("/admin/login");
  };

  return {
    isAuthenticated,
    isLoading,
    logout,
  };
}