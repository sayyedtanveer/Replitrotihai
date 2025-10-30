import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { X, Plus, Minus, ShoppingBag } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items?: CartItem[];
  onUpdateQuantity?: (id: string, quantity: number) => void;
  onCheckout?: () => void;
  disableCheckout?: boolean;
}

export default function CartSidebar({
  isOpen,
  onClose,
  items = [],
  onUpdateQuantity,
  onCheckout,
  disableCheckout = false,
}: CartSidebarProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal > 0 ? 40 : 0;
  const total = subtotal + deliveryFee;

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        data-testid="overlay-cart"
      />
      
      <div
        className="fixed right-0 top-0 h-full w-full sm:w-96 bg-background border-l z-50 flex flex-col"
        data-testid="sidebar-cart"
      >
        <div className="flex items-center justify-between gap-4 p-4 border-b flex-wrap">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold" data-testid="text-cart-title">
              Your Cart
            </h2>
            <Badge variant="secondary" data-testid="badge-cart-items">
              {items.length}
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

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-cart">
              Your cart is empty
            </h3>
            <p className="text-sm text-muted-foreground" data-testid="text-empty-cart-description">
              Add items to get started
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3"
                    data-testid={`item-cart-${item.id}`}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-md"
                      data-testid={`img-cart-${item.id}`}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium mb-1" data-testid={`text-cart-item-name-${item.id}`}>
                        {item.name}
                      </h4>
                      <p className="text-sm font-semibold text-primary mb-2" data-testid={`text-cart-item-price-${item.id}`}>
                        ₹{item.price}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => onUpdateQuantity?.(item.id, item.quantity - 1)}
                          data-testid={`button-decrease-cart-${item.id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium" data-testid={`text-cart-quantity-${item.id}`}>
                          {item.quantity}
                        </span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => onUpdateQuantity?.(item.id, item.quantity + 1)}
                          data-testid={`button-increase-cart-${item.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t p-4">
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground" data-testid="text-subtotal-label">Subtotal</span>
                  <span className="font-medium" data-testid="text-subtotal">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground" data-testid="text-delivery-label">Delivery Fee</span>
                  <span className="font-medium" data-testid="text-delivery-fee">₹{deliveryFee}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span data-testid="text-total-label">Total</span>
                  <span className="text-primary" data-testid="text-total">₹{total}</span>
                </div>
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={onCheckout}
                disabled={disableCheckout}
                data-testid="button-checkout"
              >
                Proceed to Checkout
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
