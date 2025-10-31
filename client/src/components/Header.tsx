import { ShoppingCart, MapPin, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  cartItemCount?: number;
  onCartClick?: () => void;
  onMenuClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function Header({ cartItemCount = 0, onCartClick, onMenuClick, searchQuery = "", onSearchChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          <div className="flex items-center gap-4 flex-wrap">
            <Button
              size="icon"
              variant="ghost"
              onClick={onMenuClick}
              data-testid="button-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-primary" data-testid="text-logo">
              FoodExpress
            </h1>
            <Button
              variant="ghost"
              className="hidden lg:flex items-center gap-2"
              data-testid="button-location"
            >
              <MapPin className="h-4 w-4" />
              <span className="text-sm">Deliver to</span>
            </Button>
          </div>

          <div className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for dishes..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" className="hidden lg:flex" data-testid="button-signin">
              Sign In
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={onCartClick}
              data-testid="button-cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  data-testid="badge-cart-count"
                >
                  {cartItemCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        <div className="md:hidden pb-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for dishes..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              data-testid="input-search-mobile"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
