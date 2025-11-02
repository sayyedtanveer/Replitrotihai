
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { adminApiRequest } from "@/hooks/useAdminAuth";
import { queryClient } from "@/lib/queryClient";
import type { Chef, Category } from "@shared/schema";
import { Star, Pencil, Trash2, Plus } from "lucide-react";

export default function AdminChefs() {
  const { toast } = useToast();
  const [editingChef, setEditingChef] = useState<Chef | null>(null);
  const [deletingChef, setDeletingChef] = useState<Chef | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: "",
    rating: "4.5",
    reviewCount: 0,
    categoryId: "",
  });

  const { data: chefs, isLoading } = useQuery<Chef[]>({
    queryKey: ["/api/admin", "chefs"],
    queryFn: async () => {
      const response = await adminApiRequest("/api/admin/chefs");
      if (!response.ok) throw new Error("Failed to fetch chefs");
      return response.json();
    },
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/admin", "categories"],
    queryFn: async () => {
      const response = await adminApiRequest("/api/admin/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  const createChefMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await adminApiRequest("/api/admin/chefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create chef");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "chefs"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Chef created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create chef", variant: "destructive" });
    },
  });

  const updateChefMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Chef> }) => {
      const response = await adminApiRequest(`/api/admin/chefs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update chef");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "chefs"] });
      setEditingChef(null);
      toast({ title: "Success", description: "Chef updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update chef", variant: "destructive" });
    },
  });

  const deleteChefMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await adminApiRequest(`/api/admin/chefs/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete chef");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "chefs"] });
      setDeletingChef(null);
      toast({ title: "Success", description: "Chef deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete chef", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      image: "",
      rating: "4.5",
      reviewCount: 0,
      categoryId: "",
    });
  };

  const handleEdit = (chef: Chef) => {
    setEditingChef(chef);
    setFormData({
      name: chef.name,
      description: chef.description,
      image: chef.image,
      rating: chef.rating,
      reviewCount: chef.reviewCount,
      categoryId: chef.categoryId,
    });
  };

  const handleUpdate = () => {
    if (editingChef) {
      updateChefMutation.mutate({ id: editingChef.id, data: formData });
    }
  };

  const handleCreate = () => {
    createChefMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (deletingChef) {
      deleteChefMutation.mutate(deletingChef.id);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Chefs & Restaurants</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Manage partner chefs and restaurants</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-chef">
            <Plus className="w-4 h-4 mr-2" />
            Add Chef
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-video bg-slate-200 dark:bg-slate-700"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : chefs && chefs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chefs.map((chef) => (
              <Card key={chef.id} data-testid={`card-chef-${chef.id}`}>
                <img src={chef.image} alt={chef.name} className="w-full aspect-video object-cover rounded-t-lg" />
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-1 text-slate-900 dark:text-slate-100">{chef.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{chef.description}</p>
                  <div className="flex items-center gap-2 text-sm mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-slate-900 dark:text-slate-100">{chef.rating}</span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400">({chef.reviewCount} reviews)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(chef)}
                      data-testid={`button-edit-${chef.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingChef(chef)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-delete-${chef.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Partner portal access can be created from Admin Management
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-400">No chefs found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Chef Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Chef</DialogTitle>
            <DialogDescription>Create a new chef or restaurant profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-chef-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-chef-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Image URL</Label>
              <Input
                id="image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                data-testid="input-chef-image"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                <SelectTrigger data-testid="select-chef-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rating">Rating</Label>
                <Input
                  id="rating"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                  data-testid="input-chef-rating"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewCount">Review Count</Label>
                <Input
                  id="reviewCount"
                  type="number"
                  value={formData.reviewCount}
                  onChange={(e) => setFormData({ ...formData, reviewCount: parseInt(e.target.value) || 0 })}
                  data-testid="input-chef-reviews"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createChefMutation.isPending}
              data-testid="button-save-chef"
            >
              {createChefMutation.isPending ? "Creating..." : "Create Chef"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Chef Dialog */}
      <Dialog open={!!editingChef} onOpenChange={() => setEditingChef(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Chef</DialogTitle>
            <DialogDescription>Update chef information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-edit-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-image">Image URL</Label>
              <Input
                id="edit-image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                data-testid="input-edit-image"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                <SelectTrigger data-testid="select-edit-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-rating">Rating</Label>
                <Input
                  id="edit-rating"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                  data-testid="input-edit-rating"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reviewCount">Review Count</Label>
                <Input
                  id="edit-reviewCount"
                  type="number"
                  value={formData.reviewCount}
                  onChange={(e) => setFormData({ ...formData, reviewCount: parseInt(e.target.value) || 0 })}
                  data-testid="input-edit-reviews"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingChef(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateChefMutation.isPending}
              data-testid="button-update-chef"
            >
              {updateChefMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Chef Confirmation Dialog */}
      <Dialog open={!!deletingChef} onOpenChange={() => setDeletingChef(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chef</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deletingChef?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingChef(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteChefMutation.isPending}
              data-testid="button-confirm-delete-chef"
            >
              {deleteChefMutation.isPending ? "Deleting..." : "Delete Chef"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
