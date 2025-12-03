import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import type { Category, SubscriptionPlan, InsertSubscriptionPlan, Subscription } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Calendar, Users, Settings2, Pause, Play, Package, Clock, Truck, CheckCircle, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSubscriptionPlanSchema } from "@shared/schema";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Subscription management modals
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [adjustDeliveries, setAdjustDeliveries] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newDeliveryDate, setNewDeliveryDate] = useState("");

  // Today's deliveries modal
  const [todaysDeliveriesOpen, setTodaysDeliveriesOpen] = useState(false);

  // Delivery time slots
  const [newSlot, setNewSlot] = useState({
    startTime: "09:00",
    endTime: "10:00",
    label: "9:00 AM - 10:00 AM",
    capacity: 50,
    isActive: true,
  });

  const token = localStorage.getItem("adminToken");

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/admin", "categories"],
    queryFn: async () => {
      const response = await fetch("/api/admin/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
    enabled: !!token,
  });

  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/admin", "subscription-plans"],
    queryFn: async () => {
      const response = await fetch("/api/admin/subscription-plans", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch subscription plans");
      return response.json();
    },
    enabled: !!token,
  });

  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin", "subscriptions"],
    queryFn: async () => {
      const response = await fetch("/api/admin/subscriptions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch subscriptions");
      return response.json();
    },
    enabled: !!token,
  });

  // Fetch overdue preparations
  const { data: overduePreparations = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/subscriptions/overdue-preparations"],
    queryFn: async () => {
      const response = await fetch("/api/admin/subscriptions/overdue-preparations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch overdue preparations");
      return response.json();
    },
    enabled: !!token,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const { data: chefs } = useQuery<Array<{ id: string; name: string; isActive: boolean }>>({
    queryKey: ["/api/admin", "chefs"],
    queryFn: async () => {
      const response = await fetch("/api/admin/chefs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch chefs");
      return response.json();
    },
    enabled: !!token,
  });

  const { data: deliverySlots = [], isLoading: slotsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/delivery-slots"],
    queryFn: async () => {
      const response = await fetch("/api/admin/delivery-slots", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch delivery slots");
      return response.json();
    },
    enabled: !!token,
  });

  // Create delivery slot
  const createSlotMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/admin/delivery-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create slot");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-slots"] });
      setNewSlot({ startTime: "09:00", endTime: "10:00", label: "9:00 AM - 10:00 AM", capacity: 50, isActive: true });
      toast({ title: "Success", description: "Delivery slot added" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add delivery slot", variant: "destructive" });
    },
  });

  // Update delivery slot
  const updateSlotMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const response = await fetch(`/api/admin/delivery-slots/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update slot");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-slots"] });
      toast({ title: "Success", description: "Delivery slot updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update delivery slot", variant: "destructive" });
    },
  });

  // Delete delivery slot
  const deleteSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/delivery-slots/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete slot");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/delivery-slots"] });
      toast({ title: "Success", description: "Delivery slot deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete delivery slot", variant: "destructive" });
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
    onError: () => {
      toast({ title: "Error", description: "Failed to create subscription plan", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertSubscriptionPlan }) => {
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
    onError: () => {
      toast({ title: "Error", description: "Failed to update subscription plan", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
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
    onError: () => {
      toast({ title: "Error", description: "Failed to delete subscription plan", variant: "destructive" });
    },
  });

  // Subscription adjustment mutation
  const adjustSubscriptionMutation = useMutation({
    mutationFn: async ({ subscriptionId, data }: { subscriptionId: string; data: any }) => {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to adjust subscription");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "subscriptions"] });
      toast({ title: "Adjusted", description: "Subscription adjusted successfully" });
      setAdjustModalOpen(false);
      setSelectedSubscription(null);
      resetAdjustmentForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Assign chef/partner to subscription mutation
  const assignChefMutation = useMutation({
    mutationFn: async ({ subscriptionId, chefId }: { subscriptionId: string; chefId: string }) => {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/assign-chef`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chefId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assign chef");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscriptions/overdue-preparations"] }); // Invalidate overdue preparations as well
      toast({ title: "Chef Assigned", description: "Chef assigned to subscription successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Status change mutation
  const changeStatusMutation = useMutation({
    mutationFn: async ({ subscriptionId, status }: { subscriptionId: string; status: string }) => {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to change status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "subscriptions"] });
      toast({ title: "Status Changed", description: "Subscription status updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to change status", variant: "destructive" });
    },
  });

  // Today's deliveries query
  const { data: todaysDeliveries } = useQuery({
    queryKey: ["/api/admin", "subscriptions", "today-deliveries"],
    queryFn: async () => {
      const response = await fetch(`/api/admin/subscriptions/today-deliveries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch today's deliveries");
      return response.json();
    },
    enabled: !!token,
  });

  // Delivery status update mutation
  const updateDeliveryStatusMutation = useMutation({
    mutationFn: async ({ subscriptionId, status }: { subscriptionId: string; status: string }) => {
      const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/delivery-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update delivery status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "subscriptions", "today-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "subscriptions"] });
      toast({ title: "Updated", description: "Delivery status updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update delivery status", variant: "destructive" });
    },
  });

  const resetAdjustmentForm = () => {
    setAdjustDeliveries(0);
    setAdjustReason("");
    setNewStatus("");
    setNewDeliveryDate("");
  };

  const openAdjustModal = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setNewStatus(subscription.status);
    setNewDeliveryDate(format(new Date(subscription.nextDeliveryDate), "yyyy-MM-dd"));
    setAdjustModalOpen(true);
  };

  const handleAdjustSubmit = () => {
    if (!selectedSubscription) return;

    const data: any = {};
    if (adjustDeliveries !== 0) {
      data.deliveryAdjustment = adjustDeliveries;
    }
    if (adjustReason) {
      data.reason = adjustReason;
    }
    if (newStatus && newStatus !== selectedSubscription.status) {
      data.status = newStatus;
    }
    if (newDeliveryDate) {
      data.nextDeliveryDate = newDeliveryDate;
    }

    if (Object.keys(data).length === 0) {
      toast({ title: "No Changes", description: "Please make at least one adjustment", variant: "destructive" });
      return;
    }

    adjustSubscriptionMutation.mutate({ subscriptionId: selectedSubscription.id, data });
  };

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
            <TabsTrigger value="slots">Delivery Time Slots</TabsTrigger>
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
            {/* Unavailable Chefs with Active Subscriptions */}
            {subscriptions?.filter(s => s.isPaid && s.status === "active" && s.chefId).length > 0 && (
              (() => {
                const unavailableChefSubscriptions = subscriptions.filter(s => {
                  if (!s.isPaid || s.status !== "active" || !s.chefId) return false;
                  const chef = chefs?.find(c => c.id === s.chefId);
                  return chef && !chef.isActive;
                });
                
                if (unavailableChefSubscriptions.length === 0) return null;

                const chefGroups = unavailableChefSubscriptions.reduce((acc, sub) => {
                  const chefId = sub.chefId!;
                  if (!acc[chefId]) {
                    acc[chefId] = {
                      chef: chefs?.find(c => c.id === chefId),
                      subscriptions: [] as any[],
                    };
                  }
                  acc[chefId].subscriptions.push(sub);
                  return acc;
                }, {} as Record<string, { chef: any; subscriptions: any[] }>);

                return (
                  <Card className="mb-6 border-red-500">
                    <CardHeader>
                      <CardTitle className="text-red-600 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        🔴 Unavailable Chefs with Active Subscriptions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Chef</TableHead>
                            <TableHead>Subscriptions</TableHead>
                            <TableHead>Customers</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(chefGroups).map(([chefId, group]) => {
                            const { chef, subscriptions: subs } = group;
                            return (
                            <TableRow key={chefId} className="bg-red-50">
                              <TableCell>
                                <div>
                                  <Badge variant="destructive">{chef?.name || "Unknown Chef"}</Badge>
                                  <div className="text-xs text-muted-foreground mt-1">Status: Unavailable</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{subs.length} active subscription{subs.length > 1 ? 's' : ''}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {subs.slice(0, 3).map(s => (
                                    <div key={s.id} className="text-sm">{s.customerName}</div>
                                  ))}
                                  {subs.length > 3 && (
                                    <div className="text-xs text-muted-foreground">+{subs.length - 3} more</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-xs text-amber-600 font-medium mb-2">
                                  Please reassign these subscriptions to available chefs
                                </div>
                                {subs.map(s => (
                                  <div key={s.id} className="mb-2">
                                    <Select
                                      onValueChange={(newChefId) => {
                                        assignChefMutation.mutate({
                                          subscriptionId: s.id,
                                          chefId: newChefId,
                                        });
                                      }}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder={`Reassign ${s.customerName}`} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {chefs?.filter(c => c.id !== chefId && c.isActive).map(c => (
                                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                ))}
                              </TableCell>
                            </TableRow>
                          );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })()
            )}

            {/* Overdue Chef Preparations */}
            {overduePreparations.length > 0 && (
              <Card className="mb-6 border-red-500">
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    ⚠️ Overdue Chef Preparations - Reassignment Needed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Current Chef</TableHead>
                        <TableHead>Expected Prep Time</TableHead>
                        <TableHead>Delivery Time</TableHead>
                        <TableHead>Overdue By</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overduePreparations.map((item) => (
                        <TableRow key={item.subscriptionId} className="bg-red-50">
                          <TableCell>
                            <div>{item.customerName}</div>
                            <div className="text-xs text-muted-foreground">{item.phone}</div>
                          </TableCell>
                          <TableCell>{item.planName}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{item.chefName}</Badge>
                          </TableCell>
                          <TableCell>{item.expectedPrepTime}</TableCell>
                          <TableCell>{item.deliveryTime}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{item.minutesOverdue} min</Badge>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  Reassign Chef
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reassign Chef</DialogTitle>
                                </DialogHeader>
                                <Select
                                  onValueChange={(value) => {
                                    assignChefMutation.mutate({
                                      subscriptionId: item.subscriptionId,
                                      chefId: value,
                                    });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a new chef" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {chefs
                                      ?.filter((c) => c.id !== item.chefId && c.isActive)
                                      .map((chef) => (
                                        <SelectItem key={chef.id} value={chef.id}>
                                          {chef.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

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
                              {sub.deliverySlotId && deliverySlots.find((s: any) => s.id === sub.deliverySlotId) && (
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  <Clock className="w-3 h-3 inline mr-1" />
                                  Delivery Slot: {deliverySlots.find((s: any) => s.id === sub.deliverySlotId)?.label}
                                </p>
                              )}
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

            {/* Today's Deliveries Quick Action */}
            <Card className="mb-6 border-blue-200 dark:border-blue-800">
              <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Truck className="w-5 h-5" />
                    Today's Subscription Deliveries
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setTodaysDeliveriesOpen(true)} data-testid="button-view-today-deliveries">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-md">
                    <p className="text-2xl font-bold">{todaysDeliveries?.scheduled || 0}</p>
                    <p className="text-xs text-muted-foreground">Scheduled</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                    <p className="text-2xl font-bold text-yellow-600">{todaysDeliveries?.preparing || 0}</p>
                    <p className="text-xs text-muted-foreground">Preparing</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <p className="text-2xl font-bold text-blue-600">{todaysDeliveries?.outForDelivery || 0}</p>
                    <p className="text-xs text-muted-foreground">Out for Delivery</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <p className="text-2xl font-bold text-green-600">{todaysDeliveries?.delivered || 0}</p>
                    <p className="text-xs text-muted-foreground">Delivered</p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold">{sub.customerName}</h4>
                                <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                                  {sub.status === "active" ? "Active" : sub.status === "paused" ? "Paused" : sub.status}
                                </Badge>
                                {sub.remainingDeliveries <= 3 && (
                                  <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                                    Low Deliveries
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Plan: {plan?.name}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Phone: {sub.phone}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Address: {sub.address}</p>
                              <div className="flex gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                                <span>Next: {format(new Date(sub.nextDeliveryDate), "PPP")}</span>
                                <span>Time: {sub.nextDeliveryTime || "09:00"}</span>
                                <span>Remaining: {sub.remainingDeliveries}/{sub.totalDeliveries}</span>
                              </div>
                              {/* Partner Assignment */}
                              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                                {sub.chefId ? (
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                                      👨‍🍳 Partner: {chefs?.find(c => c.id === sub.chefId)?.name || "Unknown"}
                                    </p>
                                    <Select
                                      value={sub.chefId}
                                      onValueChange={(chefId) => assignChefMutation.mutate({ subscriptionId: sub.id, chefId })}
                                    >
                                      <SelectTrigger className="h-7 w-32 text-xs">
                                        <SelectValue placeholder="Change" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {chefs?.filter(c => c.isActive).map(chef => (
                                          <SelectItem key={chef.id} value={chef.id}>{chef.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                      ⚠️ No partner assigned
                                    </p>
                                    <Select
                                      onValueChange={(chefId) => assignChefMutation.mutate({ subscriptionId: sub.id, chefId })}
                                    >
                                      <SelectTrigger className="h-7 w-32 text-xs">
                                        <SelectValue placeholder="Assign" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {chefs?.filter(c => c.isActive).map(chef => (
                                          <SelectItem key={chef.id} value={chef.id}>{chef.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                              {sub.deliverySlotId && deliverySlots.find((s: any) => s.id === sub.deliverySlotId) && (
                                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                                    <Clock className="w-3 h-3 inline mr-1" />
                                    Delivery Slot: {deliverySlots.find((s: any) => s.id === sub.deliverySlotId)?.label}
                                  </p>
                                </div>
                              )}
                              {sub.pauseStartDate && (
                                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                                  Paused since: {format(new Date(sub.pauseStartDate), "PPP")}
                                  {sub.pauseResumeDate && ` • Auto-resume: ${format(new Date(sub.pauseResumeDate), "PPP")}`}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="text-right">
                                <p className="font-semibold text-primary">₹{plan?.price}</p>
                                <p className="text-xs text-slate-500">/{plan?.frequency}</p>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {/* Quick Status Toggle */}
                                {sub.status === "active" ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => changeStatusMutation.mutate({ subscriptionId: sub.id, status: "paused" })}
                                    disabled={changeStatusMutation.isPending}
                                    data-testid={`button-pause-${sub.id}`}
                                  >
                                    <Pause className="w-3 h-3" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => changeStatusMutation.mutate({ subscriptionId: sub.id, status: "active" })}
                                    disabled={changeStatusMutation.isPending}
                                    data-testid={`button-resume-${sub.id}`}
                                  >
                                    <Play className="w-3 h-3" />
                                  </Button>
                                )}
                                {/* Adjust Button */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openAdjustModal(sub)}
                                  data-testid={`button-adjust-${sub.id}`}
                                >
                                  <Settings2 className="w-3 h-3" />
                                </Button>
                              </div>
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

          <TabsContent value="slots" className="space-y-4">
            {/* Add New Slot */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add New Time Slot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={newSlot.startTime}
                      onChange={(e) =>
                        setNewSlot({ ...newSlot, startTime: e.target.value })
                      }
                      data-testid="input-start-time"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={newSlot.endTime}
                      onChange={(e) =>
                        setNewSlot({ ...newSlot, endTime: e.target.value })
                      }
                      data-testid="input-end-time"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="label">Display Label</Label>
                    <Input
                      id="label"
                      placeholder="e.g., 9:00 AM - 10:00 AM"
                      value={newSlot.label}
                      onChange={(e) =>
                        setNewSlot({ ...newSlot, label: e.target.value })
                      }
                      data-testid="input-label"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => createSlotMutation.mutate(newSlot)}
                      disabled={createSlotMutation.isPending}
                      data-testid="button-add-slot"
                      className="w-full"
                    >
                      {createSlotMutation.isPending ? "Adding..." : "Add Slot"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* List of Slots */}
            <Card>
              <CardHeader>
                <CardTitle>Active Time Slots</CardTitle>
              </CardHeader>
              <CardContent>
                {slotsLoading ? (
                  <p className="text-slate-600 dark:text-slate-400">
                    Loading slots...
                  </p>
                ) : deliverySlots.length === 0 ? (
                  <p className="text-slate-600 dark:text-slate-400">
                    No delivery slots created yet. Add one to get started.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {deliverySlots.map((slot: any) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {slot.label}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Start: {slot.startTime}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              Active
                            </span>
                            <Switch
                              checked={slot.isActive}
                              onCheckedChange={(checked) =>
                                updateSlotMutation.mutate({
                                  id: slot.id,
                                  data: { isActive: checked },
                                })
                              }
                              data-testid={`switch-active-${slot.id}`}
                            />
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteSlotMutation.mutate(slot.id)}
                            disabled={deleteSlotMutation.isPending}
                            data-testid={`button-delete-${slot.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Subscription Adjustment Modal */}
      <Dialog open={adjustModalOpen} onOpenChange={(open) => {
        setAdjustModalOpen(open);
        if (!open) {
          setSelectedSubscription(null);
          resetAdjustmentForm();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Subscription</DialogTitle>
            <DialogDescription>
              {selectedSubscription?.customerName} - {plans?.find(p => p.id === selectedSubscription?.planId)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Add/Remove Deliveries</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAdjustDeliveries(prev => prev - 1)}
                >
                  -
                </Button>
                <Input
                  type="number"
                  value={adjustDeliveries}
                  onChange={(e) => setAdjustDeliveries(parseInt(e.target.value) || 0)}
                  className="text-center w-20"
                  data-testid="input-adjust-deliveries"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAdjustDeliveries(prev => prev + 1)}
                >
                  +
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Current: {selectedSubscription?.remainingDeliveries} → New: {(selectedSubscription?.remainingDeliveries || 0) + adjustDeliveries}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger data-testid="select-adjust-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Next Delivery Date</Label>
              <Input
                type="date"
                value={newDeliveryDate}
                onChange={(e) => setNewDeliveryDate(e.target.value)}
                data-testid="input-adjust-date"
              />
            </div>

            <div className="space-y-2">
              <Label>Reason for Adjustment</Label>
              <Textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Enter reason for this adjustment..."
                data-testid="input-adjust-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdjustSubmit}
              disabled={adjustSubscriptionMutation.isPending}
              data-testid="button-save-adjustment"
            >
              {adjustSubscriptionMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Today's Deliveries Modal */}
      <Dialog open={todaysDeliveriesOpen} onOpenChange={setTodaysDeliveriesOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Today's Subscription Deliveries</DialogTitle>
            <DialogDescription>
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {todaysDeliveries?.deliveries?.length ? (
              todaysDeliveries.deliveries.map((delivery: any) => (
                <div key={delivery.id} className="border rounded-lg p-4" data-testid={`delivery-${delivery.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{delivery.customerName}</h4>
                        <Badge variant={
                          delivery.status === "delivered" ? "default" :
                          delivery.status === "out_for_delivery" ? "secondary" :
                          delivery.status === "preparing" ? "outline" :
                          "secondary"
                        }>
                          {delivery.status?.replace(/_/g, " ") || "scheduled"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{delivery.address}</p>
                      <p className="text-sm text-muted-foreground">Phone: {delivery.phone}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Time: {delivery.time || "09:00"} | Plan: {delivery.planName}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={delivery.status === "preparing" ? "default" : "outline"}
                        onClick={() => updateDeliveryStatusMutation.mutate({ 
                          subscriptionId: delivery.subscriptionId, 
                          status: "preparing" 
                        })}
                        disabled={updateDeliveryStatusMutation.isPending}
                        data-testid={`button-preparing-${delivery.id}`}
                      >
                        <Clock className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={delivery.status === "out_for_delivery" ? "default" : "outline"}
                        onClick={() => updateDeliveryStatusMutation.mutate({ 
                          subscriptionId: delivery.subscriptionId, 
                          status: "out_for_delivery" 
                        })}
                        disabled={updateDeliveryStatusMutation.isPending}
                        data-testid={`button-out-${delivery.id}`}
                      >
                        <Truck className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={delivery.status === "delivered" ? "default" : "outline"}
                        onClick={() => updateDeliveryStatusMutation.mutate({ 
                          subscriptionId: delivery.subscriptionId, 
                          status: "delivered" 
                        })}
                        disabled={updateDeliveryStatusMutation.isPending}
                        data-testid={`button-delivered-${delivery.id}`}
                      >
                        <CheckCircle className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No subscription deliveries scheduled for today
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTodaysDeliveriesOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}