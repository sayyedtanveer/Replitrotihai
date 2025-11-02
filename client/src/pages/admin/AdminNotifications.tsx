import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, ShoppingBag, AlertTriangle, Info, CheckCircle, Clock } from "lucide-react";
import type { Order, Product } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function AdminNotifications() {
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
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

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin", "products"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  // Get recent orders (last 24 hours) and sort by newest first
  const recentOrders = orders
    .filter((order) => {
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 24;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  // Get low stock products
  const lowStockProducts = products.filter(
    (p) => (p.stockQuantity || 0) <= (p.lowStockThreshold || 20)
  );

  // Get out of stock products
  const outOfStockProducts = products.filter((p) => (p.stockQuantity || 0) === 0);

  // Get pending orders
  const pendingOrders = orders.filter((o) => o.status === "pending");

  const getOrderStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "confirmed":
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case "preparing":
        return <Info className="w-4 h-4 text-purple-600" />;
      case "out_for_delivery":
        return <ShoppingBag className="w-4 h-4 text-orange-600" />;
      case "delivered":
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getOrderStatusColor = (status: string) => {
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
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const totalNotifications = recentOrders.length + lowStockProducts.length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2" data-testid="text-notifications-title">
            <Bell className="w-8 h-8" />
            Notifications
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Stay updated with orders, stock alerts, and system events
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {totalNotifications}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Pending Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {pendingOrders.length}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {lowStockProducts.length}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Out of Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {outOfStockProducts.length}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications Tabs */}
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="orders" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="orders" data-testid="tab-orders">
                  Orders ({recentOrders.length})
                </TabsTrigger>
                <TabsTrigger value="stock" data-testid="tab-stock">
                  Stock Alerts ({lowStockProducts.length})
                </TabsTrigger>
                <TabsTrigger value="all" data-testid="tab-all">
                  All ({totalNotifications})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="mt-4">
                <ScrollArea className="h-[600px] pr-4">
                  {ordersLoading ? (
                    <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                      Loading orders...
                    </div>
                  ) : recentOrders.length === 0 ? (
                    <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                      No recent orders
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentOrders.map((order) => (
                        <Card key={order.id} className="hover:border-primary transition-colors" data-testid={`notification-order-${order.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="mt-1">
                                  {getOrderStatusIcon(order.status)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                      New Order #{order.id.slice(0, 8)}
                                    </h4>
                                    <Badge className={getOrderStatusColor(order.status)}>
                                      {order.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Customer: {order.customerName}
                                  </p>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Total: ₹{order.total}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="stock" className="mt-4">
                <ScrollArea className="h-[600px] pr-4">
                  {productsLoading ? (
                    <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                      Loading products...
                    </div>
                  ) : lowStockProducts.length === 0 ? (
                    <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                      All products have sufficient stock
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {lowStockProducts.map((product) => (
                        <Card key={product.id} className="hover:border-yellow-500 transition-colors" data-testid={`notification-stock-${product.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-1" />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                    {product.name}
                                  </h4>
                                  <Badge
                                    className={
                                      (product.stockQuantity || 0) === 0
                                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                    }
                                  >
                                    {(product.stockQuantity || 0) === 0 ? "Out of Stock" : "Low Stock"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  Current Stock: {product.stockQuantity || 0} units
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  Threshold: {product.lowStockThreshold || 20} units
                                </p>
                                {(product.stockQuantity || 0) === 0 && (
                                  <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-1">
                                    ⚠️ Immediate restocking required
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="all" className="mt-4">
                <ScrollArea className="h-[600px] pr-4">
                  {ordersLoading || productsLoading ? (
                    <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                      Loading notifications...
                    </div>
                  ) : totalNotifications === 0 ? (
                    <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                      <Bell className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                      No notifications
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Stock Alerts First */}
                      {lowStockProducts.map((product) => (
                        <Card key={`all-stock-${product.id}`} className="hover:border-yellow-500 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-1" />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                    Low Stock: {product.name}
                                  </h4>
                                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                    Stock Alert
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  Only {product.stockQuantity || 0} units remaining
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {/* Recent Orders */}
                      {recentOrders.map((order) => (
                        <Card key={`all-order-${order.id}`} className="hover:border-primary transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {getOrderStatusIcon(order.status)}
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                    Order #{order.id.slice(0, 8)}
                                  </h4>
                                  <Badge className={getOrderStatusColor(order.status)}>
                                    {order.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {order.customerName} • ₹{order.total}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
