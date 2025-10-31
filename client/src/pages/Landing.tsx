import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Clock, ShieldCheck, Star } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-primary" data-testid="text-logo">
              FoodExpress
            </h1>
            <Button onClick={handleLogin} data-testid="button-signin-landing">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl sm:text-6xl font-bold mb-6" data-testid="text-hero-title">
              Delicious Meals Delivered
              <br />
              <span className="text-primary">to Your Door</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-hero-subtitle">
              Fresh rotis, complete meals, and restaurant specials in 30 minutes
            </p>
            <Button size="lg" onClick={handleLogin} className="text-lg px-8 py-6" data-testid="button-get-started">
              Get Started
            </Button>
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12" data-testid="text-features-heading">
              Why Choose FoodExpress?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center" data-testid="feature-card-variety">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UtensilsCrossed className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Wide Variety</h3>
                <p className="text-sm text-muted-foreground">
                  100+ dishes from rotis to complete meals
                </p>
              </div>

              <div className="text-center" data-testid="feature-card-delivery">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Fast Delivery</h3>
                <p className="text-sm text-muted-foreground">
                  Average delivery time: 25-30 minutes
                </p>
              </div>

              <div className="text-center" data-testid="feature-card-quality">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Quality Assured</h3>
                <p className="text-sm text-muted-foreground">
                  Fresh ingredients and hygienic preparation
                </p>
              </div>

              <div className="text-center" data-testid="feature-card-rating">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Top Rated</h3>
                <p className="text-sm text-muted-foreground">
                  4.5+ average rating from 10,000+ reviews
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6" data-testid="text-cta-heading">
              Ready to Order?
            </h2>
            <p className="text-lg text-muted-foreground mb-8" data-testid="text-cta-description">
              Sign in to browse our menu and start ordering delicious food today!
            </p>
            <Button size="lg" onClick={handleLogin} className="text-lg px-8 py-6" data-testid="button-signin-cta">
              Sign In to Order
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p data-testid="text-footer">© 2025 FoodExpress. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
