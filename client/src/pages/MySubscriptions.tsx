import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MenuDrawer from "@/components/MenuDrawer";
import CartSidebar from "@/components/CartSidebar";
import ChefListDrawer from "@/components/ChefListDrawer";
import SubscriptionDrawer from "@/components/SubscriptionDrawer";
import LoginDialog from "@/components/LoginDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Pause,
  Play,
  ChefHat,
  MapPin,
  Phone,
  CreditCard,
  Package,
  History,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format, isPast, isToday, addDays, differenceInDays } from "date-fns";
import type { Category, Chef, Subscription, SubscriptionPlan } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

interface DeliveryRecord {
  date: string;
  status: "delivered" | "missed" | "pending";
  notes?: string;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  expired: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  pending_payment: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
  expired: "Expired",
  pending_payment: "Payment Pending",
};

export default function MySubscriptions() {
  const [, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isChefListOpen, setIsChefListOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const userToken = localStorage.getItem("userToken");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [expandedSubscription, setExpandedSubscription] = useState<string | null>(null);

  const isAuthenticated = !!(user || userToken);

  const {
    data: subscriptions = [],
    isLoading,
    error,
  } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (userToken) headers.Authorization = `Bearer ${userToken}`;
      const res = await fetch("/api/subscriptions", { headers, credentials: "include" });
      if (res.status === 401) {
        localStorage.removeItem("userToken");
        localStorage.removeItem("userData");
        throw new Error("Session expired. Please log in again.");
      }
      if (!res.ok) {
        throw new Error("Failed to fetch subscriptions");
      }
      return res.json();
    },
  });

  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
    queryFn: async () => {
      const res = await fetch("/api/subscription-plans");
      if (!res.ok) throw new Error("Failed to fetch plans");
      return res.json();
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const { data: chefs = [] } = useQuery<Chef[]>({
    queryKey: ["/api/chefs"],
    queryFn: async () => {
      const res = await fetch("/api/chefs");
      if (!res.ok) throw new Error("Failed to fetch chefs");
      return res.json();
    },
  });

  const { data: deliverySlots = [] } = useQuery<{ id: string; name: string; startTime: string; endTime: string }[]>({
    queryKey: ["/api/delivery-slots"],
    queryFn: async () => {
      const res = await fetch("/api/delivery-slots");
      if (!res.ok) throw new Error("Failed to fetch delivery slots");
      return res.json();
    },
  });

  const getPlanName = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    return plan?.name || "Unknown Plan";
  };

  const getCategoryName = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return "Unknown";
    const category = categories.find((c) => c.id === plan.categoryId);
    return category?.name || "Unknown Category";
  };

  const getChefName = (chefId: string | null) => {
    if (!chefId) return "Not Assigned";
    const chef = chefs.find((c) => c.id === chefId);
    return chef?.name || "Unknown Chef";
  };

  const getDeliverySlotInfo = (slotId: string | null) => {
    if (!slotId) return null;
    const slot = deliverySlots.find((s) => s.id === slotId);
    return slot;
  };

  const getDeliveryProgress = (subscription: Subscription) => {
    const total = subscription.totalDeliveries || 30;
    const remaining = subscription.remainingDeliveries || 0;
    const delivered = total - remaining;
    return {
      delivered,
      remaining,
      total,
      percentage: (delivered / total) * 100,
    };
  };

  const getNextDeliveryInfo = (subscription: Subscription) => {
    if (!subscription.nextDeliveryDate) return null;
    const nextDate = new Date(subscription.nextDeliveryDate);
    const slot = getDeliverySlotInfo(subscription.deliverySlotId);
    
    return {
      date: nextDate,
      isToday: isToday(nextDate),
      isPast: isPast(nextDate),
      daysUntil: differenceInDays(nextDate, new Date()),
      slotName: slot?.name || "Standard",
      slotTime: slot ? `${slot.startTime} - ${slot.endTime}` : subscription.nextDeliveryTime || "09:00",
    };
  };

  if (!isAuthenticated && !authLoading) {
    return <Redirect to="/" />;
  }

  const activeSubscriptions = subscriptions.filter((s) => s.status === "active");
  const pausedSubscriptions = subscriptions.filter((s) => s.status === "paused");
  const otherSubscriptions = subscriptions.filter(
    (s) => !["active", "paused"].includes(s.status)
  );

  return (
    <div className="min-h-screen bg-background">
      <Header
        onCartClick={() => setIsCartOpen(true)}
        onMenuClick={() => setIsMenuOpen(true)}
        onChefListClick={() => setIsChefListOpen(true)}
        onSubscriptionClick={() => setIsSubscriptionOpen(true)}
        onLoginClick={() => setIsLoginOpen(true)}
        onOffersClick={() => {}}
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">My Subscriptions</h1>
            <p className="text-muted-foreground">
              Manage your meal subscriptions and delivery schedule
            </p>
          </div>
          <Button
            onClick={() => setIsSubscriptionOpen(true)}
            data-testid="button-new-subscription"
          >
            <Calendar className="w-4 h-4 mr-2" />
            New Subscription
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <AlertCircle className="w-12 h-12 text-destructive" />
              <p className="text-muted-foreground">Failed to load subscriptions</p>
              <Button
                variant="outline"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] })}
                data-testid="button-retry"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : subscriptions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <Calendar className="w-16 h-16 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No Subscriptions Yet</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                Subscribe to our meal plans and get fresh meals delivered to your doorstep every day!
              </p>
              <Button
                onClick={() => setIsSubscriptionOpen(true)}
                data-testid="button-start-subscription"
              >
                Start a Subscription
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {activeSubscriptions.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Active Subscriptions
                </h2>
                <div className="space-y-4">
                  {activeSubscriptions.map((subscription) => (
                    <SubscriptionCard
                      key={subscription.id}
                      subscription={subscription}
                      getPlanName={getPlanName}
                      getCategoryName={getCategoryName}
                      getChefName={getChefName}
                      getDeliveryProgress={getDeliveryProgress}
                      getNextDeliveryInfo={getNextDeliveryInfo}
                      isExpanded={expandedSubscription === subscription.id}
                      onToggle={() =>
                        setExpandedSubscription(
                          expandedSubscription === subscription.id ? null : subscription.id
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            )}

            {pausedSubscriptions.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Pause className="w-5 h-5 text-yellow-600" />
                  Paused Subscriptions
                </h2>
                <div className="space-y-4">
                  {pausedSubscriptions.map((subscription) => (
                    <SubscriptionCard
                      key={subscription.id}
                      subscription={subscription}
                      getPlanName={getPlanName}
                      getCategoryName={getCategoryName}
                      getChefName={getChefName}
                      getDeliveryProgress={getDeliveryProgress}
                      getNextDeliveryInfo={getNextDeliveryInfo}
                      isExpanded={expandedSubscription === subscription.id}
                      onToggle={() =>
                        setExpandedSubscription(
                          expandedSubscription === subscription.id ? null : subscription.id
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            )}

            {otherSubscriptions.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-muted-foreground" />
                  Past Subscriptions
                </h2>
                <div className="space-y-4">
                  {otherSubscriptions.map((subscription) => (
                    <SubscriptionCard
                      key={subscription.id}
                      subscription={subscription}
                      getPlanName={getPlanName}
                      getCategoryName={getCategoryName}
                      getChefName={getChefName}
                      getDeliveryProgress={getDeliveryProgress}
                      getNextDeliveryInfo={getNextDeliveryInfo}
                      isExpanded={expandedSubscription === subscription.id}
                      onToggle={() =>
                        setExpandedSubscription(
                          expandedSubscription === subscription.id ? null : subscription.id
                        )
                      }
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <Footer />

      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        categories={categories}
        onCategoryClick={(categoryId: string) => {
          const category = categories.find(c => c.id === categoryId);
          if (category) setSelectedCategory(category);
          setIsMenuOpen(false);
          setLocation("/");
        }}
        onLoginClick={() => {
          setIsMenuOpen(false);
          setIsLoginOpen(true);
        }}
        onSubscriptionClick={() => {
          setIsMenuOpen(false);
          setIsSubscriptionOpen(true);
        }}
      />

      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={() => {
          setIsCartOpen(false);
          setLocation("/");
        }}
      />

      <ChefListDrawer
        isOpen={isChefListOpen}
        onClose={() => setIsChefListOpen(false)}
        category={selectedCategory}
        chefs={chefs}
        onChefClick={() => {
          setIsChefListOpen(false);
          setLocation("/");
        }}
      />

      <SubscriptionDrawer
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
      />

      <LoginDialog
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />
    </div>
  );
}

interface SubscriptionCardProps {
  subscription: Subscription;
  getPlanName: (planId: string) => string;
  getCategoryName: (planId: string) => string;
  getChefName: (chefId: string | null) => string;
  getDeliveryProgress: (subscription: Subscription) => {
    delivered: number;
    remaining: number;
    total: number;
    percentage: number;
  };
  getNextDeliveryInfo: (subscription: Subscription) => {
    date: Date;
    isToday: boolean;
    isPast: boolean;
    daysUntil: number;
    slotName: string;
    slotTime: string;
  } | null;
  isExpanded: boolean;
  onToggle: () => void;
}

function SubscriptionCard({
  subscription,
  getPlanName,
  getCategoryName,
  getChefName,
  getDeliveryProgress,
  getNextDeliveryInfo,
  isExpanded,
  onToggle,
}: SubscriptionCardProps) {
  const progress = getDeliveryProgress(subscription);
  const nextDelivery = getNextDeliveryInfo(subscription);
  const deliveryHistory = (subscription.deliveryHistory as DeliveryRecord[] | null) || [];

  return (
    <Card className="overflow-visible" data-testid={`card-subscription-${subscription.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg" data-testid={`text-plan-name-${subscription.id}`}>
                {getPlanName(subscription.planId)}
              </CardTitle>
              <Badge
                className={statusColors[subscription.status] || "bg-gray-100 text-gray-800"}
                data-testid={`badge-status-${subscription.id}`}
              >
                {statusLabels[subscription.status] || subscription.status}
              </Badge>
              {!subscription.isPaid && subscription.status !== "cancelled" && (
                <Badge variant="destructive" data-testid={`badge-unpaid-${subscription.id}`}>
                  Unpaid
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              {getCategoryName(subscription.planId)}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            data-testid={`button-toggle-${subscription.id}`}
          >
            {isExpanded ? "Show Less" : "Details"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Deliveries</span>
            <span className="font-medium" data-testid={`text-deliveries-${subscription.id}`}>
              {progress.delivered} of {progress.total} delivered
            </span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress.remaining} remaining</span>
            <span>{Math.round(progress.percentage)}% complete</span>
          </div>
        </div>

        {subscription.status === "active" && nextDelivery && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
            <div className="flex-shrink-0">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium" data-testid={`text-next-delivery-${subscription.id}`}>
                {nextDelivery.isToday
                  ? "Today"
                  : nextDelivery.daysUntil === 1
                  ? "Tomorrow"
                  : format(nextDelivery.date, "EEEE, MMM d")}
              </p>
              <p className="text-sm text-muted-foreground">
                {nextDelivery.slotName} ({nextDelivery.slotTime})
              </p>
            </div>
            {nextDelivery.isToday && (
              <Badge variant="secondary">Arriving Soon</Badge>
            )}
          </div>
        )}

        {subscription.status === "paused" && subscription.pauseResumeDate && (
          <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
            <Play className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="font-medium">Resuming on</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(subscription.pauseResumeDate), "EEEE, MMM d, yyyy")}
              </p>
            </div>
          </div>
        )}

        {isExpanded && (
          <div className="pt-4 space-y-4 border-t">
            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Chef:</span>
                <span className="font-medium" data-testid={`text-chef-${subscription.id}`}>
                  {getChefName(subscription.chefId)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Delivery Address:</span>
                <span className="font-medium truncate" data-testid={`text-address-${subscription.id}`}>
                  {subscription.address}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium" data-testid={`text-phone-${subscription.id}`}>
                  {subscription.phone}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Started:</span>
                <span className="font-medium">
                  {format(new Date(subscription.startDate), "MMM d, yyyy")}
                </span>
              </div>
              {subscription.endDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {subscription.status === "expired" ? "Ended:" : "Ends:"}
                  </span>
                  <span className="font-medium">
                    {format(new Date(subscription.endDate), "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </div>

            {subscription.finalAmount !== undefined && subscription.finalAmount !== null && (
              <div className="p-3 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Payment Details</span>
                </div>
                <div className="grid gap-1 text-sm">
                  {subscription.originalPrice && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Original Price</span>
                      <span>Rs. {subscription.originalPrice}</span>
                    </div>
                  )}
                  {subscription.discountAmount && subscription.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>- Rs. {subscription.discountAmount}</span>
                    </div>
                  )}
                  {subscription.walletAmountUsed && subscription.walletAmountUsed > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Wallet Applied</span>
                      <span>- Rs. {subscription.walletAmountUsed}</span>
                    </div>
                  )}
                  {subscription.couponDiscount && subscription.couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Coupon ({subscription.couponCode})</span>
                      <span>- Rs. {subscription.couponDiscount}</span>
                    </div>
                  )}
                  <Separator className="my-1" />
                  <div className="flex justify-between font-medium">
                    <span>Final Amount</span>
                    <span>Rs. {subscription.finalAmount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className={subscription.isPaid ? "text-green-600" : "text-orange-600"}>
                      {subscription.isPaid ? "Paid" : "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {deliveryHistory.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Recent Deliveries</span>
                </div>
                <div className="space-y-2">
                  {deliveryHistory.slice(-5).reverse().map((delivery, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded"
                    >
                      <span>{format(new Date(delivery.date), "MMM d, yyyy")}</span>
                      <Badge
                        variant={
                          delivery.status === "delivered"
                            ? "default"
                            : delivery.status === "missed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {delivery.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
