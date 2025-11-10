
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DeliverySetting, DeliveryPersonnel } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Truck, Plus, Trash2, MapPin, Users, UserCog } from "lucide-react";
import { useState } from "react";

export default function AdminDeliverySettings() {
  const { toast } = useToast();
  const [newSetting, setNewSetting] = useState({
    name: "",
    minDistance: "",
    maxDistance: "",
    price: "",
  });

  const [newDeliveryPerson, setNewDeliveryPerson] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });

  // Delivery Settings Queries
  const { data: settings, isLoading: settingsLoading } = useQuery<DeliverySetting[]>({
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

  // Delivery Personnel Queries
  const { data: deliveryPersonnel, isLoading: personnelLoading } = useQuery<DeliveryPersonnel[]>({
    queryKey: ["/api/admin", "delivery-personnel"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/delivery-personnel", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch delivery personnel");
      return response.json();
    },
  });

  // Delivery Settings Mutations
  const createSettingMutation = useMutation({
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

  const updateSettingMutation = useMutation({
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

  const deleteSettingMutation = useMutation({
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

  // Delivery Personnel Mutations
  const createPersonnelMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/delivery-personnel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create delivery person");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "delivery-personnel"] });
      setNewDeliveryPerson({ name: "", phone: "", email: "", password: "" });
      toast({
        title: "Delivery person created",
        description: "Delivery person has been created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Creation failed",
        description: "Failed to create delivery person",
        variant: "destructive",
      });
    },
  });

  const updatePersonnelMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DeliveryPersonnel> }) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/delivery-personnel/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update delivery person");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "delivery-personnel"] });
      toast({
        title: "Delivery person updated",
        description: "Delivery person has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update delivery person",
        variant: "destructive",
      });
    },
  });

  const deletePersonnelMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/delivery-personnel/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete delivery person");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "delivery-personnel"] });
      toast({
        title: "Delivery person deleted",
        description: "Delivery person has been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Deletion failed",
        description: "Failed to delete delivery person",
        variant: "destructive",
      });
    },
  });

  const handleCreateSetting = () => {
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

    createSettingMutation.mutate(newSetting);
  };

  const handleCreatePersonnel = () => {
    if (!newDeliveryPerson.name || !newDeliveryPerson.phone || !newDeliveryPerson.password) {
      toast({
        title: "Validation error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createPersonnelMutation.mutate(newDeliveryPerson);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Truck className="w-8 h-8" />
            Delivery Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage delivery partners, personnel, and pricing settings
          </p>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="partners" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Partners</span>
            </TabsTrigger>
            <TabsTrigger value="personnel" className="flex items-center gap-2">
              <UserCog className="w-4 h-4" />
              <span className="hidden sm:inline">Delivery Personnel</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Delivery Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Partners Tab */}
          <TabsContent value="partners">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Delivery Partners
                </CardTitle>
                <CardDescription>Manage your delivery partner integrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">Partner management coming soon</p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                    Integrate with third-party delivery services
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Personnel Tab */}
          <TabsContent value="personnel">
            <div className="space-y-6">
              {/* Add New Delivery Person */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add New Delivery Person
                  </CardTitle>
                  <CardDescription>Register a new delivery personnel</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="person-name">Name *</Label>
                      <Input
                        id="person-name"
                        placeholder="Full Name"
                        value={newDeliveryPerson.name}
                        onChange={(e) => setNewDeliveryPerson({ ...newDeliveryPerson, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="person-phone">Phone *</Label>
                      <Input
                        id="person-phone"
                        placeholder="Phone Number"
                        value={newDeliveryPerson.phone}
                        onChange={(e) => setNewDeliveryPerson({ ...newDeliveryPerson, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="person-email">Email</Label>
                      <Input
                        id="person-email"
                        type="email"
                        placeholder="Email (optional)"
                        value={newDeliveryPerson.email}
                        onChange={(e) => setNewDeliveryPerson({ ...newDeliveryPerson, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="person-password">Password *</Label>
                      <Input
                        id="person-password"
                        type="password"
                        placeholder="Password"
                        value={newDeliveryPerson.password}
                        onChange={(e) => setNewDeliveryPerson({ ...newDeliveryPerson, password: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreatePersonnel} disabled={createPersonnelMutation.isPending}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Delivery Person
                  </Button>
                </CardContent>
              </Card>

              {/* Current Delivery Personnel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCog className="w-5 h-5" />
                    Delivery Personnel
                  </CardTitle>
                  <CardDescription>Manage your delivery team</CardDescription>
                </CardHeader>
                <CardContent>
                  {personnelLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2"></div>
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                        </div>
                      ))}
                    </div>
                  ) : deliveryPersonnel && deliveryPersonnel.length > 0 ? (
                    <div className="space-y-4">
                      {deliveryPersonnel.map((person) => (
                        <div
                          key={person.id}
                          className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                                {person.name}
                              </h3>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {person.phone} {person.email && `• ${person.email}`}
                              </p>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-xs text-slate-500 capitalize">
                                  Status: {person.status}
                                </span>
                                <span className="text-xs text-slate-500">
                                  Deliveries: {person.totalDeliveries}
                                </span>
                                <span className="text-xs text-slate-500">
                                  Rating: {person.rating}★
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`active-${person.id}`} className="text-sm">
                                  Active
                                </Label>
                                <Switch
                                  id={`active-${person.id}`}
                                  checked={person.isActive}
                                  onCheckedChange={(checked) =>
                                    updatePersonnelMutation.mutate({
                                      id: person.id,
                                      data: { isActive: checked },
                                    })
                                  }
                                />
                              </div>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => deletePersonnelMutation.mutate(person.id)}
                                disabled={deletePersonnelMutation.isPending}
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
                      <UserCog className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                      <p className="text-slate-600 dark:text-slate-400">No delivery personnel registered</p>
                      <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                        Add your first delivery person above
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Delivery Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
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
                  <Button onClick={handleCreateSetting} disabled={createSettingMutation.isPending} data-testid="button-create-setting">
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
                  {settingsLoading ? (
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
                                      updateSettingMutation.mutate({
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
                                  onClick={() => deleteSettingMutation.mutate(setting.id)}
                                  disabled={deleteSettingMutation.isPending}
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
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
