import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CategoryCard from "@/components/CategoryCard";
import ProductCard from "@/components/ProductCard";
import CartSidebar from "@/components/CartSidebar";
import CheckoutDialog from "@/components/CheckoutDialog";
import MenuDrawer from "@/components/MenuDrawer";
import Footer from "@/components/Footer";
import { UtensilsCrossed, ChefHat, Hotel } from "lucide-react";
import type { Category, Product } from "@shared/schema";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
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
    console.log(`Category clicked: ${categoryId}`);
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const filteredProducts = products.filter(product => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query)
    );
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
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-categories-heading">
              Browse by Category
            </h2>
            <p className="text-lg text-muted-foreground" data-testid="text-categories-subheading">
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
                  onBrowse={() => console.log(`Browse ${category.name}`)}
                />
              ))
            )}
          </div>

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
              filteredProducts.slice(0, 8).map((product) => (
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
        </section>
      </main>

      <Footer />

      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        categories={categories}
        onCategoryClick={handleCategoryClick}
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
