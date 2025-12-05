import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Gift, Copy, Share2, Clock, CheckCircle, XCircle, Wallet, MessageCircle } from "lucide-react";
import { format } from "date-fns";

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalEarned: number;
  monthlyEarned: number;
  monthlyLimit: number;
}

interface Referral {
  id: string;
  referredName: string;
  referredPhone: string;
  status: string;
  referrerBonus: number;
  createdAt: string;
  completedAt: string | null;
}

interface ReferralSettings {
  referrerBonus: number;
  referredBonus: number;
  minOrderAmount: number;
  maxReferralsPerMonth: number;
  maxEarningsPerMonth: number;
  expiryDays: number;
}

export default function InviteEarn() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<ReferralStats>({
    queryKey: ["/api/user/referral-stats"],
  });

  const { data: referrals = [], isLoading: referralsLoading } = useQuery<Referral[]>({
    queryKey: ["/api/user/referrals"],
  });

  const { data: settings } = useQuery<ReferralSettings>({
    queryKey: ["/api/referral-settings"],
  });

  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/user/generate-referral", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/referral-stats"] });
      toast({ title: "Referral code generated!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to generate code", description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = async () => {
    if (stats?.referralCode) {
      await navigator.clipboard.writeText(stats.referralCode);
      setCopied(true);
      toast({ title: "Code copied to clipboard!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareViaWhatsApp = () => {
    if (stats?.referralCode) {
      const message = `Join RotiHai and get ₹${settings?.referredBonus || 50} off on your first order! Use my referral code: ${stats.referralCode}`;
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
    }
  };

  const shareViaSMS = () => {
    if (stats?.referralCode) {
      const message = `Join RotiHai and get ₹${settings?.referredBonus || 50} off! Use my code: ${stats.referralCode}`;
      const url = `sms:?body=${encodeURIComponent(message)}`;
      window.location.href = url;
    }
  };

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

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Invite & Earn</h1>
        <p className="text-muted-foreground">Refer friends and earn rewards</p>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            Your Referral Code
          </CardTitle>
          <CardDescription>Share this code with your friends</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats?.referralCode ? (
            <>
              <div className="flex items-center justify-center gap-2">
                <div className="text-3xl font-bold font-mono tracking-wider px-6 py-3 bg-background rounded-lg border-2 border-dashed border-primary/50" data-testid="text-referral-code">
                  {stats.referralCode}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyToClipboard}
                  data-testid="button-copy-code"
                >
                  <Copy className={`w-4 h-4 ${copied ? "text-green-500" : ""}`} />
                </Button>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={shareViaWhatsApp} className="gap-2" data-testid="button-share-whatsapp">
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </Button>
                <Button onClick={shareViaSMS} variant="outline" className="gap-2" data-testid="button-share-sms">
                  <Share2 className="w-4 h-4" />
                  SMS
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Generate your unique referral code to start earning!</p>
              <Button
                onClick={() => generateCodeMutation.mutate()}
                disabled={generateCodeMutation.isPending}
                data-testid="button-generate-code"
              >
                {generateCodeMutation.isPending ? "Generating..." : "Generate Code"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold" data-testid="text-total-referrals">{stats?.totalReferrals || 0}</div>
            <div className="text-xs text-muted-foreground">Total Referrals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold" data-testid="text-completed">{stats?.completedReferrals || 0}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Wallet className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold text-green-600" data-testid="text-total-earned">₹{stats?.totalEarned || 0}</div>
            <div className="text-xs text-muted-foreground">Total Earned</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Gift className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold" data-testid="text-monthly-earned">₹{stats?.monthlyEarned || 0}</div>
            <div className="text-xs text-muted-foreground">This Month</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">1</span>
              </div>
              <div>
                <h4 className="font-medium">Share Your Code</h4>
                <p className="text-sm text-muted-foreground">Share your unique referral code with friends via WhatsApp, SMS, or any other way</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">2</span>
              </div>
              <div>
                <h4 className="font-medium">Friend Signs Up</h4>
                <p className="text-sm text-muted-foreground">Your friend registers using your code and gets ₹{settings?.referredBonus || 50} wallet bonus</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold">3</span>
              </div>
              <div>
                <h4 className="font-medium">First Order Completed</h4>
                <p className="text-sm text-muted-foreground">When they complete their first order (min ₹{settings?.minOrderAmount || 100}), you earn ₹{settings?.referrerBonus || 50}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
          <CardDescription>Track your referrals and earnings</CardDescription>
        </CardHeader>
        <CardContent>
          {referralsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No referrals yet. Start sharing your code!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  data-testid={`referral-item-${referral.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{referral.referredName || "User"}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(referral.createdAt), "dd MMM yyyy")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(referral.status)}
                    {referral.status === "completed" && (
                      <div className="text-sm text-green-600 font-medium mt-1">
                        +₹{referral.referrerBonus}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Terms & Conditions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. Referral bonus is credited after the referred user completes their first order.</p>
          <p>2. Minimum order value of ₹{settings?.minOrderAmount || 100} required for bonus eligibility.</p>
          <p>3. Maximum {settings?.maxReferralsPerMonth || 10} referrals per month allowed.</p>
          <p>4. Maximum earnings of ₹{settings?.maxEarningsPerMonth || 500} per month from referrals.</p>
          <p>5. Referral expires if first order is not placed within {settings?.expiryDays || 30} days.</p>
          <p>6. RotiHai reserves the right to modify or cancel the referral program at any time.</p>
        </CardContent>
      </Card>
    </div>
  );
}
