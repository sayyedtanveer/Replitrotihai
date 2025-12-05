import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubscriptionCard } from "./SubscriptionCard";
import { SubscriptionSchedule } from "./SubscriptionSchedule";
import PaymentQRDialog from "./PaymentQRDialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format, addDays, differenceInDays, isPast, isAfter } from "date-fns";
import { Calendar, Pause, Play, Clock, CheckCircle2, AlertCircle, Settings2, CalendarDays, History, RefreshCw, AlertTriangle } from "lucide-react";
import type { SubscriptionPlan, Subscription } from "@shared/schema";
import { useLocation } from "wouter";

interface SubscriptionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function SubscriptionDrawer({ isOpen, onClose }: SubscriptionDrawerProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPaymentQR, setShowPaymentQR] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    subscriptionId: string;
    amount: number;
    planName: string;
  } | null>(null);
  const [, setLocation] = useLocation();
  
  // Delivery slot selection for subscription (Roti category)
  const [showSlotSelectionModal, setShowSlotSelectionModal] = useState(false);
  const [selectedPlanForSubscription, setSelectedPlanForSubscription] = useState<string | null>(null);
  const [selectedSubscriptionSlotId, setSelectedSubscriptionSlotId] = useState<string>("");
  
  // Advanced pause modal state
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseSubscriptionId, setPauseSubscriptionId] = useState<string | null>(null);
  const [pauseStartDate, setPauseStartDate] = useState<string>("");
  const [pauseResumeDate, setPauseResumeDate] = useState<string>("");
  
  // Delivery time modal state
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeSubscriptionId, setTimeSubscriptionId] = useState<string | null>(null);
  const [selectedDeliveryTime, setSelectedDeliveryTime] = useState<string>("09:00");
  
  // Fetch available delivery time slots
  const { data: availableSlots = [] } = useQuery({
    queryKey: ["/api/delivery-slots"],
    queryFn: async () => {
      const response = await fetch("/api/delivery-slots");
      if (!response.ok) throw new Error("Failed to fetch delivery slots");
      return response.json();
    },
  });
  
  // Fetch categories to check if plan is Roti category
  const { data: categoryList } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });
  
  // Delivery history modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySubscriptionId, setHistorySubscriptionId] = useState<string | null>(null);
  
  // Renewal modal state
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renewalSubscription, setRenewalSubscription] = useState<Subscription | null>(null);

  const { data: plans, isLoading: plansLoading, error: plansError } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
    queryFn: async () => {
      const response = await fetch("/api/subscription-plans");
      if (!response.ok) throw new Error("Failed to fetch subscription plans");
      return response.json();
    },
    retry: 2,
  });

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("userToken");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  // Fetch user profile to get user details
  const { data: userProfile } = useQuery({
    queryKey: ["/api/user/profile"],
    queryFn: async () => {
      const response = await fetch("/api/user/profile", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch profile");
      const data = await response.json();
      
      // Store in localStorage for payment dialog
      localStorage.setItem("userName", data.name || "");
      localStorage.setItem("userPhone", data.phone || "");
      localStorage.setItem("userEmail", data.email || "");
      localStorage.setItem("userAddress", data.address || "");
      
      return data;
    },
    enabled: !!localStorage.getItem("userToken"),
  });

  const { data: mySubscriptions } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
    queryFn: async () => {
      const response = await fetch("/api/subscriptions", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        if (response.status === 401) {
          toast({ title: "Please login", description: "You need to login to view subscriptions", variant: "destructive" });
        }
        throw new Error("Failed to fetch subscriptions");
      }
      return response.json();
    },
    enabled: !!localStorage.getItem("userToken"),
  });

  const subscribeMutation = useMutation({
    mutationFn: async ({ planId, deliverySlotId }: { planId: string; deliverySlotId?: string }) => {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ planId, deliverySlotId }),
      });
      if (!response.ok) {
        if (response.status === 401) {
          toast({ title: "Please login", description: "You need to login to subscribe", variant: "destructive" });
        }
        throw new Error("Failed to create subscription");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      const plan = plans?.find(p => p.id === data.planId);

      // Show payment QR dialog with proper details
      const user = localStorage.getItem("userToken");
      let userName = "User";
      let userPhone = "";
      
      if (user) {
        // Decode token to get user info (simplified - in production use proper JWT decode)
        try {
          const payload = JSON.parse(atob(user.split('.')[1]));
          userName = payload.name || "User";
          userPhone = payload.phone || "";
        } catch (e) {
          console.error("Failed to decode token", e);
        }
      }

      setPaymentDetails({
        subscriptionId: data.id,
        amount: plan?.price || 0,
        planName: plan?.name || "Subscription",
      });
      setShowPaymentQR(true);

      toast({ 
        title: "Subscription Created!", 
        description: `Complete payment of ₹${plan?.price || 0} to activate your subscription` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create subscription", variant: "destructive" });
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ subscriptionId, paymentTransactionId }: { subscriptionId: string; paymentTransactionId: string }) => {
      if (!paymentTransactionId || paymentTransactionId.trim() === "") {
        throw new Error("Transaction ID is required");
      }
      
      const response = await fetch(`/api/subscriptions/${subscriptionId}/payment-confirmed`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ paymentTransactionId: paymentTransactionId.trim() }),
      });
      
      if (!response.ok) {
        let errorMessage = "Failed to confirm payment";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const error = await response.json();
            errorMessage = error.message || errorMessage;
          } else {
            // Handle HTML or other non-JSON responses
            const errorText = await response.text();
            console.error("Non-JSON error response:", errorText);
            errorMessage = "Server error occurred. Please try again or contact support.";
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
          errorMessage = "Unexpected error occurred. Please contact support.";
        }
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setShowPaymentQR(false);
      setPaymentDetails(null);
      toast({ 
        title: "Payment Submitted!", 
        description: "Admin will verify and activate your subscription shortly" 
      });
    },
    onError: (error: Error) => {
      console.error("Payment confirmation error:", error);
      toast({ 
        title: "Payment Confirmation Failed", 
        description: error.message || "Failed to confirm payment. Please try again.", 
        variant: "destructive" 
      });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async ({ subscriptionId, pauseStartDate, pauseResumeDate }: { 
      subscriptionId: string; 
      pauseStartDate?: string; 
      pauseResumeDate?: string;
    }) => {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/pause`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ pauseStartDate, pauseResumeDate }),
      });
      if (!response.ok) throw new Error("Failed to pause subscription");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setShowPauseModal(false);
      setPauseSubscriptionId(null);
      setPauseStartDate("");
      setPauseResumeDate("");
      
      let message = "Subscription paused successfully";
      if (data.pauseResumeDate) {
        message = `Subscription paused until ${format(new Date(data.pauseResumeDate), "PPP")}`;
      }
      toast({ title: "Paused", description: message });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to pause subscription", variant: "destructive" });
    },
  });

  const updateDeliveryTimeMutation = useMutation({
    mutationFn: async ({ subscriptionId, deliveryTime }: { subscriptionId: string; deliveryTime: string }) => {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/delivery-time`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ deliveryTime }),
      });
      if (!response.ok) throw new Error("Failed to update delivery time");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setShowTimeModal(false);
      setTimeSubscriptionId(null);
      toast({ title: "Updated", description: "Delivery time updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update delivery time", variant: "destructive" });
    },
  });

  // Fetch delivery history for a subscription
  const { data: deliveryHistory } = useQuery({
    queryKey: ["/api/subscriptions", historySubscriptionId, "delivery-logs"],
    queryFn: async () => {
      const response = await fetch(`/api/subscriptions/${historySubscriptionId}/delivery-logs`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch delivery history");
      return response.json();
    },
    enabled: !!historySubscriptionId && showHistoryModal,
  });

  // Renewal mutation
  const renewalMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/renew`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to renew subscription");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setShowRenewalModal(false);
      setRenewalSubscription(null);
      
      // Show payment QR for renewal
      const plan = plans?.find(p => p.id === data.planId);
      setPaymentDetails({
        subscriptionId: data.id,
        amount: plan?.price || 0,
        planName: plan?.name || "Subscription",
      });
      setShowPaymentQR(true);
      
      toast({ 
        title: "Renewal Created!", 
        description: "Complete payment to activate your renewal" 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to renew subscription", variant: "destructive" });
    },
  });

  // Helper function to check subscription expiration status
  const getExpirationStatus = (sub: Subscription) => {
    if (sub.remainingDeliveries <= 0) {
      return { isExpired: true, isExpiringSoon: false, daysRemaining: 0 };
    }
    
    const endDate = sub.endDate ? new Date(sub.endDate) : null;
    if (endDate) {
      const daysRemaining = differenceInDays(endDate, new Date());
      return {
        isExpired: isPast(endDate),
        isExpiringSoon: daysRemaining <= 7 && daysRemaining > 0,
        daysRemaining
      };
    }
    
    // Check based on remaining deliveries
    const isExpiringSoon = sub.remainingDeliveries <= 3;
    return { isExpired: false, isExpiringSoon, daysRemaining: sub.remainingDeliveries };
  };

  const resumeMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/resume`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to resume subscription");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ title: "Resumed", description: "Subscription resumed successfully" });
    },
  });

  // Cancel mutation is removed as per the requirement

  const activePlans = plans?.filter(p => p.isActive) || [];
  const categories = Array.from(new Set(activePlans.map(p => p.categoryId)));

  const filteredPlans = selectedCategory
    ? activePlans.filter(p => p.categoryId === selectedCategory)
    : activePlans;

  const subscribedPlanIds = mySubscriptions?.map(s => s.planId) || [];

  // Handler to check if plan needs delivery slot selection
  const handleSubscribe = (planId: string) => {
    const plan = plans?.find(p => p.id === planId);
    if (!plan) return;

    const category = categoryList?.find((c: any) => c.id === plan.categoryId);
    const isRotiCategory = category?.name?.toLowerCase().includes('roti');

    if (isRotiCategory) {
      // Show slot selection modal for Roti plans
      setSelectedPlanForSubscription(planId);
      setSelectedSubscriptionSlotId("");
      setShowSlotSelectionModal(true);
    } else {
      // Subscribe directly for non-Roti plans
      subscribeMutation.mutate({ planId });
    }
  };

  // Confirm subscription with selected slot
  const confirmSubscriptionWithSlot = () => {
    if (!selectedPlanForSubscription) return;

    if (!selectedSubscriptionSlotId) {
      toast({ 
        title: "Slot Required", 
        description: "Please select a delivery time slot", 
        variant: "destructive" 
      });
      return;
    }

    subscribeMutation.mutate({ 
      planId: selectedPlanForSubscription, 
      deliverySlotId: selectedSubscriptionSlotId 
    });
    setShowSlotSelectionModal(false);
    setSelectedPlanForSubscription(null);
    setSelectedSubscriptionSlotId("");
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Subscriptions</SheetTitle>
            <SheetDescription>
              Subscribe to get regular deliveries of your favorite meals
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="plans" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="plans">Available Plans</TabsTrigger>
              <TabsTrigger value="my-subscriptions">My Subscriptions</TabsTrigger>
            </TabsList>

            <TabsContent value="plans" className="space-y-4">
              {plansLoading ? (
                <div className="grid grid-cols-1 gap-4 mt-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="animate-pulse space-y-4">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                          <div className="h-8 bg-muted rounded w-1/4"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : plansError ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-destructive">Failed to load subscription plans</p>
                    <p className="text-sm text-muted-foreground mt-2">Please try again later</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4 mt-4">
                  {filteredPlans.map(plan => (
                    <SubscriptionCard
                      key={plan.id}
                      plan={plan}
                      onSubscribe={handleSubscribe}
                      isSubscribed={subscribedPlanIds.includes(plan.id)}
                    />
                  ))}
                  {filteredPlans.length === 0 && (
                    <Card>
                      <CardContent className="text-center py-12">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No subscription plans available</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="my-subscriptions" className="space-y-4">
              {mySubscriptions && mySubscriptions.length > 0 ? (
                <div className="space-y-4 mt-4">
                  {mySubscriptions.map(sub => {
                    const plan = plans?.find(p => p.id === sub.planId);
                    const expirationStatus = getExpirationStatus(sub);
                    return (
                      <div key={sub.id} className="space-y-4">
                        <Card className={expirationStatus.isExpiringSoon ? "border-yellow-500/50" : expirationStatus.isExpired ? "border-destructive/50" : ""}>
                          <CardHeader>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <CardTitle className="text-lg">{plan?.name}</CardTitle>
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Expiration warning badge */}
                                {sub.isPaid && expirationStatus.isExpiringSoon && (
                                  <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600 dark:text-yellow-500">
                                    <AlertTriangle className="w-3 h-3" />
                                    Expiring Soon
                                  </Badge>
                                )}
                                {sub.isPaid && expirationStatus.isExpired && (
                                  <Badge variant="outline" className="gap-1 border-destructive text-destructive">
                                    <AlertCircle className="w-3 h-3" />
                                    Expired
                                  </Badge>
                                )}
                                {/* Status badge */}
                                {!sub.isPaid && !sub.paymentTransactionId && (
                                  <Badge variant="destructive" className="gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Pending Payment
                                  </Badge>
                                )}
                                {!sub.isPaid && sub.paymentTransactionId && (
                                  <Badge variant="secondary" className="gap-1">
                                    <Clock className="w-3 h-3" />
                                    Awaiting Verification
                                  </Badge>
                                )}
                                {sub.isPaid && sub.status === "active" && !expirationStatus.isExpired && (
                                  <Badge variant="default" className="gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Active
                                  </Badge>
                                )}
                                {sub.isPaid && sub.status === "paused" && (
                                  <Badge variant="secondary" className="gap-1">
                                    <Pause className="w-3 h-3" />
                                    Paused
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Show delivery info only for active/paused subscriptions */}
                            {sub.isPaid && (
                              <div className="text-sm space-y-2">
                                <div className="flex justify-between gap-2">
                                  <span className="text-muted-foreground">Next Delivery:</span>
                                  <span className="font-medium">
                                    {format(new Date(sub.nextDeliveryDate), "PPP")}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-2">
                                  <span className="text-muted-foreground">Remaining:</span>
                                  <span className="font-medium">
                                    {sub.remainingDeliveries} of {sub.totalDeliveries} deliveries
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex justify-between gap-2 text-sm">
                              <span className="text-muted-foreground">Price:</span>
                              <span className="font-medium">₹{plan?.price}/{plan?.frequency}</span>
                            </div>

                            {/* Step 1: Payment Not Done */}
                            {!sub.isPaid && !sub.paymentTransactionId && (
                              <div className="space-y-3 pt-2">
                                <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
                                  <p className="text-sm text-center font-medium text-destructive">
                                    Complete payment to activate your subscription
                                  </p>
                                </div>
                                <Button
                                  className="w-full"
                                  data-testid={`button-pay-${sub.id}`}
                                  onClick={() => {
                                    setPaymentDetails({
                                      subscriptionId: sub.id,
                                      amount: plan?.price || 0,
                                      planName: plan?.name || "Subscription",
                                    });
                                    setShowPaymentQR(true);
                                  }}
                                >
                                  Pay Now - ₹{plan?.price}
                                </Button>
                              </div>
                            )}
                            
                            {/* Step 2: Payment Submitted - Waiting for Admin */}
                            {!sub.isPaid && sub.paymentTransactionId && (
                              <div className="space-y-3 pt-2">
                                <div className="p-3 bg-muted rounded-md border">
                                  <div className="flex items-center gap-2 justify-center">
                                    <Clock className="w-4 h-4 text-muted-foreground animate-pulse" />
                                    <span className="text-sm font-medium">Payment Under Review</span>
                                  </div>
                                  <p className="text-xs text-center text-muted-foreground mt-2">
                                    Admin will verify and activate your subscription shortly
                                  </p>
                                  <p className="text-xs text-center text-muted-foreground mt-1">
                                    Transaction ID: {sub.paymentTransactionId}
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* Step 3: Active Subscription - Can Pause and Configure */}
                            {sub.isPaid && sub.status === "active" && (
                              <div className="space-y-3 pt-2">
                                {/* Delivery Time Display */}
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Delivery Time:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{sub.nextDeliveryTime || "09:00"}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      data-testid={`button-change-time-${sub.id}`}
                                      onClick={() => {
                                        setTimeSubscriptionId(sub.id);
                                        setSelectedDeliveryTime(sub.nextDeliveryTime || "09:00");
                                        setShowTimeModal(true);
                                      }}
                                    >
                                      <Settings2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    data-testid={`button-pause-${sub.id}`}
                                    onClick={() => {
                                      setPauseSubscriptionId(sub.id);
                                      setPauseStartDate(format(new Date(), "yyyy-MM-dd"));
                                      setPauseResumeDate("");
                                      setShowPauseModal(true);
                                    }}
                                  >
                                    <Pause className="w-4 h-4 mr-2" />
                                    Pause Deliveries
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    data-testid={`button-history-${sub.id}`}
                                    onClick={() => {
                                      setHistorySubscriptionId(sub.id);
                                      setShowHistoryModal(true);
                                    }}
                                  >
                                    <History className="w-4 h-4 mr-2" />
                                    History
                                  </Button>
                                </div>
                              </div>
                            )}
                            
                            {/* Paused State - Can Resume */}
                            {sub.isPaid && sub.status === "paused" && (
                              <div className="space-y-3 pt-2">
                                <div className="p-3 bg-muted rounded-md border space-y-2">
                                  <p className="text-sm text-center font-medium">
                                    Subscription Paused
                                  </p>
                                  {sub.pauseStartDate && (
                                    <p className="text-xs text-center text-muted-foreground">
                                      Since: {format(new Date(sub.pauseStartDate), "PPP")}
                                    </p>
                                  )}
                                  {sub.pauseResumeDate && (
                                    <p className="text-xs text-center text-muted-foreground">
                                      Auto-resume: {format(new Date(sub.pauseResumeDate), "PPP")}
                                    </p>
                                  )}
                                  {!sub.pauseResumeDate && (
                                    <p className="text-xs text-center text-muted-foreground">
                                      Resume manually to continue deliveries
                                    </p>
                                  )}
                                </div>
                                <Button
                                  className="w-full"
                                  data-testid={`button-resume-${sub.id}`}
                                  onClick={() => resumeMutation.mutate(sub.id)}
                                  disabled={resumeMutation.isPending}
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  {resumeMutation.isPending ? "Resuming..." : "Resume Deliveries Now"}
                                </Button>
                              </div>
                            )}

                            {/* Expiration Warning and Renewal */}
                            {sub.isPaid && (expirationStatus.isExpiringSoon || expirationStatus.isExpired) && (
                              <div className="space-y-3 pt-2">
                                <div className={`p-3 rounded-md border ${
                                  expirationStatus.isExpired 
                                    ? "bg-destructive/10 border-destructive/20" 
                                    : "bg-yellow-500/10 border-yellow-500/20"
                                }`}>
                                  <div className="flex items-center gap-2 justify-center">
                                    {expirationStatus.isExpired ? (
                                      <AlertCircle className="w-4 h-4 text-destructive" />
                                    ) : (
                                      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
                                    )}
                                    <span className={`text-sm font-medium ${
                                      expirationStatus.isExpired ? "text-destructive" : "text-yellow-600 dark:text-yellow-500"
                                    }`}>
                                      {expirationStatus.isExpired 
                                        ? "Subscription Expired" 
                                        : `Only ${expirationStatus.daysRemaining} ${expirationStatus.daysRemaining === 1 ? 'delivery' : 'deliveries'} remaining`
                                      }
                                    </span>
                                  </div>
                                  <p className="text-xs text-center text-muted-foreground mt-2">
                                    {expirationStatus.isExpired 
                                      ? "Renew to continue enjoying your subscription" 
                                      : "Renew now to avoid interruption"
                                    }
                                  </p>
                                </div>
                                <Button
                                  className="w-full"
                                  data-testid={`button-renew-${sub.id}`}
                                  onClick={() => {
                                    setRenewalSubscription(sub);
                                    setShowRenewalModal(true);
                                  }}
                                >
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Renew Subscription - ₹{plan?.price}
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {sub.isPaid && sub.status === "active" && (
                          <SubscriptionSchedule subscriptionId={sub.id} />
                        )}
                      </div>
                    );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No active subscriptions</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Subscribe to a plan to see it here
                  </p>
                </CardContent>
              </Card>
            )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Payment QR Dialog */}
      {showPaymentQR && paymentDetails && (
        <PaymentQRDialog
          isOpen={showPaymentQR}
          onClose={() => {
            setShowPaymentQR(false);
            setPaymentDetails(null);
          }}
          orderId={paymentDetails.subscriptionId}
          amount={paymentDetails.amount}
          customerName={localStorage.getItem("userName") || "User"}
          phone={localStorage.getItem("userPhone") || ""}
          email={localStorage.getItem("userEmail") || ""}
          address={localStorage.getItem("userAddress") || ""}
          onPaymentConfirmed={(txnId: string) => {
            confirmPaymentMutation.mutate({
              subscriptionId: paymentDetails.subscriptionId,
              paymentTransactionId: txnId
            });
          }}
        />
      )}

      {/* Advanced Pause Modal */}
      <Dialog open={showPauseModal} onOpenChange={setShowPauseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Subscription</DialogTitle>
            <DialogDescription>
              Choose how long you want to pause your subscription. You can set a date range or pause indefinitely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pauseStart">Pause From</Label>
              <Input
                id="pauseStart"
                type="date"
                value={pauseStartDate}
                min={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => setPauseStartDate(e.target.value)}
                data-testid="input-pause-start"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pauseResume">Resume On (Optional)</Label>
              <Input
                id="pauseResume"
                type="date"
                value={pauseResumeDate}
                min={pauseStartDate || format(addDays(new Date(), 1), "yyyy-MM-dd")}
                onChange={(e) => setPauseResumeDate(e.target.value)}
                data-testid="input-pause-resume"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to pause indefinitely. You can resume manually anytime.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPauseModal(false)}>
              Cancel
            </Button>
            <Button
              data-testid="button-confirm-pause"
              onClick={() => {
                if (pauseSubscriptionId) {
                  pauseMutation.mutate({
                    subscriptionId: pauseSubscriptionId,
                    pauseStartDate: pauseStartDate || undefined,
                    pauseResumeDate: pauseResumeDate || undefined,
                  });
                }
              }}
              disabled={pauseMutation.isPending}
            >
              {pauseMutation.isPending ? "Pausing..." : "Pause Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Time Modal */}
      <Dialog open={showTimeModal} onOpenChange={setShowTimeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Delivery Time</DialogTitle>
            <DialogDescription>
              Select your preferred delivery time slot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deliveryTime">Delivery Time</Label>
              <Select value={selectedDeliveryTime} onValueChange={setSelectedDeliveryTime}>
                <SelectTrigger data-testid="select-delivery-time">
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.length > 0 ? (
                    availableSlots.map((slot: any) => (
                      <SelectItem key={slot.id} value={slot.startTime}>
                        {slot.label}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="09:00">Default: 9:00 AM - 10:00 AM</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTimeModal(false)}>
              Cancel
            </Button>
            <Button
              data-testid="button-save-delivery-time"
              onClick={() => {
                if (timeSubscriptionId) {
                  updateDeliveryTimeMutation.mutate({
                    subscriptionId: timeSubscriptionId,
                    deliveryTime: selectedDeliveryTime,
                  });
                }
              }}
              disabled={updateDeliveryTimeMutation.isPending}
            >
              {updateDeliveryTimeMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={(open) => {
        setShowHistoryModal(open);
        if (!open) setHistorySubscriptionId(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delivery History</DialogTitle>
            <DialogDescription>
              Your recent subscription deliveries
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-2 py-4">
            {deliveryHistory && deliveryHistory.length > 0 ? (
              deliveryHistory.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div>
                    <p className="text-sm font-medium">{format(new Date(log.date), "PPP")}</p>
                    <p className="text-xs text-muted-foreground">{log.time}</p>
                  </div>
                  <Badge
                    variant={
                      log.status === "delivered" ? "default" :
                      log.status === "missed" ? "destructive" :
                      "secondary"
                    }
                  >
                    {log.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No delivery history yet
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Slot Selection Modal for Subscription */}
      <Dialog open={showSlotSelectionModal} onOpenChange={(open) => {
        setShowSlotSelectionModal(open);
        if (!open) {
          setSelectedPlanForSubscription(null);
          setSelectedSubscriptionSlotId("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Delivery Time Slot</DialogTitle>
            <DialogDescription>
              Choose your preferred daily delivery time for fresh rotis
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subscriptionSlot">Delivery Time Slot *</Label>
              <Select 
                value={selectedSubscriptionSlotId} 
                onValueChange={setSelectedSubscriptionSlotId}
              >
                <SelectTrigger data-testid="select-subscription-slot">
                  <SelectValue placeholder="Choose a delivery time slot" />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots
                    .filter((slot: any) => slot.isActive && slot.currentOrders < slot.capacity)
                    .map((slot: any) => (
                      <SelectItem 
                        key={slot.id} 
                        value={slot.id}
                        data-testid={`subscription-slot-${slot.id}`}
                      >
                        {slot.label} ({slot.capacity - slot.currentOrders} slots available)
                      </SelectItem>
                    ))}
                  {availableSlots.filter((slot: any) => slot.isActive && slot.currentOrders < slot.capacity).length === 0 && (
                    <SelectItem value="none" disabled>
                      No delivery slots available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Your rotis will be delivered daily at your selected time slot
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowSlotSelectionModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSubscriptionWithSlot}
              disabled={!selectedSubscriptionSlotId || subscribeMutation.isPending}
              data-testid="button-confirm-subscription-slot"
            >
              {subscribeMutation.isPending ? "Creating..." : "Continue to Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renewal Confirmation Modal */}
      <Dialog open={showRenewalModal} onOpenChange={(open) => {
        setShowRenewalModal(open);
        if (!open) setRenewalSubscription(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Subscription</DialogTitle>
            <DialogDescription>
              Renew your subscription to continue enjoying deliveries
            </DialogDescription>
          </DialogHeader>
          {renewalSubscription && (() => {
            const plan = plans?.find(p => p.id === renewalSubscription.planId);
            return (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{plan?.name}</span>
                    <Badge>{plan?.frequency}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Price:</span>
                    <span className="font-bold text-lg">₹{plan?.price}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Deliveries:</span>
                    <span>{renewalSubscription?.totalDeliveries} deliveries</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  After renewal, you'll need to complete payment to activate your subscription.
                </p>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenewalModal(false)}>
              Cancel
            </Button>
            <Button
              data-testid="button-confirm-renewal"
              onClick={() => {
                if (renewalSubscription) {
                  renewalMutation.mutate(renewalSubscription.id);
                }
              }}
              disabled={renewalMutation.isPending}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {renewalMutation.isPending ? "Processing..." : "Renew Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SubscriptionDrawer;