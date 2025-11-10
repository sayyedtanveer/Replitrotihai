
import { useEffect, useState } from "react";
import { queryClient } from "@/lib/queryClient";
import type { Order } from "@shared/schema";

export function usePartnerNotifications() {
  const [wsConnected, setWsConnected] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("partnerToken");
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?type=chef&token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Partner WebSocket connected for notifications");
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "new_order" || data.type === "order_update") {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/partner/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/partner/dashboard/metrics"] });
        
        // Show notification
        if (data.type === "new_order") {
          const order = data.data as Order;
          setNewOrdersCount((prev) => prev + 1);
          
          // Browser notification
          if (Notification.permission === "granted") {
            new Notification("New Order Received!", {
              body: `Order #${order.id.slice(0, 8)} - ₹${order.total} from ${order.customerName}`,
              icon: "/favicon.png",
              tag: order.id,
            });
            
            // Play sound
            const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE=");
            audio.play().catch(() => {});
          }
        }
      }
    };

    ws.onclose = () => {
      console.log("Partner WebSocket disconnected");
      setWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("Partner WebSocket error:", error);
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const clearNewOrdersCount = () => {
    setNewOrdersCount(0);
  };

  return {
    wsConnected,
    newOrdersCount,
    requestNotificationPermission,
    clearNewOrdersCount,
  };
}
