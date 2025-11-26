import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Order } from "@shared/schema";

export function useAdminNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);

  const { data: pendingPayments = [] } = useQuery<Order[]>({
    queryKey: ["/api/admin", "orders", "pending-payments"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch orders");
      const allOrders = await response.json();
      return allOrders.filter(
        (order: Order) =>
          order.paymentStatus === "pending" || order.paymentStatus === "paid"
      );
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    setUnreadCount(pendingPayments.length);
  }, [pendingPayments]);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?type=admin&token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Admin WebSocket connected for notifications");
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_order" || data.type === "order_update") {
        const order = data.data as Order;

        // Invalidate all order queries for real-time updates
        queryClient.invalidateQueries({ queryKey: ["/api/admin", "orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/metrics"] });

        // Show notification only for payment-related updates
        if (order.paymentStatus === "pending" || order.paymentStatus === "paid") {
          setUnreadCount((prev) => prev + 1);

          if (Notification.permission === "granted") {
            new Notification("New Payment Pending", {
              body: `Order #${order.id.slice(0, 8)} - ₹${order.total} from ${order.customerName}`,
              icon: "/favicon.ico",
            });
          }
        }
      }

      if (data.type === "chef_status_update") {
        console.log("🔄 Chef status updated:", data.data);
        // Invalidate chefs query to refresh the list immediately
        queryClient.invalidateQueries({ queryKey: ["/api/admin", "chefs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/chefs"] });
      }
    };

    ws.onclose = () => {
      console.log("Admin WebSocket disconnected");
      setWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("Admin WebSocket error:", error);
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

  const clearUnreadCount = () => {
    setUnreadCount(0);
  };

  return {
    unreadCount,
    wsConnected,
    pendingPayments,
    requestNotificationPermission,
    clearUnreadCount,
  };
}