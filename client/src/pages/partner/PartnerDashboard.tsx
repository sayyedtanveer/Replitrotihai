
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, Clock, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function PartnerDashboard() {
  const partnerToken = localStorage.getItem("partnerToken");
  const chefName = localStorage.getItem("partnerChefName");

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
      return response.json();
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
      case "preparing":
        return "bg-blue-100 text-blue-800";
      case "out_for_delivery":
        return "bg-purple-100 text-purple-800";
      case "delivered":
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {chefName} - Partner Dashboard
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                orders.slice(0, 10).map((order: any) => (
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
                    <div className="text-right">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace("_", " ").toUpperCase()}
                      </Badge>
                      <p className="font-bold mt-2">₹{order.total}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No orders yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
