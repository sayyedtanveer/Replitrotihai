import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import PaymentQRDialog from "./PaymentQRDialog";
import { useCart } from "@/hooks/use-cart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: Array<{ id: string; name: string; price: number; quantity: number; image: string }>;
  onOrderSuccess: () => void;
}

export default function CheckoutDialog({ isOpen, onClose, cartItems, onOrderSuccess }: CheckoutDialogProps) {
  const { cart, clearCart } = useCart();
  const { toast } = useToast();

  // Check if user is already logged in
  const userToken = localStorage.getItem("userToken");
  const savedUserData = localStorage.getItem("userData");
  const parsedUserData = savedUserData ? JSON.parse(savedUserData) : null;

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [activeTab, setActiveTab] = useState<"checkout" | "login">("checkout");

  // Auto-fill form when dialog opens if user is logged in
  useEffect(() => {
    if (isOpen && parsedUserData) {
      setCustomerName(parsedUserData.name || "");
      setPhone(parsedUserData.phone || "");
      setEmail(parsedUserData.email || "");
      setAddress(parsedUserData.address || "");
    }
  }, [isOpen, parsedUserData]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 40;
  const total = subtotal + deliveryFee;

  const orderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...orderData,
          paymentStatus: "pending",
          paymentQrShown: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to create order");
      return response.json();
    },
    onSuccess: (data) => {
      setOrderId(data.id);
      onClose();
      setShowQRDialog(true);
      toast({
        title: "Order Created!",
        description: "Please complete the payment to confirm your order",
      });
      setFormData({
        customerName: "",
        phone: "",
        email: "",
        address: "",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const authData = await response.json();

      // Store tokens
      localStorage.setItem("userToken", authData.accessToken);
      localStorage.setItem("userRefreshToken", authData.refreshToken);
      localStorage.setItem("userData", JSON.stringify(authData.user));

      // Auto-fill form with logged-in user data
      setCustomerName(authData.user.name);
      setPhone(authData.user.phone);
      setEmail(authData.user.email || "");
      setAddress(authData.user.address || "");

      toast({
        title: "Login successful!",
        description: "Your details have been filled automatically.",
      });

      // Switch to checkout tab
      setActiveTab("checkout");
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Invalid phone number or password. If you're a new user, use the Checkout tab.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // If user is not logged in, auto-register them
      if (!userToken) {
        const autoRegisterResponse = await fetch("/api/user/auto-register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName,
            phone,
            email: email || null,
            address,
          }),
        });

        if (autoRegisterResponse.ok) {
          const authData = await autoRegisterResponse.json();

          // Store tokens for future auto-login
          localStorage.setItem("userToken", authData.accessToken);
          localStorage.setItem("userRefreshToken", authData.refreshToken);
          localStorage.setItem("userData", JSON.stringify(authData.user));

          // Show password notification only for new users
          if (authData.defaultPassword) {
            toast({
              title: "Account Created!",
              description: `Your account has been created. Default password: ${authData.defaultPassword}. You can change it later.`,
              duration: 10000,
            });
          }
        }
      }

      const orderData = {
        customerName,
        phone,
        email: email || null,
        address,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        subtotal,
        deliveryFee,
        total,
        status: "pending",
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to create order");
      }

      const order = await response.json();
      clearCart();

      setOrderId(order.id);
      setShowQRDialog(true);

      toast({
        title: "Order placed successfully!",
        description: "Please complete the payment to confirm your order.",
      });
    } catch (error) {
      console.error("Order creation error:", error);
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentClose = () => {
    setShowQRDialog(false);
    onOrderSuccess();
  };

  // Helper function to update form data state
  const setFormData = (data: any) => {
    setCustomerName(data.customerName);
    setPhone(data.phone);
    setEmail(data.email);
    setAddress(data.address);
  };


  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-md sm:max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              {userToken ? "Your details are ready" : "Login or continue as guest"}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "checkout" | "login")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="checkout">
                {userToken ? "Place Order" : "Guest Checkout"}
              </TabsTrigger>
              <TabsTrigger value="login" disabled={!!userToken}>
                Login
              </TabsTrigger>
            </TabsList>

            <TabsContent value="checkout" className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3">
                  {userToken && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
                      ✓ Logged in as {parsedUserData?.name || parsedUserData?.phone}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="customerName">Full Name *</Label>
                    <Input
                      id="customerName"
                      data-testid="input-customer-name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      data-testid="input-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      required
                      disabled={!!userToken}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      data-testid="input-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Delivery Address *</Label>
                    <Textarea
                      id="address"
                      data-testid="textarea-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter complete delivery address with landmark"
                      required
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Please include street, area, and any landmarks in Kurla West, Mumbai
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee:</span>
                    <span>₹{deliveryFee}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>₹{total}</span>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none" data-testid="button-cancel-checkout">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1 sm:flex-none" data-testid="button-place-order">
                    {isLoading ? "Placing Order..." : "Place Order"}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                    Returning customer? Login to auto-fill your details
                  </div>

                  <div>
                    <Label htmlFor="login-phone">Phone Number *</Label>
                    <Input
                      id="login-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="login-password">Password *</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default password is the last 6 digits of your phone number
                    </p>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1 sm:flex-none">
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <PaymentQRDialog
        isOpen={showQRDialog}
        onClose={handlePaymentClose}
        orderId={orderId}
        amount={total}
        customerName={customerName}
        phone={phone}
        email={email}
        address={address}
      />
    </>
  );
}