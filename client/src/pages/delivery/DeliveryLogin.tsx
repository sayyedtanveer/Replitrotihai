
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Bike, LogIn, AlertCircle } from "lucide-react";

export default function DeliveryLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/delivery/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await response.json();
      localStorage.setItem("deliveryToken", data.token);
      localStorage.setItem("deliveryPersonId", data.deliveryPerson.id);
      localStorage.setItem("deliveryPersonName", data.deliveryPerson.name);

      toast({
        title: "Login successful",
        description: `Welcome back, ${data.deliveryPerson.name}!`,
      });

      setLocation("/delivery/dashboard");
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Invalid phone number or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
      {/* Hero Section with Background */}
      <div className="relative w-full h-48 md:h-64 bg-gradient-to-br from-blue-20/20 to-blue/5 dark:from-blue-900/30 dark:to-slate-900 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-4 right-4 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-8 left-0 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>
        
        {/* Header Content */}
        <div className="relative h-full flex items-center justify-center text-center px-4">
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="p-4 bg-blue-500/15 dark:bg-blue-900/20 rounded-full">
                <Bike className="h-10 w-10 md:h-12 md:w-12 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Delivery Portal</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">Track & manage your deliveries</p>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="flex-1 flex items-start justify-center px-4 py-6 md:py-8 md:mt-4">
        <Card className="w-full max-w-sm border-0 md:border shadow-none md:shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Phone Field */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs md:text-sm font-medium">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  className="text-xs md:text-sm h-9 md:h-10"
                  data-testid="input-phone"
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
                    Delivery Partner Login
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Use your credentials provided by admin to access your dashboard
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
