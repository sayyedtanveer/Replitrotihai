import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search } from "lucide-react";
import heroImage from '@assets/generated_images/Indian_food_spread_hero_01f8cdab.png';

export default function Hero() {
  return (
    <section className="relative h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
        <h2
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4"
          data-testid="text-hero-title"
        >
          Delicious Meals Delivered
          <br />
          to Your Door
        </h2>
        <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl" data-testid="text-hero-subtitle">
          Fresh rotis, complete meals, and restaurant specials in 30 minutes
        </p>

        <div className="w-full max-w-2xl bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white" />
              <Input
                placeholder="Enter delivery location"
                className="pl-10 bg-white/90 border-white/30 text-foreground placeholder:text-muted-foreground"
                data-testid="input-location"
              />
            </div>
            <Button size="lg" variant="default" className="gap-2" data-testid="button-search-food">
              <Search className="h-5 w-5" />
              Search Food
            </Button>
          </div>
        </div>

        <p className="mt-6 text-white/80 text-sm" data-testid="text-delivery-time">
          Average delivery time: 25-30 mins
        </p>
      </div>
    </section>
  );
}
