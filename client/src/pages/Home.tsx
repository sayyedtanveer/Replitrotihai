import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CategoryCard from "@/components/CategoryCard";
import ProductCard from "@/components/ProductCard";
import CartSidebar from "@/components/CartSidebar";
import CheckoutDialog from "@/components/CheckoutDialog";
import MenuDrawer from "@/components/MenuDrawer";
import CategoryMenuDrawer from "@/components/CategoryMenuDrawer";
import ChefListDrawer from "@/components/ChefListDrawer";
import Footer from "@/components/Footer";

import { Button } from "@/components/ui/button";
import { UtensilsCrossed, ChefHat, Hotel } from "lucide-react";
import type { Category, Chef, Product } from "@shared/schema";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

const iconMap: Record<string, React.ReactNode> = {
  UtensilsCrossed: <UtensilsCrossed className="h-6 w-6 text-primary" />,
  ChefHat: <ChefHat className="h-6 w-6 text-primary" />,
  Hotel: <Hotel className="h-6 w-6 text-primary" />,
};

export default function Home() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChefListOpen, setIsChefListOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [selectedCategoryForChefList, setSelectedCategoryForChefList] = useState<Category | null>(null);
  const [selectedCategoryForMenu, setSelectedCategoryForMenu] = useState<Category | null>(null);
  const [selectedChefForMenu, setSelectedChefForMenu] = useState<Chef | null>(null);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const handleCategoryTabChange = (value: string) => {
    setSelectedCategoryTab(value);
    // Close drawers when changing tabs
    setIsChefListOpen(false);
    setIsCategoryMenuOpen(false);
    // Scroll to products section
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

  const handleAddToCart = (productId: string, productName: string, price: number, image: string, quantity: number) => {
    if (quantity === 0) {
      setCartItems(items => items.filter(item => item.id !== productId));
    } else {
      setCartItems(items => {
        const existing = items.find(item => item.id === productId);
        if (existing) {
          return items.map(item =>
            item.id === productId ? { ...item, quantity } : item
          );
        }
        return [...items, { id: productId, name: productName, price, quantity, image }];
      });
    }
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(items => items.filter(item => item.id !== id));
    } else {
      setCartItems(items =>
        items.map(item => item.id === id ? { ...item, quantity } : item)
      );
    }
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal > 0 ? 40 : 0;
  const total = subtotal + deliveryFee;

  const handleCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleOrderSuccess = () => {
    setCartItems([]);
    setIsCheckoutOpen(false);
  };

  const handleCategoryClick = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      // Switch to the category tab
      setSelectedCategoryTab(categoryId);
      // Close menu drawer
      setIsMenuOpen(false);
      // Scroll to products section
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
      // Switch to the category tab
      setSelectedCategoryTab(categoryId);
      // Close menu drawer
      setIsMenuOpen(false);
      // Scroll to products section
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
    const matchesSearch = !searchLower || 
      product.name.toLowerCase().includes(searchLower) ||
      product.description.toLowerCase().includes(searchLower);
    
    const matchesCategory = selectedCategoryTab === "all" || product.categoryId === selectedCategoryTab;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        cartItemCount={totalItems}
        onCartClick={() => setIsCartOpen(true)}
        onMenuClick={() => setIsMenuOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="flex-1">
        <Hero />

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {selectedCategoryTab === "all" && (
            <>
              <div className="text-center mb-8">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-categories-heading">
                  Browse by Category
                </h2>
                <p className="text-lg text-muted-foreground mb-6" data-testid="text-categories-subheading">
                  Choose from our popular categories
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                {categoriesLoading ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    Loading categories...
                  </div>
                ) : (
                  categories.map((category) => (
                    <CategoryCard
                      key={category.id}
                      id={`category-${category.id}`}
                      title={category.name}
                      description={category.description}
                      itemCount={category.itemCount}
                      image={category.image}
                      icon={iconMap[category.iconName]}
                      onBrowse={() => handleBrowseCategory(category.id)}
                    />
                  ))
                )}
              </div>
            </>
          )}

          <div id="products-section">
            {selectedCategoryTab === "all" ? (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-popular-heading">
                    Popular Items
                  </h2>
                  <p className="text-lg text-muted-foreground" data-testid="text-popular-subheading">
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
                        onAddToCart={(quantity) =>
                          handleAddToCart(product.id, product.name, product.price, product.image, quantity)
                        }
                      />
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-popular-heading">
                    {categories.find(c => c.id === selectedCategoryTab)?.name || 'Restaurants & Chefs'}
                  </h2>
                  <p className="text-lg text-muted-foreground mb-6" data-testid="text-popular-subheading">
                    Select a restaurant or chef to view their menu
                  </p>
                  
                  {/* Category tabs */}
                  <div className="flex justify-center mb-6">
                    <div className="inline-flex gap-2 p-1 bg-muted rounded-lg flex-wrap">
                      <Button
                        variant={selectedCategoryTab === "all" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleCategoryTabChange("all")}
                        data-testid="tab-all"
                      >
                        All
                      </Button>
                      {categories.map((category) => (
                        <Button
                          key={category.id}
                          variant={selectedCategoryTab === category.id ? "default" : "ghost"}
                          size="sm"
                          onClick={() => handleCategoryTabChange(category.id)}
                          data-testid={`tab-${category.id}`}
                        >
                          {category.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {chefsLoading ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      Loading chefs...
                    </div>
                  ) : (
                    chefs
                      .filter(chef => chef.categoryId === selectedCategoryTab)
                      .map((chef) => (
                        <div
                          key={chef.id}
                          className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:border-primary"
                          onClick={() => {
                            const category = categories.find(c => c.id === selectedCategoryTab);
                            setSelectedChefForMenu(chef);
                            setSelectedCategoryForMenu(category || null);
                            setIsCategoryMenuOpen(true);
                          }}
                          data-testid={`chef-card-${chef.id}`}
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
                            <h3 className="font-bold text-xl mb-2" data-testid={`text-chef-name-${chef.id}`}>
                              {chef.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3" data-testid={`text-chef-description-${chef.id}`}>
                              {chef.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <svg className="h-4 w-4 fill-yellow-400 text-yellow-400" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  <span className="text-sm font-medium">{chef.rating}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  ({chef.reviewCount} reviews)
                                </span>
                              </div>
                              <Button variant="ghost" size="sm" className="gap-1">
                                View Menu
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />

      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        categories={categories}
        onCategoryClick={handleCategoryClick}
        selectedCategoryTab={selectedCategoryTab}
        onCategoryTabChange={handleCategoryTabChange}
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
        cartItems={cartItems}
      />

      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onCheckout={handleCheckout}
      />

      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        subtotal={subtotal}
        deliveryFee={deliveryFee}
        total={total}
        onOrderSuccess={handleOrderSuccess}
      />
    </div>
  );
}
