import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getDeliveryMessage } from "@/lib/locationUtils";
import { apiRequest } from "@/lib/queryClient";
import heroImage from '@assets/generated_images/Indian_food_spread_hero_01f8cdab.png';

export default function Hero() {
  const [location, setLocation] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkLocationOnLoad = () => {
      const savedLat = localStorage.getItem('userLatitude');
      const savedLng = localStorage.getItem('userLongitude');
      
      if (savedLat && savedLng) {
        const lat = parseFloat(savedLat);
        const lng = parseFloat(savedLng);
        const deliveryCheck = getDeliveryMessage(lat, lng);
        setDeliveryAvailable(deliveryCheck.available);
        setLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        
        if (!deliveryCheck.available) {
          toast({
            title: "Coming Soon to Your Area",
            description: deliveryCheck.message,
            variant: "default",
          });
        }
      } else {
        getUserLocationSilently();
      }
    };

    checkLocationOnLoad();
  }, []);

  const getUserLocationSilently = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        localStorage.setItem('userLatitude', latitude.toString());
        localStorage.setItem('userLongitude', longitude.toString());
        setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);

        const deliveryCheck = getDeliveryMessage(latitude, longitude);
        setDeliveryAvailable(deliveryCheck.available);

        if (!deliveryCheck.available) {
          toast({
            title: "Coming Soon to Your Area",
            description: deliveryCheck.message,
          });
        }
      },
      () => {
        // Silent failure - user denied or error
      }
    );
  };

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
        setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);

        const deliveryCheck = getDeliveryMessage(latitude, longitude);
        setDeliveryAvailable(deliveryCheck.available);

        toast({
          title: deliveryCheck.available ? "Location Detected" : "Coming Soon to Your Area",
          description: deliveryCheck.message,
          variant: deliveryCheck.available ? "default" : "default",
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

    // Check if location is coordinates (e.g., "19.0728, 72.8826")
    const coordPattern = /^(-?\d+\.?\d*),?\s*(-?\d+\.?\d*)$/;
    const coordMatch = location.trim().match(coordPattern);
    
    if (coordMatch) {
      // Location is coordinates, parse them directly from input
      try {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        
        if (isNaN(lat) || isNaN(lng)) {
          toast({
            title: "Invalid Coordinates",
            description: "Please enter valid latitude and longitude values.",
            variant: "destructive",
          });
          return;
        }
        
        // Store the coordinates
        localStorage.setItem('userLatitude', lat.toString());
        localStorage.setItem('userLongitude', lng.toString());
        
        const deliveryCheck = getDeliveryMessage(lat, lng);
        
        if (!deliveryCheck.available) {
          toast({
            title: "Coming Soon to Your Area",
            description: deliveryCheck.message,
            variant: "default",
          });
          setDeliveryAvailable(false);
          return;
        }
        
        toast({
          title: "Location Confirmed",
          description: deliveryCheck.message,
        });
        setDeliveryAvailable(true);
      } catch (error) {
        toast({
          title: "Invalid Coordinates",
          description: "Could not parse the coordinates. Please try again.",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Location is text address, check if it contains "kurla"
      if (!locationLower.includes("kurla")) {
        toast({
          title: "Delivery Not Available",
          description: "We currently deliver only in Kurla, Mumbai. Please enter a Kurla location.",
          variant: "destructive",
        });
        setDeliveryAvailable(false);
        return;
      }
      
      toast({
        title: "Location Confirmed",
        description: "Great! We deliver to your area. Browse our menu below.",
      });
      setDeliveryAvailable(true);
    }

    // Scroll to products section
    setTimeout(() => {
      const productsSection = document.getElementById("products-section");
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 500);
  };

  return (
    <section className="relative h-[50vh] sm:h-[60vh] min-h-[350px] sm:min-h-[400px] max-h-[600px] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent" />

      <div className="relative h-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 flex flex-col items-center justify-center text-center">
        <h2
          className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-3 sm:mb-4"
          data-testid="text-hero-title"
        >
          Fresh Rotis Delivered
          <br />
          Ghar Jaisa Swaad
        </h2>
        <p className="text-sm sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl px-4" data-testid="text-hero-subtitle">
          Fresh rotis, homestyle meals, and restaurant specials in 30 minutes
        </p>

        <div className="w-full max-w-2xl bg-white/10 backdrop-blur-md rounded-lg p-3 sm:p-4 border border-white/20">
          <div className="flex flex-col gap-2 sm:gap-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white" />
                <Input
                  placeholder="Enter delivery location (Kurla, Mumbai)"
                  className="pl-9 h-9 sm:h-10 bg-white/90 border-white/30 text-foreground placeholder:text-muted-foreground text-sm"
                  data-testid="input-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchFood()}
                />
              </div>
              <Button 
                size="default"
                variant="default" 
                className="gap-2 h-9 sm:h-10 text-sm" 
                data-testid="button-search-food"
                onClick={handleSearchFood}
              >
                <Search className="h-4 w-4" />
                Search Food
              </Button>
            </div>
            <Button
              size="default"
              variant="outline"
              onClick={getUserLocation}
              disabled={isGettingLocation}
              className="w-full h-9 sm:h-10 text-sm"
              data-testid="button-get-location"
            >
              {isGettingLocation ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Getting Location...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  Use My Location
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="mt-4 sm:mt-6 text-white/80 text-xs sm:text-sm" data-testid="text-delivery-time">
          Average delivery time: 25-30 mins
        </p>
        {deliveryAvailable === false && (
          <div className="mt-3 bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-lg px-4 py-2 max-w-md">
            <p className="text-xs sm:text-sm text-white font-medium">
              Coming soon to your area! Currently serving Kurla West, Mumbai.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}