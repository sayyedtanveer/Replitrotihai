import { X, Home, UtensilsCrossed, ShoppingBag, User, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation } from "wouter";
import type { Category } from "@shared/schema";

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: Category[];
  onCategoryClick?: (categoryId: string) => void;
}

export default function MenuDrawer({ isOpen, onClose, categories = [], onCategoryClick }: MenuDrawerProps) {
  const [, setLocation] = useLocation();
  
  if (!isOpen) return null;

  const handleCategoryClick = (categoryId: string) => {
    onCategoryClick?.(categoryId);
    onClose();
  };

  const handleHomeClick = () => {
    setLocation("/");
    onClose();
  };

  const handleMyOrdersClick = () => {
    setLocation("/orders");
    onClose();
  };

  const handleProfileClick = () => {
    setLocation("/profile");
    onClose();
  };

  const handleSettingsClick = () => {
    // TODO: Navigate to settings page when implemented
    console.log('Settings clicked');
    onClose();
  };

  const handleLogoutClick = () => {
    window.location.href = "/api/logout";
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
        data-testid="menu-backdrop"
      />

      <div
        className="fixed top-0 left-0 h-full w-80 bg-background z-50 shadow-lg transform transition-transform duration-300 ease-in-out"
        data-testid="menu-drawer"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-bold text-primary" data-testid="text-menu-title">
              FoodExpress Menu
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
                  Categories
                </h3>
                <div className="space-y-1">
                  {categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-3 py-2" data-testid="text-no-categories">
                      No categories available
                    </p>
                  ) : (
                    categories.map((category) => (
                      <Button
                        key={category.id}
                        variant="ghost"
                        className="w-full justify-between"
                        onClick={() => handleCategoryClick(category.id)}
                        data-testid={`button-category-${category.id}`}
                      >
                        <span className="flex items-center">
                          <UtensilsCrossed className="h-4 w-4 mr-3" />
                          {category.name}
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    ))
                  )}
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
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={handleLogoutClick}
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
              © 2025 FoodExpress. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
