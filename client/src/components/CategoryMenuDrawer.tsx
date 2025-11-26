import { X, Star, Plus, Minus, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Category, Product } from "@shared/schema";

interface CategoryMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  chef: { id: string; name: string; isActive?: boolean } | null; // Added isActive for chef status
  products: Product[];
  onAddToCart?: (product: Product) => void;
  cartItems?: { id: string; quantity: number; price: number }[];
  autoCloseOnAdd?: boolean;
  onProceedToCart?: () => void;
}

export default function CategoryMenuDrawer({
  isOpen,
  onClose,
  category,
  chef,
  products,
  onAddToCart,
  cartItems = [],
  autoCloseOnAdd = false,
  onProceedToCart,
}: CategoryMenuDrawerProps) {
  if (!isOpen || !category || !chef) return null;

  const isChefClosed = chef.isActive === false;

  const categoryProducts = products.filter(
    (p) => p.categoryId === category.id && p.chefId === chef.id
  );

  const avgRating = categoryProducts.length > 0
    ? (categoryProducts.reduce((sum, p) => sum + parseFloat(p.rating), 0) / categoryProducts.length).toFixed(1)
    : "0.0";
  const totalReviews = categoryProducts.reduce((sum, p) => sum + p.reviewCount, 0);

  const getProductQuantity = (productId: string) => {
    const cartItem = cartItems.find(item => item.id === productId);
    return cartItem?.quantity || 0;
  };

  const handleQuantityChange = (product: Product, newQuantity: number) => {
    if (newQuantity < 0) return;

    const currentQuantity = getProductQuantity(product.id);
    if (newQuantity === currentQuantity) return;

    if (onAddToCart) {
      onAddToCart(product);
      // Don't auto-close - let users continue browsing and adding items
    }
  };

  // Calculate total items and total price for the "Proceed to Cart" button
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
        data-testid="category-menu-backdrop"
      />

      <div
        className="fixed top-0 left-0 h-full w-full sm:w-[500px] bg-background z-50 shadow-lg transform transition-transform duration-300 ease-in-out"
        data-testid="category-menu-drawer"
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="font-semibold text-lg">{chef.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                data-testid="button-close-category-menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{category.name}</p>
          </div>

          {isChefClosed && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-3 mx-4">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                ⚠️ Currently Closed
              </p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                {chef.name} is not accepting orders right now. You can browse the menu but cannot place orders.
              </p>
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="p-4 border-b bg-muted/30" data-testid={`header-${category.id}`}>
              <div className="flex items-start gap-3">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-16 h-16 rounded-lg object-cover"
                  data-testid={`img-category-${category.id}`}
                />
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1" data-testid={`text-category-name-${category.id}`}>
                    {category.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2" data-testid={`text-category-description-${category.id}`}>
                    {category.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold" data-testid={`text-category-rating-${category.id}`}>
                        {avgRating}
                      </span>
                      <span className="text-muted-foreground" data-testid={`text-category-reviews-${category.id}`}>
                        ({totalReviews} reviews)
                      </span>
                    </div>
                    <Badge variant="secondary" data-testid={`badge-item-count-${category.id}`}>
                      {category.itemCount}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {categoryProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8" data-testid="text-no-products">
                  No items available in this category
                </p>
              ) : (
                categoryProducts.map((product) => {
                  const currentQuantity = getProductQuantity(product.id);
                  const cartItem = cartItems.find(item => item.id === product.id); // To get current quantity for quantity controls
                  return (
                    <div
                      key={product.id}
                      className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
                      data-testid={`product-card-${product.id}`}
                    >
                      <div className="flex gap-4">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-20 h-20 rounded-lg object-cover"
                          data-testid={`img-product-${product.id}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-base" data-testid={`text-name-${product.id}`}>
                                  {product.name}
                                </h3>
                                {product.isVeg && (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    <Leaf className="h-3 w-3 mr-1" />
                                    Veg
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium" data-testid={`text-rating-${product.id}`}>
                                  {product.rating}
                                </span>
                                <span className="text-xs text-muted-foreground" data-testid={`text-reviews-${product.id}`}>
                                  ({product.reviewCount})
                                </span>
                              </div>
                            </div>
                            <p className="font-bold text-lg" data-testid={`text-price-${product.id}`}>
                              ₹{product.price}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2" data-testid={`text-description-${product.id}`}>
                            {product.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        {currentQuantity === 0 ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              onAddToCart?.(product); // <-- optional chaining
                              if (autoCloseOnAdd) {
                                onClose();
                              }
                            }}
                            disabled={isChefClosed}
                            data-testid={`button-add-${product.id}`}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {isChefClosed ? "Chef Closed" : "Add"}
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => {
                                const currentQuantity = cartItem?.quantity || 0;
                                if (currentQuantity > 0) {
                                  onAddToCart?.(product); // <-- optional chaining
                                }
                              }}
                              disabled={isChefClosed}
                              data-testid={`button-decrease-${product.id}`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {cartItem?.quantity || 0}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => onAddToCart?.(product)} // <-- optional chaining
                              disabled={isChefClosed}
                              data-testid={`button-increase-${product.id}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Proceed to Cart Button */}
          <div className="p-4 border-t">
            {totalItems > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {totalItems} {totalItems === 1 ? 'item' : 'items'} in cart
                  </span>
                  <span className="font-semibold text-primary">
                    ₹{totalPrice}
                  </span>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    onClose();
                    onProceedToCart?.(); // <-- optional chaining
                  }}
                  disabled={isChefClosed}
                  data-testid="button-proceed-to-cart"
                >
                  {isChefClosed ? "Chef is Currently Closed" : "Proceed to Cart"}
                </Button>
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                Add items to cart to proceed
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}