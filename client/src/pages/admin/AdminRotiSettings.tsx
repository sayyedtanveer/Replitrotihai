import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Clock, Save, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface RotiSettings {
  id: string;
  morningBlockStartTime: string;
  morningBlockEndTime: string;
  lastOrderTime: string;
  blockMessage: string;
  isActive: boolean;
  isInBlockedPeriod: boolean;
  isPastLastOrderTime: boolean;
  currentTime: string;
}

export default function AdminRotiSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    morningBlockStartTime: "08:00",
    morningBlockEndTime: "11:00",
    lastOrderTime: "23:00",
    blockMessage: "Roti orders are not available from 8 AM to 11 AM. Please order before 11 PM for next morning delivery.",
    isActive: true,
  });

  const { data: settings, isLoading } = useQuery<RotiSettings>({
    queryKey: ["/api/roti-settings"],
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        morningBlockStartTime: settings.morningBlockStartTime || "08:00",
        morningBlockEndTime: settings.morningBlockEndTime || "11:00",
        lastOrderTime: settings.lastOrderTime || "23:00",
        blockMessage: settings.blockMessage || "Roti orders are not available from 8 AM to 11 AM. Please order before 11 PM for next morning delivery.",
        isActive: settings.isActive ?? true,
      });
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/roti-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to update roti settings");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roti-settings"] });
      toast({
        title: "Settings updated",
        description: "Roti time settings have been saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update roti settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(formData.morningBlockStartTime) || 
        !timeRegex.test(formData.morningBlockEndTime) || 
        !timeRegex.test(formData.lastOrderTime)) {
      toast({
        title: "Validation error",
        description: "Please use HH:MM format for all time fields",
        variant: "destructive",
      });
      return;
    }
    updateSettingsMutation.mutate(formData);
  };

  const formatTimeForDisplay = (time: string) => {
    try {
      const [hours, minutes] = time.split(":");
      const h = parseInt(hours, 10);
      const ampm = h >= 12 ? "PM" : "AM";
      const displayHour = h % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-8 h-8" />
            Roti Time Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Configure when Roti orders can be placed and delivery time restrictions
          </p>
        </div>

        {settings && (
          <Card className={settings.isInBlockedPeriod ? "border-orange-300 dark:border-orange-700" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${settings.isInBlockedPeriod ? "text-orange-500" : "text-green-500"}`} />
                Current Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-800">
                  <p className="text-sm text-muted-foreground">Current Server Time</p>
                  <p className="text-lg font-semibold">{formatTimeForDisplay(settings.currentTime)}</p>
                </div>
                <div className={`p-4 rounded-md ${settings.isInBlockedPeriod ? "bg-orange-50 dark:bg-orange-950/30" : "bg-green-50 dark:bg-green-950/30"}`}>
                  <p className="text-sm text-muted-foreground">Order Status</p>
                  <p className={`text-lg font-semibold ${settings.isInBlockedPeriod ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}`}>
                    {settings.isInBlockedPeriod ? "Blocked" : "Open"}
                  </p>
                </div>
                <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-800">
                  <p className="text-sm text-muted-foreground">Settings Status</p>
                  <p className={`text-lg font-semibold ${settings.isActive ? "text-green-600 dark:text-green-400" : "text-slate-500"}`}>
                    {settings.isActive ? "Active" : "Disabled"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Time Window Configuration</CardTitle>
            <CardDescription>
              Set the morning block period during which Roti orders are not accepted
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 rounded-md bg-slate-50 dark:bg-slate-800">
                  <div>
                    <Label className="text-base font-medium">Enable Time Blocking</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, Roti orders will be blocked during the morning window
                    </p>
                  </div>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    data-testid="switch-roti-active"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="morningBlockStartTime">Morning Block Start Time</Label>
                    <Input
                      id="morningBlockStartTime"
                      type="time"
                      value={formData.morningBlockStartTime}
                      onChange={(e) => setFormData({ ...formData, morningBlockStartTime: e.target.value })}
                      data-testid="input-block-start-time"
                    />
                    <p className="text-xs text-muted-foreground">
                      Orders will be blocked starting at this time
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="morningBlockEndTime">Morning Block End Time</Label>
                    <Input
                      id="morningBlockEndTime"
                      type="time"
                      value={formData.morningBlockEndTime}
                      onChange={(e) => setFormData({ ...formData, morningBlockEndTime: e.target.value })}
                      data-testid="input-block-end-time"
                    />
                    <p className="text-xs text-muted-foreground">
                      Orders will resume after this time
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastOrderTime">Last Order Time for Morning Delivery</Label>
                    <Input
                      id="lastOrderTime"
                      type="time"
                      value={formData.lastOrderTime}
                      onChange={(e) => setFormData({ ...formData, lastOrderTime: e.target.value })}
                      data-testid="input-last-order-time"
                    />
                    <p className="text-xs text-muted-foreground">
                      Last time to order for next morning delivery
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blockMessage">Block Message</Label>
                  <Textarea
                    id="blockMessage"
                    value={formData.blockMessage}
                    onChange={(e) => setFormData({ ...formData, blockMessage: e.target.value })}
                    rows={3}
                    placeholder="Message shown to customers when orders are blocked"
                    data-testid="input-block-message"
                  />
                  <p className="text-xs text-muted-foreground">
                    This message is displayed to customers when they try to order during the blocked period
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={updateSettingsMutation.isPending}
                    data-testid="button-save-roti-settings"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Morning Block Period</h3>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  During the configured morning block period (default: 8 AM - 11 AM), customers cannot place Roti orders. 
                  This allows your kitchen to focus on preparing and delivering morning orders without new orders coming in.
                </p>
              </div>
              <div className="p-4 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">Next-Day Auto-Scheduling</h3>
                <p className="text-sm text-green-700 dark:text-green-400">
                  When customers order after the last order time (default: 11 PM) or select a morning slot, 
                  their delivery is automatically scheduled for the next day. This ensures realistic delivery expectations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
