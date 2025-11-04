
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { DeliverySetting } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Truck, Plus, Trash2, MapPin } from "lucide-react";
import { useState } from "react";

export default function AdminDeliverySettings() {
  const { toast } = useToast();
  const [newSetting, setNewSetting] = useState({
    name: "",
    minDistance: "",
    maxDistance: "",
    price: "",
  });

  const { data: settings, isLoading } = useQuery<DeliverySetting[]>({
    queryKey: ["/api/admin", "delivery-settings"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/delivery-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch delivery settings");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/delivery-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name,
          minDistance: parseFloat(data.minDistance),
          maxDistance: parseFloat(data.maxDistance),
          price: parseInt(data.price),
          isActive: true,
        }),
      });
      if (!response.ok) throw new Error("Failed to create delivery setting");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "delivery-settings"] });
      setNewSetting({ name: "", minDistance: "", maxDistance: "", price: "" });
      toast({
        title: "Setting created",
        description: "Delivery setting has been created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Creation failed",
        description: "Failed to create delivery setting",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DeliverySetting> }) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/delivery-settings/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update delivery setting");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "delivery-settings"] });
      toast({
        title: "Setting updated",
        description: "Delivery setting has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update delivery setting",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/delivery-settings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete delivery setting");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "delivery-settings"] });
      toast({
        title: "Setting deleted",
        description: "Delivery setting has been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Deletion failed",
        description: "Failed to delete delivery setting",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!newSetting.name || !newSetting.minDistance || !newSetting.maxDistance || !newSetting.price) {
      toast({
        title: "Validation error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(newSetting.minDistance) >= parseFloat(newSetting.maxDistance)) {
      toast({
        title: "Validation error",
        description: "Max distance must be greater than min distance",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(newSetting);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Truck className="w-8 h-8" />
            Delivery Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Configure distance-based delivery pricing
          </p>
        </div>

        {/* Create New Setting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Delivery Range
            </CardTitle>
            <CardDescription>Define a new distance range and its delivery fee</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="name">Range Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Local Area"
                  value={newSetting.name}
                  onChange={(e) => setNewSetting({ ...newSetting, name: e.target.value })}
                  data-testid="input-new-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minDistance">Min Distance (km)</Label>
                <Input
                  id="minDistance"
                  type="number"
                  step="0.1"
                  placeholder="0"
                  value={newSetting.minDistance}
                  onChange={(e) => setNewSetting({ ...newSetting, minDistance: e.target.value })}
                  data-testid="input-new-min"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDistance">Max Distance (km)</Label>
                <Input
                  id="maxDistance"
                  type="number"
                  step="0.1"
                  placeholder="5"
                  value={newSetting.maxDistance}
                  onChange={(e) => setNewSetting({ ...newSetting, maxDistance: e.target.value })}
                  data-testid="input-new-max"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Delivery Fee (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="40"
                  value={newSetting.price}
                  onChange={(e) => setNewSetting({ ...newSetting, price: e.target.value })}
                  data-testid="input-new-price"
                />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-create-setting">
              <Plus className="w-4 h-4 mr-2" />
              Add Delivery Range
            </Button>
          </CardContent>
        </Card>

        {/* Existing Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Current Delivery Ranges
            </CardTitle>
            <CardDescription>Manage your distance-based delivery pricing</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                  </div>
                ))}
              </div>
            ) : settings && settings.length > 0 ? (
              <div className="space-y-4">
                {settings
                  .sort((a, b) => parseFloat(a.minDistance) - parseFloat(b.minDistance))
                  .map((setting) => (
                    <div
                      key={setting.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                      data-testid={`card-setting-${setting.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                            {setting.name}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {setting.minDistance} km - {setting.maxDistance} km
                          </p>
                          <p className="text-lg font-bold text-primary mt-1">₹{setting.price}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`active-${setting.id}`} className="text-sm">
                              Active
                            </Label>
                            <Switch
                              id={`active-${setting.id}`}
                              checked={setting.isActive}
                              onCheckedChange={(checked) =>
                                updateMutation.mutate({
                                  id: setting.id,
                                  data: { isActive: checked },
                                })
                              }
                              data-testid={`switch-active-${setting.id}`}
                            />
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => deleteMutation.mutate(setting.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${setting.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 dark:text-slate-400">No delivery ranges configured</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                  Add your first delivery range above
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
