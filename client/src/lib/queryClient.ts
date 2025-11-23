import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle 401 Unauthorized errors - redirect to appropriate login
    if (res.status === 401) {
      const path = window.location.pathname;
      
      // Clear tokens and redirect based on current path
      if (path.startsWith('/admin')) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
        throw new Error('Session expired. Redirecting to login...');
      } else if (path.startsWith('/partner')) {
        localStorage.removeItem('partnerToken');
        window.location.href = '/partner/login';
        throw new Error('Session expired. Redirecting to login...');
      } else if (path.startsWith('/delivery')) {
        localStorage.removeItem('deliveryToken');
        window.location.href = '/delivery/login';
        throw new Error('Session expired. Redirecting to login...');
      } else {
        // Regular user
        localStorage.removeItem('userToken');
        window.location.href = '/login';
        throw new Error('Session expired. Redirecting to login...');
      }
    }
    
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const path = window.location.pathname;
  
  // Get appropriate token based on current path
  let token: string | null = null;
  if (path.startsWith('/admin')) {
    token = localStorage.getItem("adminToken");
  } else if (path.startsWith('/partner')) {
    token = localStorage.getItem("partnerToken");
  } else if (path.startsWith('/delivery')) {
    token = localStorage.getItem("deliveryToken");
  } else {
    token = localStorage.getItem("userToken");
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...(data ? { "Content-Type": "application/json" } : {}),
  };
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      headers: getAuthHeaders(),
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
