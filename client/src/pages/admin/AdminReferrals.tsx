import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Gift, Clock, CheckCircle, XCircle, Search, RefreshCw, Ban, Award } from "lucide-react";
import { format } from "date-fns";

interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  referralCode: string;
  status: string;
  referrerBonus: number;
  referredBonus: number;
  referredOrderCompleted: boolean;
  createdAt: string;
  completedAt: string | null;
  referrerName?: string;
  referrerPhone?: string;
  referredName?: string;
  referredPhone?: string;
}

export default function AdminReferrals() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [actionDialog, setActionDialog] = useState<{ open: boolean; action: string; referral: Referral | null }>({
    open: false,
    action: "",
    referral: null,
  });

  const { data: referrals = [], isLoading, refetch } = useQuery<Referral[]>({
    queryKey: ["/api/admin/referrals"],
  });

  const { data: stats } = useQuery<{
    totalReferrals: number;
    pendingReferrals: number;
    completedReferrals: number;
    totalBonusPaid: number;
  }>({
    queryKey: ["/api/admin/referral-stats"],
  });

  const updateReferralMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/admin/referrals/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referral-stats"] });
      toast({ title: "Referral updated successfully" });
      setActionDialog({ open: false, action: "", referral: null });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update referral", description: error.message, variant: "destructive" });
    },
  });

  const filteredReferrals = referrals.filter((referral) => {
    const matchesSearch =
      referral.referralCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referrerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referredName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.referrerPhone?.includes(searchTerm) ||
      referral.referredPhone?.includes(searchTerm);

    const matchesStatus = statusFilter === "all" || referral.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "expired":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleAction = (action: string, referral: Referral) => {
    setActionDialog({ open: true, action, referral });
  };

  const confirmAction = () => {
    if (!actionDialog.referral) return;

    let newStatus = "";
    switch (actionDialog.action) {
      case "complete":
        newStatus = "completed";
        break;
      case "expire":
        newStatus = "expired";
        break;
      default:
        return;
    }

    updateReferralMutation.mutate({ id: actionDialog.referral.id, status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Referral Management</h1>
          <p className="text-muted-foreground">View and manage all referral records</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-referrals">{stats?.totalReferrals || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-referrals">{stats?.pendingReferrals || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-completed-referrals">{stats?.completedReferrals || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Bonus Paid</CardTitle>
            <Gift className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-bonus">₹{stats?.totalBonusPaid || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Referral Records</CardTitle>
          <CardDescription>All referral transactions in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredReferrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No referrals found
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referral Code</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referred User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.map((referral) => (
                    <TableRow key={referral.id} data-testid={`row-referral-${referral.id}`}>
                      <TableCell className="font-mono font-medium">{referral.referralCode}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{referral.referrerName || "Unknown"}</div>
                          <div className="text-sm text-muted-foreground">{referral.referrerPhone || "-"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{referral.referredName || "Unknown"}</div>
                          <div className="text-sm text-muted-foreground">{referral.referredPhone || "-"}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(referral.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Referrer: ₹{referral.referrerBonus}</div>
                          <div>Referred: ₹{referral.referredBonus}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(referral.createdAt), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {referral.completedAt ? format(new Date(referral.completedAt), "dd MMM yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {referral.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAction("complete", referral)}
                                data-testid={`button-complete-${referral.id}`}
                              >
                                <Award className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleAction("expire", referral)}
                                data-testid={`button-expire-${referral.id}`}
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "complete" ? "Complete Referral" : "Expire Referral"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "complete"
                ? "This will mark the referral as completed and credit bonuses to both users."
                : "This will expire the referral and no bonuses will be credited."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Referral Code: <span className="font-mono font-medium">{actionDialog.referral?.referralCode}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, action: "", referral: null })}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={updateReferralMutation.isPending}
              variant={actionDialog.action === "expire" ? "destructive" : "default"}
              data-testid="button-confirm-action"
            >
              {updateReferralMutation.isPending ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
