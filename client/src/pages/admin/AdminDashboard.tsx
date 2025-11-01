import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingBag, DollarSign, Clock, CheckCircle } from "lucide-react";

interface DashboardMetrics {
  userCount: number;
  orderCount: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
}

export default function AdminDashboard() {
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/admin/dashboard/metrics"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/dashboard/metrics", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch metrics");
      return response.json();
    },
  });

  const stats = [
    {
      title: "Total Users",
      value: metrics?.userCount || 0,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Total Orders",
      value: metrics?.orderCount || 0,
      icon: ShoppingBag,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      title: "Total Revenue",
      value: `₹${metrics?.totalRevenue || 0}`,
      icon: DollarSign,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Pending Orders",
      value: metrics?.pendingOrders || 0,
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950",
    },
    {
      title: "Completed Orders",
      value: metrics?.completedOrders || 0,
      icon: CheckCircle,
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-50 dark:bg-teal-950",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Overview of your food delivery platform
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} data-testid={`card-metric-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid={`text-${stat.title.toLowerCase().replace(/\s+/g, "-")}-value`}>
                      {stat.value}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Welcome to the Admin Panel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-400">
              Use the sidebar navigation to manage your food delivery platform. You can:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2 text-slate-700 dark:text-slate-300">
              <li>View and manage customer orders</li>
              <li>Add, edit, and delete products</li>
              <li>Manage food categories</li>
              <li>View registered users</li>
              <li>Manage chef/restaurant partnerships</li>
              {metrics && (
                <li className="font-semibold text-primary">
                  Monitor real-time metrics and analytics
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
