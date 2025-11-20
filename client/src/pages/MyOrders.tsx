import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MenuDrawer from "@/components/MenuDrawer";
import CartSidebar from "@/components/CartSidebar";
import ChefListDrawer from "@/components/ChefListDrawer";
import SubscriptionDrawer from "@/components/SubscriptionDrawer";
import LoginDialog from "@/components/LoginDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShoppingBag,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  ChefHat,
  Truck,
  Home,
  MapPin,
  Phone,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import type { Category } from "../types/category";
import type { Order } from "../types/order";
import type { Chef } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export default function MyOrders() {
  const [, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isChefListOpen, setIsChefListOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const userToken = localStorage.getItem("userToken");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // 🧠 Fetch orders for authenticated user
  const {
    data: orders = [],
    isLoading,
    error,
  } = useQuery<Order[]>({
    queryKey: ["/api/orders", userToken],
    enabled: !!userToken,
    queryFn: async () => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (userToken) headers.Authorization = `Bearer ${userToken}`;
      const res = await fetch("/api/orders", { headers });
      if (res.status === 401) {
        localStorage.removeItem("userToken");
        localStorage.removeItem("userData");
        throw new Error("Session expired. Please log in again.");
      }
      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to fetch orders:", text);
        throw new Error("Failed to fetch orders");
      }
      return res.json();
    },
  });

  // 🧩 Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  // 🧩 Fetch chefs
  const { data: chefs = [] } = useQuery<Chef[]>({
    queryKey: ["/api/chefs"],
    queryFn: async () => {
      const res = await fetch("/api/chefs");
      if (!res.ok) throw new Error("Failed to fetch chefs");
      return res.json();
    },
  });

  // WebSocket connection for live updates
  useEffect(() => {
    if (!orders || orders.length === 0) return;

    // Find active orders (not delivered or cancelled)
    const activeOrders = orders.filter(
      (order) => !["delivered", "completed", "cancelled"].includes(order.status)
    );

    if (activeOrders.length === 0) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsConnections: WebSocket[] = [];

    activeOrders.forEach((order) => {
      const wsUrl = `${protocol}//${window.location.host}/ws?type=customer&orderId=${order.id}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`WebSocket connected for order ${order.id}`);
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "order_update") {
          queryClient.setQueryData(["/api/orders", userToken], (oldData: Order[] | undefined) => {
            if (!oldData) return oldData;
            return oldData.map((o) => (o.id === data.data.id ? data.data : o));
          });
        }
      };

      ws.onclose = () => {
        console.log(`WebSocket disconnected for order ${order.id}`);
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error for order ${order.id}:`, error);
      };

      wsConnections.push(ws);
    });

    return () => {
      wsConnections.forEach((ws) => ws.close());
      setWsConnected(false);
    };
  }, [orders, userToken]);

  // Show loading state while checking auth
  if (authLoading || (userToken && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">Loading your orders...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect if not authenticated after loading is complete
  if (!userToken && !user) {
    return <Redirect to="/" />;
  }

  // 🧩 Helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "confirmed":
      case "preparing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "out_for_delivery":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "delivered":
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "paid":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "confirmed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200";
    }
  };

  const getOrderProgress = (order: Order) => {
    return [
      {
        key: "placed",
        label: "Order Placed",
        icon: <ShoppingBag className="h-5 w-5" />,
        completed: true,
        description: format(new Date(order.createdAt), "MMM d, h:mm a"),
      },
      {
        key: "payment",
        label: "Payment Confirmed",
        icon: <CreditCard className="h-5 w-5" />,
        completed:
          order.paymentStatus === "confirmed" ||
          order.status === "confirmed" ||
          order.status === "preparing" ||
          order.status === "out_for_delivery" ||
          order.status === "delivered",
        description:
          order.paymentStatus === "pending"
            ? "Waiting for verification"
            : "Payment verified",
      },
      {
        key: "preparing",
        label: "Preparing",
        icon: <ChefHat className="h-5 w-5" />,
        completed:
          order.status === "preparing" ||
          order.status === "out_for_delivery" ||
          order.status === "delivered",
        description:
          order.status === "preparing"
            ? "Chef is preparing your food"
            : order.status === "confirmed"
            ? "Waiting for chef"
            : order.status === "out_for_delivery" || order.status === "delivered"
            ? "Preparation complete"
            : "Pending",
      },
      {
        key: "delivery",
        label: "Out for Delivery",
        icon: <Truck className="h-5 w-5" />,
        completed:
          order.status === "out_for_delivery" || order.status === "delivered",
        description:
          order.status === "out_for_delivery"
            ? "On the way"
            : order.status === "delivered"
            ? "Delivered"
            : "Pending pickup",
      },
      {
        key: "delivered",
        label: "Delivered",
        icon: <Home className="h-5 w-5" />,
        completed:
          order.status === "delivered" || order.status === "completed",
        description:
          order.status === "delivered"
            ? "Order delivered"
            : "Not yet delivered",
      },
    ];
  };

  // Find the current active order (most recent non-completed order)
  const activeOrder = orders.find(
    (order) => !["delivered", "completed", "cancelled"].includes(order.status)
  );

  // 🧩 UI rendering
  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onMenuClick={() => setIsMenuOpen(true)}
        onCartClick={() => setIsCartOpen(true)}
        onChefListClick={() => setIsChefListOpen(true)}
        onSubscriptionClick={() => setIsSubscriptionOpen(true)}
        onLoginClick={() => setIsLoginOpen(true)}
      />

      <main className="flex-1 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Orders</h1>
            <p className="text-muted-foreground">
              Track and manage your orders
            </p>
          </div>

          {!userToken ? (
            <Card className="text-center py-12">
              <CardContent className="flex flex-col items-center gap-4">
                <ShoppingBag className="h-16 w-16 text-muted-foreground" />
                <div>
                  <CardTitle className="mb-2">Sign In Required</CardTitle>
                  <CardDescription>
                    Place an order to automatically create an account and track
                    your orders.
                  </CardDescription>
                </div>
                <Button onClick={() => setLocation("/")}>
                  Start Shopping
                </Button>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">Loading your orders...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-red-600">
                  Failed to load orders. Please refresh.
                </p>
              </CardContent>
            </Card>
          ) : orders.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent className="flex flex-col items-center gap-4">
                <ShoppingBag className="h-16 w-16 text-muted-foreground" />
                <div>
                  <CardTitle className="mb-2">No orders yet</CardTitle>
                  <CardDescription>
                    Start ordering delicious food to see your orders here.
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Live Tracking for Active Order */}
              {activeOrder && (
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="text-2xl">
                          Current Order #{activeOrder.id.slice(0, 8)}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Placed on {format(new Date(activeOrder.createdAt), "PPpp")}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge className={getStatusColor(activeOrder.status)}>
                          <Clock className="h-3 w-3 mr-1" />
                          {activeOrder.status.toUpperCase().replace("_", " ")}
                        </Badge>
                        <Badge className={getPaymentStatusColor(activeOrder.paymentStatus)}>
                          <CreditCard className="h-3 w-3 mr-1" />
                          Payment: {activeOrder.paymentStatus.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {wsConnected && (
                        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
                          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                          <p className="text-sm text-green-800 dark:text-green-200">
                            Live tracking active - updates will appear automatically
                          </p>
                        </div>
                      )}

                      {activeOrder.paymentStatus === "pending" && (
                        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                            <div>
                              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                                Waiting for Payment Confirmation
                              </h3>
                              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                                Our team is verifying your payment. This usually takes a few minutes.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Order Status Tracker */}
                      <div className="bg-muted/30 dark:bg-muted/20 rounded-lg p-4">
                        <h4 className="font-semibold mb-4">Order Status Tracker</h4>
                        <div className="relative">
                          {getOrderProgress(activeOrder).map((step, idx) => (
                            <div key={step.key} className="flex gap-4 pb-6 last:pb-0">
                              <div className="relative flex flex-col items-center">
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                                    step.completed
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {step.icon}
                                </div>
                                {idx < getOrderProgress(activeOrder).length - 1 && (
                                  <div
                                    className={`w-0.5 h-full absolute top-10 ${
                                      step.completed ? "bg-primary" : "bg-muted"
                                    }`}
                                  />
                                )}
                              </div>
                              <div className="flex-1 -mt-1">
                                <p
                                  className={`font-semibold ${
                                    step.completed
                                      ? "text-foreground"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {step.label}
                                </p>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {step.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Order Details Grid */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Delivery Address
                          </h4>
                          <p className="text-sm text-muted-foreground">{activeOrder.address}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm">{activeOrder.phone}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Order Items
                          </h4>
                          <div className="space-y-1">
                            {activeOrder.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {item.name} × {item.quantity}
                                </span>
                                <span className="font-medium">₹{item.price * item.quantity}</span>
                              </div>
                            ))}
                            <div className="border-t pt-2 mt-2">
                              <div className="flex justify-between font-bold">
                                <span>Total</span>
                                <span>₹{activeOrder.total}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* All Orders Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Order History</CardTitle>
                  <CardDescription>View all your past orders</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            #{order.id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(order.createdAt), "MMM d, yyyy")}
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(order.createdAt), "h:mm a")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {order.items.slice(0, 2).map((item: any, idx: number) => (
                                <div key={idx} className="text-muted-foreground">
                                  {item.name} ×{item.quantity}
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <span className="text-xs text-muted-foreground">
                                  +{order.items.length - 2} more
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">₹{order.total}</TableCell>
                          <TableCell>
                            <Badge className={getPaymentStatusColor(order.paymentStatus)} variant="outline">
                              {order.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocation(`/track/${order.id}`)}
                            >
                              Track
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <Footer />

      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        categories={categories}
        onSubscriptionClick={() => {
          setIsMenuOpen(false);
          setIsSubscriptionOpen(true);
        }}
        onLoginClick={() => setIsLoginOpen(true)}
      />

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <ChefListDrawer
        isOpen={isChefListOpen}
        onClose={() => setIsChefListOpen(false)}
        category={selectedCategory}
        chefs={chefs}
        onChefClick={(chef) => console.log("Selected chef:", chef)}
      />

      <SubscriptionDrawer
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
      />

      <LoginDialog
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={() => {
          setIsLoginOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        }}
      />
    </div>
  );
}