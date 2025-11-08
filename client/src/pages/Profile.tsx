import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MenuDrawer from "@/components/MenuDrawer";
import CartSidebar from "@/components/CartSidebar";
import ChefListDrawer from "@/components/ChefListDrawer";
import SubscriptionDrawer from "@/components/SubscriptionDrawer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Mail, MapPin, Phone, LogOut } from "lucide-react";
import { Category } from "@shared/schema";

export default function Profile() {
  const { user: replitUser } = useAuth();
  const [, setLocation] = useLocation();
  const userToken = localStorage.getItem("userToken");
  const savedUserData = localStorage.getItem("userData");
  const parsedUserData = savedUserData ? JSON.parse(savedUserData) : null;
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const { data: phoneUser, isLoading: phoneUserLoading } = useQuery<ProfileUser>({
  queryKey: ["/api/user/profile", userToken],
  queryFn: async () => {
    const res = await fetch("/api/user/profile", {
      headers: {
        Authorization: `Bearer ${userToken}`,
      }
    });

    if (!res.ok) throw new Error("Failed to load user");

    return res.json();
  },
  enabled: !!userToken && !replitUser,
});
const { data: categories = [] } = useQuery<Category[]>({
  queryKey: ["/api/categories"],
  queryFn: async () => {
    const res = await fetch("/api/categories");
    return res.json();
  }
});
const { data: chefs = [] } = useQuery<Chef[]>({
  queryKey: ["/api/chefs"],
  queryFn: async () => {
    const res = await fetch("/api/chefs");
    return res.json();
  }
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
          <div className="grid gap-6">
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
                    <h3 className="text-xl font-semibold">
                      {user.name || `${user.firstName} ${user.lastName}` || "User"}
                    </h3>
                    {user.phone && <p className="text-muted-foreground">{user.phone}</p>}
                    {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4">
                  {user.name && (
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        defaultValue={user.name}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  )}

                  {user.phone && (
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="flex gap-2">
                        <Phone className="h-4 w-4 mt-3 text-muted-foreground" />
                        <Input
                          id="phone"
                          defaultValue={user.phone}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    </div>
                  )}

                  {user.email && (
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="flex gap-2">
                        <Mail className="h-4 w-4 mt-3 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          defaultValue={user.email}
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    </div>
                  )}

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

            <Card>
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
                <CardDescription>Manage your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => setLocation("/my-orders")}
                  className="w-full sm:w-auto"
                  data-testid="button-view-orders"
                >
                  View My Orders
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-full sm:w-auto ml-0 sm:ml-2"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </CardContent>
            </Card>
          </div>
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

      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

      <ChefListDrawer
  isOpen={isChefListOpen}
  onClose={() => setIsChefListOpen(false)}
  category={selectedCategory}
  chefs={chefs}
  onChefClick={(chef) => {
    console.log("Selected chef:", chef);
    // Navigate or open menu
  }}
/>


      <SubscriptionDrawer
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
      />
    </div>
  );
}