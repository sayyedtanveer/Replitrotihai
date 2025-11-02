import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Package, AlertTriangle, Edit, Search, TrendingDown } from "lucide-react";
import type { Product } from "@shared/schema";

export default function AdminInventory() {
  const { toast } = useToast();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [stockData, setStockData] = useState({
    stockQuantity: 0,
    lowStockThreshold: 0,
    isAvailable: true,
  });

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

  const updateStockMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update stock");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin", "products"] });
      toast({ title: "Stock updated", description: "Inventory has been updated successfully" });
      setEditingProduct(null);
    },
    onError: () => {
      toast({ title: "Update failed", description: "Failed to update stock", variant: "destructive" });
    },
  });

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setStockData({
      stockQuantity: product.stockQuantity || 0,
      lowStockThreshold: product.lowStockThreshold || 20,
      isAvailable: product.isAvailable ?? true,
    });
  };

  const handleUpdate = () => {
    if (editingProduct) {
      updateStockMutation.mutate({ id: editingProduct.id, data: stockData });
    }
  };

  const filteredProducts = products?.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isLowStock = (product.stockQuantity || 0) <= (product.lowStockThreshold || 20);
    const matchesFilter = !showLowStockOnly || isLowStock;
    return matchesSearch && matchesFilter;
  }) || [];

  const lowStockCount = products?.filter(
    (p) => (p.stockQuantity || 0) <= (p.lowStockThreshold || 20)
  ).length || 0;

  const outOfStockCount = products?.filter((p) => (p.stockQuantity || 0) === 0).length || 0;

  const totalStock = products?.reduce((sum, p) => sum + (p.stockQuantity || 0), 0) || 0;

  const getStockStatus = (product: Product) => {
    const stock = product.stockQuantity || 0;
    const threshold = product.lowStockThreshold || 20;
    
    if (stock === 0) return { label: "Out of Stock", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
    if (stock <= threshold) return { label: "Low Stock", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" };
    return { label: "In Stock", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100" data-testid="text-inventory-title">
            Inventory Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Track and manage product stock levels
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {products?.length || 0}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {totalStock}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {lowStockCount}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Out of Stock
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {outOfStockCount}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-inventory"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={showLowStockOnly}
                  onCheckedChange={setShowLowStockOnly}
                  data-testid="switch-low-stock-filter"
                />
                <Label className="text-sm">Show Low Stock Only</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle>Product Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                Loading inventory...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                No products found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                        Product
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                        Stock
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                        Threshold
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                        Availability
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const status = getStockStatus(product);
                      return (
                        <tr
                          key={product.id}
                          className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                          data-testid={`row-product-${product.id}`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-12 h-12 rounded object-cover"
                              />
                              <div>
                                <div className="font-medium text-slate-900 dark:text-slate-100">
                                  {product.name}
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                  ₹{product.price}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {product.stockQuantity || 0}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-slate-600 dark:text-slate-400">
                              {product.lowStockThreshold || 20}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={status.color}>{status.label}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              className={
                                product.isAvailable
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                              }
                            >
                              {product.isAvailable ? "Available" : "Unavailable"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(product)}
                              data-testid={`button-edit-stock-${product.id}`}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit Stock
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Stock Dialog */}
        <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
          <DialogContent data-testid="dialog-edit-stock">
            <DialogHeader>
              <DialogTitle>Update Stock - {editingProduct?.name}</DialogTitle>
              <DialogDescription>
                Adjust stock quantity, threshold, and availability
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="stockQuantity">Stock Quantity</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  value={stockData.stockQuantity}
                  onChange={(e) =>
                    setStockData({ ...stockData, stockQuantity: parseInt(e.target.value) || 0 })
                  }
                  data-testid="input-stock-quantity"
                />
              </div>
              <div>
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  value={stockData.lowStockThreshold}
                  onChange={(e) =>
                    setStockData({ ...stockData, lowStockThreshold: parseInt(e.target.value) || 0 })
                  }
                  data-testid="input-low-stock-threshold"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  You'll be alerted when stock falls below this number
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isAvailable"
                  checked={stockData.isAvailable}
                  onCheckedChange={(checked) => setStockData({ ...stockData, isAvailable: checked })}
                  data-testid="switch-is-available"
                />
                <Label htmlFor="isAvailable">Product Available for Sale</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingProduct(null)}
                data-testid="button-cancel-stock"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={updateStockMutation.isPending}
                data-testid="button-update-stock"
              >
                {updateStockMutation.isPending ? "Updating..." : "Update Stock"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
