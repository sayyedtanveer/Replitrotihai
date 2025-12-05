import { useEffect, useState, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

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

// Global singleton to ensure only one instance across all module imports
let globalManager: CustomerNotificationsManager | null = null;

// Singleton WebSocket manager to avoid duplicate connections
class CustomerNotificationsManager {
  private ws: WebSocket | null = null;
  private connecting = false;
  private listeners: Set<() => void> = new Set();
  private isFirstLoad = true;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000; // Start with 1 second

  public wsConnected = false;
  public chefStatuses: Record<string, boolean> = {};
  public productAvailability: Record<string, { isAvailable: boolean; stock?: number }> = {};

  static getInstance(): CustomerNotificationsManager {
    if (!globalManager) {
      globalManager = new CustomerNotificationsManager();
    }
    return globalManager;
  }

  subscribe(callback: () => void) {
    this.listeners.add(callback);
    // Connect on first subscription
    if (!this.ws && !this.connecting) {
      this.connect();
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  private connect() {
    if (this.ws || this.connecting) return;
    this.connecting = true;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?type=browser`;

    console.log("Customer WebSocket connecting to:", wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("Customer WebSocket connected for real-time updates");
      this.wsConnected = true;
      this.connecting = false;
      this.resetReconnectState(); // Reset reconnect attempts on successful connection
      this.notify();
      // Mark as not first load after connection established
      setTimeout(() => {
        this.isFirstLoad = false;
      }, 2000);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Customer received WebSocket message:", data.type, data);

        if (data.type === "chef_status_update") {
          const chef = data.data as ChefStatusUpdate;
          console.log(`Chef status updated: ${chef.name} is now ${chef.isActive ? "OPEN" : "CLOSED"}`);

          const wasOpen = this.chefStatuses[chef.id];
          // Show toast only if status actually changed and not first load
          if (!this.isFirstLoad && wasOpen !== undefined && wasOpen !== chef.isActive) {
            toast({
              title: chef.isActive ? "Kitchen Now Open" : "Kitchen Now Closed",
              description: `${chef.name} is ${chef.isActive ? "now accepting orders" : "currently closed"}`,
              variant: chef.isActive ? "default" : "destructive",
            });
          }

          this.chefStatuses = {
            ...this.chefStatuses,
            [chef.id]: chef.isActive
          };

          // Invalidate chef-related queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["/api/chefs"] });
          queryClient.invalidateQueries({ queryKey: ["/api/products"] });
          this.notify();
        }

        if (data.type === "product_availability_update") {
          const product = data.data as ProductAvailabilityUpdate;
          console.log(`Product availability updated: ${product.name} is now ${product.isAvailable ? "AVAILABLE" : "UNAVAILABLE"}`);

          const wasAvailable = this.productAvailability[product.id]?.isAvailable;
          // Show toast only if availability actually changed and not first load
          if (!this.isFirstLoad && wasAvailable !== undefined && wasAvailable !== product.isAvailable) {
            toast({
              title: product.isAvailable ? "Item Available" : "Item Unavailable",
              description: `${product.name} is ${product.isAvailable ? "now available" : "currently out of stock"}`,
              variant: product.isAvailable ? "default" : "destructive",
            });
          }

          this.productAvailability = {
            ...this.productAvailability,
            [product.id]: { isAvailable: product.isAvailable, stock: product.stock }
          };

          // Invalidate product queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["/api/products"] });
          this.notify();
        }

        // Handle subscription_update messages
        if (data.type === "subscription_update") {
          const subscription = data.data;
          console.log("Subscription updated:", subscription.id, subscription.status);
          queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });

          // Show notification to user
          if (subscription.isPaid && subscription.status === "active") {
            toast({
              title: "Subscription Activated! 🎉",
              description: `Your subscription has been confirmed and is now active.`,
              duration: 5000,
            });
          }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    this.ws.onclose = () => {
      console.log("Customer WebSocket disconnected");
      this.wsConnected = false;
      this.ws = null;
      this.connecting = false;
      this.notify();
      // Auto-reconnect if there are listeners
      if (this.listeners.size > 0) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error("Customer WebSocket error:", error);
      this.wsConnected = false;
      this.connecting = false;
      this.notify();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Max WebSocket reconnection attempts reached");
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s... capped at 30s
    const delay = Math.min(this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`Scheduling WebSocket reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      if (!this.ws && !this.connecting && this.listeners.size > 0) {
        console.log("Attempting WebSocket reconnection...");
        this.connect();
      }
    }, delay);
  }

  private resetReconnectState() {
    this.reconnectAttempts = 0;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  getSnapshot() {
    return {
      wsConnected: this.wsConnected,
      chefStatuses: this.chefStatuses,
      productAvailability: this.productAvailability,
    };
  }
}

const manager = CustomerNotificationsManager.getInstance();

export function useCustomerNotifications() {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    return manager.subscribe(() => forceUpdate({}));
  }, []);

  const { wsConnected, chefStatuses, productAvailability } = manager.getSnapshot();

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