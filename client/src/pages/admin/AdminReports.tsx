
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { 
  CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Package,
  Download,
  BarChart3
} from "lucide-react";
import { useState } from "react";

interface SalesReport {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Array<{ id: string; name: string; quantity: number; revenue: number }>;
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
  revenueChange: number;
  ordersChange: number;
}

interface UserReport {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  userGrowth: number;
  topCustomers: Array<{ id: string; name: string; email: string; totalSpent: number; orderCount: number }>;
}

interface InventoryReport {
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
  categories: Array<{ name: string; productCount: number; revenue: number }>;
}

interface SubscriptionReport {
  totalSubscriptions: number;
  activeSubscriptions: number;
  pausedSubscriptions: number;
  cancelledSubscriptions: number;
  subscriptionRevenue: number;
  topPlans: Array<{ id: string; name: string; subscriberCount: number; revenue: number }>;
}

export default function AdminReports() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: salesReport, isLoading: salesLoading } = useQuery<SalesReport>({
    queryKey: ["/api/admin/reports/sales", dateRange],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        `/api/admin/reports/sales?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to fetch sales report");
      return response.json();
    },
  });

  const { data: userReport, isLoading: userLoading } = useQuery<UserReport>({
    queryKey: ["/api/admin/reports/users", dateRange],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        `/api/admin/reports/users?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to fetch user report");
      return response.json();
    },
  });

  const { data: inventoryReport } = useQuery<InventoryReport>({
    queryKey: ["/api/admin/reports/inventory"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/reports/inventory", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch inventory report");
      return response.json();
    },
  });

  const { data: subscriptionReport } = useQuery<SubscriptionReport>({
    queryKey: ["/api/admin/reports/subscriptions", dateRange],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        `/api/admin/reports/subscriptions?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to fetch subscription report");
      return response.json();
    },
  });

  const handleExportCSV = (reportType: string) => {
    const token = localStorage.getItem("adminToken");
    window.open(
      `/api/admin/reports/export/${reportType}?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}&token=${token}`,
      '_blank'
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Reports & Analytics</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Comprehensive business insights and performance metrics
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                >
                  Last 7 days
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                >
                  Last 30 days
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}
                >
                  Last 90 days
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="w-4 h-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{salesReport?.totalRevenue || 0}</div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    {(salesReport?.revenueChange || 0) >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1 text-green-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1 text-red-600" />
                    )}
                    <span className={cn((salesReport?.revenueChange || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                      {Math.abs(salesReport?.revenueChange || 0)}%
                    </span>
                    <span className="ml-1">from previous period</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{salesReport?.totalOrders || 0}</div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    {(salesReport?.ordersChange || 0) >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1 text-green-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1 text-red-600" />
                    )}
                    <span className={cn((salesReport?.ordersChange || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                      {Math.abs(salesReport?.ordersChange || 0)}%
                    </span>
                    <span className="ml-1">from previous period</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{salesReport?.averageOrderValue || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Top Selling Products</CardTitle>
                  <CardDescription>Best performing items in selected period</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleExportCSV('sales')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesReport?.topProducts?.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.quantity} units sold</p>
                        </div>
                      </div>
                      <p className="font-semibold">₹{product.revenue}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userReport?.totalUsers || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">New Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userReport?.newUsers || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userReport?.activeUsers || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userReport?.userGrowth || 0}%</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Top Customers</CardTitle>
                  <CardDescription>Highest spending customers</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleExportCSV('users')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userReport?.topCustomers?.map((customer, index) => (
                    <div key={customer.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{customer.totalSpent}</p>
                        <p className="text-sm text-muted-foreground">{customer.orderCount} orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{inventoryReport?.totalProducts || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{inventoryReport?.lowStock || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{inventoryReport?.outOfStock || 0}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Category Performance</CardTitle>
                  <CardDescription>Revenue by category</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleExportCSV('inventory')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {inventoryReport?.categories?.map((category) => (
                    <div key={category.name} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-sm text-muted-foreground">{category.productCount} products</p>
                      </div>
                      <p className="font-semibold">₹{category.revenue}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{subscriptionReport?.totalSubscriptions || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{subscriptionReport?.activeSubscriptions || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Paused</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{subscriptionReport?.pausedSubscriptions || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{subscriptionReport?.subscriptionRevenue || 0}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Top Subscription Plans</CardTitle>
                  <CardDescription>Most popular subscription plans</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleExportCSV('subscriptions')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subscriptionReport?.topPlans?.map((plan, index) => (
                    <div key={plan.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <div>
                          <p className="font-medium">{plan.name}</p>
                          <p className="text-sm text-muted-foreground">{plan.subscriberCount} subscribers</p>
                        </div>
                      </div>
                      <p className="font-semibold">₹{plan.revenue}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
