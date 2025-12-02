import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, CheckCircle, MapPin, Clock, Bell, Wifi, WifiOff, DollarSign, TrendingUp, Calendar, LogOut, Truck } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useDeliveryNotifications } from "@/hooks/useDeliveryNotifications";
import { useEffect, useState } from "react";

export default function DeliveryDashboard() {
  const deliveryPersonName = localStorage.getItem("deliveryPersonName");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { wsConnected, newAssignmentsCount, requestNotificationPermission, clearNewAssignmentsCount } = useDeliveryNotifications();
  const [selectedTab, setSelectedTab] = useState("dashboard");

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Auto-refresh access token before expiry
  useEffect(() => {
    const refreshToken = async () => {
      try {
        const response = await apiRequest("POST", "/api/delivery/auth/refresh");
        const data = await response.json();
        localStorage.setItem("deliveryToken", data.accessToken);
      } catch (error) {
        console.error("Token refresh failed:", error);
      }
    };

    // Refresh token every 10 minutes (before 15min expiry)
    const tokenRefreshInterval = setInterval(refreshToken, 10 * 60 * 1000);

    return () => clearInterval(tokenRefreshInterval);
  }, []);


  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["/api/delivery/orders"],
  });

  const { data: availableOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/delivery/available-orders"],
  });

  const { data: earnings } = useQuery<any>({
    queryKey: ["/api/delivery/earnings"],
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/delivery/stats"],
  });

  const claimOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest("POST", `/api/delivery/orders/${orderId}/claim`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/available-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/delivery/earnings"] });
      clearNewAssignmentsCount();
      toast({ title: "Order claimed successfully! You can now pick it up." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to claim order", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest("POST", `/api/delivery/orders/${orderId}/accept`);
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
      const response = await apiRequest("POST", `/api/delivery/orders/${orderId}/pickup`);
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
      const response = await apiRequest("POST", `/api/delivery/orders/${orderId}/deliver`);
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
      case "accepted_by_delivery":
        return "bg-blue-100 text-blue-800";
      case "prepared":
        return "bg-cyan-100 text-cyan-800";
      case "preparing":
        return "bg-blue-100 text-blue-800";
      case "accepted_by_chef":
        return "bg-green-100 text-green-800";
      case "out_for_delivery":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const pendingOrders = orders.filter((o: any) => o.assignedTo && !["accepted_by_delivery", "out_for_delivery", "delivered"].includes(o.status));
  const activeOrders = orders.filter((o: any) => ["accepted_by_delivery", "out_for_delivery"].includes(o.status));
  const completedOrders = orders.filter((o: any) => o.status === "delivered");

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Mobile Header */}
      <header className="bg-white dark:bg-slate-800 border-b sticky top-0 z-40">
        <div className="px-3 md:px-6 py-3 md:py-4">
          {/* Delivery Person Name & Actions Row */}
          <div className="flex items-center justify-between gap-2 mb-3 md:mb-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-sm md:text-xl font-bold text-foreground truncate">
                {deliveryPersonName}
              </h1>
            </div>
            <div className="flex items-center gap-1">
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
            {newAssignmentsCount > 0 && (
              <Badge variant="destructive" className="text-xs flex items-center gap-1">
                <Bell className="h-2.5 w-2.5" />
                {newAssignmentsCount} New
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
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 h-auto">
            <TabsTrigger value="dashboard" className="text-xs md:text-sm py-2" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="available" className="text-xs md:text-sm py-2 relative" data-testid="tab-available">
              <span className="hidden md:inline">Available</span>
              <span className="md:hidden">Open</span>
              {availableOrders && availableOrders.length > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">{availableOrders.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs md:text-sm py-2" data-testid="tab-orders">Deliveries</TabsTrigger>
            <TabsTrigger value="earnings" className="text-xs md:text-sm py-2" data-testid="tab-earnings">Earnings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold" data-testid="stat-pending">{stats?.pendingCount || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Active</CardTitle>
                  <Package className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold" data-testid="stat-active">{stats?.activeCount || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-completed-today">{stats?.completedToday || 0}</div>
                </CardContent>
              </Card>
            </div>

            {availableOrders && availableOrders.length > 0 && (
              <Card className="border-orange-200 dark:border-orange-800">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-orange-600" />
                      Available Orders to Claim
                    </CardTitle>
                    <Badge variant="destructive">{availableOrders.length} Available</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {availableOrders.map((order: any) => (
                      <div
                        key={order.id}
                        className="flex flex-col gap-4 p-4 border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-950/20"
                        data-testid={`available-order-${order.id}`}
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

                        <Button
                          onClick={() => claimOrderMutation.mutate(order.id)}
                          disabled={claimOrderMutation.isPending}
                          size="default"
                          className="w-full"
                          data-testid={`button-claim-${order.id}`}
                        >
                          {claimOrderMutation.isPending ? "Claiming..." : "Claim This Order"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
                          {(order.status === "preparing" || order.status === "accepted_by_delivery" || order.status === "prepared") && (
                            <Button
                              size="sm"
                              onClick={() => pickupOrderMutation.mutate(order.id)}
                              disabled={pickupOrderMutation.isPending}
                              className="bg-purple-600 hover:bg-purple-700"
                              data-testid={`button-pickup-${order.id}`}
                            >
                              Mark as Picked Up
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

          <TabsContent value="available" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-600" />
                  Available Orders to Claim
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {availableOrders && availableOrders.length > 0 ? (
                    availableOrders.map((order: any) => (
                      <div
                        key={order.id}
                        className="flex flex-col gap-4 p-4 border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-950/20"
                        data-testid={`available-order-${order.id}`}
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

                        <Button
                          onClick={() => claimOrderMutation.mutate(order.id)}
                          disabled={claimOrderMutation.isPending}
                          size="default"
                          className="w-full"
                          data-testid={`button-claim-${order.id}`}
                        >
                          {claimOrderMutation.isPending ? "Claiming..." : "Claim This Order"}
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No available orders at the moment. You'll be notified when new orders are available.
                    </p>
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
                          {(order.status === "preparing" || order.status === "accepted_by_delivery" || order.status === "prepared") && (
                            <Button
                              size="sm"
                              onClick={() => pickupOrderMutation.mutate(order.id)}
                              disabled={pickupOrderMutation.isPending}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              Mark as Picked Up
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