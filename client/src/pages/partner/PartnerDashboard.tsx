import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, DollarSign, Clock, CheckCircle, Bell, Wifi, WifiOff, TrendingUp, Calendar, UserCircle, LogOut, Store, UtensilsCrossed, ToggleLeft, ToggleRight, Repeat, Truck, Loader2, Star, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { usePartnerNotifications } from "@/hooks/usePartnerNotifications";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import type { Chef, Product, Order } from "@shared/schema"; // Assuming Order type is defined in schema

export default function PartnerDashboard() {
  const partnerToken = localStorage.getItem("partnerToken");
  const chefName = localStorage.getItem("partnerChefName");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { wsConnected, newOrdersCount, requestNotificationPermission, clearNewOrdersCount } = usePartnerNotifications();
  const [selectedTab, setSelectedTab] = useState("dashboard");

  const handleLogout = () => {
    localStorage.removeItem("partnerToken");
    localStorage.removeItem("partnerChefName");
    setLocation("/partner/login");
  };

  // Add automatic token refresh for partners
  useEffect(() => {
    const refreshToken = async () => {
      try {
        const response = await fetch("/api/partner/auth/refresh", {
          method: "POST",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem("partnerToken", data.accessToken);
          console.log("✅ Partner token refreshed successfully");
        } else {
          console.warn("⚠️ Token refresh failed, user may need to re-login");
        }
      } catch (error) {
        console.error("❌ Token refresh failed:", error);
      }
    };

    // Refresh token every 6 days (before 7-day expiry)
    const tokenRefreshInterval = setInterval(refreshToken, 6 * 24 * 60 * 60 * 1000);

    return () => clearInterval(tokenRefreshInterval);
  }, []);


  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const { data: metrics } = useQuery({
    queryKey: ["/api/partner/dashboard/metrics"],
    queryFn: async () => {
      const response = await fetch("/api/partner/dashboard/metrics", {
        headers: { Authorization: `Bearer ${partnerToken}` },
      });
      if (!response.ok) throw new Error("Failed to fetch metrics");
      return response.json();
    },
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/partner/orders"],
    queryFn: async () => {
      const response = await fetch("/api/partner/orders", {
        headers: { Authorization: `Bearer ${partnerToken}` },
      });
      if (!response.ok) throw new Error("Failed to fetch orders");
      const allOrders = await response.json();
      console.log(`📦 Partner Dashboard - Received ${allOrders.length} orders:`,
        allOrders.map((o: any) => ({ id: o.id.slice(0, 8), status: o.status, assignedTo: o.assignedTo }))
      );
      // Sort by latest first
      return allOrders.sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
  });

  // Fetch subscription orders for the chef panel
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useQuery({
    queryKey: ["/api/partner/subscriptions"],
    queryFn: async () => {
      const token = localStorage.getItem("partnerToken");
      const response = await fetch("/api/partner/subscriptions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        console.error("Failed to fetch subscriptions:", response.status);
        throw new Error("Failed to fetch subscriptions");
      }
      const data = await response.json();
      console.log(`📦 Partner - Received ${data.length} subscriptions:`, data);
      return data;
    },
  });


  const { data: incomeReport } = useQuery({
    queryKey: ["/api/partner/income-report"],
    queryFn: async () => {
      const response = await fetch("/api/partner/income-report", {
        headers: { Authorization: `Bearer ${partnerToken}` },
      });
      if (!response.ok) throw new Error("Failed to fetch income report");
      return response.json();
    },
  });

  const { data: chefDetails } = useQuery<Chef>({
    queryKey: ["/api/partner/chef"],
    queryFn: async () => {
      const response = await fetch("/api/partner/chef", {
        headers: { Authorization: `Bearer ${partnerToken}` },
      });
      if (!response.ok) throw new Error("Failed to fetch chef details");
      return response.json();
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/partner/products"],
    queryFn: async () => {
      const response = await fetch("/api/partner/products", {
        headers: { Authorization: `Bearer ${partnerToken}` },
      });
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Subscription deliveries for the partner
  const { data: subscriptionDeliveries, isLoading: subscriptionDeliveriesLoading } = useQuery({
    queryKey: ["/api/partner/subscription-deliveries"],
    queryFn: async () => {
      const response = await fetch("/api/partner/subscription-deliveries", {
        headers: { Authorization: `Bearer ${partnerToken}` },
      });
      if (!response.ok) throw new Error("Failed to fetch subscription deliveries");
      return response.json();
    },
  });

  // Update subscription delivery status mutation
  const updateSubscriptionStatusMutation = useMutation({
    mutationFn: async ({ subscriptionId, status }: { subscriptionId: string; status: string }) => {
      const response = await fetch(`/api/partner/subscription-deliveries/${subscriptionId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${partnerToken}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update delivery status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/subscription-deliveries"] });
      toast({
        title: "Status updated",
        description: "Subscription delivery status has been updated",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update delivery status",
        variant: "destructive",
      });
    },
  });

  const toggleChefStatusMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const response = await fetch("/api/partner/chef/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${partnerToken}`,
        },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/chef"] });
      toast({
        title: data.isActive ? "Store is now OPEN" : "Store is now CLOSED",
        description: data.isActive
          ? "Customers can now see and order from your menu"
          : "Your store will appear as unavailable to customers",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update status",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const toggleProductAvailabilityMutation = useMutation({
    mutationFn: async ({ productId, isAvailable }: { productId: string; isAvailable: boolean }) => {
      const response = await fetch(`/api/partner/products/${productId}/availability`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${partnerToken}`,
        },
        body: JSON.stringify({ isAvailable }),
      });
      if (!response.ok) throw new Error("Failed to update product availability");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/products"] });
      toast({
        title: data.isAvailable ? "Item is now available" : "Item is now unavailable",
        description: data.isAvailable
          ? `${data.name} can now be ordered by customers`
          : `${data.name} will appear as unavailable`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to update item",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/partner/orders/${orderId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${partnerToken}` },
      });
      if (!response.ok) throw new Error("Failed to accept order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partner/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partner/income-report"] });
      toast({
        title: "Order accepted",
        description: "Order has been accepted and confirmed",
      });
    },
  });

  const rejectOrderMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const response = await fetch(`/api/partner/orders/${orderId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${partnerToken}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error("Failed to reject order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partner/dashboard/metrics"] });
      toast({
        title: "Order rejected",
        description: "Order has been rejected",
      });
    },
    onError: () => {
      toast({
        title: "Rejection failed",
        description: "Failed to reject order",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await fetch(`/api/partner/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${partnerToken}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update order status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partner/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partner/income-report"] });
      toast({
        title: "Order updated",
        description: "Order status has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-orange-100 text-orange-800";
      case "accepted_by_chef":
        return "bg-sky-100 text-sky-800";
      case "preparing":
        return "bg-blue-100 text-blue-800";
      case "prepared":
        return "bg-indigo-100 text-indigo-800";
      case "accepted_by_delivery":
        return "bg-purple-100 text-purple-800";
      case "out_for_delivery":
        return "bg-fuchsia-100 text-fuchsia-800";
      case "delivered":
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Mobile Header */}
      <header className="bg-white dark:bg-slate-800 border-b sticky top-0 z-40">
        <div className="px-3 md:px-6 py-3 md:py-4">
          {/* Chef Name & Status Row */}
          <div className="flex items-center justify-between gap-2 mb-3 md:mb-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h1 className="text-sm md:text-xl font-bold text-foreground truncate">
                {chefName}
              </h1>
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all flex-shrink-0 ${
                  chefDetails?.isActive
                    ? "bg-green-50 dark:bg-green-950 border-green-500"
                    : "bg-red-50 dark:bg-red-950 border-red-500"
                }`}
              >
                <Store className={`h-3 w-3 ${chefDetails?.isActive ? "text-green-600" : "text-red-600"}`} />
                <span className={`text-xs font-medium ${chefDetails?.isActive ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                  {chefDetails?.isActive ? "OPEN" : "CLOSED"}
                </span>
                <Switch
                  checked={chefDetails?.isActive ?? true}
                  onCheckedChange={(checked) => toggleChefStatusMutation.mutate(checked)}
                  disabled={toggleChefStatusMutation.isPending}
                  data-testid="switch-chef-status"
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/partner/profile")}
                className="h-8 w-8 md:h-9 md:w-9"
                data-testid="button-profile"
              >
                <UserCircle className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 md:h-9 md:w-9"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </div>

          {/* Status Row - Hidden on md and above */}
          <div className="md:hidden flex items-center gap-2 text-xs">
            {newOrdersCount > 0 && (
              <Badge variant="destructive" className="text-xs flex items-center gap-1">
                <Bell className="h-2.5 w-2.5" />
                {newOrdersCount} New
              </Badge>
            )}
            <div className={`flex items-center gap-1 ${wsConnected ? "text-green-600" : "text-red-600"}`}>
              {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{wsConnected ? "Live" : "Offline"}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="px-3 md:px-6 py-4 md:py-8">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 h-auto">
            <TabsTrigger value="dashboard" className="text-xs md:text-sm py-2">Dashboard</TabsTrigger>
            <TabsTrigger value="menu" className="text-xs md:text-sm py-2">Menu</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs md:text-sm py-2">Orders</TabsTrigger>
            <TabsTrigger value="subscriptions" className="text-xs md:text-sm py-2 relative">
              <span className="hidden md:inline">Subscriptions</span>
              <span className="md:hidden">Subs</span>
              {(subscriptionDeliveries?.todayCount > 0 || subscriptions.length > 0) && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
                  {subscriptionDeliveries?.todayCount || subscriptions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="income" className="text-xs md:text-sm py-2">Income</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Total Orders</CardTitle>
                  <Package className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">{metrics?.totalOrders || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Revenue</CardTitle>
                  <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">₹{metrics?.totalRevenue || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">{metrics?.pendingOrders || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">{metrics?.completedOrders || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Orders Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm md:text-base">Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 md:space-y-4">
                  {orders && orders.length > 0 ? (
                    orders.slice(0, 5).map((order: any) => (
                      <div
                        key={order.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-border/50"
                        data-testid={`card-order-${order.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-xs md:text-sm">Order #{order.id.slice(0, 8)}</p>
                            <Badge className={`${getStatusColor(order.status)} text-xs`}>
                              {order.status.replace("_", " ").toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground mt-1">
                            {order.customerName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.createdAt), "MMM d, h:mm a")}
                          </p>
                          <div className="mt-2 text-xs space-y-0.5">
                            {(order.items as any[]).slice(0, 2).map((item, idx) => (
                              <p key={idx} className="text-muted-foreground">
                                {item.name} x{item.quantity}
                              </p>
                            ))}
                            {(order.items as any[]).length > 2 && (
                              <p className="text-muted-foreground text-xs">+{(order.items as any[]).length - 2} more</p>
                            )}
                          </div>
                          {/* Display delivery time slot if available */}
                          {order.deliveryTime && (
                            <p className="text-sm font-bold text-orange-600 bg-orange-50 dark:bg-orange-950 px-2 py-1 rounded inline-block mt-1">
                              🕐 Delivery Time: {order.deliveryTime}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between md:flex-col md:items-end gap-2 flex-wrap">
                          <p className="font-bold text-sm md:text-base">₹{order.total}</p>

                          <div className="flex gap-1 flex-wrap">
                            {order.paymentStatus === "confirmed" && order.status === "confirmed" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => acceptOrderMutation.mutate(order.id)}
                                  disabled={acceptOrderMutation.isPending || rejectOrderMutation.isPending}
                                  variant="default"
                                  className="text-xs"
                                  data-testid={`button-accept-${order.id}`}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const reason = window.prompt("Please provide a reason for rejection:");
                                    if (reason) {
                                      rejectOrderMutation.mutate({ orderId: order.id, reason });
                                    }
                                  }}
                                  disabled={acceptOrderMutation.isPending || rejectOrderMutation.isPending}
                                  variant="destructive"
                                  className="text-xs"
                                  data-testid={`button-reject-${order.id}`}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {["preparing", "accepted_by_chef"].includes(order.status) && !order.assignedTo && (
                              <Badge variant="secondary" className="text-xs">
                                Waiting for delivery
                              </Badge>
                            )}
                            {order.assignedTo && order.deliveryPersonName && order.status === "preparing" && (
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="text-xs">
                                  🚴 {order.deliveryPersonName}
                                </Badge>
                                <Button
                                  size="sm"
                                  onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "prepared" })}
                                  disabled={updateStatusMutation.isPending}
                                  variant="default"
                                  className="text-xs"
                                >
                                  Mark Ready
                                </Button>
                              </div>
                            )}
                            {order.status === "accepted_by_delivery" && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "prepared" })}
                                disabled={updateStatusMutation.isPending}
                                variant="default"
                                className="text-xs"
                              >
                                Mark Ready
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-xs">No orders yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="menu" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5 text-primary" />
                  Menu Items
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Toggle items on/off to control what customers can order
                </p>
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">
                {products.filter(p => p.isAvailable).length} / {products.length} available
              </div>
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className={`overflow-hidden transition-all hover:shadow-lg ${
                      product.isAvailable
                        ? "bg-white dark:bg-slate-800"
                        : "opacity-60"
                    }`}
                    data-testid={`card-product-${product.id}`}
                  >
                    <div className="relative h-40 sm:h-48 overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className={`w-full h-full object-cover ${!product.isAvailable ? "grayscale" : ""}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* Offer Badge */}
                      {product.offerPercentage > 0 && (
                        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                          {product.offerPercentage}% OFF
                        </div>
                      )}

                      {/* Veg/Non-Veg indicator */}
                      <div className="absolute top-2 right-2">
                        <div className={`w-5 h-5 border-2 ${product.isVeg ? 'border-green-600' : 'border-red-600'} bg-white rounded-sm flex items-center justify-center`}>
                          <div className={`w-2.5 h-2.5 rounded-full ${product.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                        </div>
                      </div>

                      {/* Rating */}
                      <div className="absolute bottom-2 left-2">
                        <Badge className="bg-green-600 text-white border-0 text-xs">
                          <Star className="h-3 w-3 fill-current mr-0.5" />
                          {parseFloat(product.rating).toFixed(1)}
                        </Badge>
                      </div>

                      {/* Stock Badge */}
                      <div className="absolute bottom-2 right-2">
                        {product.stockQuantity <= product.lowStockThreshold && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-600 text-xs">
                            ⚠️ Low Stock
                          </Badge>
                        )}
                      </div>

                      {/* Unavailable overlay */}
                      {!product.isAvailable && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Badge variant="destructive" className="text-sm">
                            Unavailable
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="p-3 md:p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className={`font-bold text-base md:text-lg line-clamp-1 ${!product.isAvailable ? "text-muted-foreground" : ""}`}>
                          {product.name}
                        </h3>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Switch
                            checked={product.isAvailable}
                            onCheckedChange={(checked) =>
                              toggleProductAvailabilityMutation.mutate({
                                productId: product.id,
                                isAvailable: checked
                              })
                            }
                            disabled={toggleProductAvailabilityMutation.isPending}
                            data-testid={`switch-product-${product.id}`}
                          />
                          <span className={`text-xs font-semibold ${product.isAvailable ? "text-green-600" : "text-red-600"}`}>
                            {product.isAvailable ? "ON" : "OFF"}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {product.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div>
                          {product.offerPercentage > 0 ? (
                            <div className="flex flex-col">
                              <span className="text-xs line-through text-muted-foreground">
                                ₹{product.price}
                              </span>
                              <span className="font-bold text-lg text-green-600">
                                ₹{Math.round(product.price * (1 - product.offerPercentage / 100))}
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-lg text-primary">
                              ₹{product.price}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Stock</p>
                          <p className="text-sm font-semibold">
                            {product.stockQuantity} units
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          ({product.reviewCount} reviews)
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No menu items found</p>
                <p className="text-sm">Contact admin to add items to your menu</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm md:text-base">All Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 md:space-y-4">
                  {orders && orders.length > 0 ? (
                    orders.map((order: any) => (
                      <div
                        key={order.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-border/50"
                        data-testid={`card-order-${order.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-xs md:text-sm">Order #{order.id.slice(0, 8)}</p>
                            <Badge className={`${getStatusColor(order.status)} text-xs`}>
                              {order.status.replace("_", " ").toUpperCase()}
                            </Badge>
                            <Badge variant={order.paymentStatus === "confirmed" ? "default" : "secondary"} className="text-xs">
                              {order.paymentStatus}
                            </Badge>
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground mt-1">
                            {order.customerName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.createdAt), "MMM d, h:mm a")}
                          </p>
                          <div className="mt-2 text-xs space-y-0.5">
                            {(order.items as any[]).slice(0, 2).map((item, idx) => (
                              <p key={idx} className="text-muted-foreground">
                                {item.name} x{item.quantity}
                              </p>
                            ))}
                            {(order.items as any[]).length > 2 && (
                              <p className="text-muted-foreground text-xs">+{(order.items as any[]).length - 2} more</p>
                            )}
                          </div>
                          {order.assignedTo && order.deliveryPersonName && (
                            <Badge variant="outline" className="text-xs mt-2">
                              🚴 {order.deliveryPersonName}
                            </Badge>
                          )}
                          {/* Display delivery time slot if available */}
                          {order.deliveryTime && (
                            <p className="text-sm font-bold text-orange-600 bg-orange-50 dark:bg-orange-950 px-2 py-1 rounded inline-block mt-1">
                              🕐 Delivery Time: {order.deliveryTime}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between md:flex-col md:items-end gap-2 flex-wrap">
                          <p className="font-bold text-sm md:text-base">₹{order.total}</p>

                          <div className="flex gap-1 flex-wrap">
                            {order.paymentStatus === "confirmed" && order.status === "confirmed" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => acceptOrderMutation.mutate(order.id)}
                                  disabled={acceptOrderMutation.isPending || rejectOrderMutation.isPending}
                                  variant="default"
                                  className="text-xs"
                                  data-testid={`button-table-accept-${order.id}`}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const reason = window.prompt("Please provide a reason for rejection:");
                                    if (reason) {
                                      rejectOrderMutation.mutate({ orderId: order.id, reason });
                                    }
                                  }}
                                  disabled={acceptOrderMutation.isPending || rejectOrderMutation.isPending}
                                  variant="destructive"
                                  className="text-xs"
                                  data-testid={`button-table-reject-${order.id}`}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {["preparing", "accepted_by_chef"].includes(order.status) && !order.assignedTo && (
                              <Badge variant="secondary" className="text-xs">
                                Waiting for delivery
                              </Badge>
                            )}
                            {order.assignedTo && order.deliveryPersonName && order.status === "preparing" && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "prepared" })}
                                disabled={updateStatusMutation.isPending}
                                variant="default"
                                className="text-xs"
                                data-testid={`button-table-ready-${order.id}`}
                              >
                                Mark Ready
                              </Button>
                            )}
                            {order.status === "accepted_by_delivery" && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "prepared" })}
                                disabled={updateStatusMutation.isPending}
                                variant="default"
                                className="text-xs"
                              >
                                Mark Ready
                              </Button>
                            )}
                            {order.status === "prepared" && (
                              <Badge variant="outline" className="bg-green-50 text-xs">
                                ✓ Ready
                              </Badge>
                            )}
                            {order.status === "out_for_delivery" && (
                              <Badge variant="outline" className="bg-blue-50 text-xs">
                                ✓ Out for Delivery
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-xs">No orders yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6">
            {/* All Subscriptions Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Repeat className="w-5 h-5" />
                  My Subscriptions ({subscriptions.length})
                </CardTitle>
                <CardDescription>All subscriptions assigned to you</CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : subscriptions.length > 0 ? (
                  <div className="space-y-4">
                    {subscriptions.map((sub: any) => (
                      <div
                        key={sub.id}
                        className="border rounded-lg p-4 space-y-2"
                        data-testid={`subscription-${sub.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{sub.planName || 'Subscription'}</h4>
                            <p className="text-sm text-muted-foreground">{sub.phone}</p>
                          </div>
                          <Badge className={sub.status === "active" ? "bg-green-500" : "bg-yellow-500"}>
                            {sub.status}
                          </Badge>
                        </div>
                        <div className="text-sm grid gap-1">
                          <p>Next Delivery: {new Date(sub.nextDeliveryDate).toLocaleDateString()}</p>
                          <p>Time: {sub.nextDeliveryTime}</p>
                          <p>Remaining: {sub.remainingDeliveries} / {sub.totalDeliveries} deliveries</p>
                          <p className="text-sm">{sub.address}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Repeat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No subscriptions assigned yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Today's Subscription Deliveries Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Today's Deliveries</CardTitle>
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{subscriptionDeliveries?.todayCount || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Scheduled for today</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Preparing</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{subscriptionDeliveries?.preparing || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Being prepared</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Out for Delivery</CardTitle>
                  <Truck className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{subscriptionDeliveries?.outForDelivery || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">On the way</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{subscriptionDeliveries?.delivered || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Completed today</p>
                </CardContent>
              </Card>
            </div>

            {/* Today's Subscription Deliveries List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Repeat className="h-5 w-5" />
                  Today's Subscription Deliveries - {format(new Date(), "EEEE, MMM d")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subscriptionDeliveriesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : subscriptionDeliveries?.deliveries && subscriptionDeliveries.deliveries.length > 0 ? (
                  <div className="space-y-4">
                    {subscriptionDeliveries.deliveries.map((delivery: any) => (
                      <div
                        key={delivery.id}
                        className="border rounded-lg p-4 space-y-2"
                        data-testid={`subscription-delivery-${delivery.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{delivery.planName}</h4>
                            {/* customer name removed for privacy */}
                            {delivery.deliverySlotId && (
                              <p className="text-sm font-medium text-orange-600 bg-orange-50 dark:bg-orange-950 px-2 py-1 rounded inline-block mt-1">
                                🕐 Delivery Time: {delivery.nextDeliveryTime}
                              </p>
                            )}
                          </div>
                          <Badge className={delivery.status === "active" ? "bg-green-500" : "bg-yellow-500"}>
                            {delivery.status}
                          </Badge>
                        </div>
                        <div className="text-sm">
                          <p>Next Delivery: {new Date(delivery.nextDeliveryDate).toLocaleDateString()}</p>
                          <p>Remaining: {delivery.remainingDeliveries} / {delivery.totalDeliveries} deliveries</p>
                          <p className="font-medium">Items: {delivery.planItems?.map((item: any) => `${item.name} x${item.quantity}`).join(", ")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Repeat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No subscription deliveries scheduled for today</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="income" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Total Income</CardTitle>
                  <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">₹{incomeReport?.totalIncome || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">All time earnings</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">This Month</CardTitle>
                  <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">₹{incomeReport?.thisMonth || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Current month revenue</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Last Month</CardTitle>
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">₹{incomeReport?.lastMonth || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Previous month revenue</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm md:text-base">Monthly Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {incomeReport?.monthlyBreakdown && incomeReport.monthlyBreakdown.length > 0 ? (
                    incomeReport.monthlyBreakdown.map((month: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 md:p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-border/50"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-xs md:text-sm">{month.month}</p>
                          <p className="text-xs text-muted-foreground">{month.orders} orders</p>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-4 md:gap-8">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="font-bold text-sm md:text-base">₹{month.revenue}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Avg Order</p>
                            <p className="font-medium text-sm">₹{month.avgOrderValue}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-xs">No income data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}