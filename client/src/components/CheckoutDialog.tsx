import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Loader2, Navigation } from "lucide-react";
import { calculateDistance, isInDeliveryZone, getDeliveryMessage } from "@/lib/locationUtils";

interface CheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: Array<{ id: string; name: string; price: number; quantity: number; image: string }>;
  onOrderSuccess: () => void;
}

export default function CheckoutDialog({ isOpen, onClose, cartItems, onOrderSuccess }: CheckoutDialogProps) {
  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    email: "",
    address: "",
    latitude: "",
    longitude: "",
  });

  const [deliveryInfo, setDeliveryInfo] = useState<{ distance: number; fee: number; time: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>("");
  const [isLocating, setIsLocating] = useState(false);
  const { toast } = useToast();

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = deliveryInfo?.fee || 0;
  const total = subtotal + deliveryFee;

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation. Please enter coordinates manually.",
        variant: "destructive",
      });
      return;
    }

    setIsLocating(true);
    setLocationStatus("Getting your location...");

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setFormData(prev => ({
          ...prev,
          latitude: lat.toString(),
          longitude: lon.toString(),
        }));

        const deliveryCheck = getDeliveryMessage(lat, lon);
        setLocationStatus(deliveryCheck.message);

        if (deliveryCheck.available) {
          calculateDeliveryFee(lat, lon);
        }

        setIsLocating(false);
        toast({
          title: "Location detected",
          description: `Latitude: ${lat.toFixed(4)}, Longitude: ${lon.toFixed(4)}`,
        });
      },
      (error) => {
        setIsLocating(false);
        let errorMessage = "Unable to get location. ";

        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Please allow location access in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out. Please try again.";
            break;
          default:
            errorMessage += "An unknown error occurred.";
        }

        setLocationStatus(errorMessage);
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive",
        });
      },
      options
    );
  };

  const calculateDeliveryFee = async (lat: number, lon: number) => {
    try {
      const response = await fetch("/api/calculate-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });

      if (!response.ok) throw new Error("Failed to calculate delivery");

      const data = await response.json();
      setDeliveryInfo(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to calculate delivery fee",
        variant: "destructive",
      });
    }
  };

  const orderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) throw new Error("Failed to create order");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Order placed!",
        description: "Your order has been successfully placed.",
      });
      onOrderSuccess();
      onClose();
      setFormData({
        customerName: "",
        phone: "",
        email: "",
        address: "",
        latitude: "",
        longitude: "",
      });
      setDeliveryInfo(null);
      setLocationStatus("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.latitude || !formData.longitude) {
      toast({
        title: "Location required",
        description: "Please get your location or enter coordinates manually",
        variant: "destructive",
      });
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);

    if (!isInDeliveryZone(lat, lon)) {
      toast({
        title: "Outside delivery zone",
        description: "Sorry, we don't deliver to your location yet.",
        variant: "destructive",
      });
      return;
    }

    orderMutation.mutate({
      customerName: formData.customerName,
      phone: formData.phone,
      email: formData.email || null,
      address: formData.address,
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
      })),
      subtotal,
      deliveryFee,
      total,
      status: "pending",
    });
  };

  useEffect(() => {
    if (formData.latitude && formData.longitude) {
      const lat = parseFloat(formData.latitude);
      const lon = parseFloat(formData.longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        calculateDeliveryFee(lat, lon);
      }
    }
  }, [formData.latitude, formData.longitude]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
          <DialogDescription>Complete your order details</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="customerName">Full Name *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="address">Delivery Address *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Location *</Label>
              <Button
                type="button"
                variant="outline"
                onClick={getLocation}
                disabled={isLocating}
                className="w-full"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Getting location...
                  </>
                ) : (
                  <>
                    <Navigation className="mr-2 h-4 w-4" />
                    Get My Location
                  </>
                )}
              </Button>
              {locationStatus && (
                <p className={`text-sm ${locationStatus.includes("Great") ? "text-green-600" : "text-muted-foreground"}`}>
                  {locationStatus}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="latitude" className="text-xs">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="19.0728"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="longitude" className="text-xs">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="72.8826"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee:</span>
              <span>₹{deliveryFee}</span>
            </div>
            {deliveryInfo && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Estimated Time:</span>
                <span>{deliveryInfo.time} minutes</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>₹{total}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={orderMutation.isPending}>
              {orderMutation.isPending ? "Placing Order..." : "Place Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}