import { ShoppingCart, MapPin, Search, Menu, LogOut, User as UserIcon, ChefHat, Calendar, LogIn, ChevronDown, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getDeliveryMessage } from "@/lib/locationUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLocation as useWouterLocation } from "wouter";

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
  const { toast } = useToast();
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [currentLocation, setCurrentLocation] = useState("Kurla West, Mumbai");
  const [isServiceable, setIsServiceable] = useState(true);

  useEffect(() => {
    const savedLat = localStorage.getItem('userLatitude');
    const savedLng = localStorage.getItem('userLongitude');
    
    if (savedLat && savedLng) {
      const lat = parseFloat(savedLat);
      const lng = parseFloat(savedLng);
      const deliveryCheck = getDeliveryMessage(lat, lng);
      setIsServiceable(deliveryCheck.available);
      
      if (deliveryCheck.available) {
        setCurrentLocation("Kurla West, Mumbai");
      } else {
        setCurrentLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    }
  }, []);

  const handleDetectLocation = () => {
    setIsDetecting(true);

    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation",
        variant: "destructive",
      });
      setIsDetecting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        localStorage.setItem('userLatitude', latitude.toString());
        localStorage.setItem('userLongitude', longitude.toString());

        const deliveryCheck = getDeliveryMessage(latitude, longitude);
        setIsServiceable(deliveryCheck.available);

        if (deliveryCheck.available) {
          setCurrentLocation("Kurla West, Mumbai");
          toast({
            title: "Location Updated",
            description: deliveryCheck.message,
          });
        } else {
          setCurrentLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          toast({
            title: "Coming Soon",
            description: deliveryCheck.message,
          });
        }

        setIsDetecting(false);
        setIsLocationOpen(false);
      },
      (error) => {
        toast({
          title: "Location error",
          description: "Please enable location access or enter address manually",
          variant: "destructive",
        });
        setIsDetecting(false);
      }
    );
  };

  const handleManualAddress = () => {
    const addressLower = manualAddress.toLowerCase().trim();
    
    if (!addressLower) {
      toast({
        title: "Address Required",
        description: "Please enter your delivery address",
        variant: "destructive",
      });
      return;
    }

    const isKurlaArea = addressLower.includes("kurla") || 
                        addressLower.includes("chunabhatti") ||
                        addressLower.includes("sion") ||
                        addressLower.includes("bkc");

    if (isKurlaArea) {
      setCurrentLocation(manualAddress);
      setIsServiceable(true);
      localStorage.setItem('userLatitude', '19.0728');
      localStorage.setItem('userLongitude', '72.8826');
      toast({
        title: "Location Confirmed",
        description: "Great! We deliver to your area.",
      });
      setIsLocationOpen(false);
      setManualAddress("");
    } else {
      setIsServiceable(false);
      toast({
        title: "Delivery Not Available",
        description: "We currently deliver only in Kurla, Mumbai.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };
  
  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 h-14 sm:h-16">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={onMenuClick}
              data-testid="button-menu"
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="flex flex-col">
              <h1 className="text-lg sm:text-2xl font-bold text-primary leading-tight" data-testid="text-logo">
                RotiHai
              </h1>
              <span className="text-[9px] sm:text-xs text-muted-foreground font-medium -mt-0.5">
                घर की रोटी
              </span>
            </div>
            
            <Sheet open={isLocationOpen} onOpenChange={setIsLocationOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  className="hidden sm:flex items-center gap-1.5 h-9 text-sm px-2 max-w-[200px] lg:max-w-[280px]"
                  data-testid="button-location"
                >
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate text-left flex-1">{currentLocation}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="h-auto max-h-[80vh]">
                <SheetHeader className="pb-4">
                  <SheetTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Change Delivery Location
                  </SheetTitle>
                </SheetHeader>
                
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-12"
                    onClick={handleDetectLocation}
                    disabled={isDetecting}
                  >
                    {isDetecting ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <Navigation className="h-5 w-5 text-primary" />
                    )}
                    <div className="text-left">
                      <p className="font-medium">Use current location</p>
                      <p className="text-xs text-muted-foreground">Using GPS</p>
                    </div>
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or enter address</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter Kurla area address..."
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualAddress()}
                      className="h-11"
                    />
                    <Button onClick={handleManualAddress} className="h-11 px-6">
                      Confirm
                    </Button>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">
                      Currently serving: <span className="font-medium text-foreground">Kurla West, Kurla East, Chunabhatti, Sion, BKC</span>
                    </p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
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
            
            <Sheet open={isLocationOpen} onOpenChange={setIsLocationOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden h-8 w-8"
                  data-testid="button-location-mobile"
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </SheetTrigger>
            </Sheet>
            
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 sm:h-9 sm:w-9"
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
            <Button variant="ghost" size="icon" onClick={onChefListClick} data-testid="button-chefs" className="h-8 w-8 sm:h-9 sm:w-9">
              <ChefHat className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            {isAuthenticated && (
              <Button variant="ghost" size="icon" onClick={onSubscriptionClick} data-testid="button-subscriptions" className="h-8 w-8 sm:h-9 sm:w-9">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
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
