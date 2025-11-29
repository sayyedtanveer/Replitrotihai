
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Megaphone, Plus, Pencil, Trash2 } from "lucide-react";
import type { PromotionalBanner } from "@shared/schema";

export default function AdminPromotionalBanners() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PromotionalBanner | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    buttonText: "",
    gradientFrom: "orange-600",
    gradientVia: "amber-600",
    gradientTo: "yellow-600",
    emoji1: "🍽️",
    emoji2: "🥘",
    emoji3: "🍛",
    actionType: "subscription",
    actionValue: "",
    isActive: true,
    displayOrder: 0,
  });

  const { data: banners, isLoading } = useQuery<PromotionalBanner[]>({
    queryKey: ["/api/admin/promotional-banners"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/promotional-banners", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch banners");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/promotional-banners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create banner");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotional-banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promotional-banners"] });
      toast({ title: "Banner created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/promotional-banners/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update banner");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotional-banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promotional-banners"] });
      toast({ title: "Banner updated successfully" });
      setIsDialogOpen(false);
      setEditingBanner(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/promotional-banners/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete banner");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotional-banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promotional-banners"] });
      toast({ title: "Banner deleted successfully" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      subtitle: "",
      buttonText: "",
      gradientFrom: "orange-600",
      gradientVia: "amber-600",
      gradientTo: "yellow-600",
      emoji1: "🍽️",
      emoji2: "🥘",
      emoji3: "🍛",
      actionType: "subscription",
      actionValue: "",
      isActive: true,
      displayOrder: 0,
    });
  };

  const handleEdit = (banner: PromotionalBanner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle,
      buttonText: banner.buttonText,
      gradientFrom: banner.gradientFrom,
      gradientVia: banner.gradientVia,
      gradientTo: banner.gradientTo,
      emoji1: banner.emoji1,
      emoji2: banner.emoji2,
      emoji3: banner.emoji3,
      actionType: banner.actionType,
      actionValue: banner.actionValue || "",
      isActive: banner.isActive,
      displayOrder: banner.displayOrder,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Megaphone className="w-8 h-8" />
              Promotional Banners
            </h1>
            <p className="text-muted-foreground mt-1">Manage homepage promotional banners</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingBanner(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Banner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingBanner ? "Edit Banner" : "Add New Banner"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Subscribe to Daily Roti & Lunch"
                  />
                </div>
                <div>
                  <Label>Subtitle</Label>
                  <Textarea
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="Fresh homemade meals delivered daily"
                  />
                </div>
                <div>
                  <Label>Button Text</Label>
                  <Input
                    value={formData.buttonText}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    placeholder="View Subscription Plans"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Gradient From</Label>
                    <Input
                      value={formData.gradientFrom}
                      onChange={(e) => setFormData({ ...formData, gradientFrom: e.target.value })}
                      placeholder="orange-600"
                    />
                  </div>
                  <div>
                    <Label>Gradient Via</Label>
                    <Input
                      value={formData.gradientVia}
                      onChange={(e) => setFormData({ ...formData, gradientVia: e.target.value })}
                      placeholder="amber-600"
                    />
                  </div>
                  <div>
                    <Label>Gradient To</Label>
                    <Input
                      value={formData.gradientTo}
                      onChange={(e) => setFormData({ ...formData, gradientTo: e.target.value })}
                      placeholder="yellow-600"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Emoji 1</Label>
                    <Input
                      value={formData.emoji1}
                      onChange={(e) => setFormData({ ...formData, emoji1: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Emoji 2</Label>
                    <Input
                      value={formData.emoji2}
                      onChange={(e) => setFormData({ ...formData, emoji2: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Emoji 3</Label>
                    <Input
                      value={formData.emoji3}
                      onChange={(e) => setFormData({ ...formData, emoji3: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Action Type</Label>
                  <Select
                    value={formData.actionType}
                    onValueChange={(value) => setFormData({ ...formData, actionType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subscription">Open Subscription</SelectItem>
                      <SelectItem value="category">Navigate to Category</SelectItem>
                      <SelectItem value="url">Open URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.actionType !== "subscription" && (
                  <div>
                    <Label>Action Value</Label>
                    <Input
                      value={formData.actionValue}
                      onChange={(e) => setFormData({ ...formData, actionValue: e.target.value })}
                      placeholder={formData.actionType === "category" ? "Category ID" : "https://..."}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
                <div>
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingBanner ? "Update" : "Create"} Banner
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <Card><CardContent className="py-12 text-center">Loading...</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {banners?.map((banner) => (
              <Card key={banner.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{banner.title}</CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(banner)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(banner.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{banner.subtitle}</p>
                  <div className="flex gap-2 items-center text-xs text-muted-foreground">
                    <span>Button: {banner.buttonText}</span>
                    <span>•</span>
                    <span>Action: {banner.actionType}</span>
                    <span>•</span>
                    <span>Order: {banner.displayOrder}</span>
                    <span>•</span>
                    <span className={banner.isActive ? "text-green-600" : "text-red-600"}>
                      {banner.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
