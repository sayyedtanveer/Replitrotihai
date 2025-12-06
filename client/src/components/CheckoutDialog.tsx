import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useApplyReferral } from "@/hooks/useApplyReferral";
import { Loader2, Clock } from "lucide-react";

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
  chefLatitude?: number;
  chefLongitude?: number;
  items: CartItem[];
  total?: number;
  deliveryFee?: number;
  distance?: number;
  freeDeliveryEligible?: boolean;
  amountForFreeDelivery?: number;
  chefIsActive?: boolean;
}

interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CategoryCart | null;
  onClearCart?: () => void;
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
  onClearCart,
  onShowPaymentQR,
}: CheckoutDialogProps) {
  const [activeTab, setActiveTab] = useState("checkout");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [referralCode, setReferralCode] = useState("");
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
  const [selectedDeliveryTime, setSelectedDeliveryTime] = useState("");
  const [selectedDeliverySlotId, setSelectedDeliverySlotId] = useState("");
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const applyReferralMutation = useApplyReferral();

  // Check if this is a Roti category order
  const isRotiCategory = cart?.categoryName?.toLowerCase() === 'roti' ||
                         cart?.categoryName?.toLowerCase().includes('roti');

  // Fetch delivery time slots for Roti orders
  const { data: deliverySlots = [] } = useQuery<Array<{
    id: string;
    startTime: string;
    endTime: string;
    label: string;
    capacity: number;
    currentOrders: number;
    isActive: boolean;
  }>>({
    queryKey: ["/api/delivery-slots"],
    enabled: isRotiCategory,
  });

  // Compute cutoff info for each slot (client-side advisory). Keep in sync with server logic.
  const slotCutoffMap = useMemo(() => {
    const map: Record<string, {
      cutoffHoursBefore: number;
      cutoffDate: Date;
      isPastCutoff: boolean;
      nextAvailableDate: Date;
      deliveryDateLabel: string;
      isMorningSlot: boolean;
      slotHasPassed: boolean;
    }> = {};
    const now = new Date();
    const currentHour = now.getHours();

    deliverySlots.forEach((slot) => {
      const [hStr, mStr] = (slot.startTime || "00:00").split(":");
      const h = parseInt(hStr || "0", 10) || 0;
      const m = parseInt(mStr || "0", 10) || 0;

      // Check if this is a morning slot (8 AM to 11 AM)
      const isMorningSlot = h >= 8 && h < 11;

      // Get cutoff hours - prefer slot's configured value, otherwise use defaults
      let cutoffHours: number;
      if (typeof (slot as any).cutoffHoursBefore === 'number') {
        cutoffHours = (slot as any).cutoffHoursBefore;
      } else if (isMorningSlot) {
        // Morning slots: default to 11 PM previous day
        cutoffHours = h + 13; // 8 AM + 13 = 21 (9 PM), 9 AM + 13 = 22 (10 PM), 10 AM + 13 = 23 (11 PM)
      } else if (h < 8) {
        cutoffHours = 10;
      } else if (h >= 12) {
        // Evening/afternoon slots: use 1 hour cutoff
        // If it's 2 PM and user selects 2 PM, it will be next day
        // User must select 3 PM or later for same-day delivery
        cutoffHours = 1;
      } else {
        cutoffHours = 4;
      }

      // Build today's occurrence of this slot
      const todaySlot = new Date(now);
      todaySlot.setHours(h, m, 0, 0);

      // Check if this time slot has already passed today (current time > slot time)
      const slotHasPassed = now > todaySlot;

      // Calculate cutoff time for today's slot
      const cutoffMs = cutoffHours * 60 * 60 * 1000;
      const todayCutoffTime = new Date(todaySlot.getTime() - cutoffMs);

      // Determine if we can still order for today's slot
      let deliveryDate: Date;
      let isPastCutoff: boolean;

      // Logic: If slot time has passed OR we're past the cutoff time, deliver tomorrow
      if (slotHasPassed || now > todayCutoffTime) {
        // Schedule for tomorrow
        deliveryDate = new Date(todaySlot);
        deliveryDate.setDate(deliveryDate.getDate() + 1);
        isPastCutoff = true;
      } else {
        // Can still deliver today
        deliveryDate = todaySlot;
        isPastCutoff = false;
      }

      // Create friendly label for delivery date
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const deliveryDateStart = new Date(deliveryDate);
      deliveryDateStart.setHours(0, 0, 0, 0);

      let deliveryDateLabel: string;
      if (deliveryDateStart.getTime() === todayStart.getTime()) {
        deliveryDateLabel = "Today";
      } else if (deliveryDateStart.getTime() === tomorrowStart.getTime()) {
        deliveryDateLabel = "Tomorrow";
      } else {
        deliveryDateLabel = deliveryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }

      map[slot.id] = {
        cutoffHoursBefore: cutoffHours,
        cutoffDate: todayCutoffTime,
        isPastCutoff,
        nextAvailableDate: deliveryDate,
        deliveryDateLabel,
        isMorningSlot,
        slotHasPassed,
      };
    });
    return map;
  }, [deliverySlots]);

  const [suggestedReschedule, setSuggestedReschedule] = useState<null | { slotId: string; nextAvailableDate: string }>(null);

  // Get token from localStorage (for authenticated users)
  const userToken = localStorage.getItem("userToken");

  useEffect(() => {
    if (cart) {
      const calculatedSubtotal = cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      setSubtotal(calculatedSubtotal);

      // Use precomputed delivery values from cart if available
      const calculatedDeliveryFee = cart.deliveryFee !== undefined ? cart.deliveryFee : 20;
      const calculatedDeliveryDistance = cart.distance !== undefined ? cart.distance : null;

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
      const savedUserData = localStorage.getItem("userData");
      if (savedUserData) {
        try {
          const userData = JSON.parse(savedUserData);
          setCustomerName(userData.name || "");
          setPhone(userData.phone || "");
          setEmail(userData.email || "");
          setAddress(userData.address || "");
        } catch (error) {
          console.error("Failed to parse user data:", error);
        }
      }
      setActiveTab("checkout"); // Automatically go to checkout
    }
  }, [userToken, cart]);


  const handlePhoneChange = async (value: string) => {
    setPhone(value.replace(/\D/g, "").slice(0, 10)); // Allow only digits, max 10
    if (value.length === 10) {
      setIsCheckingPhone(true);
      setPhoneExists(null); // Reset previous state
      try {
        const response = await fetch("/api/user/check-phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: value }),
        });
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

    // Check if chef is accepting orders
    if (cart.chefIsActive === false) {
      toast({
        title: "Chef Currently Closed",
        description: `${cart.chefName} is not accepting orders right now. Please try again later.`,
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

    // Prevent checkout if phone exists but user is not logged in
    if (phoneExists && !userToken) {
      toast({
        title: "Login Required",
        description: "This phone number is already registered. Please switch to the Login tab to continue.",
        variant: "destructive",
      });
      // Switch to login tab to make it easier for user
      setActiveTab("login");
      return;
    }

    // Check morning restriction for Roti orders (8 AM - 11 AM)
    const now = new Date();
    const currentHour = now.getHours();
    const inMorningRestriction = currentHour >= 8 && currentHour < 11;
    
    if (isRotiCategory && inMorningRestriction && selectedDeliverySlotId) {
      const selectedSlotInfo = slotCutoffMap[selectedDeliverySlotId];
      if (selectedSlotInfo?.isMorningSlot) {
        toast({
          title: "Morning Slot Unavailable",
          description: "Morning delivery slots (8 AM - 11 AM) must be ordered by 11 PM the previous day. Please select a later time slot or order after 11 AM.",
          variant: "destructive",
        });
        return;
      }
    }

    // Delivery time is optional for Roti orders

    setIsLoading(true);

    try {
      // Get delivery date info if slot selected
      const slotInfo = selectedDeliverySlotId ? slotCutoffMap[selectedDeliverySlotId] : null;
      const deliveryDateStr = slotInfo ? slotInfo.nextAvailableDate.toISOString().split('T')[0] : undefined;

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
        chefId: cart.chefId || cart.items[0]?.chefId,
        categoryId: cart.categoryId,
        categoryName: cart.categoryName,
        deliveryTime: isRotiCategory && selectedDeliveryTime ? selectedDeliveryTime : undefined,
        deliverySlotId: isRotiCategory && selectedDeliverySlotId ? selectedDeliverySlotId : undefined,
        deliveryDate: isRotiCategory && deliveryDateStr ? deliveryDateStr : undefined,
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
        const error = await response.json().catch(() => ({}));
        if (error.requiresLogin) {
          toast({
            title: "Login Required",
            description: error.message || "This phone number is already registered. Please login.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Handle server telling client to reschedule due to cutoff
        if (error.requiresReschedule) {
          setSuggestedReschedule({ slotId: orderData.deliverySlotId as string, nextAvailableDate: error.nextAvailableDate });
          toast({
            title: "Selected slot passed cutoff",
            description: error.message || "Selected delivery slot missed the ordering cutoff. Please schedule for the next available date.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        throw new Error(error.message || "Failed to create order");
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

        // Store the new user token for future requests
        if (result.accessToken) {
          localStorage.setItem("userToken", result.accessToken);
          // Store user data for immediate use
          localStorage.setItem("userData", JSON.stringify({
            id: result.userId || result.user?.id,
            name: customerName,
            phone: phone,
            email: email || "",
            address: address || "",
          }));
        }

        // Apply referral code if provided by new user
        if (referralCode.trim() && result.accessToken) {
          try {
            applyReferralMutation.mutate({
              referralCode: referralCode.trim(),
              userToken: result.accessToken,
            });
          } catch (err) {
            console.error("Failed to apply referral code:", err);
          }
        }
      } else {
        toast({
          title: "✓ Order placed successfully!",
          description: `Order #${result.id.slice(0, 8)} created`,
        });
      }

      // Clear the cart for this category after successful order
      if (onClearCart && cart?.categoryId) {
        onClearCart();
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
      setReferralCode("");
      setAppliedCoupon(null);
      setPhoneExists(null);
      setSelectedDeliveryTime("");
      setSelectedDeliverySlotId("");

      // Close the checkout dialog
      onClose();

      // Don't reload page - let PaymentQRDialog handle the flow
      // The user will be redirected to tracking page when they close the QR dialog

    } catch (error) {
      console.error("Order creation error:", error);
      toast({
        title: "Order failed",
        description: error instanceof Error ? error.message : "Failed to create order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false); // Changed from setIsSubmitting to setIsLoading
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); // Changed from setIsSubmitting to setIsLoading

    try {
      const response = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Login failed");
      }

      const data = await response.json();

      // Store token and user data
      localStorage.setItem("userToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("userData", JSON.stringify({
        id: data.user.id,
        name: data.user.name,
        phone: data.user.phone,
        email: data.user.email || "",
        address: data.user.address || "",
      }));

      // Auto-fill user details
      setCustomerName(data.user.name || "");
      setPhone(data.user.phone || "");
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
      setIsLoading(false); // Changed from setIsSubmitting to setIsLoading
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

  // Determine if the form is valid for submission
  const isFormValid = customerName && phone && address;


  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[480px] max-h-[85vh] overflow-y-auto rounded-lg mx-4 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>
              Complete your order.
            </DialogDescription>
          </DialogHeader>

          {/* Chef closed warning */}
          {cart?.chefIsActive === false && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-4">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                Chef Currently Closed
              </p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                {cart.chefName} is not accepting orders right now. Please check back later.
              </p>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="checkout" onClick={() => setActiveTab("checkout")}>
                Checkout
              </TabsTrigger>
              <TabsTrigger
                value="login"
                onClick={() => setActiveTab("login")}
                disabled={!!userToken}
                className={userToken ? "cursor-not-allowed opacity-50" : ""}
              >
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
                      <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md p-2 mt-1">
                        <p className="text-xs text-orange-800 dark:text-orange-200 font-medium">
                          ⚠️ This phone number is already registered.
                        </p>
                        <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                          Please switch to the <strong>Login</strong> tab to continue with this number, or use a different phone number.
                        </p>
                      </div>
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

                  {/* Delivery Time Selection - OPTIONAL for Roti orders */}
                  {isRotiCategory && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-700 rounded-md p-3">
                      <div className="space-y-2 w-full">
                      <Label htmlFor="delivery-slot" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Select Delivery Time (Optional)
                      </Label>
                      <p className="text-xs text-primary flex items-start gap-1">
                        <span>💡</span>
                        <span>Choose a preferred time slot for your fresh rotis</span>
                      </p>
                      <Select
                        value={selectedDeliverySlotId}
                        onValueChange={(value) => {
                          setSelectedDeliverySlotId(value);
                          const slot = deliverySlots.find((s: any) => s.id === value);
                          if (slot) {
                            setSelectedDeliveryTime(slot.startTime);
                          }
                        }}
                      >
                        <SelectTrigger id="delivery-slot" data-testid="select-delivery-slot" className="w-full">
                          <SelectValue placeholder="Choose a time slot" />
                        </SelectTrigger>
                        <SelectContent align="center" className="w-full max-w-[300px]">
                          {deliverySlots
                              .filter(slot => slot.isActive && slot.currentOrders < slot.capacity)
                              .map((slot) => {
                                const cutoff = slotCutoffMap[slot.id];
                                const slotsLeft = slot.capacity - slot.currentOrders;
                                const now = new Date();
                                const currentHour = now.getHours();
                                
                                // Check if we're in morning restriction period (8 AM - 11 AM)
                                const inMorningRestriction = currentHour >= 8 && currentHour < 11;
                                const isDisabled = cutoff?.isMorningSlot && inMorningRestriction;
                                
                                return (
                                  <SelectItem
                                    key={slot.id}
                                    value={slot.id}
                                    data-testid={`delivery-slot-${slot.id}`}
                                    className="w-full"
                                    disabled={isDisabled}
                                  >
                                    <div className="flex flex-col w-full">
                                      <span className="font-medium">{slot.label}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {cutoff?.deliveryDateLabel} ({slotsLeft} slots)
                                        {cutoff?.slotHasPassed && !cutoff.isPastCutoff && " - Next day"}
                                      </span>
                                      {isDisabled && (
                                        <span className="text-xs text-red-500">
                                          ⚠️ Not available during morning hours
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                          {deliverySlots.filter(slot => slot.isActive && slot.currentOrders < slot.capacity).length === 0 && (
                            <SelectItem value="none" disabled>
                              No delivery slots available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {selectedDeliverySlotId && slotCutoffMap[selectedDeliverySlotId] && (
                        <div className="mt-1 text-center">
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Delivery: {slotCutoffMap[selectedDeliverySlotId].deliveryDateLabel} at {selectedDeliveryTime}
                          </p>
                          {slotCutoffMap[selectedDeliverySlotId].slotHasPassed && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                              ℹ️ This time has passed today - your order will be delivered tomorrow
                            </p>
                          )}
                        </div>
                      )}
                      {!selectedDeliveryTime && (
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          Optional - if not selected, we'll deliver at the earliest available time
                        </p>
                      )}
                    </div>
                    </div>
                  )}

                  {/* Referral Code Input - for new users only (not logged in) */}
                  {!isAuthenticated && (
                    <div>
                      <Label htmlFor="referralCode" className="text-sm flex items-center gap-1">
                        Referral Code <span className="text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <Input
                        id="referralCode"
                        type="text"
                        placeholder="Enter friend's referral code"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className="font-mono uppercase"
                        maxLength={20}
                        data-testid="input-checkout-referral-code"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Have a referral code? Enter it to earn bonus rewards!
                      </p>
                    </div>
                  )}

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
                  <Button
                    type="submit"
                    disabled={isLoading || !isFormValid || (phoneExists === true && !userToken) || cart?.chefIsActive === false}
                    variant={phoneExists && !userToken ? "destructive" : cart?.chefIsActive === false ? "destructive" : "default"}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : cart?.chefIsActive === false ? (
                      "Chef Currently Closed"
                    ) : phoneExists && !userToken ? (
                      "Login Required - Switch to Login Tab"
                    ) : (
                      "Place Order"
                    )}
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