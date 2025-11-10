import { useState, useEffect } from "react";

interface UserData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export function usePhoneAuth() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUserData = localStorage.getItem("userData");
    if (savedUserData) {
      setUser(JSON.parse(savedUserData));
    }
    setIsLoading(false);
  }, []);

  async function login(phone: string, password: string) {
    const res = await fetch("/api/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });

    if (!res.ok) throw new Error("Invalid credentials");
    const data = await res.json();

    localStorage.setItem("userToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("userData", JSON.stringify(data.user));

    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await fetch("/api/user/logout", { method: "POST" });
    } catch (err) {
      console.warn("Logout request failed:", err);
    } finally {
      localStorage.removeItem("userToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userData");
      setUser(null);
      window.location.href = "/"; // Redirect to home page
    }
  }

  return {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
  };
}
