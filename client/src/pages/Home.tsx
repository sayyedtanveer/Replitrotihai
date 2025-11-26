import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, ChefHat, Hotel } from "lucide-react";
import type { Category, Chef, Product } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";
import { toast } from "@/hooks/use-toast";

const iconMap: Record<string, React.ReactNode> = {
  UtensilsCrossed: <UtensilsCrossed className="h-6 w-6 text-primary" />,
  ChefHat: <ChefHat className="h-6 w-6 text-primary" />,
  Hotel: <Hotel className="h-6 w-6 text-primary" />,
};

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
  const [selectedCart, setSelectedCart] = useState<any>(null); // State to hold the cart for checkout

  const { carts, addToCart: cartAddToCart, canAddItem, clearCart, getTotalItems, setUserLocation, getAllCartsWithDelivery } = useCart();

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
    setSelectedChefForMenu(chef);
    setSelectedCategoryForMenu(selectedCategoryForChefList);
    setIsCategoryMenuOpen(true);
  };

  const handleBrowseCategory = (categoryId: string) => {
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

  const filteredProducts = products.filter(product => {
    const searchLower = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !searchLower ||
      product.name.toLowerCase().includes(searchLower) ||
      product.description.toLowerCase().includes(searchLower);

    // When searching, show all categories; otherwise filter by selected category
    const matchesCategory =
      searchLower || selectedCategoryTab === "all" || product.categoryId === selectedCategoryTab;

    // Ensure the product is available
    const isAvailable = product.isAvailable !== false;

    return matchesSearch && matchesCategory && isAvailable;
  });


  return (
    <div className="min-h-screen flex flex-col">
      <Header
        cartItemCount={totalItems}
        onCartClick={() => setIsCartOpen(true)}
        onMenuClick={() => setIsMenuOpen(true)}
        onChefListClick={() => setIsChefListOpen(true)}
        onSubscriptionClick={() => setIsSubscriptionOpen(true)}
        onLoginClick={() => setIsLoginOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={(query) => {
          setSearchQuery(query);
          // Auto-switch to "all" tab when user starts searching
          if (query.trim() && selectedCategoryTab !== "all") {
            setSelectedCategoryTab("all");
          }
        }}
      />

      <main className="flex-1">
        <Hero />

        {/* Sticky Category Navigation Bar */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b shadow-sm">
          <div className="w-full px-2 sm:px-4">
            <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-3 overflow-x-auto py-3 sm:py-4 scrollbar-hide max-w-7xl mx-auto">
              {/* All Categories Button */}
              <button
                onClick={() => handleCategoryTabChange("all")}
                className={`flex-shrink-0 flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300 min-w-[70px] sm:min-w-[85px] ${
                  selectedCategoryTab === "all"
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "bg-card hover:bg-accent"
                }`}
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-background/50 flex items-center justify-center">
                  <UtensilsCrossed className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">All</span>
              </button>

              {/* Category Buttons */}
              {categoriesLoading ? (
                <div className="flex gap-2 sm:gap-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-[70px] sm:w-[85px] h-[72px] sm:h-[84px] bg-muted/50 rounded-lg sm:rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => handleBrowseCategory(category.id)}
                    className={`flex-shrink-0 flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300 min-w-[70px] sm:min-w-[85px] ${
                      selectedCategoryTab === category.id
                        ? "bg-primary text-primary-foreground shadow-md scale-105"
                        : "bg-card hover:bg-accent"
                    }`}
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden ring-2 ring-background">
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-center line-clamp-2 leading-tight px-1">
                      {category.name}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          <div id="products-section">
            {selectedCategoryTab === "all" ? (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">Popular Items</h2>
                  <p className="text-lg text-muted-foreground">
                    Most loved by our customers
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {productsLoading ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      Loading products...
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      No products found matching "{searchQuery}"
                    </div>
                  ) : (
                    filteredProducts.map(product => (
                      <ProductCard
                        key={product.id}
                        id={product.id}
                        name={product.name}
                        description={product.description}
                        price={product.price}
                        image={product.image}
                        rating={parseFloat(product.rating)}
                        reviewCount={product.reviewCount}
                        isVeg={product.isVeg}
                        isCustomizable={product.isCustomizable}
                        chefName={selectedChefForMenu?.name}
                        onAddToCart={() => handleAddToCart(product)}
                      />
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Category-specific chefs */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    {categories.find(c => c.id === selectedCategoryTab)?.name ||
                      "Restaurants & Chefs"}
                  </h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    Select a restaurant or chef to view their menu
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {chefsLoading ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      Loading chefs...
                    </div>
                  ) : (
                    chefs
                      .filter(chef => chef.categoryId === selectedCategoryTab)
                      .map(chef => {
                        const userLat = localStorage.getItem('userLatitude');
                        const userLon = localStorage.getItem('userLongitude');
                        let distance: number | null = null;
                        const isChefActive = chef.isActive !== false;

                        if (userLat && userLon && chef.latitude && chef.longitude) {
                          const R = 6371; // Earth's radius in km
                          const lat1 = parseFloat(userLat);
                          const lon1 = parseFloat(userLon);
                          const lat2 = chef.latitude;
                          const lon2 = chef.longitude;

                          // Validate coordinates are reasonable (within valid range)
                          if (lat1 >= -90 && lat1 <= 90 && lon1 >= -180 && lon1 <= 180 &&
                              lat2 >= -90 && lat2 <= 90 && lon2 >= -180 && lon2 <= 180) {

                            const toRad = (deg: number) => deg * (Math.PI / 180);

                            const dLat = toRad(lat2 - lat1);
                            const dLon = toRad(lon2 - lon1);

                            const a =
                              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                              Math.cos(toRad(lat1)) *
                              Math.cos(toRad(lat2)) *
                              Math.sin(dLon / 2) *
                              Math.sin(dLon / 2);

                            const c = 2 * Math.asin(Math.sqrt(a));
                            const calculatedDistance = R * c;

                            // Only set if distance is reasonable (< 100km for local delivery)
                            if (calculatedDistance < 100) {
                              distance = parseFloat(calculatedDistance.toFixed(1));
                            }
                          }
                        }

                        return (
                          <div
                            key={chef.id}
                            className={`border rounded-lg overflow-hidden transition-all ${
                              isChefActive 
                                ? "cursor-pointer hover:shadow-lg hover:border-primary" 
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
                            <div className="relative h-48 overflow-hidden">
                              <img
                                src={chef.image}
                                alt={chef.name}
                                className={`w-full h-full object-cover transition-transform duration-300 ${
                                  isChefActive ? "hover:scale-105" : "grayscale"
                                }`}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                              {!isChefActive && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <div className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                                    Currently Closed
                                  </div>
                                </div>
                              )}
                              {distance !== null && isChefActive && (
                                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                  <span className="text-primary">📍</span>
                                  {distance.toFixed(1)} km
                                </div>
                              )}
                            </div>

                            <div className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className={`font-bold text-xl ${!isChefActive ? "text-muted-foreground" : ""}`}>
                                  {chef.name}
                                </h3>
                                {!isChefActive && (
                                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 text-xs rounded-full">
                                    Closed
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {chef.description}
                              </p>
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {chef.rating} ({chef.reviewCount} reviews)
                                </span>
                                {distance !== null && isChefActive && (
                                  <span className="text-xs text-muted-foreground">
                                    ~{Math.ceil(distance * 2 + 15)} mins
                                  </span>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="gap-1"
                                  disabled={!isChefActive}
                                >
                                  {isChefActive ? "View Menu →" : "Unavailable"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />

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