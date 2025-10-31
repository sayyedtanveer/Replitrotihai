import { X, Star, Plus, Minus, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Category, Product } from "@shared/schema";

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: Category[];
  products?: Product[];
  onAddToCart?: (productId: string, productName: string, price: number, image: string, quantity: number) => void;
  cartItems?: { id: string; quantity: number }[];
}

export default function MenuDrawer({ 
  isOpen, 
  onClose, 
  categories = [], 
  products = [],
  onAddToCart,
  cartItems = []
}: MenuDrawerProps) {
  if (!isOpen) return null;

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
    }
  };

  const productsByCategory = categories.map(category => ({
    category,
    products: products.filter(p => p.categoryId === category.id)
  }));

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
        data-testid="menu-backdrop"
      />

      <div
        className="fixed top-0 left-0 h-full w-full sm:w-[500px] bg-background z-50 shadow-lg transform transition-transform duration-300 ease-in-out"
        data-testid="menu-drawer"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-bold text-primary" data-testid="text-menu-title">
              Browse Menu
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Tabs defaultValue={categories[0]?.id} className="flex-1 flex flex-col">
            <div className="border-b px-4">
              <TabsList className="w-full justify-start h-auto p-0 bg-transparent">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3"
                    data-testid={`tab-${category.id}`}
                  >
                    {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              {productsByCategory.map(({ category, products: categoryProducts }) => (
                <TabsContent 
                  key={category.id} 
                  value={category.id} 
                  className="mt-0 p-4 space-y-4"
                  data-testid={`content-${category.id}`}
                >
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
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
        </div>
      </div>
    </>
  );
}
