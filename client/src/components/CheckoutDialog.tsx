import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  chefId?: string;
  chefName?: string;
  categoryId?: string;
}

interface CategoryCart {
  categoryId: string;
  categoryName: string;
  chefId: string;
  chefName: string;
  items: CartItem[];
}

interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CategoryCart | null;
  onShowPaymentQR: ({
    orderId,
    amount,
    customerName,
    phone,
    email,
    address,
    accountCreated,
    defaultPassword,
  }: {
    orderId: string;
    amount: number;
    customerName: string;
    phone: string;
    email: string | undefined;
    address: string;
    accountCreated: boolean;
    defaultPassword?: string;
  }) => void;
}

export default function CheckoutDialog({
  isOpen,
  onClose,
  cart,
  onShowPaymentQR,
}: CheckoutDialogProps) {
  const [activeTab, setActiveTab] = useState("checkout");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [subtotal, setSubtotal] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  const [discount, setDiscount] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [phoneExists, setPhoneExists] = useState<boolean | null>(null);
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { toast } = useToast();
  const { user: userToken } = useAuth();

  useEffect(() => {
    if (cart) {
      const calculatedSubtotal = cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      setSubtotal(calculatedSubtotal);

      // Calculate delivery fee based on distance (simplified for now)
      // In a real app, you'd use a geocoding API and potentially charge more for longer distances
      const baseDeliveryFee = 20; // Base fee
      const distanceFeeMultiplier = 5; // Fee per km over 5 km
      const maxDeliveryFee = 100; // Cap the delivery fee

      let calculatedDeliveryFee = baseDeliveryFee;
      let calculatedDeliveryDistance: number | null = null;

      if (address) {
        // Simple heuristic: Assume distance based on address complexity or length
        // A real implementation would involve a proper address lookup or API call
        const approxDistance = Math.max(0, address.length - 50); // Arbitrary calculation
        calculatedDeliveryDistance = approxDistance;

        if (approxDistance > 5) {
          calculatedDeliveryFee = baseDeliveryFee + (approxDistance - 5) * distanceFeeMultiplier;
        }
        calculatedDeliveryFee = Math.min(calculatedDeliveryFee, maxDeliveryFee); // Apply max fee
      }

      setDeliveryFee(calculatedDeliveryFee);
      setDeliveryDistance(calculatedDeliveryDistance);

      const calculatedDiscount = appliedCoupon
        ? Math.min(appliedCoupon.discountAmount, calculatedSubtotal + calculatedDeliveryFee)
        : 0;
      setDiscount(calculatedDiscount);

      setTotal(calculatedSubtotal + calculatedDeliveryFee - calculatedDiscount);
    }
  }, [cart, address, appliedCoupon]);

  useEffect(() => {
    // Auto-fill details if user is logged in
    if (userToken && cart) {
      // Assuming user details are available from useAuth hook
      // For now, we'll just simulate pre-filling if userToken exists
      // In a real app, you'd fetch user details here or have them in useAuth
      setCustomerName("Logged In User"); // Placeholder
      // setEmail(userToken.email); // Example
      // setAddress(userToken.address); // Example
      setActiveTab("checkout"); // Automatically go to checkout
    }
  }, [userToken, cart]);


  const handlePhoneChange = async (value: string) => {
    setPhone(value.replace(/\D/g, "").slice(0, 10)); // Allow only digits, max 10
    if (value.length === 10) {
      setIsCheckingPhone(true);
      setPhoneExists(null); // Reset previous state
      try {
        const response = await fetch(`/api/auth/check-phone?phone=${value}`);
        const data = await response.json();
        setPhoneExists(data.exists);
        if (data.exists && !userToken) {
          toast({
            title: "Phone number already registered",
            description: "Please login to continue.",
            variant: "destructive",
          });
        } else if (!data.exists && userToken) {
          // If user is logged in but phone doesn't match, maybe it's an error or they are changing it
          // For now, we assume logged-in user's phone is correct
        }
      } catch (error) {
        console.error("Error checking phone:", error);
        toast({
          title: "Error checking phone",
          description: "Could not verify phone number. Please try again.",
          variant: "destructive",
        });
        setPhoneExists(false); // Assume not exists on error
      } finally {
        setIsCheckingPhone(false);
      }
    } else {
      setPhoneExists(null); // Reset if not 10 digits
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsVerifyingCoupon(true);
    setCouponError("");

    try {
      const response = await fetch("/api/coupons/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setCouponError(errorData.message || "Invalid coupon code");
        setAppliedCoupon(null);
      } else {
        const data = await response.json();
        setAppliedCoupon({ code: couponCode, discountAmount: data.discountAmount });
        // Recalculate totals to reflect discount immediately
        const calculatedSubtotal = cart!.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );
        const calculatedDiscount = Math.min(data.discountAmount, calculatedSubtotal + deliveryFee);
        setDiscount(calculatedDiscount);
        setTotal(calculatedSubtotal + deliveryFee - calculatedDiscount);
      }
    } catch (error) {
      console.error("Coupon application error:", error);
      setCouponError("Failed to apply coupon. Please try again later.");
      setAppliedCoupon(null);
    } finally {
      setIsVerifyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
    // Recalculate totals without discount
    const calculatedSubtotal = cart!.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    setDiscount(0);
    setTotal(calculatedSubtotal + deliveryFee);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cart || cart.items.length === 0) {
      toast({
        title: "Error",
        description: "Your cart is empty",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number
    if (phone.length !== 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const orderData = {
        customerName,
        phone,
        email: email || "",
        address,
        items: cart.items.map((item: CartItem) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          categoryId: item.categoryId,
          chefId: item.chefId,
        })),
        subtotal,
        deliveryFee,
        discount,
        couponCode: appliedCoupon?.code,
        total,
        status: "pending" as const,
        paymentStatus: "pending" as const,
      };

      console.log("Sending order data:", orderData);

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add auth token if user is logged in
      if (userToken) {
        headers.Authorization = `Bearer ${userToken}`;
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers,
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create order");
      }

      const result = await response.json();

      console.log("Order created successfully:", result);

      // Show different messages for new vs existing users
      if (result.accountCreated) {
        toast({
          title: "✓ Account Created & Order Placed!",
          description: `Order #${result.id.slice(0, 8)} created. Your login password is the last 6 digits of your phone: ${phone.slice(-6)}`,
          duration: 10000, // Show for 10 seconds
        });
      } else {
        toast({
          title: "✓ Order placed successfully!",
          description: `Order #${result.id.slice(0, 8)} created`,
        });
      }

      // Call the payment QR callback
      onShowPaymentQR({
        orderId: result.id,
        amount: total,
        customerName,
        phone,
        email,
        address,
        accountCreated: result.accountCreated,
        defaultPassword: phone.slice(-6), // Always use last 6 digits
      });

      // Reset form
      setCustomerName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setCouponCode("");
      setAppliedCoupon(null);

    } catch (error) {
      console.error("Order creation error:", error);
      toast({
        title: "Order failed",
        description: error instanceof Error ? error.message : "Failed to create order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Login failed");
      }

      const data = await response.json();

      // Store token
      localStorage.setItem("userToken", data.token);

      // Auto-fill user details
      setCustomerName(data.user.name || "");
      setEmail(data.user.email || "");
      setAddress(data.user.address || "");

      toast({
        title: "✓ Login successful",
        description: "Your details have been filled automatically",
      });

      // Switch to checkout tab
      setActiveTab("checkout");

    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!phone || phone.length !== 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter your registered phone number",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/user/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset password");
      }

      const data = await response.json();

      toast({
        title: "✓ Password Reset Successful",
        description: `Your password is: ${data.newPassword} (last 6 digits of your phone)`,
        duration: 10000, // Show for 10 seconds
      });

      setShowForgotPassword(false);

    } catch (error) {
      toast({
        title: "Reset failed",
        description: "Could not reset password. Please contact support.",
        variant: "destructive",
      });
    }
  };

  // Dummy password state for login form
  const [password, setPassword] = useState("");


  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              Complete your order.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="checkout" onClick={() => setActiveTab("checkout")}>
                Checkout
              </TabsTrigger>
              <TabsTrigger value="login" onClick={() => setActiveTab("login")}>
                Login
              </TabsTrigger>
            </TabsList>

            {/* Checkout Tab */}
            <TabsContent value="checkout">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3">
                  {/* Customer Information */}
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
                    <div className="relative">
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        required
                        disabled={!!userToken}
                        placeholder="Enter 10-digit mobile number"
                      />
                      {isCheckingPhone && (
                        <div className="absolute right-3 top-3">
                          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    {phoneExists && !userToken && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        ⚠️ This number is registered. Please login to continue.
                      </p>
                    )}
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

                  {/* Coupon Code */}
                  <div>
                    <Label htmlFor="couponCode" className="text-sm">
                      Coupon Code (Optional)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="couponCode"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setCouponError("");
                        }}
                        placeholder="Enter coupon code"
                        disabled={!!appliedCoupon}
                        className="uppercase"
                      />
                      {appliedCoupon ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRemoveCoupon}
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleApplyCoupon}
                          disabled={isVerifyingCoupon || !couponCode.trim()}
                        >
                          {isVerifyingCoupon ? "Verifying..." : "Apply"}
                        </Button>
                      )}
                    </div>
                    {couponError && (
                      <p className="text-xs text-destructive mt-1">{couponError}</p>
                    )}
                    {appliedCoupon && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Coupon "{appliedCoupon.code}" applied - You save ₹{appliedCoupon.discountAmount}
                      </p>
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>
                      Delivery Fee
                      {deliveryDistance !== null && deliveryDistance < 100
                        ? ` (${deliveryDistance.toFixed(1)} km)`
                        : ''}:
                    </span>
                    <span>₹{deliveryFee.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount:</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base border-t pt-2">
                    <span>Total:</span>
                    <span>₹{total.toFixed(2)}</span>
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
                      placeholder="Enter your registered number"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="login-password" className="text-sm">
                        Password *
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Last 6 digits of your phone"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 Default password: last 6 digits of your phone number
                    </p>
                  </div>

                  {showForgotPassword && (
                    <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 space-y-2">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        Reset your password? A new password will be sent to you.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowForgotPassword(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleForgotPassword}
                        >
                          Reset Password
                        </Button>
                      </div>
                    </div>
                  )}
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
    </>
  );
}