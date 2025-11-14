
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { adminApiRequest } from "@/hooks/useAdminAuth";
import { Wallet, Gift, Settings } from "lucide-react";
import { useState } from "react";

export default function AdminWalletSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    maxUsagePerOrder: 10,
    referrerBonus: 100,
    referredBonus: 50,
  });

  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ["/api/admin/wallet-settings"],
    queryFn: async () => {
      const response = await adminApiRequest("/api/admin/wallet-settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      const data = await response.json();
      if (data) {
        setSettings({
          maxUsagePerOrder: data.maxUsagePerOrder || 10,
          referrerBonus: data.referrerBonus || 100,
          referredBonus: data.referredBonus || 50,
        });
      }
      return data;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof settings) => {
      const response = await adminApiRequest("/api/admin/wallet-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallet-settings"] });
      toast({ title: "Success", description: "Wallet settings updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(settings);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Wallet & Referral Settings</h1>
          <p className="text-muted-foreground mt-1">Configure wallet usage limits and referral rewards</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Wallet Usage Settings
              </CardTitle>
              <CardDescription>
                Control how much wallet balance users can use per order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUsage">Maximum Usage Per Order (₹)</Label>
                  <Input
                    id="maxUsage"
                    type="number"
                    value={settings.maxUsagePerOrder}
                    onChange={(e) => setSettings({ ...settings, maxUsagePerOrder: parseInt(e.target.value) || 0 })}
                    min="0"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Users can use up to this amount from their wallet per order
                  </p>
                </div>
                
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Referral Rewards
              </CardTitle>
              <CardDescription>
                Set bonus amounts for referrals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="referrerBonus">Referrer Bonus (₹)</Label>
                  <Input
                    id="referrerBonus"
                    type="number"
                    value={settings.referrerBonus}
                    onChange={(e) => setSettings({ ...settings, referrerBonus: parseInt(e.target.value) || 0 })}
                    min="0"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Amount given to users who refer others
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referredBonus">New User Bonus (₹)</Label>
                  <Input
                    id="referredBonus"
                    type="number"
                    value={settings.referredBonus}
                    onChange={(e) => setSettings({ ...settings, referredBonus: parseInt(e.target.value) || 0 })}
                    min="0"
                    required
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Currently disabled - new users don't receive a signup bonus
                  </p>
                </div>
                
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Current Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Max Wallet Usage Per Order:</span>
                <span>₹{settings.maxUsagePerOrder}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Referrer Bonus:</span>
                <span>₹{settings.referrerBonus}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium">New User Bonus:</span>
                <span>₹{settings.referredBonus}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
