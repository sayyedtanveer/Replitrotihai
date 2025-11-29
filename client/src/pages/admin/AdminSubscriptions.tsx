
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Category, SubscriptionPlan, InsertSubscriptionPlan, Subscription } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Calendar, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSubscriptionPlanSchema } from "@shared/schema";
import { format } from "date-fns";

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/admin", "categories"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/admin", "subscription-plans"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/subscription-plans", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch subscription plans");
      return response.json();
    },
  });

  const { data: subscriptions } = useQuery<Subscription[]>({
    queryKey: ["/api/admin", "subscriptions"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/subscriptions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch subscriptions");
      return response.json();
    },
  });

  const form = useForm<InsertSubscriptionPlan>({
    resolver: zodResolver(insertSubscriptionPlanSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      frequency: "daily",
      price: 0,
      deliveryDays: [],
      items: [],
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSubscriptionPlan) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/subscription-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, deliveryDays: selectedDays }),
      });
      if (!response.ok) throw new Error("Failed to create subscription plan");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "subscription-plans"] });
      toast({ title: "Plan created", description: "Subscription plan created successfully" });
      setIsDialogOpen(false);
      form.reset();
      setSelectedDays([]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertSubscriptionPlan }) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/subscription-plans/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, deliveryDays: selectedDays }),
      });
      if (!response.ok) throw new Error("Failed to update subscription plan");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "subscription-plans"] });
      toast({ title: "Plan updated", description: "Subscription plan updated successfully" });
      setIsDialogOpen(false);
      setEditingPlan(null);
      form.reset();
      setSelectedDays([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/subscription-plans/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete subscription plan");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "subscription-plans"] });
      toast({ title: "Plan deleted", description: "Subscription plan deleted successfully" });
    },
  });

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setSelectedDays(plan.deliveryDays as string[]);
    form.reset({
      name: plan.name,
      description: plan.description,
      categoryId: plan.categoryId,
      frequency: plan.frequency,
      price: plan.price,
      deliveryDays: plan.deliveryDays as string[],
      items: plan.items as Record<string, unknown>[],
      isActive: plan.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: InsertSubscriptionPlan) => {
    if (selectedDays.length === 0) {
      toast({ title: "Error", description: "Please select at least one delivery day", variant: "destructive" });
      return;
    }
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const eligibleCategories = categories?.filter(c => 
    c.name.toLowerCase().includes('roti') || 
    c.name.toLowerCase().includes('lunch') ||
    c.name.toLowerCase().includes('dinner')
  ) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Subscription Plans</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Manage subscription plans for Roti & Lunch categories</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { 
            setIsDialogOpen(open); 
            if (!open) { 
              setEditingPlan(null); 
              form.reset();
              setSelectedDays([]);
            } 
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-plan">
                <Plus className="w-4 h-4 mr-2" />
                Add Subscription Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPlan ? "Edit Subscription Plan" : "Add New Subscription Plan"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Daily Roti Pack" data-testid="input-plan-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Describe the subscription plan" data-testid="input-plan-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-plan-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {eligibleCategories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-plan-frequency">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            onChange={e => field.onChange(parseInt(e.target.value))}
                            placeholder="299" 
                            data-testid="input-plan-price" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div>
                    <FormLabel>Delivery Days</FormLabel>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {DAYS_OF_WEEK.map(day => (
                        <div key={day} className="flex items-center space-x-2">
                          <Switch
                            checked={selectedDays.includes(day)}
                            onCheckedChange={() => toggleDay(day)}
                            data-testid={`switch-day-${day}`}
                          />
                          <label className="text-sm capitalize">{day}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel>Active</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-plan-active"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-plan">
                      {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingPlan ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="plans" className="space-y-4">
          <TabsList>
            <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
            <TabsTrigger value="active">Active Subscriptions</TabsTrigger>
          </TabsList>

          <TabsContent value="plans">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : plans && plans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <Card key={plan.id} data-testid={`card-plan-${plan.id}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{plan.name}</span>
                        <Badge variant={plan.isActive ? "default" : "secondary"}>
                          {plan.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-slate-600 dark:text-slate-400">{plan.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">₹{plan.price}</span>
                        <Badge variant="outline" className="capitalize">{plan.frequency}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(plan.deliveryDays as string[]).map(day => (
                          <Badge key={day} variant="secondary" className="text-xs capitalize">
                            {day.slice(0, 3)}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(plan)} data-testid={`button-edit-${plan.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(plan.id)} data-testid={`button-delete-${plan.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-600 dark:text-slate-400">No subscription plans found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="active">
            {/* Pending Payment Verification Section */}
            {subscriptions?.filter(s => !s.isPaid && s.paymentTransactionId).length ? (
              <Card className="mb-6 border-amber-200 dark:border-amber-800">
                <CardHeader className="bg-amber-50 dark:bg-amber-900/20">
                  <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <Users className="w-5 h-5" />
                    Pending Payment Verification ({subscriptions?.filter(s => !s.isPaid && s.paymentTransactionId).length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {subscriptions?.filter(s => !s.isPaid && s.paymentTransactionId).map(sub => {
                      const plan = plans?.find(p => p.id === sub.planId);
                      return (
                        <div key={sub.id} className="border rounded-lg p-4 bg-amber-50/50 dark:bg-amber-900/10" data-testid={`subscription-pending-${sub.id}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{sub.customerName}</h4>
                                <Badge variant="secondary">Awaiting Verification</Badge>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Plan: {plan?.name}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Phone: {sub.phone}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Amount: ₹{plan?.price}</p>
                              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded text-sm">
                                <span className="font-medium">Transaction ID: </span>
                                <span className="font-mono">{sub.paymentTransactionId}</span>
                              </div>
                              <p className="text-xs text-slate-500">
                                Submitted: {format(new Date(sub.createdAt), "PPP 'at' p")}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Button
                                onClick={async () => {
                                  try {
                                    const token = localStorage.getItem("adminToken");
                                    const response = await fetch(`/api/admin/subscriptions/${sub.id}/confirm-payment`, {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        Authorization: `Bearer ${token}`,
                                      },
                                    });
                                    
                                    if (!response.ok) {
                                      const error = await response.json();
                                      throw new Error(error.message || "Failed to confirm payment");
                                    }
                                    
                                    queryClient.invalidateQueries({ queryKey: ["/api/admin", "subscriptions"] });
                                    toast({ 
                                      title: "Payment Verified ✅", 
                                      description: "Subscription activated successfully" 
                                    });
                                  } catch (error: any) {
                                    toast({ 
                                      title: "Error", 
                                      description: error.message || "Failed to confirm payment", 
                                      variant: "destructive" 
                                    });
                                  }
                                }}
                                data-testid={`button-confirm-payment-${sub.id}`}
                              >
                                Verify & Activate
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Subscriptions Without Payment */}
            {subscriptions?.filter(s => !s.isPaid && !s.paymentTransactionId).length ? (
              <Card className="mb-6 border-red-200 dark:border-red-800">
                <CardHeader className="bg-red-50 dark:bg-red-900/20">
                  <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <Users className="w-5 h-5" />
                    Awaiting Payment ({subscriptions?.filter(s => !s.isPaid && !s.paymentTransactionId).length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {subscriptions?.filter(s => !s.isPaid && !s.paymentTransactionId).map(sub => {
                      const plan = plans?.find(p => p.id === sub.planId);
                      return (
                        <div key={sub.id} className="border rounded-lg p-4" data-testid={`subscription-awaiting-${sub.id}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{sub.customerName}</h4>
                                <Badge variant="destructive">No Payment</Badge>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Plan: {plan?.name}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Phone: {sub.phone}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Amount: ₹{plan?.price}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                Created: {format(new Date(sub.createdAt), "PPP 'at' p")}
                              </p>
                            </div>
                            <div className="text-xs text-muted-foreground text-right">
                              <p>User has not made payment yet</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Active Subscriptions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Active Subscriptions ({subscriptions?.filter(s => s.isPaid).length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subscriptions?.filter(s => s.isPaid).length ? (
                  <div className="space-y-4">
                    {subscriptions?.filter(s => s.isPaid).map(sub => {
                      const plan = plans?.find(p => p.id === sub.planId);
                      return (
                        <div key={sub.id} className="border rounded-lg p-4" data-testid={`subscription-active-${sub.id}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{sub.customerName}</h4>
                                <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                                  {sub.status === "active" ? "Active" : sub.status === "paused" ? "Paused" : sub.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Plan: {plan?.name}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Phone: {sub.phone}</p>
                              <div className="flex gap-4 mt-2 text-xs text-slate-500">
                                <span>Next: {format(new Date(sub.nextDeliveryDate), "PPP")}</span>
                                <span>Remaining: {sub.remainingDeliveries}/{sub.totalDeliveries}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-primary">₹{plan?.price}</p>
                              <p className="text-xs text-slate-500">/{plan?.frequency}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-slate-600 dark:text-slate-400 py-8">No active subscriptions</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
