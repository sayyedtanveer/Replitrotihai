
import { useEffect, useState, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

interface ChefStatusUpdate {
  id: string;
  name: string;
  isActive: boolean;
}

interface ProductAvailabilityUpdate {
  id: string;
  name: string;
  isAvailable: boolean;
  stock?: number;
}

export function useCustomerNotifications() {
  const [wsConnected, setWsConnected] = useState(false);
  const [chefStatuses, setChefStatuses] = useState<Record<string, boolean>>({});
  const [productAvailability, setProductAvailability] = useState<Record<string, { isAvailable: boolean; stock?: number }>>({});

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?type=browser`;

    console.log("Customer WebSocket connecting to:", wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Customer WebSocket connected for real-time updates");
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Customer received WebSocket message:", data.type, data);

        if (data.type === "chef_status_update") {
          const chef = data.data as ChefStatusUpdate;
          console.log(`🔄 Chef status updated: ${chef.name} is now ${chef.isActive ? "OPEN" : "CLOSED"}`);
          
          setChefStatuses(prev => ({
            ...prev,
            [chef.id]: chef.isActive
          }));

          // Invalidate chef-related queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["/api/chefs"] });
          queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        }

        if (data.type === "product_availability_update") {
          const product = data.data as ProductAvailabilityUpdate;
          console.log(`🔄 Product availability updated: ${product.name} is now ${product.isAvailable ? "AVAILABLE" : "UNAVAILABLE"}`);
          
          setProductAvailability(prev => ({
            ...prev,
            [product.id]: { isAvailable: product.isAvailable, stock: product.stock }
          }));

          // Invalidate product queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("Customer WebSocket disconnected");
      setWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("Customer WebSocket error:", error);
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  const isChefOpen = useCallback((chefId: string): boolean | undefined => {
    return chefStatuses[chefId];
  }, [chefStatuses]);

  const isProductAvailable = useCallback((productId: string): { isAvailable: boolean; stock?: number } | undefined => {
    return productAvailability[productId];
  }, [productAvailability]);

  return {
    wsConnected,
    chefStatuses,
    productAvailability,
    isChefOpen,
    isProductAvailable,
  };
}
