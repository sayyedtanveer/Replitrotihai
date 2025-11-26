import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, Clock, CheckCircle, Bell, Wifi, WifiOff, TrendingUp, Calendar, UserCircle, LogOut, Store, UtensilsCrossed, ToggleLeft, ToggleRight } from "lucide-react";
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
import type { Chef, Product } from "@shared/schema";

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
        }
      } catch (error) {
        console.error("Token refresh failed:", error);
      }
    };

    // Refresh token every 10 minutes (before 15min expiry)
    const tokenRefreshInterval = setInterval(refreshToken, 10 * 60 * 1000);

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

  const { data: orders } = useQuery({
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            {chefName} - Partner Dashboard
          </h1>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <div 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all ${
                chefDetails?.isActive 
                  ? "bg-green-50 dark:bg-green-950 border-green-500" 
                  : "bg-red-50 dark:bg-red-950 border-red-500"
              }`}
            >
              <Store className={`h-4 w-4 ${chefDetails?.isActive ? "text-green-600" : "text-red-600"}`} />
              <span className={`text-sm font-medium ${chefDetails?.isActive ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                {chefDetails?.isActive ? "OPEN" : "CLOSED"}
              </span>
              <Switch
                checked={chefDetails?.isActive ?? true}
                onCheckedChange={(checked) => toggleChefStatusMutation.mutate(checked)}
                disabled={toggleChefStatusMutation.isPending}
                data-testid="switch-chef-status"
              />
            </div>
            {newOrdersCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Bell className="h-3 w-3" />
                {newOrdersCount} New
              </Badge>
            )}
            <div className="flex items-center gap-2">
              {wsConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">Offline</span>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/partner/profile")}
              data-testid="button-profile"
            >
              <UserCircle className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="orders">All Orders</TabsTrigger>
            <TabsTrigger value="income">Income Report</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.totalOrders || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{metrics?.totalRevenue || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.pendingOrders || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.completedOrders || 0}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders && orders.length > 0 ? (
                    orders.slice(0, 5).map((order: any) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.customerName} • {order.phone}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(order.createdAt), "PPp")}
                          </p>
                          <div className="mt-2">
                            {(order.items as any[]).map((item, idx) => (
                              <p key={idx} className="text-sm">
                                {item.name} x {item.quantity}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace("_", " ").toUpperCase()}
                          </Badge>
                          <p className="font-bold">₹{order.total}</p>

                          {/* Action buttons based on status */}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {console.log(`Order ${order.id.slice(0, 8)} - Status: ${order.status}, PaymentStatus: ${order.paymentStatus}`)}
                            {order.paymentStatus === "confirmed" && order.status === "confirmed" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => acceptOrderMutation.mutate(order.id)}
                                  disabled={acceptOrderMutation.isPending || rejectOrderMutation.isPending}
                                  variant="default"
                                  data-testid={`button-accept-${order.id}`}
                                >
                                  Accept Order
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
                                  data-testid={`button-reject-${order.id}`}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {order.status === "preparing" && !order.assignedTo && (
                              <Badge variant="outline" className="bg-blue-50">
                                🍳 Preparing - Waiting for Delivery Person
                              </Badge>
                            )}
                            {order.status === "preparing" && order.assignedTo && (
                              <Badge variant="outline" className="bg-purple-50">
                                🍳 Preparing - {order.deliveryPersonName} is on the way
                              </Badge>
                            )}
                            {["preparing", "accepted_by_delivery"].includes(order.status) && (
  <Button
    size="sm"
    onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "prepared" })}
    disabled={updateStatusMutation.isPending}
    variant="default"
  >
    Mark as Prepared
  </Button>
)}

                            {order.status === "prepared" && (
                              <Badge variant="outline" className="bg-green-50">
                                ✓ Ready - Waiting for Delivery
                              </Badge>
                            )}
                            {order.status === "out_for_delivery" && (
                              <Badge variant="outline" className="bg-blue-50">
                                ✓ Out for Delivery
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No orders yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="menu" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UtensilsCrossed className="h-5 w-5" />
                    Menu Items
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Toggle items on/off to control what customers can order
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {products.filter(p => p.isAvailable).length} / {products.length} available
                </div>
              </CardHeader>
              <CardContent>
                {products.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className={`relative border rounded-lg overflow-hidden transition-all ${
                          product.isAvailable 
                            ? "bg-white dark:bg-slate-800" 
                            : "bg-slate-100 dark:bg-slate-900 opacity-60"
                        }`}
                        data-testid={`card-product-${product.id}`}
                      >
                        <div className="relative h-32 overflow-hidden">
                          <img
                            src={product.image}
                            alt={product.name}
                            className={`w-full h-full object-cover ${!product.isAvailable ? "grayscale" : ""}`}
                          />
                          {!product.isAvailable && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Badge variant="destructive" className="text-sm">
                                UNAVAILABLE
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-semibold truncate ${!product.isAvailable ? "text-muted-foreground" : ""}`}>
                                {product.name}
                              </h3>
                              <p className="text-sm text-muted-foreground truncate">
                                {product.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="font-bold text-lg">
                                  ₹{product.price}
                                </span>
                                {product.isVeg ? (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    VEG
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-red-600 border-red-600">
                                    NON-VEG
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
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
                              <span className={`text-xs ${product.isAvailable ? "text-green-600" : "text-red-600"}`}>
                                {product.isAvailable ? "Available" : "Unavailable"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>Stock: {product.stockQuantity}</span>
                            {product.stockQuantity <= product.lowStockThreshold && (
                              <Badge variant="outline" className="text-orange-600 border-orange-600">
                                Low Stock
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No menu items found</p>
                    <p className="text-sm">Contact admin to add items to your menu</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders && orders.length > 0 ? (
                      orders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">#{order.id.slice(0, 8)}</TableCell>
                          <TableCell>
                            <div>
                              <div>{order.customerName}</div>
                              <div className="text-xs text-muted-foreground">{order.phone}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {(order.items as any[]).map((item, idx) => (
                                <div key={idx}>{item.name} x{item.quantity}</div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="font-bold">₹{order.total}</TableCell>
                          <TableCell>
                            <div>{format(new Date(order.createdAt), "MMM d, yyyy")}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(order.createdAt), "h:mm a")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.replace("_", " ").toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={order.paymentStatus === "confirmed" ? "default" : "secondary"}>
                              {order.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 flex-wrap">
                              {order.paymentStatus === "confirmed" && order.status === "confirmed" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => acceptOrderMutation.mutate(order.id)}
                                    disabled={acceptOrderMutation.isPending || rejectOrderMutation.isPending}
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
                                    data-testid={`button-table-reject-${order.id}`}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              {order.status === "preparing" && (
                                <Button
                                  size="sm"
                                  onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "prepared" })}
                                  disabled={updateStatusMutation.isPending}
                                  data-testid={`button-table-ready-${order.id}`}
                                >
                                  Ready
                                </Button>
                              )}
                              {order.status === "prepared" && (
                                <Badge variant="outline" className="bg-green-50">
                                  ✓ Ready
                                </Badge>
                              )}
                              {order.status === "out_for_delivery" && (
                                <Badge variant="outline" className="bg-blue-50">
                                  ✓ Out for Delivery
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No orders found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="income" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{incomeReport?.totalIncome || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">All time earnings</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{incomeReport?.thisMonth || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Current month revenue</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Last Month</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{incomeReport?.lastMonth || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Previous month revenue</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Average Order Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeReport?.monthlyBreakdown && incomeReport.monthlyBreakdown.length > 0 ? (
                      incomeReport.monthlyBreakdown.map((month: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{month.month}</TableCell>
                          <TableCell>{month.orders}</TableCell>
                          <TableCell className="font-bold">₹{month.revenue}</TableCell>
                          <TableCell>₹{month.avgOrderValue}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No income data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}