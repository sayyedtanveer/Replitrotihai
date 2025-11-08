import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { X, Plus, Minus, ShoppingBag } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
}

export default function CartSidebar({
  isOpen,
  onClose,
  carts = [],
  onUpdateQuantity,
  onCheckout,
}: CartSidebarProps) {
  // Controlled accordion state - tracks which categories are expanded
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const totalItems = carts.reduce((total, cart) => 
    total + cart.items.reduce((sum, item) => sum + item.quantity, 0), 0
  );

  // Sync expanded state with carts - auto-expand new categories, prune removed ones
  useEffect(() => {
    // Get current cart category IDs (filter out empty/invalid IDs)
    const currentCategoryIds = carts
      .map(cart => cart.categoryId)
      .filter(id => id && id.trim() !== '');

    if (currentCategoryIds.length === 0) {
      // No carts, clear expanded state
      setExpandedIds([]);
      return;
    }

    setExpandedIds(prev => {
      // Auto-add any new category IDs that aren't already expanded
      const newIds = currentCategoryIds.filter(id => !prev.includes(id));
      // Remove category IDs that no longer exist in carts
      const validIds = prev.filter(id => currentCategoryIds.includes(id));
      // Combine and deduplicate
      return Array.from(new Set([...validIds, ...newIds]));
    });
  }, [carts]);

  // Handle accordion value change from user interaction
  const handleAccordionChange = (value: string | string[]) => {
    // Coerce to array since Shadcn Accordion can return string or string[]
    const newValue = Array.isArray(value) ? value : value ? [value] : [];
    setExpandedIds(newValue);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        data-testid="overlay-cart"
      />
      
      <div
        className="fixed right-0 top-0 h-full w-full max-w-md sm:w-96 bg-background border-l z-50 flex flex-col"
        data-testid="sidebar-cart"
      >
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

        {carts.length === 0 ? (
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
              <Accordion 
                type="multiple" 
                className="space-y-4" 
                value={expandedIds}
                onValueChange={handleAccordionChange}
              >
                {carts.map((cart) => {
                  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                  const deliveryFee = 40; // This will be dynamic based on chef location
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
                            <p className="text-sm text-muted-foreground">{cart.chefName}</p>
                          </div>
                          <Badge variant="secondary">
                            {cart.items.reduce((sum, item) => sum + item.quantity, 0)} items
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
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
                                <h4 className="font-medium text-sm mb-1" data-testid={`text-cart-item-name-${item.id}`}>
                                  {item.name}
                                </h4>
                                <p className="text-sm font-semibold text-primary mb-2" data-testid={`text-cart-item-price-${item.id}`}>
                                  ₹{item.price}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-6 w-6"
                                    onClick={() => onUpdateQuantity?.(cart.categoryId, item.id, item.quantity - 1)}
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
                                    className="h-6 w-6"
                                    onClick={() => onUpdateQuantity?.(cart.categoryId, item.id, item.quantity + 1)}
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
                          onClick={() => onCheckout?.(cart.categoryId)}
                          data-testid={`button-checkout-${cart.categoryId}`}
                        >
                          Checkout {cart.categoryName}
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
