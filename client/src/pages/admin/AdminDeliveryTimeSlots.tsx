import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Clock, Plus, Trash2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface DeliveryTimeSlot {
  id: string;
  startTime: string;
  label: string;
  isActive: boolean;
  cutoffHoursBefore?: number;
}

export default function AdminDeliveryTimeSlots() {
  const { toast } = useToast();
  const [newSlot, setNewSlot] = useState<{ startTime: string; label: string; isActive: boolean; cutoffHoursBefore?: number | undefined }>({
    startTime: "09:00",
    label: "9:00 AM - 10:00 AM",
    isActive: true,
    cutoffHoursBefore: undefined,
  });

  const buildHeaders = (includeContentType = false): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (includeContentType) {
      headers["Content-Type"] = "application/json";
    }
    const token = localStorage.getItem("adminToken");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  // Fetch slots
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["/api/admin/delivery-slots"],
    queryFn: async () => {
      const response = await fetch("/api/admin/delivery-slots", {
        headers: buildHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch slots");
      return response.json();
    },
  });

  // Create slot mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/admin/delivery-slots", {
        method: "POST",
        headers: buildHeaders(true),
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create slot");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/delivery-slots"],
      });
      setNewSlot({
        startTime: "09:00",
        label: "9:00 AM - 10:00 AM",
        isActive: true,
        cutoffHoursBefore: undefined,
      });
      toast({ title: "Success", description: "Delivery slot added" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add delivery slot",
        variant: "destructive",
      });
    },
  });

  // Update slot mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const response = await fetch(`/api/admin/delivery-slots/${id}`, {
        method: "PATCH",
        headers: buildHeaders(true),
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update slot");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/delivery-slots"],
      });
      toast({ title: "Success", description: "Delivery slot updated" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update delivery slot",
        variant: "destructive",
      });
    },
  });

  // Delete slot mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/delivery-slots/${id}`, {
        method: "DELETE",
        headers: buildHeaders(),
      });
      if (!response.ok) throw new Error("Failed to delete slot");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/delivery-slots"],
      });
      toast({ title: "Success", description: "Delivery slot deleted" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete delivery slot",
        variant: "destructive",
      });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1
            className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"
            data-testid="text-slots-title"
          >
            <Clock className="w-8 h-8" />
            Delivery Time Slots
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Create and manage delivery time slots that customers can select from
          </p>
        </div>

        {/* Add New Slot */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Time Slot
            </CardTitle>
            <CardDescription>Create a new delivery time slot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="cutoff">Cutoff (hours before)</Label>
                <Input
                  id="cutoff"
                  type="number"
                  min={0}
                  placeholder="e.g., 10"
                  value={newSlot.cutoffHoursBefore ?? ""}
                  onChange={(e) => setNewSlot({ ...newSlot, cutoffHoursBefore: e.target.value === "" ? undefined : parseInt(e.target.value, 10) })}
                  data-testid="input-cutoff"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => createMutation.mutate(newSlot)}
                  disabled={createMutation.isPending}
                  data-testid="button-add-slot"
                  className="w-full"
                >
                  {createMutation.isPending ? "Adding..." : "Add Slot"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* List of Slots */}
        <Card>
          <CardHeader>
            <CardTitle>Active Time Slots</CardTitle>
            <CardDescription>Manage your delivery time slots</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-slate-600 dark:text-slate-400">
                Loading slots...
              </p>
            ) : slots.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-400">
                No delivery slots created yet. Add one to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {slots.map((slot: DeliveryTimeSlot) => (
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
                        {typeof slot.cutoffHoursBefore === 'number' && (
                          <span className="ml-2 text-xs text-muted-foreground">(cutoff: {slot.cutoffHoursBefore}h)</span>
                        )}
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
                            updateMutation.mutate({
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
                        onClick={() => deleteMutation.mutate(slot.id)}
                        disabled={deleteMutation.isPending}
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
      </div>
    </AdminLayout>
  );
}
