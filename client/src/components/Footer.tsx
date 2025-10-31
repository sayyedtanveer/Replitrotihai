import { Facebook, Instagram, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Footer() {
  return (
    <footer className="bg-card border-t mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold text-primary mb-4" data-testid="text-footer-logo">
              RotiHai
            </h3>
            <p className="text-sm text-muted-foreground mb-4" data-testid="text-footer-description">
              Delicious meals delivered to your doorstep in 30 minutes or less.
            </p>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" data-testid="button-facebook">
                <Facebook className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" data-testid="button-instagram">
                <Instagram className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" data-testid="button-twitter">
                <Twitter className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4" data-testid="text-categories-title">Categories</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors" data-testid="link-rotis">Rotis & Breads</a></li>
              <li><a href="#" className="hover:text-primary transition-colors" data-testid="link-meals">Lunch & Dinner</a></li>
              <li><a href="#" className="hover:text-primary transition-colors" data-testid="link-hotels">Hotel Specials</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4" data-testid="text-support-title">Customer Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors" data-testid="link-help">Help Center</a></li>
              <li><a href="#" className="hover:text-primary transition-colors" data-testid="link-track">Track Order</a></li>
              <li><a href="#" className="hover:text-primary transition-colors" data-testid="link-contact">Contact Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors" data-testid="link-faq">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4" data-testid="text-newsletter-title">Stay Updated</h4>
            <p className="text-sm text-muted-foreground mb-3" data-testid="text-newsletter-description">
              Get special offers and updates
            </p>
            <div className="flex gap-2">
              <Input placeholder="Your email" type="email" data-testid="input-newsletter" />
              <Button data-testid="button-subscribe">Subscribe</Button>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p data-testid="text-copyright">
            © 2025 RotiHai. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
