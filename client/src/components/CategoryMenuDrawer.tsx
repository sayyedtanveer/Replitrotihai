import { X, Star, Plus, Minus, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Category, Product } from "@shared/schema";

interface CategoryMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  chef: { id: string; name: string } | null;
  products: Product[];
  onAddToCart?: (productId: string, productName: string, price: number, image: string, quantity: number) => void;
  cartItems?: { id: string; quantity: number }[];
  autoCloseOnAdd?: boolean;
}

export default function CategoryMenuDrawer({ 
  isOpen, 
  onClose, 
  category,
  chef,
  products,
  onAddToCart,
  cartItems = [],
  autoCloseOnAdd = false
}: CategoryMenuDrawerProps) {
  if (!isOpen || !category || !chef) return null;

  const categoryProducts = products.filter(p => 
    p.categoryId === category.id && p.chefId === chef.id
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
      onAddToCart(product.id, product.name, product.price, product.image, newQuantity);
      // Don't auto-close - let users continue browsing and adding items
    }
  };

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
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-xl font-bold text-primary" data-testid="text-category-menu-title">
                {chef.name}
              </h2>
              <p className="text-sm text-muted-foreground">{category.name}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-category-menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

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
                            onClick={() => handleQuantityChange(product, 1)}
                            className="w-24"
                            data-testid={`button-add-${product.id}`}
                          >
                            Add
                          </Button>
                        ) : (
                          <div className="flex items-center gap-3 border rounded-md">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleQuantityChange(product, currentQuantity - 1)}
                              className="h-8 w-8"
                              data-testid={`button-decrease-${product.id}`}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="font-semibold min-w-8 text-center" data-testid={`text-quantity-${product.id}`}>
                              {currentQuantity}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleQuantityChange(product, currentQuantity + 1)}
                              className="h-8 w-8"
                              data-testid={`button-increase-${product.id}`}
                            >
                              <Plus className="h-4 w-4" />
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
        </div>
      </div>
    </>
  );
}
