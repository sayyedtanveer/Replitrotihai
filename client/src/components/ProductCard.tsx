import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Star } from "lucide-react";
import { useState } from "react";

interface ProductCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  rating?: number;
  reviewCount?: number;
  isVeg?: boolean;
  isCustomizable?: boolean;
  onAddToCart?: (quantity: number) => void;
  chefId?: string;
  categoryId?: string;
  chefName?: string;
  isAvailable?: boolean; // Added for availability check
  stock?: number; // Added for stock check
}

export default function ProductCard({
  id,
  name,
  description,
  price,
  image,
  rating = 4.5,
  reviewCount = 0,
  isVeg = true,
  isCustomizable = false,
  onAddToCart,
  chefId,
  categoryId,
  chefName,
  isAvailable = true, // Default to available
  stock = 0, // Default to 0 stock
}: ProductCardProps) {
  const [quantity, setQuantity] = useState(0);

  const isOutOfStock = stock <= 0; // Determine if out of stock
  const isUnavailable = !isAvailable; // Determine if unavailable

  const handleAdd = () => {
    // Only allow adding if not out of stock and available
    if (!isOutOfStock && !isUnavailable && quantity < stock) {
      const newQuantity = quantity + 1;
      setQuantity(newQuantity);
      onAddToCart?.(newQuantity);
    }
  };

  const handleRemove = () => {
    if (quantity > 0) {
      const newQuantity = quantity - 1;
      setQuantity(newQuantity);
      onAddToCart?.(newQuantity);
    }
  };

  return (
    <Card className="overflow-hidden hover-elevate group" data-testid={`card-product-${id}`}>
      <div className="relative h-48 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          data-testid={`img-product-${id}`}
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge
            variant={isVeg ? "default" : "destructive"}
            className="bg-white/90 backdrop-blur-sm"
            data-testid={`badge-diet-${id}`}
          >
            <div className={`w-3 h-3 border-2 ${isVeg ? 'border-green-600' : 'border-red-600'} mr-1`}>
              <div className={`w-full h-full ${isVeg ? 'bg-green-600' : 'bg-red-600'} rounded-full scale-50`} />
            </div>
            {isVeg ? 'Veg' : 'Non-Veg'}
          </Badge>
        </div>
        {isCustomizable && (
          <Badge
            className="absolute top-3 right-3 bg-primary/90 backdrop-blur-sm"
            data-testid={`badge-customizable-${id}`}
          >
            Customizable
          </Badge>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
          <h3 className="font-semibold text-lg" data-testid={`text-product-name-${id}`}>
            {name}
          </h3>
          <span className="font-bold text-primary" data-testid={`text-price-${id}`}>
            ₹{price}
          </span>
        </div>

        <p className="text-sm text-muted-foreground mb-3 line-clamp-2" data-testid={`text-description-${id}`}>
          {description}
        </p>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium" data-testid={`text-rating-${id}`}>
                {rating}
              </span>
            </div>
            {reviewCount > 0 && (
              <span className="text-xs text-muted-foreground" data-testid={`text-reviews-${id}`}>
                ({reviewCount})
              </span>
            )}
          </div>

          {quantity === 0 ? (
            <Button
              onClick={handleAdd}
              disabled={isOutOfStock || isUnavailable}
              className="w-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUnavailable ? "Unavailable" : isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </Button>
          ) : (
            <div className="flex items-center gap-2" data-testid={`controls-quantity-${id}`}>
              <Button
                size="icon"
                variant="outline"
                onClick={handleRemove}
                data-testid={`button-decrease-${id}`}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium" data-testid={`text-quantity-${id}`}>
                {quantity}
              </span>
              <Button
                size="icon"
                variant="outline"
                onClick={handleAdd}
                disabled={quantity >= stock} // Disable if max stock reached
                data-testid={`button-increase-${id}`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}