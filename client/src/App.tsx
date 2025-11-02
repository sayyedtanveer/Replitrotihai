import { Route, Switch, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { AdminGuard } from "@/components/admin/AdminGuard";
import Home from "@/pages/Home";
import Landing from "@/pages/Landing";
import MyOrders from "@/pages/MyOrders";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminReports from "./pages/admin/AdminReports";
import AdminChefs from "@/pages/admin/AdminChefs";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminManagement from "@/pages/admin/AdminManagement";
import PartnerLogin from "@/pages/partner/PartnerLogin";
import PartnerDashboard from "@/pages/partner/PartnerDashboard";

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/subscriptions" component={AdminSubscriptions} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/chefs" component={AdminChefs} />
      <Route path="/admin/admins" component={AdminManagement} />
      <Route path="/admin/users" component={AdminUsers} />

      <Route path="/partner/login" component={PartnerLogin} />
      <Route path="/partner/dashboard" component={PartnerDashboard} />

      <Route path="/" component={Home} />
      {isAuthenticated ? (
        <>
          <Route path="/orders" component={MyOrders} />
          <Route path="/profile" component={Profile} />
        </>
      ) : (
        <Route path="/orders" component={() => <Redirect to="/" />} />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;