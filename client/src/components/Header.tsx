import { ShoppingCart, MapPin, Search, Menu, LogOut, User as UserIcon, ChefHat, Calendar, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";

interface HeaderProps {
  cartItemCount?: number;
  onCartClick?: () => void;
  onMenuClick?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onChefListClick: () => void;
  onSubscriptionClick: () => void;
  onLoginClick?: () => void;
}

export default function Header({ cartItemCount = 0, onCartClick, onMenuClick, searchQuery = "", onSearchChange, onChefListClick, onSubscriptionClick, onLoginClick }: HeaderProps) {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };
  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={onMenuClick}
              data-testid="button-menu"
              className="h-8 w-8 sm:h-10 sm:w-10"
            >
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold text-primary leading-tight" data-testid="text-logo">
                RotiHai
              </h1>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium -mt-1">
                घर की रोटी
              </span>
            </div>
            <Button
              variant="ghost"
              className="hidden lg:flex items-center gap-2 h-9 text-sm"
              data-testid="button-location"
            >
              <MapPin className="h-4 w-4" />
              <span>Delivering to Kurla West, Mumbai</span>
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

          <div className="flex items-center gap-1 sm:gap-2">
            {!isAuthenticated && (
              <Button
                variant="ghost"
                className="gap-2 hidden lg:flex h-9 text-sm"
                onClick={onLoginClick}
                data-testid="button-signin"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            )}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 hidden lg:flex h-9 text-sm" data-testid="button-user-menu">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={(user as any).profileImageUrl ?? undefined} alt={(user as any).firstName ?? (user as any).name ?? "User"} />
                      <AvatarFallback className="text-xs">
                        {((user as any).firstName?.[0] ?? (user as any).name?.[0] ?? (user as any).email?.[0] ?? "U").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {(user as any).firstName ?? (user as any).name ?? (user as any).email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" data-testid="menu-user-dropdown">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.location.href = '/profile'} data-testid="menu-item-profile">
                    <UserIcon className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} data-testid="menu-item-logout">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 sm:h-10 sm:w-10"
              onClick={onCartClick}
              data-testid="button-cart"
            >
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
              {cartItemCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] sm:text-xs"
                  data-testid="badge-cart-count"
                >
                  {cartItemCount}
                </Badge>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onChefListClick} data-testid="button-chefs" className="h-8 w-8 sm:h-10 sm:w-10">
              <ChefHat className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            {isAuthenticated && (
              <Button variant="ghost" size="icon" onClick={onSubscriptionClick} data-testid="button-subscriptions">
                <Calendar className="h-5 w-5" />
              </Button>
            )}
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