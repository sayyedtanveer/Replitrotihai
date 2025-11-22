
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ShoppingCart, Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

export default function AdminCartSettings() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<any>(null);
  const [categoryId, setCategoryId] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["/api/admin/cart-settings"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/cart-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch cart settings");
      return response.json();
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/admin/categories"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/cart-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create cart setting");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cart-settings"] });
      toast({ title: "Cart setting created successfully" });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create cart setting", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/cart-settings/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update cart setting");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cart-settings"] });
      toast({ title: "Cart setting updated successfully" });
      setEditingSetting(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to update cart setting", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/cart-settings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete cart setting");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cart-settings"] });
      toast({ title: "Cart setting deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete cart setting", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setCategoryId("");
    setMinOrderAmount("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryId || !minOrderAmount) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    const data = {
      categoryId,
      minOrderAmount: parseFloat(minOrderAmount),
    };

    if (editingSetting) {
      updateMutation.mutate({ id: editingSetting.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (setting: any) => {
    setEditingSetting(setting);
    setCategoryId(setting.categoryId);
    setMinOrderAmount(setting.minOrderAmount.toString());
    setIsCreateOpen(true);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories?.find((c: any) => c.id === categoryId);
    return category?.name || "Unknown";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShoppingCart className="w-8 h-8" />
              Cart Settings
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage minimum order amounts per category
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingSetting(null); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Setting
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSetting ? "Edit" : "Create"} Cart Setting</DialogTitle>
                <DialogDescription>
                  Set minimum order amount for a category
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="minOrderAmount">Minimum Order Amount (₹)</Label>
                  <Input
                    id="minOrderAmount"
                    type="number"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    placeholder="e.g., 150"
                    min="0"
                    step="10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingSetting ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cart Settings</CardTitle>
            <CardDescription>Configure minimum order amounts for each category</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSettings ? (
              <div className="text-center py-8 text-slate-600">Loading...</div>
            ) : settings && settings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Minimum Order Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.map((setting: any) => (
                    <TableRow key={setting.id}>
                      <TableCell className="font-medium">
                        {getCategoryName(setting.categoryId)}
                      </TableCell>
                      <TableCell>₹{setting.minOrderAmount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(setting)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(setting.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-slate-600">
                No cart settings configured
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
