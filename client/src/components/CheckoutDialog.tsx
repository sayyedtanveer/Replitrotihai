import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import PaymentQRDialog from "./PaymentQRDialog";
import { useCart } from "@/hooks/use-cart";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface CategoryCart {
  categoryId: string;
  categoryName: string;
  chefId: string;
  chefName: string;
  items: Array<{ id: string; name: string; price: number; quantity: number; image: string }>;
}

interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CategoryCart | null; // ✅ Single cart
  onOrderSuccess: (categoryId: string) => void;
}

export default function CheckoutDialog({
  isOpen,
  onClose,
  cart,
  onOrderSuccess,
}: CheckoutDialogProps) {
  const { clearCart } = useCart();
  const { toast } = useToast();

  let userToken = localStorage.getItem("userToken");
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

  // ✅ Autofill user info if already logged in
  useEffect(() => {
    if (isOpen && parsedUserData) {
      setCustomerName(parsedUserData.name || "");
      setPhone(parsedUserData.phone || "");
      setEmail(parsedUserData.email || "");
      setAddress(parsedUserData.address || "");
    }
  }, [isOpen, parsedUserData]);

  // ✅ Reset state completely when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setShowQRDialog(false);
      setOrderId("");
      setIsLoading(false);
      setActiveTab("checkout");
    }
  }, [isOpen]);

  // 🧮 Totals — based on the selected cart
  const subtotal =
    cart?.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
  const deliveryFee = cart ? 40 : 0;
  const total = subtotal + deliveryFee;

  // 🔐 Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      if (!response.ok) throw new Error("Invalid credentials");
      const authData = await response.json();

      localStorage.setItem("userToken", authData.accessToken);
      localStorage.setItem("userRefreshToken", authData.refreshToken);
      localStorage.setItem("userData", JSON.stringify(authData.user));

      setCustomerName(authData.user.name);
      setPhone(authData.user.phone);
      setEmail(authData.user.email || "");
      setAddress(authData.user.address || "");

      toast({
        title: "Login successful!",
        description: "Your details have been filled automatically.",
      });

      setActiveTab("checkout");
    } catch {
      toast({
        title: "Login failed",
        description: "Invalid phone number or password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 🛒 Checkout handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart) return;

    setIsLoading(true);

    try {
      // Auto-register if no token
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

          localStorage.setItem("userToken", authData.accessToken);
          localStorage.setItem("userRefreshToken", authData.refreshToken);
          localStorage.setItem("userData", JSON.stringify(authData.user));

          userToken = authData.accessToken;

          if (authData.defaultPassword) {
            toast({
              title: "Account Created!",
              description: `Default password: ${authData.defaultPassword}`,
              duration: 10000,
            });
          }
        } else throw new Error("Auto-register failed");
      }

      // ✅ Order payload for this cart
      const allItems = cart.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        categoryId: cart.categoryId,
        chefId: cart.chefId,
      }));

      const orderData = {
        customerName,
        phone,
        email: email || null,
        address,
        items: allItems,
        subtotal,
        deliveryFee,
        total,
        status: "pending",
      };

      const latestToken = localStorage.getItem("userToken");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (latestToken) headers["Authorization"] = `Bearer ${latestToken}`;

      const response = await fetch("/api/orders", {
        method: "POST",
        headers,
        body: JSON.stringify(orderData),
      });

      if (!response.ok) throw new Error("Failed to create order");
      const order = await response.json();

      // ✅ Clear only this cart category
      clearCart(cart.categoryId);

      // ✅ Instantly show QR dialog
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
    if (cart) onOrderSuccess(cart.categoryId);
  };

  if (!cart) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md sm:max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg sm:text-xl">Checkout</DialogTitle>
            <DialogDescription className="text-sm">
              {userToken ? "Your details are ready" : "Login or continue as guest"}
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "checkout" | "login")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="checkout" className="text-xs sm:text-sm">
                {userToken ? "Place Order" : "Guest Checkout"}
              </TabsTrigger>
              <TabsTrigger
                value="login"
                disabled={!!userToken}
                className="text-xs sm:text-sm"
              >
                Login
              </TabsTrigger>
            </TabsList>

            {/* ✅ Checkout Form */}
            <TabsContent value="checkout" className="space-y-3 sm:space-y-4 mt-4">
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div className="space-y-2 sm:space-y-3">
                  {userToken && (
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-2 sm:p-3 text-xs sm:text-sm text-green-800 dark:text-green-200">
                      ✓ Logged in as {parsedUserData?.name || parsedUserData?.phone}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="customerName" className="text-sm">
                      Full Name *
                    </Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm">
                      Phone Number *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      disabled={!!userToken}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm">
                      Email (Optional)
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-sm">
                      Delivery Address *
                    </Label>
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Please include street, area, and any landmarks in Kurla West, Mumbai
                    </p>
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee:</span>
                    <span>₹{deliveryFee}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-2">
                    <span>Total:</span>
                    <span>₹{total}</span>
                  </div>
                </div>

                <DialogFooter className="gap-2 flex-col sm:flex-row">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Placing Order..." : "Place Order"}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            {/* Login Tab */}
            <TabsContent value="login" className="space-y-3 sm:space-y-4 mt-4">
              <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                <div className="space-y-2 sm:space-y-3">
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-2 sm:p-3 text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                    Returning customer? Login to auto-fill your details
                  </div>

                  <div>
                    <Label htmlFor="login-phone" className="text-sm">
                      Phone Number *
                    </Label>
                    <Input
                      id="login-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="login-password" className="text-sm">
                      Password *
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default password is the last 6 digits of your phone number
                    </p>
                  </div>
                </div>

                <DialogFooter className="gap-2 flex-col sm:flex-row">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ✅ Immediate QR Popup after order */}
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
