import { useState, useEffect } from "react";
  import { useQuery, useQueryClient } from "@tanstack/react-query";
  import Header from "@/components/Header";
  import Hero from "@/components/Hero";
  import CategoryCard from "@/components/CategoryCard";
  import ProductCard from "@/components/ProductCard";
  import CartSidebar from "@/components/CartSidebar";
  import CheckoutDialog from "@/components/CheckoutDialog";
  import PaymentQRDialog from "@/components/PaymentQRDialog";
  import MenuDrawer from "@/components/MenuDrawer";
  import CategoryMenuDrawer from "@/components/CategoryMenuDrawer";
  import ChefListDrawer from "@/components/ChefListDrawer";
  import SubscriptionDrawer from "@/components/SubscriptionDrawer";
  import LoginDialog from "@/components/LoginDialog";
  import Footer from "@/components/Footer";
  import PromotionalBannersSection from "@/components/PromotionalBannersSection";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Card } from "@/components/ui/card";
  import {
    UtensilsCrossed, ChefHat, Hotel, MessageCircle, Star, Clock,
    SlidersHorizontal, Zap, Sparkles, CalendarClock, Home as HomeIcon, ShoppingBag,
    User, Percent, ArrowRight, TrendingUp
  } from "lucide-react";
  import type { Category, Chef, Product } from "@shared/schema";
  import { useCart } from "@/hooks/use-cart";
  import { toast } from "@/hooks/use-toast";
  import { useCustomerNotifications } from "@/hooks/useCustomerNotifications";
  import { useAuth } from "@/hooks/useAuth";

  const iconMap: Record<string, React.ReactNode> = {
    UtensilsCrossed: <UtensilsCrossed className="h-6 w-6 text-primary" />,
    ChefHat: <ChefHat className="h-6 w-6 text-primary" />,
    Hotel: <Hotel className="h-6 w-6 text-primary" />,
  };

  const filterOptions = [
    { id: "filters", label: "Filters", icon: SlidersHorizontal },
    { id: "near-fast", label: "Near & Fast", icon: Zap },
    { id: "new", label: "New to you", icon: Sparkles },
    { id: "rating", label: "Rating 4.0+", icon: Star },
    { id: "offers", label: "Great Offers", icon: Percent },
  ];

  export default function Home() {
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [checkoutCategoryId, setCheckoutCategoryId] = useState<string>("");
    const [isPaymentQROpen, setIsPaymentQROpen] = useState(false);
    const [paymentOrderDetails, setPaymentOrderDetails] = useState<{
      orderId: string;
      amount: number;
      customerName: string;
      phone: string;
      email?: string;
      address: string;
      accountCreated?: boolean;
      defaultPassword?: string;
    } | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
    const [isChefListOpen, setIsChefListOpen] = useState(false);
    const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [selectedCategoryForChefList, setSelectedCategoryForChefList] = useState<Category | null>(null);
    const [selectedCategoryForMenu, setSelectedCategoryForMenu] = useState<Category | null>(null);
    const [selectedChefForMenu, setSelectedChefForMenu] = useState<Chef | null>(null);
    const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCart, setSelectedCart] = useState<any>(null);
    const [activeFilters, setActiveFilters] = useState<string[]>([]);
    const [mobileNavTab, setMobileNavTab] = useState<string>("delivery");
    const [vegOnly, setVegOnly] = useState(false);
    const { user } = useAuth();

    const { carts, addToCart: cartAddToCart, canAddItem, clearCart, getTotalItems, setUserLocation, getAllCartsWithDelivery, updateChefStatus, fetchChefStatuses, userLatitude, userLongitude } = useCart();
    const queryClient = useQueryClient();

    // Use WebSocket for real-time chef status and product availability updates
    const { chefStatuses, productAvailability, wsConnected } = useCustomerNotifications();

    // Sync WebSocket chef statuses to cart store
    useEffect(() => {
      Object.entries(chefStatuses).forEach(([chefId, isActive]) => {
        updateChefStatus(chefId, isActive);
      });
    }, [chefStatuses, updateChefStatus]);

    // Fetch initial chef statuses on mount
    useEffect(() => {
      fetchChefStatuses();
    }, [fetchChefStatuses]);


    const handleCategoryTabChange = (value: string) => {
      setSelectedCategoryTab(value);
      setIsChefListOpen(false);
      setIsCategoryMenuOpen(false);
      const productsSection = document.getElementById("products-section");
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
      queryKey: ["/api/categories"],
    });

    const { data: chefs = [], isLoading: chefsLoading } = useQuery<Chef[]>({
      queryKey: ["/api/chefs"],
    });

    const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
      queryKey: ["/api/products"],
    });

    const handleAddToCart = (product: Product) => {
      const category = categories.find(c => c.id === product.categoryId);
      const categoryName = category?.name || "Unknown";

      // Get chef location if available
      const chef = product.chefId ? chefs.find(c => c.id === product.chefId) : null;

      const cartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        chefId: product.chefId || undefined,
        chefName: selectedChefForMenu?.name || chef?.name || undefined,
        categoryId: product.categoryId,
      };

      const checkResult = canAddItem(cartItem.chefId, cartItem.categoryId);
      if (!checkResult.canAdd) {
        const confirmed = window.confirm(
          `Your ${categoryName} cart contains items from ${checkResult.conflictChef}. Do you want to replace them with items from ${cartItem.chefName || "this chef"}?`
        );
        if (confirmed) {
          clearCart(cartItem.categoryId || "");
          cartAddToCart(cartItem, categoryName, chef?.latitude, chef?.longitude);
        }
        return;
      }

      cartAddToCart(cartItem, categoryName, chef?.latitude, chef?.longitude);
    };

    const totalItems = getTotalItems();

    // ✅ Called when checkout creates order successfully
    const handleCheckout = (categoryId: string) => {
      // Get the cart with precomputed delivery values
      const cartsWithDelivery = getAllCartsWithDelivery();
      const cart = cartsWithDelivery.find(c => c.categoryId === categoryId);

      if (cart) {
        setSelectedCart(cart);
        setCheckoutCategoryId(categoryId);
        setIsCartOpen(false);
        // Wait for sidebar animation before showing checkout
        setTimeout(() => {
          setIsCheckoutOpen(true);
        }, 250);
      }
    };


    // ✅ Called when checkout creates order successfully
    const handleShowPaymentQR = (orderDetails: {
      orderId: string;
      amount: number;
      customerName: string;
      phone: string;
      email?: string;
      address: string;
      accountCreated?: boolean;
      defaultPassword?: string;
    }) => {
      setPaymentOrderDetails(orderDetails);
      setIsCheckoutOpen(false);
      setTimeout(() => {
        setIsPaymentQROpen(true);
      }, 100);
    };

    // ✅ Called after QR payment flow completes
    const handleOrderSuccess = (categoryId: string | null) => {
      setIsPaymentQROpen(false);
      setPaymentOrderDetails(null);

      // Clear the cart for the completed order
      if (categoryId) {
        clearCart(categoryId);
        toast({
          title: "Cart cleared",
          description: "Your order has been placed successfully",
        });
      }
    };

    // ✅ Called when checkout dialog closes
    const handleCheckoutClose = () => {
      setIsCheckoutOpen(false);
      setCheckoutCategoryId("");
      setSelectedCart(null); // Reset selected cart
    };

    const handleCategoryClick = (categoryId: string) => {
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        setSelectedCategoryTab(categoryId);
        setIsMenuOpen(false);
        setTimeout(() => {
          const productsSection = document.getElementById("products-section");
          if (productsSection) {
            productsSection.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      }
    };

    const handleChefClick = (chef: Chef) => {
    // Get realtime chef status
    const realtimeStatus = chefStatuses[chef.id];
    const isActive = realtimeStatus !== undefined ? realtimeStatus : (chef.isActive !== false);
    const chefWithStatus = { ...chef, isActive };
    setSelectedChefForMenu(chefWithStatus);
    setSelectedCategoryForMenu(selectedCategoryForChefList);
    setIsCategoryMenuOpen(true);
  };

    const handleBrowseCategory = (categoryId: string) => {
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        setSelectedCategoryForChefList(category);
        setSelectedCategoryTab(categoryId);
        setIsChefListOpen(true);
      }
    };

    const handleWhatsAppSupport = () => {
      const message = "Hi! I need help with ordering from RotiHai.";
      const whatsappUrl = `https://wa.me/918169020290?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    const [showOffersOnly, setShowOffersOnly] = useState(false);

    // Filter chefs when a category is selected (Zomato-style)
  const filteredChefs = chefs.filter(chef => {
    // Filter by selected category
    if (selectedCategoryTab !== "all" && chef.categoryId !== selectedCategoryTab) {
      return false;
    }

    // Apply rating filter (4.0+)
    if (activeFilters.includes("rating")) {
      if (parseFloat(chef.rating) < 4.0) return false;
    }

    // Apply near & fast filter (within 5km)
    if (activeFilters.includes("near-fast")) {
      if (userLatitude && userLongitude && chef.latitude && chef.longitude) {
        const R = 6371;
        const lat1 = userLatitude;
        const lon1 = userLongitude;
        const lat2 = chef.latitude;
        const lon2 = chef.longitude;
        const toRad = (deg: number) => deg * (Math.PI / 180);
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.asin(Math.sqrt(a));
        const distance = R * c;

        if (distance > 5) return false;
      }
    }

    // Apply "new to you" filter (high ratings 4.3+)
    if (activeFilters.includes("new")) {
      if (parseFloat(chef.rating) < 4.3) return false;
    }

    return true;
  });

  // Filter products when showing "all" categories
  const filteredProducts = products.filter((product, index) => {
      const searchLower = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !searchLower ||
        product.name.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower);

      // When searching, show all categories; otherwise filter by selected category
      const matchesCategory =
        searchLower || selectedCategoryTab === "all" || product.categoryId === selectedCategoryTab;

      // Apply rating filter (4.0+)
      if (activeFilters.includes("rating")) {
        if (parseFloat(product.rating) < 4.0) return false;
      }

      // Apply offers filter
      if (activeFilters.includes("offers") || showOffersOnly) {
        const hasOffer = index % 3 === 0 || index % 3 === 1 || (product.offerPercentage && product.offerPercentage > 0);
        if (!hasOffer) return false;
      }

      // Apply near & fast filter (within 5km)
      if (activeFilters.includes("near-fast")) {
        const chef = product.chefId ? chefs.find(c => c.id === product.chefId) : null;

        if (chef && userLatitude && userLongitude && chef.latitude && chef.longitude) {
          const R = 6371;
          const lat1 = userLatitude;
          const lon1 = userLongitude;
          const lat2 = chef.latitude;
          const lon2 = chef.longitude;
          const toRad = (deg: number) => deg * (Math.PI / 180);
          const dLat = toRad(lat2 - lat1);
          const dLon = toRad(lon2 - lon1);
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.asin(Math.sqrt(a));
          const distance = R * c;

          if (distance > 5) return false;
        }
      }

      // Apply "new to you" filter (high ratings 4.3+)
      if (activeFilters.includes("new")) {
        if (parseFloat(product.rating) < 4.3) return false;
      }

      // Apply veg only filter
      if (vegOnly && !product.isVeg) {
        return false;
      }

      return matchesSearch && matchesCategory;
    });

    const requestLocationPermission = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation(position.coords.latitude, position.coords.longitude);
          },
          (error) => {
            console.error("Error Code = " + error.code + " - " + error.message);
            // Optionally set a default location or inform the user
            // For example, set to a default point if location services fail
            // setUserLocation(37.7749, -122.4194); // Example: San Francisco coordinates
            toast({
              title: "Location Access Denied",
              description: "Please enable location services to find nearby restaurants.",
              variant: "destructive",
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );
      } else {
        console.log("Geolocation is not supported by this browser.");
        toast({
          title: "Geolocation Not Supported",
          description: "Your browser does not support geolocation. Some features may be limited.",
          variant: "destructive",
        });
      }
    };

    // Show toast notifications for chef status changes
    useEffect(() => {
      requestLocationPermission();
    }, []);

    // Listen for chef status updates and show notifications
    useEffect(() => {
      // This effect will run when chefStatuses changes.
      // It's important to ensure we don't show toasts on initial load if chefStatuses is empty or already reflects the current state.
      // A more robust solution might involve comparing previous and current statuses, but for now, we rely on the toast logic within the WebSocket handler if it were still present.
      // Since we've removed the direct WebSocket handler, we need to ensure the `chefStatuses` from `useCustomerNotifications` are correctly processed.
      // The `updateChefStatus` call in the earlier useEffect handles syncing the status to the cart.
      // If we need to show toasts on status changes, we'd need to compare `chefStatuses` across renders or have a dedicated callback from `useCustomerNotifications`.
      // Without direct access to `useCustomerNotifications`'s internal logic for triggering toasts, this part is a placeholder for where such logic would reside if needed.

      // For now, assuming `useCustomerNotifications` or a subsequent effect handles the UI feedback.
      // The original code invalidated queries and showed toasts directly in the WebSocket handler.
      // If `useCustomerNotifications` provides a way to react to status *changes* (not just the current state), that's where toasts should be triggered.
      // Without direct access to `useCustomerNotifications`'s internal logic for triggering toasts, this part is a placeholder for where such logic would reside if needed.

      // To avoid spam on initial load, we might add checks like:
      // if (previousChefStatuses.current && !isEqual(previousChefStatuses.current, chefStatuses)) { ... show toasts ... }
      // However, for this edit, we are just removing the duplicate WebSocket.

    }, [chefStatuses]); // Depend on chefStatuses to re-run if statuses change

    const toggleFilter = (filterId: string) => {
      // Don't open subscription drawer for offers filter anymore
      setActiveFilters(prev =>
        prev.includes(filterId)
          ? prev.filter(f => f !== filterId)
          : [...prev, filterId]
      );
    };

    return (
      <div className="min-h-screen flex flex-col bg-background pb-16 md:pb-0">
        <Header
          cartItemCount={totalItems}
          onCartClick={() => setIsCartOpen(true)}
          onMenuClick={() => setIsMenuOpen(true)}
          onChefListClick={() => setIsChefListOpen(true)}
          onSubscriptionClick={() => setIsSubscriptionOpen(true)}
          onLoginClick={() => setIsLoginOpen(true)}
          onOffersClick={() => setShowOffersOnly(!showOffersOnly)}
          searchQuery={searchQuery}
          onSearchChange={(query) => {
            setSearchQuery(query);
            if (query.trim() && selectedCategoryTab !== "all") {
              setSelectedCategoryTab("all");
            }
          }}
        />

        <main className="flex-1">
          <Hero />

          {/* Zomato-style Category Tabs - Circular Icons */}
          <section className="bg-background py-4 border-b">
            <div className="max-w-7xl mx-auto px-3">
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                {/* Special Offers Tab */}
                <button
                  onClick={() => setIsSubscriptionOpen(true)}
                  className="flex flex-col items-center gap-2 min-w-[70px] group"
                  data-testid="button-offers-tab"
                >
                  <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all group-hover:scale-105">
                    <div className="text-center text-white">
                      <div className="text-[10px] font-bold leading-none">MEALS</div>
                      <div className="text-[10px] font-bold leading-none">UNDER</div>
                      <div className="text-sm font-bold leading-none">₹200</div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[8px] px-1.5 py-0.5 rounded-full font-semibold">
                      Explore
                    </div>
                  </div>
                  <span className="text-xs font-medium text-center whitespace-nowrap"></span>
                </button>

                {/* All Category */}
                <button
                  onClick={() => handleCategoryTabChange("all")}
                  className={`flex flex-col items-center gap-2 min-w-[70px] group transition-all ${
                    selectedCategoryTab === "all" ? "scale-105" : ""
                  }`}
                  data-testid="button-category-all"
                >
                  <div className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden shadow-md group-hover:shadow-lg transition-all group-hover:scale-105 ${
                    selectedCategoryTab === "all" ? "ring-2 ring-primary ring-offset-2" : ""
                  }`}>
                    <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 flex items-center justify-center">
                      <UtensilsCrossed className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <span className={`text-xs font-medium text-center whitespace-nowrap ${
                    selectedCategoryTab === "all" ? "text-primary font-bold" : "text-muted-foreground"
                  }`}>All</span>
                </button>

                {/* Dynamic Categories */}
                {categoriesLoading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 min-w-[70px]">
                      <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
                      <div className="w-12 h-3 bg-muted rounded animate-pulse" />
                    </div>
                  ))
                ) : (
                  categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => handleBrowseCategory(category.id)}
                      className={`flex flex-col items-center gap-2 min-w-[70px] group transition-all ${
                        selectedCategoryTab === category.id ? "scale-105" : ""
                      }`}
                      data-testid={`button-category-${category.id}`}
                    >
                      <div className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden shadow-md group-hover:shadow-lg transition-all group-hover:scale-105 ${
                        selectedCategoryTab === category.id ? "ring-2 ring-primary ring-offset-2" : ""
                      }`}>
                        <img
                          src={category.image}
                          alt={category.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className={`text-xs font-medium text-center whitespace-nowrap max-w-[70px] truncate ${
                        selectedCategoryTab === category.id ? "text-primary font-bold" : "text-muted-foreground"
                      }`}>{category.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Filter Pills */}
          <section className="sticky top-14 sm:top-16 z-40 bg-background/95 backdrop-blur-md border-b shadow-sm">
            <div className="max-w-7xl mx-auto px-3 py-2">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {filterOptions.map(filter => {
                  const Icon = filter.icon;
                  const isActive = activeFilters.includes(filter.id);
                  return (
                    <button
                      key={filter.id}
                      onClick={() => toggleFilter(filter.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary/50"
                      }`}
                      data-testid={`button-filter-${filter.id}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Dynamic Promotional Banners */}
          <PromotionalBannersSection
            onSubscriptionClick={() => setIsSubscriptionOpen(true)}
            onCategoryClick={(categoryId) => {
              setSelectedCategoryTab(categoryId);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />

          {/* Main Content Section */}
          <section className="max-w-7xl mx-auto px-3 py-4" id="products-section">
            {selectedCategoryTab === "all" ? (
              <>
                {/* Section Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Recommended For You
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Fresh, homemade meals from local chefs
                    </p>
                  </div>
                  {/* Filters for Search */}
                  <div className="flex items-center gap-4 px-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="veg-filter"
                        checked={vegOnly}
                        onChange={(e) => setVegOnly(e.target.checked)}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <label htmlFor="veg-filter" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Veg Only
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="offers-filter"
                        checked={showOffersOnly}
                        onChange={(e) => setShowOffersOnly(e.target.checked)}
                        className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                      />
                      <label htmlFor="offers-filter" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        🔥 Offers Only
                      </label>
                    </div>
                  </div>
                </div>

                {/* Products Grid - Zomato Style Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {productsLoading ? (
                    [...Array(8)].map((_, i) => (
                      <Card key={i} className="overflow-hidden animate-pulse">
                        <div className="h-32 sm:h-40 bg-muted" />
                        <div className="p-3 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </Card>
                    ))
                  ) : filteredProducts.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="text-muted-foreground">
                        No products found matching "{searchQuery}"
                      </p>
                    </div>
                  ) : (
                    filteredProducts.map((product, index) => {
                      const realtimeAvailability = productAvailability[product.id];
                      const chef = product.chefId ? chefs.find(c => c.id === product.chefId) : null;
                      // Simulate offer badge based on index for demonstration if no actual offer data
                      const offerBadge = product.offerPercentage > 0 ? `FLAT ${product.offerPercentage}% OFF` : (index % 3 === 0 ? "FLAT 50% OFF" : index % 3 === 1 ? "FLAT ₹175 OFF" : null);


                      return (
                        <Card
                          key={product.id}
                          className="overflow-hidden group cursor-pointer hover:shadow-lg transition-all"
                          onClick={() => handleAddToCart(product)}
                          data-testid={`card-product-${product.id}`}
                        >
                          <div className="relative h-28 sm:h-36 overflow-hidden">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {/* Offer Badge */}
                            {offerBadge && (
                              <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded">
                                {offerBadge}
                              </div>
                            )}
                            {/* Rating Badge */}
                            <div className="absolute bottom-2 left-2 bg-green-600 text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Star className="h-2.5 w-2.5 fill-current" />
                              {parseFloat(product.rating).toFixed(1)}
                            </div>
                            {/* Veg/Non-veg indicator */}
                            <div className="absolute top-2 right-2">
                              <div className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center ${
                                product.isVeg ? 'border-green-600 bg-white' : 'border-red-600 bg-white'
                              }`}>
                                <div className={`w-2 h-2 rounded-full ${
                                  product.isVeg ? 'bg-green-600' : 'bg-red-600'
                                }`} />
                              </div>
                            </div>
                          </div>
                          <div className="p-2 sm:p-3">
                            <h3 className="font-semibold text-sm sm:text-base line-clamp-1" data-testid={`text-product-name-${product.id}`}>
                              {product.name}
                            </h3>
                            {chef && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {chef.name}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-1.5 gap-1">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                30-35 mins
                              </span>
                              <span className="font-bold text-sm text-primary">
                                ₹{product.price}
                              </span>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Category View - Chefs/Restaurants */}
                <div className="mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold mb-2 flex items-center gap-2">
                    <ChefHat className="h-6 w-6 text-primary" />
                    {categories.find(c => c.id === selectedCategoryTab)?.name || "Restaurants"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Select a restaurant to view their menu
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {chefsLoading ? (
                    [...Array(6)].map((_, i) => (
                      <Card key={i} className="overflow-hidden animate-pulse">
                        <div className="h-40 bg-muted" />
                        <div className="p-4 space-y-2">
                          <div className="h-5 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </Card>
                    ))
                  ) : (
                    filteredChefs
                      .map(chef => {
                        let distance: number | null = null;
                        const isChefActive = chef.isActive !== false;

                        if (userLatitude && userLongitude && chef.latitude && chef.longitude) {
                          const R = 6371;
                          const lat1 = userLatitude;
                          const lon1 = userLongitude;
                          const lat2 = chef.latitude;
                          const lon2 = chef.longitude;

                          if (lat1 >= -90 && lat1 <= 90 && lon1 >= -180 && lon1 <= 180 &&
                              lat2 >= -90 && lat2 <= 90 && lon2 >= -180 && lon2 <= 180) {
                            const toRad = (deg: number) => deg * (Math.PI / 180);
                            const dLat = toRad(lat2 - lat1);
                            const dLon = toRad(lon2 - lon1);
                            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                            const c = 2 * Math.asin(Math.sqrt(a));
                            const calculatedDistance = R * c;
                            if (calculatedDistance < 100) {
                              distance = parseFloat(calculatedDistance.toFixed(1));
                            }
                          }
                        }

                        return (
                          <Card
                            key={chef.id}
                            className={`overflow-hidden transition-all ${
                              isChefActive
                                ? "cursor-pointer hover:shadow-lg"
                                : "opacity-60 cursor-not-allowed"
                            }`}
                            onClick={() => {
                              if (!isChefActive) {
                                toast({
                                  title: "Currently Unavailable",
                                  description: `${chef.name} is not accepting orders right now`,
                                  variant: "destructive",
                                });
                                return;
                              }
                              const category = categories.find(c => c.id === selectedCategoryTab);
                              setSelectedChefForMenu(chef);
                              setSelectedCategoryForMenu(category || null);
                              setIsCategoryMenuOpen(true);
                            }}
                            data-testid={`card-chef-${chef.id}`}
                          >
                            <div className="relative h-36 sm:h-44 overflow-hidden">
                              <img
                                src={chef.image}
                                alt={chef.name}
                                className={`w-full h-full object-cover transition-transform duration-300 ${
                                  isChefActive ? "group-hover:scale-105" : "grayscale"
                                }`}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                              {/* Rating Badge */}
                              <div className="absolute bottom-3 left-3 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                <Star className="h-3 w-3 fill-current" />
                                {chef.rating}
                              </div>

                              {!isChefActive && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <Badge variant="destructive" className="text-sm">
                                    Currently Closed
                                  </Badge>
                                </div>
                              )}

                              {distance !== null && isChefActive && (
                                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium">
                                  {distance.toFixed(1)} km
                                </div>
                              )}
                            </div>

                            <div className="p-3 sm:p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className={`font-bold text-base sm:text-lg truncate ${!isChefActive ? "text-muted-foreground" : ""}`}>
                                    {chef.name}
                                  </h3>
                                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 mt-0.5">
                                    {chef.description}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {distance !== null ? `~${Math.ceil(distance * 2 + 15)} mins` : "30-45 mins"}
                                </span>
                                <span>•</span>
                                <span>{chef.reviewCount} reviews</span>
                              </div>
                            </div>
                          </Card>
                        );
                      })
                  )}
                </div>
              </>
            )}
          </section>
        </main>

        <Footer />

        {/* Mobile Bottom Navigation - Zomato Style */}
        <nav className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 md:hidden safe-area-inset-bottom">
          <div className="flex items-center justify-around h-14">
            <Button
          onClick={handleWhatsAppSupport}
          className="fixed bottom-20 md:bottom-6 right-4 h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg bg-green-600 hover:bg-green-700 text-white z-40"
          size="icon"
          title="Chat with us on WhatsApp"
        >
          <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
        </Button>
            
            {/* <button
              onClick={() => setMobileNavTab("delivery")}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                mobileNavTab === "delivery" ? "text-primary" : "text-muted-foreground"
              }`}
              data-testid="nav-delivery"
            >
              <HomeIcon className="h-5 w-5" />
              <span className="text-[10px] font-medium">Delivery</span>
              {mobileNavTab === "delivery" && (
                <span className="absolute top-1 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-semibold">
                  NEW
                </span>
              )}
            </button> */}

            <button
              onClick={() => setIsSubscriptionOpen(true)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                mobileNavTab === "offers" ? "text-primary" : "text-muted-foreground"
              }`}
              data-testid="nav-offers"
            >
              <Percent className="h-5 w-5" />
              <span className="text-[10px] font-medium">Under ₹200</span>
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-muted-foreground relative"
              data-testid="nav-cart"
            >
              <div className="relative">
                <ShoppingBag className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {totalItems}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">Cart</span>
            </button>

            <button
              onClick={() => user ? window.location.href = '/profile' : setIsLoginOpen(true)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-muted-foreground"
              data-testid="nav-profile"
            >
              <User className="h-5 w-5" />
              <span className="text-[10px] font-medium">{user ? 'Profile' : 'Sign In'}</span>
            </button>
          </div>
        </nav>

        {/* Floating WhatsApp Support Button - Adjusted for mobile nav */}
        {/* <Button
          onClick={handleWhatsAppSupport}
          className="fixed bottom-20 md:bottom-6 right-4 h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg bg-green-600 hover:bg-green-700 text-white z-40"
          size="icon"
          title="Chat with us on WhatsApp"
        >
          <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
        </Button> */}

        {/* Drawers */}
        <MenuDrawer
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          categories={categories}
          onCategoryClick={handleCategoryClick}
          selectedCategoryTab={selectedCategoryTab}
          onCategoryTabChange={handleCategoryTabChange}
          onSubscriptionClick={() => setIsSubscriptionOpen(true)}
          onLoginClick={() => setIsLoginOpen(true)}
        />

        <ChefListDrawer
          isOpen={isChefListOpen}
          onClose={() => setIsChefListOpen(false)}
          category={selectedCategoryForChefList}
          chefs={chefs}
          onChefClick={handleChefClick}
        />

        <CategoryMenuDrawer
          isOpen={isCategoryMenuOpen}
          onClose={() => setIsCategoryMenuOpen(false)}
          category={selectedCategoryForMenu}
          chef={selectedChefForMenu}
          products={products}
          onAddToCart={handleAddToCart}
          cartItems={
            selectedCategoryForMenu
              ? carts.find(c => c.categoryId === selectedCategoryForMenu.id)?.items.map(item => ({
                  id: item.id,
                  quantity: item.quantity,
                  price: item.price,
                })) || []
              : []
          }
          autoCloseOnAdd={false}
          onProceedToCart={() => {
            setIsCategoryMenuOpen(false);
            setIsCartOpen(true);
          }}
        />

        {/* ✅ Sidebar + Checkout Dialog */}
        <CartSidebar
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onCheckout={handleCheckout}
        />

       <CheckoutDialog
    isOpen={isCheckoutOpen}
    onClose={handleCheckoutClose}
    cart={selectedCart} // Use selectedCart for the checkout dialog
    onClearCart={() => {
      if (selectedCart) {
        clearCart(selectedCart.categoryId);
      }
    }}
    onShowPaymentQR={handleShowPaymentQR}
  />

        {paymentOrderDetails && (
          <PaymentQRDialog
            isOpen={isPaymentQROpen}
            onClose={() => handleOrderSuccess(checkoutCategoryId)}
            orderId={paymentOrderDetails.orderId}
            amount={paymentOrderDetails.amount}
            customerName={paymentOrderDetails.customerName}
            phone={paymentOrderDetails.phone}
            email={paymentOrderDetails.email}
            address={paymentOrderDetails.address}
            accountCreated={paymentOrderDetails.accountCreated}
            defaultPassword={paymentOrderDetails.defaultPassword}
          />
        )}

        <SubscriptionDrawer isOpen={isSubscriptionOpen} onClose={() => setIsSubscriptionOpen(false)} />

        <LoginDialog
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onLoginSuccess={() => {
            window.location.reload();
          }}
        />
      </div>
    );
  }