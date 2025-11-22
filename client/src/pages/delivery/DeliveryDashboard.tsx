import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, CheckCircle, MapPin, Clock, Bell, Wifi, WifiOff, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useDeliveryNotifications } from "@/hooks/useDeliveryNotifications";
import { useEffect, useState } from "react";

export default function DeliveryDashboard() {
  const deliveryToken = localStorage.getItem("deliveryToken");
  const deliveryPersonName = localStorage.getItem("deliveryPersonName");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { wsConnected, newAssignmentsCount, requestNotificationPermission, clearNewAssignmentsCount } = useDeliveryNotifications();
  const [selectedTab, setSelectedTab] = useState("dashboard");

  const fetchOrders = async () => {
    const response = await fetch("/api/delivery/orders", {
      headers: { Authorization: `Bearer ${deliveryToken}` },
    });
    if (!response.ok) throw new Error("Failed to fetch orders");
    return response.json();
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Auto-refresh access token before expiry
  useEffect(() => {
    const refreshToken = async () => {
      try {
        const response = await fetch("/api/delivery/auth/refresh", {
          method: "POST",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem("deliveryToken", data.accessToken);
        }
      } catch (error) {
        console.error("Token refresh failed:", error);
      }
    };

    // Refresh token every 10 minutes (before 15min expiry)
    const tokenRefreshInterval = setInterval(refreshToken, 10 * 60 * 1000);

    return () => clearInterval(tokenRefreshInterval);
  }, []);


  const { data: orders = [] } = useQuery({
    queryKey: ["/api/delivery/orders"],
    queryFn: fetchOrders,
  });

  const { data: earnings } = useQuery({
    queryKey: ["/api/delivery/earnings"],
    queryFn: async () => {
      const response = await fetch("/api/delivery/earnings", {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      if (!response.ok) throw new Error("Failed to fetch earnings");
      return response.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/delivery/stats"],
    queryFn: async () => {
      const response = await fetch("/api/delivery/stats", {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/delivery/orders/${orderId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      if (!response.ok) throw new Error("Failed to accept order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/earnings"] });
      toast({ title: "Order accepted successfully" });
    },
  });

  const pickupOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/delivery/orders/${orderId}/pickup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      if (!response.ok) throw new Error("Failed to mark pickup");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/earnings"] });
      toast({ title: "Order picked up successfully" });
    },
  });

  const deliverOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/delivery/orders/${orderId}/deliver`, {
        method: "POST",
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      if (!response.ok) throw new Error("Failed to mark delivery");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/earnings"] });
      toast({ title: "Order delivered successfully" });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("deliveryToken");
    localStorage.removeItem("deliveryPersonId");
    localStorage.removeItem("deliveryPersonName");
    setLocation("/delivery/login");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-yellow-100 text-yellow-800";
      case "accepted_by_delivery":
        return "bg-blue-100 text-blue-800";
      case "prepared":
        return "bg-cyan-100 text-cyan-800";
      case "preparing":
        return "bg-blue-100 text-blue-800";
      case "out_for_delivery":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const pendingOrders = orders.filter((o: any) => o.status === "assigned");
  const activeOrders = orders.filter((o: any) => ["accepted_by_delivery", "prepared", "out_for_delivery"].includes(o.status));
  const completedOrders = orders.filter((o: any) => o.status === "delivered");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {deliveryPersonName} - Delivery Dashboard
          </h1>
          <div className="flex items-center gap-4">
            {newAssignmentsCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1" onClick={clearNewAssignmentsCount}>
                <Bell className="h-3 w-3" />
                {newAssignmentsCount} New
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
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">My Deliveries</TabsTrigger>
            <TabsTrigger value="earnings" data-testid="tab-earnings">Earnings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-pending">{stats?.pendingCount || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Active</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-active">{stats?.activeCount || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-completed-today">{stats?.completedToday || 0}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Deliveries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders && orders.length > 0 ? (
                    orders.slice(0, 5).map((order: any) => (
                      <div
                        key={order.id}
                        className="flex flex-col gap-4 p-4 border rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.customerName} • {order.phone}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {order.address}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {format(new Date(order.createdAt), "PPp")}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.replace("_", " ").toUpperCase()}
                            </Badge>
                            <p className="font-bold mt-2">₹{order.total}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {(order.status === "assigned" || order.status === "prepared") && (
                            <Button
                              onClick={() => acceptOrderMutation.mutate(order.id)}
                              disabled={acceptOrderMutation.isPending}
                              size="sm"
                              data-testid={`button-accept-${order.id}`}
                            >
                              Accept Order
                            </Button>
                          )}
                          {order.status === "accepted_by_delivery" && (
                            <Button
                              onClick={() => pickupOrderMutation.mutate(order.id)}
                              disabled={pickupOrderMutation.isPending}
                              size="sm"
                              data-testid={`button-pickup-${order.id}`}
                            >
                              Pickup & Start Delivery
                            </Button>
                          )}
                          {order.status === "out_for_delivery" && (
                            <Button
                              onClick={() => deliverOrderMutation.mutate(order.id)}
                              disabled={deliverOrderMutation.isPending}
                              size="sm"
                              variant="default"
                              data-testid={`button-deliver-${order.id}`}
                            >
                              Mark as Delivered
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No orders assigned yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All My Deliveries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders && orders.length > 0 ? (
                    orders.map((order: any) => (
                      <div
                        key={order.id}
                        className="flex flex-col gap-4 p-4 border rounded-lg"
                        data-testid={`order-card-${order.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.customerName} • {order.phone}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {order.address}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {format(new Date(order.createdAt), "PPp")}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.replace("_", " ").toUpperCase()}
                            </Badge>
                            <p className="font-bold mt-2">₹{order.total}</p>
                            <p className="text-sm text-muted-foreground mt-1">Fee: ₹{order.deliveryFee}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {(order.status === "assigned" || order.status === "prepared") && (
                            <Button
                              onClick={() => acceptOrderMutation.mutate(order.id)}
                              disabled={acceptOrderMutation.isPending}
                              size="sm"
                            >
                              Accept Order
                            </Button>
                          )}
                          {order.status === "accepted_by_delivery" && (
                            <Button
                              onClick={() => pickupOrderMutation.mutate(order.id)}
                              disabled={pickupOrderMutation.isPending}
                              size="sm"
                            >
                              Pickup & Start Delivery
                            </Button>
                          )}
                          {order.status === "out_for_delivery" && (
                            <Button
                              onClick={() => deliverOrderMutation.mutate(order.id)}
                              disabled={deliverOrderMutation.isPending}
                              size="sm"
                              variant="default"
                            >
                              Mark as Delivered
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No deliveries yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Today</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="earnings-today">₹{earnings?.todayEarnings || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">{earnings?.todayDeliveries || 0} deliveries</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">This Week</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="earnings-week">₹{earnings?.weekEarnings || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">{earnings?.weekDeliveries || 0} deliveries</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="earnings-month">₹{earnings?.monthEarnings || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">{earnings?.monthDeliveries || 0} deliveries</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="earnings-total">₹{earnings?.totalEarnings || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">{earnings?.totalDeliveries || 0} deliveries</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Earnings Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-sm font-medium">Period</span>
                    <span className="text-sm font-medium">Deliveries</span>
                    <span className="text-sm font-medium">Earnings</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Today</span>
                    <span className="text-sm">{earnings?.todayDeliveries || 0}</span>
                    <span className="text-sm font-bold">₹{earnings?.todayEarnings || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">This Week</span>
                    <span className="text-sm">{earnings?.weekDeliveries || 0}</span>
                    <span className="text-sm font-bold">₹{earnings?.weekEarnings || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">This Month</span>
                    <span className="text-sm">{earnings?.monthDeliveries || 0}</span>
                    <span className="text-sm font-bold">₹{earnings?.monthEarnings || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="font-semibold">Total (All Time)</span>
                    <span className="font-semibold">{earnings?.totalDeliveries || 0}</span>
                    <span className="font-bold text-lg">₹{earnings?.totalEarnings || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}