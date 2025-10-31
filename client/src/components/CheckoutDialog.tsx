import { useState } from "react";
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
import { CheckCircle2 } from "lucide-react";

const checkoutSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  address: z.string().min(10, "Please enter a complete address"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
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
  deliveryFee: initialDeliveryFee,
  total: initialTotal,
  onOrderSuccess,
}: CheckoutDialogProps) {
  const { toast } = useToast();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string>("");
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState(initialDeliveryFee);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      address: "",
      latitude: "",
      longitude: "",
    },
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (data: CheckoutFormData) => {
      const res = await apiRequest("POST", "/api/orders", {
        customerName: data.customerName,
        phone: data.phone,
        address: data.address,
        latitude: data.latitude ? parseFloat(data.latitude) : undefined,
        longitude: data.longitude ? parseFloat(data.longitude) : undefined,
        items: cartItems,
        subtotal,
        deliveryFee: calculatedDeliveryFee,
        distance: calculatedDistance || undefined,
        total: subtotal + calculatedDeliveryFee,
        status: "pending",
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

  const calculateDistanceAndFee = async () => {
    const latitude = form.getValues("latitude");
    const longitude = form.getValues("longitude");
    const address = form.getValues("address");
    
    // Check if address contains Kurla
    const addressLower = address.toLowerCase().trim();
    if (!addressLower.includes("kurla")) {
      toast({
        title: "Delivery Not Available",
        description: "We currently deliver only in Kurla, Mumbai. Please enter a Kurla address.",
        variant: "destructive",
      });
      return;
    }
    
    if (!latitude || !longitude) {
      toast({
        title: "Location required",
        description: "Please enter your delivery coordinates to calculate delivery fee",
        variant: "destructive",
      });
      return;
    }

    setIsCalculatingDistance(true);
    
    try {
      const res = await apiRequest("POST", "/api/calculate-delivery", {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      });
      const result = await res.json();
      
      // Additional validation based on distance
      if (result.distance > 10) {
        toast({
          title: "Location Too Far",
          description: "The location seems outside our Kurla delivery area. Please verify your address.",
          variant: "destructive",
        });
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
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  const onSubmit = (data: CheckoutFormData) => {
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
        <DialogContent data-testid="dialog-order-success">
          <div className="text-center py-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <DialogTitle className="text-2xl mb-2" data-testid="text-success-title">
              Order Placed Successfully!
            </DialogTitle>
            <DialogDescription className="text-base mb-6" data-testid="text-success-description">
              Your order #{orderId.substring(0, 8)} has been confirmed and will be delivered soon.
            </DialogDescription>
            <div className="space-y-2 text-sm text-muted-foreground mb-6">
              {calculatedDistance && (
                <p>Delivery distance: {calculatedDistance} km</p>
              )}
              <p>Estimated delivery time: {calculatedDistance ? `${Math.ceil(calculatedDistance * 2 + 15)}-${Math.ceil(calculatedDistance * 2 + 20)}` : '25-30'} minutes</p>
              <p>Total amount: ₹{subtotal + calculatedDeliveryFee}</p>
            </div>
            <Button onClick={handleClose} data-testid="button-close-success">
              Continue Shopping
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" data-testid="dialog-checkout">
        <DialogHeader>
          <DialogTitle data-testid="text-checkout-title">Complete Your Order</DialogTitle>
          <DialogDescription data-testid="text-checkout-description">
            Enter your delivery details to place the order
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your name"
                      {...field}
                      data-testid="input-customer-name"
                    />
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
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your phone number"
                      {...field}
                      data-testid="input-phone"
                    />
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
                  <FormLabel>Delivery Address (Kurla Only)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your complete delivery address in Kurla, Mumbai"
                      {...field}
                      data-testid="input-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 28.6139"
                        {...field}
                        data-testid="input-latitude"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 77.2090"
                        {...field}
                        data-testid="input-longitude"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={calculateDistanceAndFee}
              disabled={isCalculatingDistance}
              className="w-full"
              data-testid="button-calculate-delivery"
            >
              {isCalculatingDistance ? "Calculating..." : "Calculate Delivery Fee"}
            </Button>

            {calculatedDistance !== null && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-medium">Distance: {calculatedDistance} km</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Delivery time: {Math.ceil(calculatedDistance * 2 + 15)}-{Math.ceil(calculatedDistance * 2 + 20)} minutes
                </p>
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivery Fee</span>
                <span>₹{calculatedDeliveryFee}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>Total</span>
                <span className="text-primary">₹{subtotal + calculatedDeliveryFee}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                data-testid="button-cancel-checkout"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={placeOrderMutation.isPending}
                data-testid="button-place-order"
              >
                {placeOrderMutation.isPending ? "Placing Order..." : "Place Order"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
