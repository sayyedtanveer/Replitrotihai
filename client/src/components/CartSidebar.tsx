import { useState, useEffect } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ShoppingBag } from "lucide-react";
import CartCard from "@/components/CartCard";
import { useCart } from "@/hooks/use-cart";
import { getUserLocation } from "@/lib/locationUtils";

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
  deliveryRangeName?: string;
}

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout?: (categoryId: string) => void;
}

export default function CartSidebar({
  isOpen,
  onClose,
  onCheckout,
}: CartSidebarProps) {
  const { getAllCartsWithDelivery, updateQuantity, fetchDeliverySettings, setUserLocation } = useCart();
  const cartsWithDelivery = getAllCartsWithDelivery();

  // Fetch delivery settings and user location on mount
  React.useEffect(() => {
    const initializeDelivery = async () => {
      await fetchDeliverySettings();
      
      // Try to get stored location first
      const savedLat = localStorage.getItem('userLatitude');
      const savedLng = localStorage.getItem('userLongitude');
      
      if (savedLat && savedLng) {
        setUserLocation(parseFloat(savedLat), parseFloat(savedLng));
      } else {
        // If no saved location, try to get current location
        try {
          const coords = await getUserLocation();
          if (coords) {
            setUserLocation(coords.latitude, coords.longitude);
          }
        } catch (error) {
          console.warn("Could not get user location:", error);
        }
      }
    };
    
    initializeDelivery();
  }, [fetchDeliverySettings, setUserLocation]);


  const totalItems = cartsWithDelivery.reduce(
    (total, cart) =>
      total + cart.items.reduce((sum, item) => sum + item.quantity, 0),
    0
  );

  const handleUpdateQuantity = (categoryId: string, itemId: string, quantity: number) => {
    updateQuantity(categoryId, itemId, quantity);
  };

  const handleCheckout = (categoryId: string) => {
    if (onCheckout) {
      onCheckout(categoryId);
    }
  };

  // Helper to get chef status for each cart
  const getChefIsClosed = (cart: CategoryCart) => cart.chefIsActive === false;

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
        {cartsWithDelivery.length === 0 ? (
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
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {cartsWithDelivery.map((cart) => {
                const isChefClosed = getChefIsClosed(cart);
                return (
                  <div key={cart.categoryId} className="relative">
                    {isChefClosed && (
                      <div className="absolute inset-0 bg-red-50 bg-opacity-70 flex flex-col items-center justify-center z-10 rounded-lg border border-red-200 pointer-events-none">
                        <span className="text-red-700 font-semibold">Chef Closed</span>
                        <span className="text-xs text-red-600">{cart.chefName} is not accepting orders.</span>
                      </div>
                    )}
                    <CartCard
                      key={cart.categoryId}
                      categoryName={cart.categoryName}
                      chefName={cart.chefName}
                      items={cart.items}
                      distance={cart.distance}
                      deliveryFee={cart.deliveryFee}
                      freeDeliveryEligible={cart.freeDeliveryEligible}
                      amountForFreeDelivery={cart.amountForFreeDelivery}
                      deliveryRangeName={cart.deliveryRangeName}
                      subtotal={cart.total || 0}
                      onUpdateQuantity={(itemId, quantity) =>
                        !isChefClosed && handleUpdateQuantity(cart.categoryId, itemId, quantity)
                      }
                      onCheckout={() => !isChefClosed && handleCheckout(cart.categoryId)}
                      disabled={isChefClosed}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </>
  );
}