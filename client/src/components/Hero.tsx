import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import heroImage from '@assets/generated_images/Indian_food_spread_hero_01f8cdab.png';

export default function Hero() {
  const [location, setLocation] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { toast } = useToast();

  const getUserLocation = () => {
    setIsGettingLocation(true);

    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation",
        variant: "destructive",
      });
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        localStorage.setItem('userLatitude', latitude.toString());
        localStorage.setItem('userLongitude', longitude.toString());

        // Reverse geocoding to get address (you can use a service like Google Maps API)
        setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);

        toast({
          title: "Location detected",
          description: "Your delivery location has been set",
        });

        setIsGettingLocation(false);
      },
      (error) => {
        toast({
          title: "Location error",
          description: "Please enable location access or enter your address manually",
          variant: "destructive",
        });
        setIsGettingLocation(false);
      }
    );
  };

  const handleSearchFood = () => {
    const locationLower = location.toLowerCase().trim();

    if (!locationLower) {
      toast({
        title: "Location Required",
        description: "Please enter your delivery location",
        variant: "destructive",
      });
      return;
    }

    // Check if location contains "kurla" or "mumbai"
    if (!locationLower.includes("kurla")) {
      toast({
        title: "Delivery Not Available",
        description: "We currently deliver only in Kurla, Mumbai. Please enter a Kurla location.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Location Confirmed",
      description: "Great! We deliver to your area. Browse our menu below.",
    });

    // Scroll to products section
    setTimeout(() => {
      const productsSection = document.getElementById("products-section");
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 500);
  };

  return (
    <section className="relative h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent" />

      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center text-center">
        <h2
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4"
          data-testid="text-hero-title"
        >
          Fresh Rotis Delivered
          <br />
          Ghar Jaisa Swaad
        </h2>
        <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl" data-testid="text-hero-subtitle">
          Fresh rotis, homestyle meals, and restaurant specials in 30 minutes
        </p>

        <div className="w-full max-w-2xl bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white" />
              <Input
                placeholder="Enter delivery location (Kurla, Mumbai)"
                className="pl-10 bg-white/90 border-white/30 text-foreground placeholder:text-muted-foreground"
                data-testid="input-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchFood()}
              />
            </div>
            <Button 
              size="lg" 
              variant="default" 
              className="gap-2" 
              data-testid="button-search-food"
              onClick={handleSearchFood}
            >
              <Search className="h-5 w-5" />
              Search Food
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={getUserLocation}
              disabled={isGettingLocation}
              data-testid="button-get-location"
            >
              {isGettingLocation ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <MapPin className="h-5 w-5" />
              )}
              Use My Location
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