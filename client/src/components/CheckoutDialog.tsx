import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// TypeScript declaration for window timeout
declare global {
  interface Window {
    phoneCheckTimeout?: NodeJS.Timeout;
  }
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
  cart: CategoryCart | null;
  onShowPaymentQR: (orderDetails: {
    orderId: string;
    amount: number;
    customerName: string;
    phone: string;
    email?: string;
    address: string;
    accountCreated?: boolean;
    defaultPassword?: string;
  }) => void;
}

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  email: z.string().email().optional(),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
  deliveryFee: z.number().optional(),
  total: z.number().optional(),
});

export default function CheckoutDialog({
  isOpen,
  onClose,
  cart,
  onShowPaymentQR,
}: CheckoutDialogProps) {
  const { clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { userToken, userData } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      deliveryFee: 0,
      total: 0,
    },
  });

  let userTokenFromStorage = localStorage.getItem("userToken");
  const savedUserData = localStorage.getItem("userData");
  const parsedUserData = savedUserData ? JSON.parse(savedUserData) : null;

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"checkout" | "login">("checkout");
  const [accountCreated, setAccountCreated] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [phoneExists, setPhoneExists] = useState<boolean | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [useWallet, setUseWallet] = useState(false);
  const [walletAmount, setWalletAmount] = useState(0);
  const [maxWalletUsage, setMaxWalletUsage] = useState(0);

  // Fetch wallet balance if user is logged in
  const { data: walletData } = useQuery({
    queryKey: ["/api/user/wallet", userToken],
    enabled: !!userToken,
    queryFn: async () => {
      const res = await fetch("/api/user/wallet", {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      if (!res.ok) return { balance: 0 };
      return res.json();
    }
  });

  // Fetch wallet usage settings
  const { data: walletSettings } = useQuery({
    queryKey: ["/api/wallet-settings"],
    queryFn: async () => {
      const res = await fetch("/api/wallet-settings");
      if (!res.ok) return { maxUsagePerOrder: 10 };
      return res.json();
    }
  });

  useEffect(() => {
    if (walletData && walletSettings) {
      const maxUsage = Math.min(
        walletData.balance,
        walletSettings.maxUsagePerOrder,
        form.getValues("total") || 0
      );
      setMaxWalletUsage(maxUsage);
      if (useWallet) {
        setWalletAmount(maxUsage);
      }
    }
  }, [walletData, walletSettings, useWallet, form.watch("total")]);

  // ✅ Autofill user info if already logged in
  useEffect(() => {
    if (isOpen && parsedUserData) {
      setCustomerName(parsedUserData.name || "");
      setPhone(parsedUserData.phone || "");
      setEmail(parsedUserData.email || "");
      setAddress(parsedUserData.address || "");
      form.setValue("name", parsedUserData.name || "");
      form.setValue("phone", parsedUserData.phone || "");
      form.setValue("email", parsedUserData.email || "");
      form.setValue("address", parsedUserData.address || "");
    }
  }, [isOpen, parsedUserData, form]);

  // ✅ Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setActiveTab("checkout");
      setAccountCreated(false);
      setDefaultPassword("");
      setDeliveryFee(40);
      setDeliveryDistance(null);
      setCouponCode("");
      setAppliedCoupon(null);
      setCouponError("");
      setPhoneExists(null);
      setShowForgotPassword(false);
      setPassword("");
      setReferralCode("");
      setUseWallet(false);
      setWalletAmount(0);
      setMaxWalletUsage(0);
      form.reset();
    }
  }, [isOpen, form]);

  // Calculate delivery fee when address changes or cart is available
  const [deliveryFee, setDeliveryFee] = useState(40);
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);

  useEffect(() => {
    const calculateDeliveryFee = async () => {
      const currentAddress = form.getValues("address");
      if (!cart || !currentAddress.trim()) {
        setDeliveryFee(40);
        setDeliveryDistance(null);
        form.setValue("deliveryFee", 40);
        return;
      }

      const userLat = localStorage.getItem('userLatitude');
      const userLon = localStorage.getItem('userLongitude');

      if (!userLat || !userLon) {
        setDeliveryFee(40);
        setDeliveryDistance(null);
        form.setValue("deliveryFee", 40);
        return;
      }

      try {
        const lat = parseFloat(userLat);
        const lon = parseFloat(userLon);

        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          console.error('Invalid coordinates');
          setDeliveryFee(40);
          setDeliveryDistance(null);
          form.setValue("deliveryFee", 40);
          return;
        }

        const response = await fetch('/api/calculate-delivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: lat,
            longitude: lon,
            chefId: cart.chefId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.distance && data.distance < 50) {
            setDeliveryFee(data.deliveryFee);
            setDeliveryDistance(data.distance);
            form.setValue("deliveryFee", data.deliveryFee);
          } else {
            console.error('Distance out of range:', data.distance);
            setDeliveryFee(40);
            setDeliveryDistance(null);
            form.setValue("deliveryFee", 40);
          }
        } else {
          setDeliveryFee(40);
          setDeliveryDistance(null);
          form.setValue("deliveryFee", 40);
        }
      } catch (error) {
        console.error('Error calculating delivery fee:', error);
        setDeliveryFee(40);
        setDeliveryDistance(null);
        form.setValue("deliveryFee", 40);
      }
    };

    calculateDeliveryFee();
  }, [cart, form.watch("address"), form]);

  // 🧮 Totals — based on the selected cart
  const subtotal =
    cart?.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;

  const discount = appliedCoupon?.discountAmount || 0;
  const calculatedTotal = subtotal + deliveryFee - discount - walletAmount;
  form.setValue("total", calculatedTotal);

  // 🎟️ Apply Coupon
  const handleApplyCoupon = async () => {
    const currentCouponCode = form.getValues("couponCode");
    if (!currentCouponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setIsVerifyingCoupon(true);
    setCouponError("");

    try {
      const response = await fetch("/api/coupons/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: currentCouponCode.toUpperCase(),
          orderAmount: subtotal,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setCouponError(error.message || "Invalid coupon code");
        setAppliedCoupon(null);
        return;
      }

      const coupon = await response.json();
      setAppliedCoupon({
        code: coupon.code,
        discountAmount: coupon.discountAmount,
      });
      setCouponError("");
      toast({
        title: "Coupon applied!",
        description: `You saved ₹${coupon.discountAmount}`,
      });
    } catch (error) {
      setCouponError("Failed to verify coupon");
      setAppliedCoupon(null);
    } finally {
      setIsVerifyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    form.setValue("couponCode", "");
    setCouponError("");
  };

  // 📱 Check if phone number exists
  const checkPhoneNumber = async (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setPhoneExists(null);
      return;
    }

    setIsCheckingPhone(true);
    try {
      const response = await fetch("/api/user/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      const data = await response.json();
      setPhoneExists(data.exists);

      if (data.exists) {
        toast({
          title: "Account Found",
          description: "Please login to continue with your existing account.",
          duration: 3000,
        });
        setActiveTab("login");
      }
    } catch (error) {
      console.error("Error checking phone:", error);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  // Handle phone input change with debounce
  const handlePhoneChange = (value: string) => {
    setPhone(value);
    form.setValue("phone", value);
    setPhoneExists(null);
    setShowForgotPassword(false); // Reset forgot password state

    if (window.phoneCheckTimeout) {
      clearTimeout(window.phoneCheckTimeout);
    }

    if (value.length >= 10 && !userToken) {
      window.phoneCheckTimeout = setTimeout(() => {
        checkPhoneNumber(value);
      }, 1000);
    } else if (value.length < 10) {
      setPhoneExists(null);
    }
  };

  // 🔑 Forgot password handler
  const handleForgotPassword = async () => {
    const currentPhone = form.getValues("phone");
    if (!currentPhone) {
      toast({
        title: "Phone Required",
        description: "Please enter your phone number first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/user/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentPhone }),
      });

      if (!response.ok) throw new Error("Failed to reset password");

      const data = await response.json();
      toast({
        title: "Password Reset",
        description: `Your new password: ${data.newPassword}. Please save it and change it after login.`,
        duration: 15000,
      });
      setShowForgotPassword(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset password. Please contact support.",
        variant: "destructive",
      });
    }
  };

  // 🔐 Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const currentPhone = form.getValues("phone");
    const currentPassword = password;

    try {
      const response = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentPhone, password: currentPassword }),
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
      form.setValue("name", authData.user.name);
      form.setValue("phone", authData.user.phone);
      form.setValue("email", authData.user.email || "");
      form.setValue("address", authData.user.address || "");

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

    const values = form.getValues();

    if (phoneExists && !userToken) {
      toast({
        title: "Login Required",
        description: "Please login to continue with your existing account.",
        variant: "destructive",
      });
      setActiveTab("login");
      return;
    }

    setIsLoading(true);

    try {
      if (!userTokenFromStorage) {
        const autoRegisterResponse = await fetch("/api/user/auto-register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: values.name,
            phone: values.phone,
            email: values.email || null,
            address: values.address,
            referralCode: !userToken ? referralCode : undefined,
          }),
        });

        if (!autoRegisterResponse.ok) {
          const error = await autoRegisterResponse.json();
          throw new Error(error.message || "Auto-register failed");
        }

        const authData = await autoRegisterResponse.json();
        localStorage.setItem("userToken", authData.accessToken);
        localStorage.setItem("userRefreshToken", authData.refreshToken);
        localStorage.setItem("userData", JSON.stringify(authData.user));

        userTokenFromStorage = authData.accessToken;
        setAccountCreated(true);

        if (authData.defaultPassword) {
          setDefaultPassword(authData.defaultPassword);
          toast({
            title: "Account Created!",
            description: `Default password: ${authData.defaultPassword}. Please save it securely.`,
            duration: 10000,
          });
        }
      }

      const finalTotal = values.total - walletAmount;

      const orderData = {
        customerName: values.name,
        phone: values.phone,
        email: values.email || undefined,
        address: values.address,
        items: cart.items,
        subtotal: cart.subtotal,
        deliveryFee: values.deliveryFee,
        total: finalTotal,
        walletAmountUsed: walletAmount,
        chefId: cart.items[0]?.chefId || null,
        userId: userToken ? userData?.id : null,
        couponCode: appliedCoupon?.code,
        discount: appliedCoupon?.discountAmount || 0,
        referralCode: !userToken ? referralCode : undefined,
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

      clearCart(cart.categoryId);

      toast({
        title: "Order placed successfully!",
        description: "Please complete the payment to confirm your order.",
      });

      onShowPaymentQR({
        orderId: order.id,
        amount: finalTotal,
        customerName: values.name,
        phone: values.phone,
        email: values.email || undefined,
        address: values.address,
        accountCreated,
        defaultPassword,
      });
    } catch (error: any) {
      console.error("Order creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
              <TabsTrigger
                value="checkout"
                className="text-xs sm:text-sm"
                disabled={phoneExists === true && !userToken}
              >
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

            <TabsContent value="checkout" className="space-y-3 sm:space-y-4 mt-4">
              <Form {...form}>
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                  <div className="space-y-2 sm:space-y-3">
                    {userToken && (
                      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md p-2 sm:p-3 text-xs sm:text-sm text-green-800 dark:text-green-200">
                        ✓ Logged in as {parsedUserData?.name || parsedUserData?.phone}
                      </div>
                    )}

                    {phoneExists && !userToken && (
                      <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md p-2 sm:p-3 text-xs sm:text-sm text-orange-800 dark:text-orange-200">
                        ⚠️ This phone number is already registered. Please switch to the Login tab to continue.
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Full Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter your full name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Phone Number *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type="tel"
                                placeholder="Enter 10-digit mobile number"
                                onChange={(e) => {
                                  field.onChange(e);
                                  handlePhoneChange(e.target.value);
                                }}
                                disabled={!!userToken}
                              />
                              {isCheckingPhone && (
                                <div className="absolute right-3 top-3">
                                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                              )}
                            </div>
                          </FormControl>
                          {phoneExists && !userToken && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                              ⚠️ This number is registered. Please login to continue.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Email (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="Enter your email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Delivery Address *</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Enter your complete address" rows={3} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            Please include street, area, and any landmarks in Kurla West, Mumbai
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Referral Code for New Users */}
                    {!userToken && phoneExists === false && (
                      <div className="space-y-2">
                        <Label htmlFor="referralCode">Referral Code (Optional)</Label>
                        <Input
                          id="referralCode"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                          placeholder="Enter referral code"
                          className="uppercase"
                        />
                        <p className="text-xs text-muted-foreground">
                          Help your friend earn rewards when you complete your first order!
                        </p>
                      </div>
                    )}

                    {/* Wallet Usage for Logged In Users */}
                    {userToken && walletData && walletData.balance > 0 && (
                      <div className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base">Use Wallet Balance</Label>
                            <p className="text-sm text-muted-foreground">
                              Available: ₹{walletData.balance}
                            </p>
                          </div>
                          <Switch
                            checked={useWallet}
                            onCheckedChange={(checked) => {
                              setUseWallet(checked);
                              if (checked) {
                                setWalletAmount(maxWalletUsage);
                              } else {
                                setWalletAmount(0);
                              }
                            }}
                          />
                        </div>

                        {useWallet && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Amount to use:</span>
                              <span className="font-semibold">₹{walletAmount}</span>
                            </div>
                            <Slider
                              value={[walletAmount]}
                              onValueChange={([value]) => {
                                setWalletAmount(value);
                                form.setValue("total", subtotal + deliveryFee - discount - value);
                              }}
                              max={maxWalletUsage}
                              step={1}
                              className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                              Maximum ₹{walletSettings?.maxUsagePerOrder || 10} per order
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Coupon Code */}
                    <div className="space-y-2">
                      <Label htmlFor="couponCode" className="text-sm">
                        Coupon Code (Optional)
                      </Label>
                      <div className="flex gap-2">
                        <FormField
                          control={form.control}
                          name="couponCode"
                          render={({ field }) => (
                            <div className="flex w-full gap-2">
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Enter coupon code"
                                  disabled={!!appliedCoupon}
                                  className="uppercase"
                                />
                              </FormControl>
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
                                  disabled={isVerifyingCoupon || !field.value.trim()}
                                >
                                  {isVerifyingCoupon ? "Verifying..." : "Apply"}
                                </Button>
                              )}
                            </div>
                          )}
                        />
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

                  {/* Order Summary */}
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>₹{subtotal}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Delivery Fee</span>
                      <span>₹{form.watch("deliveryFee") || 0}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount ({appliedCoupon.code})</span>
                        <span>-₹{appliedCoupon.discountAmount}</span>
                      </div>
                    )}
                    {useWallet && walletAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Wallet Balance Used</span>
                        <span>-₹{walletAmount}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>Total</span>
                      <span>₹{(form.watch("total") || cart.total) - walletAmount}</span>
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
              </Form>
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
                      placeholder="Enter your password"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default password is the last 6 digits of your phone number
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