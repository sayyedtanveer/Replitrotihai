import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  ChefHat,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  FolderKanban,
  Grid3x3,
  Calendar,
  BarChart3,
  Boxes,
  Bell,
  CreditCard,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

import SubscriptionDrawer from "@/components/SubscriptionDrawer";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}");

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
      setLocation("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Orders", href: "/admin/orders", icon: ShoppingBag },
    { name: "Payments", href: "/admin/payments", icon: CreditCard },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Inventory", href: "/admin/inventory", icon: Boxes },
    { name: "Categories", href: "/admin/categories", icon: FolderKanban },
    { name: "Chefs", href: "/admin/chefs", icon: ChefHat },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Notifications", href: "/admin/notifications", icon: Bell },
    { name: "Reports", href: "/admin/reports", icon: BarChart3 },
  ];

  if (adminUser.role === "super_admin") {
    navigation.push({ name: "Admin Management", href: "/admin/admins", icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="lg:flex">
        <div
          className={`fixed inset-0 z-40 lg:hidden ${isSidebarOpen ? "block" : "hidden"}`}
          onClick={() => setIsSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50"></div>
        </div>

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              <span className="font-bold text-lg">Admin Panel</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
              data-testid="button-close-sidebar"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-600 dark:text-slate-400">Logged in as</div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">{adminUser.username}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">{adminUser.role?.replace("_", " ")}</div>
          </div>

          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href}>
                  <a
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                    data-testid={`link-${item.name.toLowerCase().replace(" ", "-")}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </a>
                </Link>
              );
            })}
            <Link href="/admin/subscriptions">
              <a className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${location === "/admin/subscriptions" ? "bg-primary text-primary-foreground" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                <Calendar className="w-5 h-5" />
                <span>Subscriptions</span>
              </a>
            </Link>
            <Link href="/admin/delivery-settings">
              <a className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${location === "/admin/delivery-settings" ? "bg-primary text-primary-foreground" : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                <Truck className="w-5 h-5" />
                <span>Delivery Settings</span>
              </a>
            </Link>
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full justify-start gap-3"
              data-testid="button-logout"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </Button>
          </div>
        </aside>

        <div className="flex-1 lg:pl-64">
          <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30">
            <div className="flex items-center justify-between p-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(true)}
                data-testid="button-open-sidebar"
              >
                <Menu className="w-6 h-6" />
              </Button>
              <div className="text-lg font-semibold lg:block hidden">RotiHai Admin</div>
              <div></div>
            </div>
          </header>

          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}