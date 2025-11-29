import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscriptionCard } from "./SubscriptionCard";
import { SubscriptionSchedule } from "./SubscriptionSchedule";
import PaymentQRDialog from "./PaymentQRDialog"; // Added PaymentQRDialog
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Calendar, Pause, Play, X } from "lucide-react"; // X icon is no longer used for cancel
import type { SubscriptionPlan, Subscription } from "@shared/schema";
import { useLocation } from "wouter"; // Added useLocation

interface SubscriptionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function SubscriptionDrawer({ isOpen, onClose }: SubscriptionDrawerProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPaymentQR, setShowPaymentQR] = useState(false); // State for payment QR dialog
  const [paymentDetails, setPaymentDetails] = useState<{ // State for payment details
    subscriptionId: string;
    amount: number;
    planName: string;
  } | null>(null);
  const [, setLocation] = useLocation(); // Added for potential redirects

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
    mutationFn: async (planId: string) => {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ planId }),
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
      const response = await fetch(`/api/subscriptions/${subscriptionId}/payment-confirmed`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ paymentTransactionId }),
      });
      if (!response.ok) throw new Error("Failed to confirm payment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setShowPaymentQR(false);
      setPaymentDetails(null);
      toast({ 
        title: "Payment Confirmed!", 
        description: "Admin will verify and activate your subscription shortly" 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to confirm payment. Please try again.", 
        variant: "destructive" 
      });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/pause`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to pause subscription");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ title: "Paused", description: "Subscription paused successfully" });
    },
  });

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
                      onSubscribe={(planId) => subscribeMutation.mutate(planId)}
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
                    return (
                      <div key={sub.id} className="space-y-4">
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between gap-2">
                              <CardTitle className="text-lg">{plan?.name}</CardTitle>
                              <Badge variant={
                                sub.status === "active" ? "default" :
                                sub.status === "paused" ? "secondary" : "destructive"
                              }>
                                {sub.status}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="text-sm space-y-2">
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">Next Delivery:</span>
                                <span className="font-medium">
                                  {format(new Date(sub.nextDeliveryDate), "PPP")}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">Price:</span>
                                <span className="font-medium">₹{plan?.price}/{plan?.frequency}</span>
                              </div>
                            </div>

                            {!sub.isPaid ? (
                              <div className="space-y-2">
                                <Badge variant="destructive" className="w-full justify-center">
                                  Payment Pending - ₹{plan?.price}
                                </Badge>
                                <p className="text-xs text-center text-muted-foreground">
                                  {sub.paymentTransactionId ? 
                                    "Waiting for admin to verify your payment" : 
                                    "Please complete payment to activate subscription"
                                  }
                                </p>
                                {!sub.paymentTransactionId && (
                                  <Button
                                    size="sm"
                                    className="w-full"
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
                                )}
                                {sub.paymentTransactionId && (
                                  <Badge variant="outline" className="w-full justify-center text-xs">
                                    Payment submitted - Under verification
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {sub.status === "active" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    data-testid={`button-pause-${sub.id}`}
                                    onClick={() => pauseMutation.mutate(sub.id)}
                                  >
                                    <Pause className="w-4 h-4 mr-2" />
                                    Pause
                                  </Button>
                                )}
                                {sub.status === "paused" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    data-testid={`button-resume-${sub.id}`}
                                    onClick={() => resumeMutation.mutate(sub.id)}
                                  >
                                    <Play className="w-4 h-4 mr-2" />
                                    Resume
                                  </Button>
                                )}
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
    </>
  );
}

export default SubscriptionDrawer;