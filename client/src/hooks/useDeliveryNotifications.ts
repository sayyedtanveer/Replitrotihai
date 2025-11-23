
import { useEffect, useState } from "react";
import { queryClient } from "@/lib/queryClient";
import type { Order } from "@shared/schema";

export function useDeliveryNotifications() {
  const [wsConnected, setWsConnected] = useState(false);
  const [newAssignmentsCount, setNewAssignmentsCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("deliveryToken");
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?type=delivery&token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Delivery WebSocket connected for notifications");
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "order_assigned" || data.type === "order_confirmed" || data.type === "order_update" || data.type === "new_prepared_order") {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/delivery/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/delivery/available-orders"] });
        
        // Show notification for new assignments and new available orders
        if (data.type === "order_assigned" || data.type === "order_confirmed" || data.type === "new_prepared_order") {
          const order = data.data || data.order;
          setNewAssignmentsCount((prev) => prev + 1);
          
          // Browser notification
          if (Notification.permission === "granted") {
            const notificationTitle = 
              data.type === "order_confirmed" ? "Order Ready for Pickup!" :
              data.type === "new_prepared_order" ? "New Order Available!" :
              "New Delivery Assignment!";
            
            new Notification(
              notificationTitle,
              {
                body: data.message || `Order #${order.id.slice(0, 8)} - ${order.address || 'Available to claim'}`,
                icon: "/favicon.png",
                tag: order.id,
              }
            );
            
            // Play sound
            const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE=");
            audio.play().catch(() => {});
          }
        }
      }
    };

    ws.onclose = () => {
      console.log("Delivery WebSocket disconnected");
      setWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("Delivery WebSocket error:", error);
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

  const clearNewAssignmentsCount = () => {
    setNewAssignmentsCount(0);
  };

  return {
    wsConnected,
    newAssignmentsCount,
    requestNotificationPermission,
    clearNewAssignmentsCount,
  };
}
