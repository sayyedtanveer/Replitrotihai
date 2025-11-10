import { useRef, useState, useEffect } from "react";
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
  onCheckout?: (categoryId: string) => void; // ✅ new prop
}

export default function CartSidebar({
  isOpen,
  onClose,
  carts = [],
  onUpdateQuantity,
  onCheckout,
}: CartSidebarProps) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const prevCategoryIdsRef = useRef<string[]>([]);

  const totalItems = carts.reduce(
    (total, cart) =>
      total + cart.items.reduce((sum, item) => sum + item.quantity, 0),
    0
  );

  // Keep accordion in sync
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

  // ✅ Notify parent when user clicks Checkout
  const handleCheckout = (categoryId: string) => {
    console.log("🟢 CartSidebar → Checkout clicked:", categoryId);
    onCheckout?.(categoryId);
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
            <h2 className="text-xl font-semibold">Your Carts</h2>
            <Badge variant="secondary">{totalItems}</Badge>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Empty Cart */}
        {carts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground">Add items to get started</p>
          </div>
        ) : (
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
                          <div key={item.id} className="flex gap-3">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-16 h-16 object-cover rounded-md"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium text-sm mb-1">{item.name}</h4>
                              <p className="text-sm font-semibold text-primary mb-2">
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
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center text-sm font-medium">
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

                      {/* ✅ Still have checkout button */}
                      <Button
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => handleCheckout(cart.categoryId)}
                      >
                        Checkout {cart.categoryName}
                      </Button>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </ScrollArea>
        )}
      </div>
    </>
  );
}
