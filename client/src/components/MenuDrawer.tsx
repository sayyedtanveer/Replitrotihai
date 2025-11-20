import { X, Home, UtensilsCrossed, ShoppingBag, User, LogOut, ChevronRight, Settings, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import type { Category } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: Category[];
  onCategoryClick?: (categoryId: string) => void;
  selectedCategoryTab?: string;
  onCategoryTabChange?: (value: string) => void;
  onSubscriptionClick?: () => void;
}

export default function MenuDrawer({ isOpen, onClose, categories = [], onCategoryClick, selectedCategoryTab = "all", onCategoryTabChange, onSubscriptionClick }: MenuDrawerProps) {
  const [, setLocation] = useLocation();

  const { logout } = useAuth();
  if (!isOpen) return null;

  const handleCategoryClick = (categoryId: string) => {
    onCategoryTabChange?.(categoryId);
    onCategoryClick?.(categoryId);
    onClose();
  };

  const handleHomeClick = () => {
    onClose();
    setTimeout(() => setLocation("/"), 100);
  };

  const handleMyOrdersClick = () => {
    onClose();
    setTimeout(() => setLocation("/orders"), 100);
  };

  const handleProfileClick = () => {
    onClose();
    setTimeout(() => setLocation("/profile"), 100);
  };

  const handleSettingsClick = () => {
    // TODO: Navigate to settings page when implemented
    console.log('Settings clicked');
    onClose();
  };


  const handleLogoutClick = async () => {
    await logout(); // clears tokens and redirects home
    onClose();      // closes the drawer
  };


  // NOTE: The following is a temporary fix for the flickering issue.
  // A more robust solution would involve state management to properly
  // handle authentication state changes before navigation.
  const handleLogout = () => {
    const userToken = localStorage.getItem("userToken");
    if (userToken) {
      localStorage.removeItem("userToken");
      localStorage.removeItem("userRefreshToken");
      localStorage.removeItem("userData");
      // Force full page reload to clear all state
      window.location.href = "/";
    } else {
      window.location.href = "/api/logout";
    }
    onClose();
  };


  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
        data-testid="menu-backdrop"
      />

      <div
        className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-background z-50 shadow-lg transform transition-transform duration-300 ease-in-out"
        data-testid="menu-drawer"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-bold text-primary" data-testid="text-menu-title">
              RotiHai Menu
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

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3" data-testid="text-navigation-heading">
                  Navigation
                </h3>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={handleHomeClick}
                    data-testid="button-nav-home"
                  >
                    <Home className="h-4 w-4 mr-3" />
                    Home
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={handleMyOrdersClick}
                    data-testid="button-nav-orders"
                  >
                    <ShoppingBag className="h-4 w-4 mr-3" />
                    My Orders
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={handleProfileClick}
                    data-testid="button-nav-profile"
                  >
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3" data-testid="text-categories-heading">
                  Browse Categories
                </h3>
                <div className="space-y-1">
                  <Button
                    variant={selectedCategoryTab === "all" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      onCategoryTabChange?.("all");
                      onClose();
                    }}
                    data-testid="button-category-all"
                  >
                    <UtensilsCrossed className="h-4 w-4 mr-3" />
                    All Categories
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategoryTab === category.id ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => handleCategoryClick(category.id)}
                      data-testid={`button-category-${category.id}`}
                    >
                      <ChevronRight className="h-4 w-4 mr-3" />
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3" data-testid="text-settings-heading">
                  Settings
                </h3>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={handleSettingsClick}
                    data-testid="button-settings"
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={onSubscriptionClick}
                    data-testid="button-subscription"
                  >
                    <Calendar className="h-4 w-4 mr-3" />
                    Subscription
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={handleLogout}
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <p className="text-xs text-muted-foreground text-center" data-testid="text-menu-footer">
              © 2025 RotiHai. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}