import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ProductCard from "@/components/ProductCard";
import CartSidebar from "@/components/CartSidebar";
import CheckoutDialog from "@/components/CheckoutDialog";
import MenuDrawer from "@/components/MenuDrawer";
import CategoryMenuDrawer from "@/components/CategoryMenuDrawer";
import ChefListDrawer from "@/components/ChefListDrawer";
import SubscriptionDrawer from "@/components/SubscriptionDrawer";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import type { Category, Chef, Product } from "@shared/schema";
import { useCart } from "@/hooks/use-cart";

export default function Home() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutCategoryId, setCheckoutCategoryId] = useState<string>("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isChefListOpen, setIsChefListOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [selectedCategoryForChefList, setSelectedCategoryForChefList] = useState<Category | null>(null);
  const [selectedCategoryForMenu, setSelectedCategoryForMenu] = useState<Category | null>(null);
  const [selectedChefForMenu, setSelectedChefForMenu] = useState<Chef | null>(null);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { carts, addToCart: cartAddToCart, canAddItem, clearCart, getTotalItems } = useCart();

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
    const category = categories.find((c) => c.id === product.categoryId);
    const categoryName = category?.name || "Unknown";

    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      chefId: product.chefId || undefined,
      chefName: selectedChefForMenu?.name || undefined,
      categoryId: product.categoryId,
    };

    const checkResult = canAddItem(cartItem.chefId, cartItem.categoryId);
    if (!checkResult.canAdd) {
      const confirmed = window.confirm(
        `Your ${categoryName} cart contains items from ${checkResult.conflictChef}. Replace them with items from ${cartItem.chefName || "this chef"}?`
      );
      if (confirmed) {
        clearCart(cartItem.categoryId || "");
        cartAddToCart(cartItem, categoryName);
      }
      return;
    }

    cartAddToCart(cartItem, categoryName);
  };

  const handleUpdateQuantity = (categoryId: string, id: string, quantity: number) => {
    useCart.getState().updateQuantity(categoryId, id, quantity);
  };

  const totalItems = getTotalItems();

  const handleCheckout = (categoryId: string) => {
    const selectedCart = carts.find((c) => c.categoryId === categoryId);
    if (!selectedCart) return;
    setCheckoutCategoryId(categoryId);
    setIsCheckoutOpen(true);
    requestAnimationFrame(() => setIsCartOpen(false));
  };

  const handleOrderSuccess = () => {
    setIsCheckoutOpen(false);
    setCheckoutCategoryId("");
  };

  const handleBrowseCategory = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (category) {
      setSelectedCategoryTab(categoryId);
      setIsMenuOpen(false);
    }
  };

  const handleBackToAllCategories = () => {
    setSelectedCategoryTab("all");
    setSelectedCategoryForChefList(null);
    setIsChefListOpen(false);
    setIsCategoryMenuOpen(false);
  };

  const filteredProducts = products.filter((product) => {
    const searchLower = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !searchLower ||
      product.name.toLowerCase().includes(searchLower) ||
      product.description.toLowerCase().includes(searchLower);
    const matchesCategory =
      selectedCategoryTab === "all" || product.categoryId === selectedCategoryTab;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        cartItemCount={totalItems}
        onCartClick={() => setIsCartOpen(true)}
        onMenuClick={() => setIsMenuOpen(true)}
        onChefListClick={() => setIsChefListOpen(true)}
        onSubscriptionClick={() => setIsSubscriptionOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="flex-1">
        <Hero />

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* ✅ Category Section */}
          {selectedCategoryTab === "all" && (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center">
                Browse by Category
              </h2>

              <div className="category-scroll-container hide-scrollbar">
                {categoriesLoading ? (
                  <div className="text-center text-muted-foreground py-4">Loading...</div>
                ) : (
                  categories.map((category) => (
                    <div
                      key={category.id}
                      onClick={() => handleBrowseCategory(category.id)}
                      className="category-bubble group"
                    >
                      <div className="category-image">
                        <img
                          src={category.image}
                          alt={category.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <p className="category-label">{category.name}</p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* ✅ Category Specific View */}
          {selectedCategoryTab !== "all" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold">
                    {categories.find((c) => c.id === selectedCategoryTab)?.name ||
                      "Restaurants & Chefs"}
                  </h2>
                  <p className="text-muted-foreground">
                    Select a restaurant or chef to view their menu
                  </p>
                </div>
                <Button variant="outline" onClick={handleBackToAllCategories}>
                  ← Back to All
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {chefsLoading ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    Loading chefs...
                  </div>
                ) : (
                  chefs
                    .filter((chef) => chef.categoryId === selectedCategoryTab)
                    .map((chef) => (
                      <div
                        key={chef.id}
                        className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:border-primary"
                        onClick={() => {
                          const category = categories.find(
                            (c) => c.id === selectedCategoryTab
                          );
                          setSelectedChefForMenu(chef);
                          setSelectedCategoryForMenu(category || null);
                          setIsCategoryMenuOpen(true);
                        }}
                      >
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={chef.image}
                            alt={chef.name}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        </div>

                        <div className="p-4">
                          <h3 className="font-bold text-xl mb-2">{chef.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {chef.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              ⭐ {chef.rating} ({chef.reviewCount} reviews)
                            </span>
                            <Button variant="ghost" size="sm" className="gap-1">
                              View Menu →
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </>
          )}

          {/* ✅ Popular Items */}
          {selectedCategoryTab === "all" && (
            <div id="products-section" className="mt-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
                Popular Items
              </h2>
              <p className="text-center text-lg text-muted-foreground mb-8">
                Most loved by our customers
              </p>

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
                  filteredProducts.map((product) => (
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
            </div>
          )}
        </section>
      </main>

      <Footer />

      {/* Drawers */}
      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        categories={categories}
        onCategoryClick={(id) => handleBrowseCategory(id)}
        selectedCategoryTab={selectedCategoryTab}
        onCategoryTabChange={setSelectedCategoryTab}
        onSubscriptionClick={() => setIsSubscriptionOpen(true)}
      />

      <ChefListDrawer
        isOpen={isChefListOpen}
        onClose={() => setIsChefListOpen(false)}
        category={selectedCategoryForChefList}
        chefs={chefs}
        onChefClick={(chef) => {
          setSelectedChefForMenu(chef);
          setSelectedCategoryForMenu(selectedCategoryForChefList);
          setIsCategoryMenuOpen(true);
        }}
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
            ? carts.find((c) => c.categoryId === selectedCategoryForMenu.id)?.items.map((item) => ({
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

      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        carts={carts}
        onUpdateQuantity={handleUpdateQuantity}
        onCheckout={handleCheckout}
      />

      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={carts.find((cart) => cart.categoryId === checkoutCategoryId) || null}
        onOrderSuccess={handleOrderSuccess}
      />

      <SubscriptionDrawer
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
      />
    </div>
  );
}
