import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Order } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

export default function AdminOrders() {
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin", "orders"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch orders");
      return response.json();
    },
  });

  const { data: chefs } = useQuery({
    queryKey: ["/api/admin", "chefs"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/chefs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch chefs");
      return response.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update order status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard/metrics"] });
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
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "confirmed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "preparing":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "out_for_delivery":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "delivered":
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Orders</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage customer orders and update their status
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} data-testid={`card-order-${order.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {order.customerName} • {order.phone}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {format(new Date(order.createdAt), "PPp")}
                      </p>
                      {order.chefId && chefs && (
                        <p className="text-sm font-medium text-primary mt-1">
                          Chef: {chefs.find((c: any) => c.id === order.chefId)?.name || "Unknown"}
                        </p>
                      )}
                    </div>
                    <Badge className={getStatusColor(order.status)} data-testid={`badge-status-${order.id}`}>
                      {order.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Delivery Address</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{order.address}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Items</p>
                    <div className="space-y-1">
                      {(order.items as any[]).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">
                            {item.name} x {item.quantity}
                          </span>
                          <span className="text-slate-900 dark:text-slate-100 font-medium">
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                          <span className="text-slate-900 dark:text-slate-100">₹{order.subtotal}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">Delivery Fee:</span>
                          <span className="text-slate-900 dark:text-slate-100">₹{order.deliveryFee}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span>₹{order.total}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Update Status:</span>
                      <Select
                        value={order.status}
                        onValueChange={(status) => updateStatusMutation.mutate({ orderId: order.id, status })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <SelectTrigger className="w-48" data-testid={`select-status-${order.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="preparing">Preparing</SelectItem>
                          <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-400">No orders found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
