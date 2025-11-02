
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, MapPin, Loader2 } from "lucide-react";

const checkoutSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  address: z.string().min(10, "Please enter a complete address"),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    chefId?: string;
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  onOrderSuccess: () => void;
}

export default function CheckoutDialog({
  isOpen,
  onClose,
  cartItems,
  subtotal,
  onOrderSuccess,
}: CheckoutDialogProps) {
  const { toast } = useToast();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string>("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState(40);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  useEffect(() => {
    // Check if location is already stored
    const lat = localStorage.getItem('userLatitude');
    const lng = localStorage.getItem('userLongitude');
    
    if (lat && lng) {
      setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
      calculateDeliveryFee(parseFloat(lat), parseFloat(lng));
    }
  }, [isOpen]);

  const getUserLocation = () => {
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation. Using default delivery fee.",
        variant: "destructive",
      });
      setIsGettingLocation(false);
      setCalculatedDeliveryFee(40);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        localStorage.setItem('userLatitude', latitude.toString());
        localStorage.setItem('userLongitude', longitude.toString());
        
        calculateDeliveryFee(latitude, longitude);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Location access denied",
          description: "Using default delivery fee of ₹40. Enable location for accurate pricing.",
        });
        setIsGettingLocation(false);
        setCalculatedDeliveryFee(40);
      },
      {
        timeout: 10000,
        maximumAge: 60000,
        enableHighAccuracy: false
      }
    );
  };

  const calculateDeliveryFee = async (latitude: number, longitude: number) => {
    setIsCalculatingDistance(true);

    try {
      const res = await apiRequest("POST", "/api/calculate-delivery", {
        latitude,
        longitude,
      });
      const result = await res.json();

      if (result.distance > 10) {
        toast({
          title: "Location Too Far",
          description: "The location seems outside our Kurla delivery area.",
          variant: "destructive",
        });
        setCalculatedDistance(null);
        setCalculatedDeliveryFee(40);
        return;
      }

      setCalculatedDistance(result.distance);
      setCalculatedDeliveryFee(result.deliveryFee);

      toast({
        title: "Delivery fee calculated",
        description: `Distance: ${result.distance}km | Fee: ₹${result.deliveryFee}`,
      });
    } catch (error) {
      toast({
        title: "Calculation failed",
        description: "Could not calculate delivery fee. Using default fee.",
        variant: "destructive",
      });
      setCalculatedDistance(null);
      setCalculatedDeliveryFee(40);
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  const placeOrderMutation = useMutation({
    mutationFn: async (data: CheckoutFormData) => {
      const chefId = cartItems.length > 0 ? cartItems[0].chefId : null;

      const res = await apiRequest("POST", "/api/orders", {
        customerName: data.customerName,
        phone: data.phone,
        email: data.email || undefined,
        address: data.address,
        latitude: userLocation?.lat,
        longitude: userLocation?.lng,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        subtotal,
        deliveryFee: calculatedDeliveryFee,
        distance: calculatedDistance || undefined,
        total: subtotal + calculatedDeliveryFee,
        status: "pending",
        chefId: chefId,
      });
      return await res.json();
    },
    onSuccess: (order: any) => {
      setOrderPlaced(true);
      setOrderId(order.id);
      toast({
        title: "Order placed successfully!",
        description: `Your order #${order.id.substring(0, 8)} has been placed.`,
      });
      onOrderSuccess();
    },
    onError: () => {
      toast({
        title: "Order failed",
        description: "There was an error placing your order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CheckoutFormData) => {
    const addressLower = data.address.toLowerCase().trim();
    if (!addressLower.includes("kurla")) {
      toast({
        title: "Delivery Not Available",
        description: "We currently deliver only in Kurla, Mumbai. Please enter a Kurla address.",
        variant: "destructive",
      });
      return;
    }

    placeOrderMutation.mutate(data);
  };

  const handleClose = () => {
    setOrderPlaced(false);
    setOrderId("");
    form.reset();
    onClose();
  };

  if (orderPlaced) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent data-testid="dialog-order-success" className="sm:max-w-md">
          <div className="text-center py-4 sm:py-6">
            <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mx-auto mb-3 sm:mb-4" />
            <DialogTitle className="text-lg sm:text-2xl mb-2" data-testid="text-success-title">
              Order Placed Successfully!
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base mb-4 sm:mb-6" data-testid="text-success-description">
              Your order #{orderId.substring(0, 8)} has been confirmed and will be delivered soon.
            </DialogDescription>
            <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
              {calculatedDistance && (
                <p>Delivery distance: {calculatedDistance} km</p>
              )}
              <p>Estimated delivery time: {calculatedDistance ? `${Math.ceil(calculatedDistance * 2 + 15)}-${Math.ceil(calculatedDistance * 2 + 20)}` : '25-30'} minutes</p>
              <p className="text-base sm:text-lg font-semibold text-foreground">Total: ₹{subtotal + calculatedDeliveryFee}</p>
            </div>
            <Button onClick={handleClose} data-testid="button-close-success" className="w-full h-9 sm:h-10 text-sm">
              Continue Shopping
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-checkout">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-lg sm:text-xl" data-testid="text-checkout-title">Complete Your Order</DialogTitle>
          <DialogDescription className="text-sm" data-testid="text-checkout-description">
            Enter your delivery details to place the order
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your name"
                      {...field}
                      data-testid="input-customer-name"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your phone number"
                      {...field}
                      data-testid="input-phone"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
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
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      {...field}
                      data-testid="input-email"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Delivery Address (Kurla Only)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your complete delivery address in Kurla, Mumbai"
                      {...field}
                      data-testid="input-address"
                      rows={2}
                      className="text-sm resize-none"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {!userLocation && (
              <div className="space-y-1.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={getUserLocation}
                  disabled={isGettingLocation}
                  className="w-full h-9 text-sm"
                >
                  {isGettingLocation ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-3.5 w-3.5 mr-2" />
                      Enable Location for Accurate Fee
                    </>
                  )}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Optional: Get precise delivery fee based on your location
                </p>
              </div>
            )}

            {userLocation && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-md">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="font-medium text-sm">Location Detected</span>
                </div>
                {isCalculatingDistance ? (
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Calculating delivery fee...
                  </div>
                ) : calculatedDistance !== null ? (
                  <div className="text-xs space-y-0.5">
                    <p className="font-medium">Distance: {calculatedDistance} km</p>
                    <p className="text-muted-foreground">
                      Delivery time: {Math.ceil(calculatedDistance * 2 + 15)}-{Math.ceil(calculatedDistance * 2 + 20)} min
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            <div className="border-t pt-3 space-y-1.5">
              <div className="flex justify-between text-xs sm:text-sm">
                <span>Subtotal</span>
                <span className="font-medium">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span>Delivery Fee</span>
                <span className="font-medium">₹{calculatedDeliveryFee}</span>
              </div>
              <div className="flex justify-between font-semibold text-base sm:text-lg border-t pt-2">
                <span>Total</span>
                <span className="text-primary">₹{subtotal + calculatedDeliveryFee}</span>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-9 text-sm"
                data-testid="button-cancel-checkout"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-9 text-sm"
                disabled={placeOrderMutation.isPending}
                data-testid="button-place-order"
              >
                {placeOrderMutation.isPending ? "Placing..." : "Place Order"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
