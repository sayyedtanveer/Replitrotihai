
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { UserCog, Plus, Trash2, Mail, User, Lock } from "lucide-react";
import { useState } from "react";

interface Partner {
  id: string;
  username: string;
  email: string;
  chefId: string;
  createdAt: string;
  lastLoginAt: string | null;
}

interface Chef {
  id: string;
  name: string;
  description: string;
  image: string;
  rating: string;
  reviewCount: number;
  categoryId: string;
}

export default function AdminPartners() {
  const { toast } = useToast();
  const [newPartner, setNewPartner] = useState({
    chefId: "",
    username: "",
    email: "",
    password: "",
  });

  // Fetch chefs for selection
  const { data: chefs } = useQuery<Chef[]>({
    queryKey: ["/api/admin/chefs"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/chefs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch chefs");
      return response.json();
    },
  });

  // Fetch partners
  const { data: partners, isLoading } = useQuery<Partner[]>({
    queryKey: ["/api/admin/partners"],
    queryFn: async () => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/partners", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch partners");
      return response.json();
    },
  });

  // Create partner mutation
  const createPartnerMutation = useMutation({
    mutationFn: async (data: typeof newPartner) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/partners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create partner");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      setNewPartner({ chefId: "", username: "", email: "", password: "" });
      toast({
        title: "Partner created",
        description: "Partner account has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete partner mutation
  const deletePartnerMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/partners/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete partner");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      toast({
        title: "Partner deleted",
        description: "Partner account has been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Deletion failed",
        description: "Failed to delete partner account",
        variant: "destructive",
      });
    },
  });

  const handleCreatePartner = () => {
    if (!newPartner.chefId || !newPartner.username || !newPartner.email || !newPartner.password) {
      toast({
        title: "Validation error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (newPartner.password.length < 8) {
      toast({
        title: "Validation error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    createPartnerMutation.mutate(newPartner);
  };

  const getChefName = (chefId: string) => {
    const chef = chefs?.find((c) => c.id === chefId);
    return chef?.name || "Unknown Chef";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserCog className="w-8 h-8" />
            Partner Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage chef partner accounts and access
          </p>
        </div>

        {/* Create New Partner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Partner
            </CardTitle>
            <CardDescription>Create a new partner account for a chef</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="chef-select">Select Chef *</Label>
                <Select
                  value={newPartner.chefId}
                  onValueChange={(value) => setNewPartner({ ...newPartner, chefId: value })}
                >
                  <SelectTrigger id="chef-select">
                    <SelectValue placeholder="Select a chef" />
                  </SelectTrigger>
                  <SelectContent>
                    {chefs?.map((chef) => (
                      <SelectItem key={chef.id} value={chef.id}>
                        {chef.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  placeholder="partner_username"
                  value={newPartner.username}
                  onChange={(e) => setNewPartner({ ...newPartner, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="partner@example.com"
                  value={newPartner.email}
                  onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 8 characters"
                  value={newPartner.password}
                  onChange={(e) => setNewPartner({ ...newPartner, password: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleCreatePartner} disabled={createPartnerMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              Create Partner Account
            </Button>
          </CardContent>
        </Card>

        {/* Partner List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              Partner Accounts
            </CardTitle>
            <CardDescription>Manage existing partner accounts</CardDescription>
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
            ) : partners && partners.length > 0 ? (
              <div className="space-y-4">
                {partners.map((partner) => (
                  <div
                    key={partner.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {partner.username}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {partner.email}
                          </span>
                          <span>Chef: {getChefName(partner.chefId)}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-slate-500">
                            Created: {new Date(partner.createdAt).toLocaleDateString()}
                          </span>
                          {partner.lastLoginAt && (
                            <span className="text-xs text-slate-500">
                              Last login: {new Date(partner.lastLoginAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => deletePartnerMutation.mutate(partner.id)}
                          disabled={deletePartnerMutation.isPending}
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
                <p className="text-slate-600 dark:text-slate-400">No partner accounts created</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                  Create your first partner account above
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
