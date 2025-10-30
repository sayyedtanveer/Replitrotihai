import { useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CategoryCard from "@/components/CategoryCard";
import ProductCard from "@/components/ProductCard";
import CartSidebar from "@/components/CartSidebar";
import Footer from "@/components/Footer";
import { UtensilsCrossed, ChefHat, Hotel } from "lucide-react";

import rotiImage from '@assets/generated_images/Fresh_tandoori_rotis_stack_1dcda2c7.png';
import thaliImage from '@assets/generated_images/Complete_Indian_thali_meal_837cc17d.png';
import hotelImage from '@assets/generated_images/Fine_dining_restaurant_setup_1724ed85.png';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export default function Home() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

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

  const categories = [
    {
      title: "Fresh Rotis & Breads",
      description: "Tandoori rotis, naan, and more freshly baked",
      itemCount: "20+ varieties",
      image: rotiImage,
      icon: <UtensilsCrossed className="h-6 w-6 text-primary" />,
    },
    {
      title: "Lunch & Dinner",
      description: "Complete meals with rice, curry, and sides",
      itemCount: "50+ dishes",
      image: thaliImage,
      icon: <ChefHat className="h-6 w-6 text-primary" />,
    },
    {
      title: "Hotel Specials",
      description: "Restaurant quality dishes delivered to you",
      itemCount: "30+ partners",
      image: hotelImage,
      icon: <Hotel className="h-6 w-6 text-primary" />,
    },
  ];

  const products = [
    {
      id: "butter-naan",
      name: "Butter Naan",
      description: "Soft and fluffy naan brushed with butter, freshly baked in tandoor",
      price: 45,
      image: rotiImage,
      rating: 4.7,
      reviewCount: 128,
      isVeg: true,
      isCustomizable: true,
    },
    {
      id: "tandoori-roti",
      name: "Tandoori Roti",
      description: "Whole wheat roti with authentic smoky flavor from the tandoor",
      price: 30,
      image: rotiImage,
      rating: 4.5,
      reviewCount: 95,
      isVeg: true,
      isCustomizable: false,
    },
    {
      id: "special-thali",
      name: "Special Thali",
      description: "Complete meal with dal, curry, rice, roti, and dessert",
      price: 180,
      image: thaliImage,
      rating: 4.8,
      reviewCount: 210,
      isVeg: true,
      isCustomizable: true,
    },
    {
      id: "paneer-tikka",
      name: "Paneer Tikka",
      description: "Grilled cottage cheese marinated in Indian spices",
      price: 220,
      image: hotelImage,
      rating: 4.6,
      reviewCount: 156,
      isVeg: true,
      isCustomizable: true,
    },
  ];

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        cartItemCount={totalItems}
        onCartClick={() => setIsCartOpen(true)}
        onMenuClick={() => console.log('Menu clicked')}
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
            {categories.map((category, index) => (
              <CategoryCard
                key={index}
                {...category}
                onBrowse={() => console.log(`Browse ${category.title}`)}
              />
            ))}
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
            {products.map((product) => (
              <ProductCard
                key={product.id}
                {...product}
                onAddToCart={(quantity) =>
                  handleAddToCart(product.id, product.name, product.price, product.image, quantity)
                }
              />
            ))}
          </div>
        </section>
      </main>

      <Footer />

      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onCheckout={() => console.log('Checkout', cartItems)}
      />
    </div>
  );
}
