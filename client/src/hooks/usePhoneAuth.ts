import { useQuery } from "@tanstack/react-query";

export function usePhoneAuth() {
  const userToken = localStorage.getItem("userToken");
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user/profile"],
    enabled: !!userToken,
    retry: false,
    meta: {
      headers: userToken ? { Authorization: `Bearer ${userToken}` } : undefined,
    },
  });

  return {
    isAuthenticated: !!userToken,
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
