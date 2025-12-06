import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
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

      // Handle new subscription created notification
      if (data.type === "new_subscription_created") {
        const subscriptionData = data.data;
        
        // Invalidate subscription queries
        queryClient.invalidateQueries({ queryKey: ["/api/admin", "subscriptions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/metrics"] });

        setUnreadCount((prev) => prev + 1);

        toast({
          title: "New Subscription",
          description: `${subscriptionData.customerName} (${subscriptionData.phone}) subscribed to ${subscriptionData.planName}`,
          duration: 5000,
        });

        if (Notification.permission === "granted") {
          new Notification("New Subscription Created", {
            body: `${subscriptionData.customerName} subscribed to ${subscriptionData.planName}`,
            icon: "/favicon.ico",
          });

          // Play notification sound
          const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE=");
          audio.play().catch(() => {});
        }
      }

      // Handle subscription payment verification
      if (data.type === "subscription_update") {
        const subscription = data.data;
        
        // Invalidate subscription queries
        queryClient.invalidateQueries({ queryKey: ["/api/admin", "subscriptions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/metrics"] });

        // Show notification if payment transaction ID was just added (user confirmed payment)
        if (subscription.paymentTransactionId && !subscription.isPaid) {
          setUnreadCount((prev) => prev + 1);

          toast({
            title: "Subscription Payment",
            description: `${subscription.customerName} submitted payment (TxnID: ${subscription.paymentTransactionId.slice(0, 12)}...)`,
            duration: 5000,
          });

          if (Notification.permission === "granted") {
            new Notification("Subscription Payment Pending", {
              body: `${subscription.customerName} - Verify payment to activate subscription`,
              icon: "/favicon.ico",
            });

            // Play notification sound
            const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE=");
            audio.play().catch(() => {});
          }
        }
      }

      // Handle subscription payment pending notification (specific event)
      if (data.type === "subscription_payment_pending") {
        const subscriptionData = data.data;
        
        // Invalidate subscription queries
        queryClient.invalidateQueries({ queryKey: ["/api/admin", "subscriptions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/metrics"] });
        
        setUnreadCount((prev) => prev + 1);

        toast({
          title: "New Subscription Payment",
          description: `${subscriptionData.customerName} - ${subscriptionData.planName} (₹${subscriptionData.amount})`,
          duration: 7000,
        });

        if (Notification.permission === "granted") {
          new Notification("Subscription Payment Pending Verification", {
            body: `${subscriptionData.customerName} - ${subscriptionData.planName} - TxnID: ${subscriptionData.paymentTransactionId.slice(0, 12)}...`,
            icon: "/favicon.ico",
          });

          // Play notification sound
          const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE=");
          audio.play().catch(() => {});
        }
      }

      if (data.type === "chef_status_update") {
        console.log("🔄 Chef status updated:", data.data);
        // Invalidate chefs query to refresh the list immediately
        queryClient.invalidateQueries({ queryKey: ["/api/admin", "chefs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/chefs"] });
      } else if (data.type === "manual_assignment_required") {
        toast({
          title: "⚠️ Manual Assignment Required",
          description: data.message,
          variant: "destructive",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin", "orders"] });
      } else if (data.type === "overdue_chef_preparation") {
        toast({
          title: "⚠️ Chef Not Preparing",
          description: data.message,
          variant: "destructive",
          duration: 10000,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions/overdue-preparations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions/today-deliveries"] });
      } else if (data.type === "chef_unavailable_with_subscriptions") {
        toast({
          title: "🔴 Chef Unavailable - Reassignment Needed",
          description: data.message,
          variant: "destructive",
          duration: 15000,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin", "subscriptions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin", "chefs"] });
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