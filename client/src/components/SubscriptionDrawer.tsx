import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscriptionCard } from "./SubscriptionCard";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Calendar, Pause, Play, X } from "lucide-react";
import type { SubscriptionPlan, Subscription } from "@shared/schema";

interface SubscriptionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function SubscriptionDrawer({ isOpen, onClose }: SubscriptionDrawerProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: plans } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscription-plans"],
    queryFn: async () => {
      const response = await fetch("/api/subscription-plans");
      if (!response.ok) throw new Error("Failed to fetch subscription plans");
      return response.json();
    },
  });

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("userToken");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ title: "Subscribed!", description: "Your subscription has been activated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create subscription", variant: "destructive" });
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

  const cancelMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to cancel subscription");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({ title: "Cancelled", description: "Subscription cancelled successfully" });
    },
  });

  const activePlans = plans?.filter(p => p.isActive) || [];
  const categories = Array.from(new Set(activePlans.map(p => p.categoryId)));

  const filteredPlans = selectedCategory
    ? activePlans.filter(p => p.categoryId === selectedCategory)
    : activePlans;

  const subscribedPlanIds = mySubscriptions?.map(s => s.planId) || [];

  return (
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
            <div className="grid grid-cols-1 gap-4 mt-4">
              {filteredPlans.map(plan => (
                <SubscriptionCard
                  key={plan.id}
                  plan={plan}
                  onSubscribe={(p) => subscribeMutation.mutate(p.id)}
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
          </TabsContent>

          <TabsContent value="my-subscriptions" className="space-y-4">
            {mySubscriptions && mySubscriptions.length > 0 ? (
              <div className="space-y-4 mt-4">
                {mySubscriptions.map(sub => {
                  const plan = plans?.find(p => p.id === sub.planId);
                  return (
                    <Card key={sub.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
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
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Next Delivery:</span>
                            <span className="font-medium">
                              {format(new Date(sub.nextDeliveryDate), "PPP")}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Price:</span>
                            <span className="font-medium">₹{plan?.price}/{plan?.frequency}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {sub.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
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
                              onClick={() => resumeMutation.mutate(sub.id)}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Resume
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => cancelMutation.mutate(sub.id)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
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
  );
}

export default SubscriptionDrawer;