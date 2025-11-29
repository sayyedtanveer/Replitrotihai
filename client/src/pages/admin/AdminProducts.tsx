import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Product, Category, Chef } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Grid3x3, List } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";

export default function AdminProducts() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin", "products"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

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

  const { data: chefs } = useQuery<Chef[]>({
    queryKey: ["/api/admin", "chefs"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/chefs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch chefs");
      return response.json();
    },
  });

  const form = useForm<any>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      image: "",
      categoryId: "",
      isVeg: true,
      isCustomizable: false,
      chefId: "",
      isAvailable: true,
      stockQuantity: 100,
      lowStockThreshold: 20,
      offerPercentage: 0, // Added default for offerPercentage
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "products"] });
      toast({ title: "Product created", description: "Product has been created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Creation failed", description: "Failed to create product", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "products"] });
      toast({ title: "Product updated", description: "Product has been updated successfully" });
      setIsDialogOpen(false);
      setEditingProduct(null);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "products"] });
      toast({ title: "Product deleted", description: "Product has been deleted successfully" });
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isAvailable }),
      });
      if (!response.ok) throw new Error("Failed to update availability");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "products"] });
      toast({ title: "Availability updated", description: "Product availability has been updated" });
    },
  });

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      ...product,
      chefId: product.chefId || "none", // Handle null/undefined chefId
      stockQuantity: product.stockQuantity || 100,
      lowStockThreshold: product.lowStockThreshold || 20,
      offerPercentage: product.offerPercentage || 0, // Ensure offerPercentage is reset
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: any) => {
    // Ensure chefId is null if it's "none" before submitting
    const processedData = {
      ...data,
      chefId: data.chefId === "none" ? null : data.chefId,
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: processedData });
    } else {
      createMutation.mutate(processedData);
    }
  };

  const getChefName = (chefId: string | null) => {
    if (!chefId) return "Not Assigned";
    const chef = chefs?.find(c => c.id === chefId);
    return chef?.name || "Unknown Chef";
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "No Category";
    const category = categories?.find(c => c.id === categoryId);
    return category?.name || "Unknown";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Products</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your food products</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setViewMode(viewMode === "grid" ? "table" : "grid")}
            >
              {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingProduct(null); form.reset(); } }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-product">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter product name" data-testid="input-product-name" />
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
                            <Textarea {...field} placeholder="Enter product description" data-testid="input-product-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price (₹)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="0" onChange={(e) => field.onChange(parseInt(e.target.value))} data-testid="input-product-price" />
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
                            <FormLabel>Category *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-product-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories?.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="chefId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign Chef (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select chef" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No Chef</SelectItem>
                              {chefs?.map((chef) => (
                                <SelectItem key={chef.id} value={chef.id}>
                                  {chef.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="image"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://..." data-testid="input-product-image" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="stockQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stock Quantity</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" onChange={(e) => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lowStockThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Low Stock Threshold</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" onChange={(e) => field.onChange(parseInt(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex flex-col gap-4">
                      <FormField
                        control={form.control}
                        name="isCustomizable"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Customizable</FormLabel>
                              <FormDescription>
                                Allow customers to customize this product
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="offerPercentage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Offer Percentage (0-100%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="Enter discount percentage"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              Set a discount percentage for this product (0 = no offer)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex gap-4">
                      <FormField
                        control={form.control}
                        name="isVeg"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormLabel>Vegetarian</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-product-veg" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="isCustomizable"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormLabel>Customizable</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-product-customizable" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="isAvailable"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormLabel>Available in Menu</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-product">
                        {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingProduct ? "Update" : "Create"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-400">Loading products...</p>
            </CardContent>
          </Card>
        ) : !products || products.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-400">No products found. Add your first product to get started!</p>
            </CardContent>
          </Card>
        ) : viewMode === "table" ? (
          <Card>
            <CardHeader>
              <CardTitle>All Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Chef</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Offer</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-12 h-12 rounded object-cover"
                            />
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {product.description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getCategoryName(product.categoryId)}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{getChefName(product.chefId)}</span>
                        </TableCell>
                        <TableCell>
                          {product.offerPercentage > 0 ? (
                            <div className="flex flex-col">
                              <span className="line-through text-slate-500 text-sm">₹{product.price}</span>
                              <span className="font-semibold text-green-600">₹{Math.round(product.price * (1 - product.offerPercentage / 100))}</span>
                            </div>
                          ) : (
                            <span>₹{product.price}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.offerPercentage > 0 ? (
                            <Badge variant="destructive" className="bg-green-600">
                              {product.offerPercentage}% OFF
                            </Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={product.stockQuantity && product.stockQuantity < (product.lowStockThreshold || 20) ? "text-yellow-600" : ""}>
                            {product.stockQuantity || 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.isVeg ? "default" : "destructive"} className="text-xs">
                            {product.isVeg ? "Veg" : "Non-Veg"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={product.isAvailable ?? true}
                            onCheckedChange={(checked) => 
                              toggleAvailabilityMutation.mutate({ id: product.id, isAvailable: checked })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(product)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(product.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card 
                key={product.id} 
                data-testid={`card-product-${product.id}`}
                className={product.isAvailable === false ? "opacity-60" : ""}
              >
                <div className="relative">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className={`w-full aspect-video object-cover rounded-t-lg ${product.isAvailable === false ? "grayscale" : ""}`} 
                  />
                  {product.isAvailable === false && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-t-lg">
                      <Badge variant="destructive" className="text-sm">
                        UNAVAILABLE
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className={`font-semibold text-lg text-slate-900 dark:text-slate-100 ${product.isAvailable === false ? "text-muted-foreground" : ""}`}>
                      {product.name}
                    </h3>
                    <Switch
                      checked={product.isAvailable ?? true}
                      onCheckedChange={(checked) => 
                        toggleAvailabilityMutation.mutate({ id: product.id, isAvailable: checked })
                      }
                      data-testid={`switch-product-${product.id}`}
                    />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">{product.description}</p>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Category:</span>
                      <Badge variant="outline">{getCategoryName(product.categoryId)}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Chef:</span>
                      <span>{getChefName(product.chefId)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Stock:</span>
                      <span className={product.stockQuantity && product.stockQuantity < (product.lowStockThreshold || 20) ? "text-yellow-600 font-semibold" : ""}>{product.stockQuantity || 0}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <Badge variant={product.isVeg ? "default" : "destructive"} className="text-xs">
                        {product.isVeg ? "Veg" : "Non-Veg"}
                      </Badge>
                      {product.isCustomizable && (
                        <Badge variant="secondary" className="text-xs">Customizable</Badge>
                      )}
                      <Badge variant={product.isAvailable !== false ? "default" : "destructive"} className="text-xs">
                        {product.isAvailable !== false ? "Available" : "Unavailable"}
                      </Badge>
                      {product.offerPercentage > 0 && (
                        <Badge variant="destructive" className="bg-green-600 text-xs">
                          {product.offerPercentage}% OFF
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {product.offerPercentage > 0 ? (
                        <span>₹{Math.round(product.price * (1 - product.offerPercentage / 100))}</span>
                      ) : (
                        <span>₹{product.price}</span>
                      )}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(product)} data-testid={`button-edit-${product.id}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(product.id)} data-testid={`button-delete-${product.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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