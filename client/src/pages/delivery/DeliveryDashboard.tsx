
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function DeliveryDashboard() {
  const deliveryToken = localStorage.getItem("deliveryToken");
  const deliveryPersonName = localStorage.getItem("deliveryPersonName");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: orders = [] } = useQuery({
    queryKey: ["/api/delivery/orders"],
    queryFn: async () => {
      const response = await fetch("/api/delivery/orders", {
        headers: { Authorization: `Bearer ${deliveryToken}` },
      });
      if (!response.ok) throw new Error("Failed to fetch orders");
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
  const activeOrders = orders.filter((o: any) => ["preparing", "out_for_delivery"].includes(o.status));
  const completedOrders = orders.filter((o: any) => o.status === "delivered");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {deliveryPersonName} - Delivery Dashboard
          </h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingOrders.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeOrders.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedOrders.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders && orders.length > 0 ? (
                orders.map((order: any) => (
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
                      {order.status === "assigned" && (
                        <Button
                          onClick={() => acceptOrderMutation.mutate(order.id)}
                          disabled={acceptOrderMutation.isPending}
                          size="sm"
                        >
                          Accept Order
                        </Button>
                      )}
                      {order.status === "preparing" && (
                        <Button
                          onClick={() => pickupOrderMutation.mutate(order.id)}
                          disabled={pickupOrderMutation.isPending}
                          size="sm"
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
                <p className="text-center text-muted-foreground py-8">No orders assigned yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
