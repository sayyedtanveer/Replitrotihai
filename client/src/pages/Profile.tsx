import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MenuDrawer from "@/components/MenuDrawer";
import CartSidebar from "@/components/CartSidebar";
import ChefListDrawer from "@/components/ChefListDrawer";
import SubscriptionDrawer from "@/components/SubscriptionDrawer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Mail, MapPin, Phone, LogOut } from "lucide-react";
import type { Category, Chef as BaseChef } from "@shared/schema";

// ✅ Frontend-safe version of Chef (adds optional lat/long if Drizzle didn’t generate them yet)
type FrontendChef = BaseChef & {
  latitude?: number | null;
  longitude?: number | null;
};

export default function Profile() {
  const { user: replitUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userToken = localStorage.getItem("userToken");
  const savedUserData = localStorage.getItem("userData");
  const parsedUserData = savedUserData ? JSON.parse(savedUserData) : null;
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // 🧍 Fetch authenticated user
  const { data: phoneUser, isLoading: phoneUserLoading } = useQuery<ProfileUser>({
    queryKey: ["/api/user/profile", userToken],
    queryFn: async () => {
      const res = await fetch("/api/user/profile", {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) throw new Error("Failed to load user");
      return res.json();
    },
    enabled: !!userToken && !replitUser,
  });

  // 🧩 Categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      return res.json();
    },
  });

  // 🍳 Chefs — ensure lat/long exist
  const { data: chefs = [] } = useQuery<FrontendChef[]>({
    queryKey: ["/api/chefs"],
    queryFn: async () => {
      const res = await fetch("/api/chefs");
      if (!res.ok) throw new Error("Failed to fetch chefs");
      const data = await res.json();

      return data.map((chef: any) => ({
        ...chef,
        latitude:
          chef.latitude !== undefined && chef.latitude !== null
            ? Number(chef.latitude)
            : null,
        longitude:
          chef.longitude !== undefined && chef.longitude !== null
            ? Number(chef.longitude)
            : null,
      })) as FrontendChef[];
    },
  });

  // 🎁 Referral code
  const { data: referralCode } = useQuery<{ referralCode: string }>({
    queryKey: ["/api/user/referral-code", userToken],
    queryFn: async () => {
      const res = await fetch("/api/user/referral-code", {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) throw new Error("Failed to load referral code");
      return res.json();
    },
    enabled: !!userToken,
  });

  // 👥 Referrals
  const { data: referrals = [] } = useQuery<any[]>({
    queryKey: ["/api/user/referrals", userToken],
    queryFn: async () => {
      const res = await fetch("/api/user/referrals", {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) throw new Error("Failed to load referrals");
      return res.json();
    },
    enabled: !!userToken,
  });

  // 💰 Wallet
  const { data: walletBalance } = useQuery<{ balance: number }>({
    queryKey: ["/api/user/wallet", userToken],
    queryFn: async () => {
      const res = await fetch("/api/user/wallet", {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) throw new Error("Failed to load wallet balance");
      return res.json();
    },
    enabled: !!userToken,
  });

  const user: ProfileUser | null = replitUser || phoneUser || null;
  const isLoading = phoneUserLoading;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isChefListOpen, setIsChefListOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);

  const handleLogout = () => {
    if (userToken) {
      localStorage.removeItem("userToken");
      localStorage.removeItem("userRefreshToken");
      localStorage.removeItem("userData");
      setLocation("/");
    } else {
      window.location.href = "/api/logout";
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onMenuClick={() => setIsMenuOpen(true)}
        onCartClick={() => setIsCartOpen(true)}
        onChefListClick={() => setIsChefListOpen(true)}
        onSubscriptionClick={() => setIsSubscriptionOpen(true)}
      />

      <main className="flex-1 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Profile</h1>
            <p className="text-muted-foreground">Manage your account information</p>
          </div>

          {isLoading ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">Loading your profile...</p>
              </CardContent>
            </Card>
          ) : !user ? (
            <Card className="text-center py-12">
              <CardContent className="flex flex-col items-center gap-4">
                <User className="h-16 w-16 text-muted-foreground" />
                <div>
                  <CardTitle className="mb-2">Please log in</CardTitle>
                  <CardDescription>
                    Place an order to create an account
                  </CardDescription>
                </div>
                <Button onClick={() => setLocation("/")} data-testid="button-go-home">
                  Go to Home
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="text-2xl">
                        {(user.name?.[0] || user.phone?.[0] || "U").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold">{user.name || "User"}</h3>
                      {user.phone && <p className="text-muted-foreground">{user.phone}</p>}
                      {user.email && (
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4">
                    {user.address && (
                      <div className="grid gap-2">
                        <Label htmlFor="address">Address</Label>
                        <div className="flex gap-2">
                          <MapPin className="h-4 w-4 mt-3 text-muted-foreground" />
                          <Input
                            id="address"
                            defaultValue={user.address}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {userToken && (
                <>
                  {/* Wallet & Referral Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle>💰 Wallet & Referrals</CardTitle>
                      <CardDescription>Your rewards and referral earnings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Wallet Balance */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Wallet Balance</p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                          ₹{walletBalance?.balance || 0}
                        </p>
                      </div>

                      <Separator />

                      {/* Referral Code */}
                      <div>
                        <h3 className="font-semibold mb-3">Your Referral Code</h3>
                        {referralCode?.referralCode ? (
                          <div className="bg-primary/10 p-4 rounded-lg border-2 border-primary/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Share this code</p>
                                <p className="text-2xl font-bold font-mono tracking-wider">
                                  {referralCode.referralCode}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(referralCode.referralCode);
                                  toast({
                                    title: "Copied!",
                                    description: "Referral code copied to clipboard",
                                  });
                                }}
                              >
                                Copy
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            onClick={async () => {
                              try {
                                const res = await fetch("/api/user/generate-referral", {
                                  method: "POST",
                                  headers: { Authorization: `Bearer ${userToken}` },
                                });
                                if (res.ok) {
                                  queryClient.invalidateQueries({ queryKey: ["/api/user/referral-code"] });
                                  toast({
                                    title: "Success!",
                                    description: "Your referral code has been generated",
                                  });
                                }
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Failed to generate referral code",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            Generate Referral Code
                          </Button>
                        )}
                      </div>

                      {/* Referral Stats */}
                      {referrals.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="font-semibold mb-3">Your Referrals</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                                <p className="text-xs text-muted-foreground">Total Referrals</p>
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                  {referrals.length}
                                </p>
                              </div>
                              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                                <p className="text-xs text-muted-foreground">Completed</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                  {referrals.filter(r => r.status === "completed").length}
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* How it Works */}
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2 text-sm">How Referrals Work</h4>
                        <ul className="text-xs space-y-1 text-muted-foreground">
                          <li>• Share your referral code with friends</li>
                          <li>• They sign up using your code</li>
                          <li>• You get bonus when they complete their first order</li>
                          <li>• Bonus amount is set by admin</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Account Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button
                        onClick={() => setLocation("/my-orders")}
                        className="w-full sm:w-auto"
                      >
                        View My Orders
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleLogout}
                        className="w-full sm:w-auto ml-0 sm:ml-2"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />

      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        categories={categories}
        onSubscriptionClick={() => {
          setIsMenuOpen(false);
          setIsSubscriptionOpen(true);
        }}
      />

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <ChefListDrawer
        isOpen={isChefListOpen}
        onClose={() => setIsChefListOpen(false)}
        category={selectedCategory}
        chefs={chefs}
        onChefClick={(chef) => console.log("Selected chef:", chef)}
      />

      <SubscriptionDrawer
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
      />
    </div>
  );
}
