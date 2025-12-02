import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, LogIn, AlertCircle } from "lucide-react";

export default function PartnerLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    if (!username.trim()) {
      toast({
        title: "Validation error",
        description: "Please enter your username",
        variant: "destructive",
      });
      return;
    }

    if (!password) {
      toast({
        title: "Validation error",
        description: "Please enter your password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/partner/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: username.trim(), 
          password 
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid credentials");
      }

      if (!data.accessToken || !data.partner) {
        throw new Error("Invalid response from server");
      }

      localStorage.setItem("partnerToken", data.accessToken);
      localStorage.setItem("partnerChefId", data.partner.chefId);
      localStorage.setItem("partnerChefName", data.partner.chefName || "Partner");

      toast({
        title: "Login successful",
        description: `Welcome back, ${data.partner.chefName}!`,
      });

      setLocation("/partner/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
      {/* Hero Section with Background */}
      <div className="relative w-full h-48 md:h-64 bg-gradient-to-br from-primary/20 to-primary/5 dark:from-primary/30 dark:to-slate-900 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-4 right-4 w-32 h-32 bg-primary/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-8 left-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>
        </div>
        
        {/* Header Content */}
        <div className="relative h-full flex items-center justify-center text-center px-4">
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/15 dark:bg-primary/20 rounded-full">
                <ChefHat className="h-10 w-10 md:h-12 md:w-12 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Partner Portal</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">Manage your restaurant & orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="flex-1 flex items-start justify-center px-4 py-6 md:py-8 md:mt-4">
        <Card className="w-full max-w-sm border-0 md:border shadow-none md:shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs md:text-sm font-medium">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="text-xs md:text-sm h-9 md:h-10"
                  data-testid="input-username"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs md:text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="text-xs md:text-sm h-9 md:h-10"
                  data-testid="input-password"
                />
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full h-10 md:h-11 text-xs md:text-sm font-medium mt-6"
                disabled={isLoading}
                data-testid="button-login"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {isLoading ? "Logging in..." : "Login to Dashboard"}
              </Button>
            </form>

            {/* Info Box */}
            <div className="mt-6 p-3 md:p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs md:text-sm text-blue-900 dark:text-blue-200 font-medium">
                    Partner Account Required
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Use your partner login credentials provided by the admin
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Note */}
      <div className="text-center py-4 px-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          For support, contact your admin
        </p>
      </div>
    </div>
  );
}