import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Plus, Minus, ShoppingBag, AlertTriangle, ShoppingCart } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  carts?: CategoryCart[];
  onUpdateQuantity?: (categoryId: string, id: string, quantity: number) => void;
  onCheckout?: (categoryId: string) => void;
  onCheckoutAll?: () => void;
}

export default function CartSidebar({
  isOpen,
  onClose,
  carts = [],
  onUpdateQuantity,
  onCheckout,
  onCheckoutAll,
}: CartSidebarProps) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const prevCategoryIdsRef = useRef<string[]>([]);
  const { toast } = useToast();

  // Fetch cart settings for minimum order amounts
  const { data: cartSettings } = useQuery<any[]>({
    queryKey: ["/api/cart-settings"],
    queryFn: async () => {
      const response = await fetch("/api/cart-settings");
      if (!response.ok) throw new Error("Failed to fetch cart settings");
      return response.json();
    },
  });

  const totalItems = carts.reduce(
    (total, cart) =>
      total + cart.items.reduce((sum, item) => sum + item.quantity, 0),
    0
  );

  const totalAmount = carts.reduce((total, cart) => {
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    return total + subtotal + 40; // Include delivery fee
  }, 0);

  // Sync expanded accordion with available carts
  useEffect(() => {
    const currentIds = carts.map((c) => c.categoryId).filter(Boolean);
    const prev = prevCategoryIdsRef.current;
    const changed =
      !prev ||
      prev.length !== currentIds.length ||
      prev.some((id, i) => id !== currentIds[i]);

    if (changed) {
      prevCategoryIdsRef.current = currentIds;
      setExpandedIds(currentIds);
    }
  }, [carts]);

  const handleAccordionChange = (value: string | string[]) => {
    const newValue = Array.isArray(value) ? value : value ? [value] : [];
    setExpandedIds(newValue);
  };

  // Get minimum order amount for a category
  const getMinimumOrderAmount = (categoryId: string) => {
    const setting = cartSettings?.find(s => s.categoryId === categoryId);
    return setting?.minOrderAmount || 100; // Default ₹100 if not set
  };

  // Check if cart meets minimum order requirement
  const meetsMinimumOrder = (cart: CategoryCart) => {
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const minimum = getMinimumOrderAmount(cart.categoryId);
    return subtotal >= minimum;
  };

  // Get all carts that don't meet minimum
  const cartsNotMeetingMinimum = carts.filter(cart => !meetsMinimumOrder(cart));

  // ✅ Handle per-category checkout - delegate to parent
  const handleCheckout = (categoryId: string) => {
    const cart = carts.find(c => c.categoryId === categoryId);
    if (!cart) return;

    if (!meetsMinimumOrder(cart)) {
      const minimum = getMinimumOrderAmount(cart.categoryId);
      toast({
        title: "Minimum Order Not Met",
        description: `Minimum order for ${cart.categoryName} is ₹${minimum}`,
        variant: "destructive",
      });
      return;
    }

    if (onCheckout) {
      onCheckout(categoryId);
    }
  };

  // Handle checkout all
  const handleCheckoutAll = () => {
    console.log("Checkout All clicked - Total carts:", carts.length);
    console.log("Carts not meeting minimum:", cartsNotMeetingMinimum);
    
    if (cartsNotMeetingMinimum.length > 0) {
      const details = cartsNotMeetingMinimum.map(cart => {
        const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const minimum = getMinimumOrderAmount(cart.categoryId);
        return `${cart.categoryName}: ₹${subtotal} / ₹${minimum} required`;
      }).join(', ');
      
      toast({
        title: "Cannot Checkout All",
        description: `${cartsNotMeetingMinimum.length} cart(s) don't meet minimum order requirements. ${details}`,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    console.log("All carts meet minimum - proceeding to checkout");
    if (onCheckoutAll) {
      onCheckoutAll();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        data-testid="overlay-cart"
      />

      {/* Sidebar */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-md sm:w-96 bg-background border-l z-50 flex flex-col"
        data-testid="sidebar-cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 p-4 border-b">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold" data-testid="text-cart-title">
              Your Carts
            </h2>
            <Badge variant="secondary" data-testid="badge-cart-items">
              {totalItems}
            </Badge>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            data-testid="button-close-cart"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Empty Cart */}
        {carts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-cart">
              Your cart is empty
            </h3>
            <p
              className="text-sm text-muted-foreground"
              data-testid="text-empty-cart-description"
            >
              Add items to get started
            </p>
          </div>
        ) : (
          <>
            {/* Checkout All Button */}
            {carts.length > 1 && (
              <div className="p-4 border-b bg-muted/30">
                <Button
                  onClick={handleCheckoutAll}
                  disabled={cartsNotMeetingMinimum.length > 0}
                  className="w-full"
                  size="lg"
                  data-testid="button-checkout-all"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Checkout All ({carts.length} Carts) - ₹{totalAmount}
                </Button>
                {cartsNotMeetingMinimum.length > 0 && (
                  <Alert className="mt-3" variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {cartsNotMeetingMinimum.length} cart(s) don't meet minimum order requirements
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          <ScrollArea className="flex-1 p-4">
              <Accordion
                type="multiple"
                className="space-y-4"
                value={expandedIds}
                onValueChange={handleAccordionChange}
              >
                {carts.map((cart) => {
                  const subtotal = cart.items.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0
                  );
                  const deliveryFee = 40;
                  const total = subtotal + deliveryFee;

                  return (
                    <AccordionItem
                      key={cart.categoryId}
                      value={cart.categoryId}
                      className="border rounded-lg"
                    >
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex flex-col items-start">
                            <h3 className="font-semibold">{cart.categoryName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {cart.chefName}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {cart.items.reduce(
                              (sum, item) => sum + item.quantity,
                              0
                            )}{" "}
                            items
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        {/* Minimum Order Warning */}
                        {!meetsMinimumOrder(cart) && (
                          <Alert className="mb-3" variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              Minimum order: ₹{getMinimumOrderAmount(cart.categoryId)} 
                              (Add ₹{getMinimumOrderAmount(cart.categoryId) - cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)} more)
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="space-y-3">
                          {cart.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex gap-3"
                              data-testid={`item-cart-${item.id}`}
                            >
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-16 h-16 object-cover rounded-md"
                                data-testid={`img-cart-${item.id}`}
                              />
                              <div className="flex-1">
                                <h4
                                  className="font-medium text-sm mb-1"
                                  data-testid={`text-cart-item-name-${item.id}`}
                                >
                                  {item.name}
                                </h4>
                                <p
                                  className="text-sm font-semibold text-primary mb-2"
                                  data-testid={`text-cart-item-price-${item.id}`}
                                >
                                  ₹{item.price}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-6 w-6"
                                    onClick={() =>
                                      onUpdateQuantity?.(
                                        cart.categoryId,
                                        item.id,
                                        item.quantity - 1
                                      )
                                    }
                                    data-testid={`button-decrease-cart-${item.id}`}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span
                                    className="w-8 text-center text-sm font-medium"
                                    data-testid={`text-cart-quantity-${item.id}`}
                                  >
                                    {item.quantity}
                                  </span>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-6 w-6"
                                    onClick={() =>
                                      onUpdateQuantity?.(
                                        cart.categoryId,
                                        item.id,
                                        item.quantity + 1
                                      )
                                    }
                                    data-testid={`button-increase-cart-${item.id}`}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <Separator className="my-3" />

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium">₹{subtotal}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Delivery Fee</span>
                            <span className="font-medium">₹{deliveryFee}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-semibold">
                            <span>Total</span>
                            <span className="text-primary">₹{total}</span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => handleCheckout(cart.categoryId)}
                          disabled={!meetsMinimumOrder(cart)}
                          data-testid={`button-checkout-${cart.categoryId}`}
                        >
                          {meetsMinimumOrder(cart) 
                            ? `Checkout ${cart.categoryName}` 
                            : `Minimum ₹${getMinimumOrderAmount(cart.categoryId)} Required`}
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </ScrollArea>
          </>
        )}
      </div>
    </>
  );
}
