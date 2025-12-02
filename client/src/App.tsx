import { lazy, Suspense } from "react";
import { Route, Switch, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/Home";
import MyOrders from "@/pages/MyOrders";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminInventory from "@/pages/admin/AdminInventory";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminReports from "./pages/admin/AdminReports";
import AdminChefs from "@/pages/admin/AdminChefs";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminManagement from "@/pages/admin/AdminManagement";
import AdminDeliverySettings from "@/pages/admin/AdminDeliverySettings";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminPartners from "./pages/admin/AdminPartners";
import PartnerLogin from "@/pages/partner/PartnerLogin";
import PartnerDashboard from "@/pages/partner/PartnerDashboard";
import PartnerProfile from "@/pages/partner/PartnerProfile";
import DeliveryLogin from "./pages/delivery/DeliveryLogin";
import DeliveryDashboard from "./pages/delivery/DeliveryDashboard";
import OrderTracking from "@/pages/OrderTracking";
import AdminWalletSettings from "./pages/admin/AdminWalletSettings";
import AdminDeliveryTimeSlots from "@/pages/admin/AdminDeliveryTimeSlots";
// Add AdminCartSettings import here
const AdminCartSettings = lazy(() => import("@/pages/admin/AdminCartSettings"));

// Import AdminPromotionalBanners component
const AdminPromotionalBanners = lazy(() => import("@/pages/admin/AdminPromotionalBanners"));

// ✅ Simple Auth Guard for customer routes
function ProtectedRoute({ component: Component }: { component: any }) {
  const { user, isLoading } = useAuth();
  const hasJwtToken = !!localStorage.getItem("userToken");

  // Wait for auth state to load before redirecting
  if (isLoading) {
    return null; // or return a loading spinner
  }

  // Check authentication - use Redirect component instead of setLocation
  if (!user && !hasJwtToken) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  const { user } = useAuth();
  const hasJwtToken = !!localStorage.getItem("userToken");

  return (
    <Switch>
      {/* ---------- ADMINROUTES ---------- */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/payments" component={AdminPayments} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/inventory" component={AdminInventory} />
      <Route path="/admin/notifications" component={AdminNotifications} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/subscriptions" component={AdminSubscriptions} />
      <Route path="/admin/promotional-banners" component={AdminPromotionalBanners} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/chefs" component={AdminChefs} />
      <Route path="/admin/partners" component={AdminPartners} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/admins" component={AdminManagement} />
      <Route path="/admin/delivery-settings" component={AdminDeliverySettings} />
      <Route path="/admin/wallet-settings" component={AdminWalletSettings} />
      <Route path="/admin/delivery-time-slots" component={AdminDeliveryTimeSlots} />
      {/* Add cart settings admin route */}
      <Route path="/admin/cart-settings" component={AdminCartSettings} />


      {/* ---------- PARTNER / DELIVERY ROUTES ---------- */}
      <Route path="/partner/login" component={PartnerLogin} />
      <Route path="/partner/dashboard" component={PartnerDashboard} />
      <Route path="/partner/profile" component={PartnerProfile} />
      <Route path="/delivery/login" component={DeliveryLogin} />
      <Route path="/delivery/dashboard" component={DeliveryDashboard} />

      {/* ---------- USERROUTES ---------- */}
      <Route path="/" component={Home} />
      <Route path="/landing" component={Landing} />

      {/* Protected (requires JWT or replit user) */}
      <Route
        path="/my-orders"
        component={() => <ProtectedRoute component={MyOrders} />}
      />
      <Route
        path="/profile"
        component={() => <ProtectedRoute component={Profile} />}
      />

      {/* Alias for /orders → same as /my-orders */}
      <Route
        path="/orders"
        component={() => <ProtectedRoute component={MyOrders} />}
      />

      <Route path="/track/:orderId" component={OrderTracking} />
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