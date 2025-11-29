import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Loader2, Navigation, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getDeliveryMessage } from "@/lib/locationUtils";
import heroImage from '@assets/generated_images/Indian_food_spread_hero_01f8cdab.png';

export default function Hero() {
  const [location, setLocation] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState<boolean | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [hasLocation, setHasLocation] = useState(false); // New state to track if location is set
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
        setHasLocation(true); // Set hasLocation to true if coordinates are found

        if (deliveryCheck.available) {
          setLocation(`Kurla West, Mumbai`);
        } else {
          setLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      }
    };

    checkLocationOnLoad();
  }, [toast]);

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

        const deliveryCheck = getDeliveryMessage(latitude, longitude);
        setDeliveryAvailable(deliveryCheck.available);
        setHasLocation(true); // Ensure hasLocation is true after successful detection

        if (deliveryCheck.available) {
          setLocation(`Kurla West, Mumbai`);
          toast({
            title: "Location Detected",
            description: deliveryCheck.message,
          });
        } else {
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          toast({
            title: "Coming Soon to Your Area",
            description: deliveryCheck.message,
          });
        }

        setIsGettingLocation(false);
        setShowManualInput(false);
      },
      (error) => {
        toast({
          title: "Location error",
          description: "Please enable location access or enter your address manually",
          variant: "destructive",
        });
        setIsGettingLocation(false);
        setShowManualInput(true);
        setHasLocation(false); // Reset hasLocation on error
      }
    );
  };

  const handleSearchFood = async () => {
    if (!location.trim()) {
      toast({
        title: "Enter Location",
        description: "Please enter your delivery address",
        variant: "destructive",
      });
      return;
    }

    const locationLower = location.toLowerCase();
    const isKurlaArea = 
      locationLower.includes('kurla') || 
      locationLower.includes('chunabhatti') ||
      locationLower.includes('sion') ||
      locationLower.includes('bkc');

    if (!isKurlaArea) {
      toast({
        title: "Outside Delivery Zone",
        description: "We currently deliver only in Kurla West, Mumbai area. Please enter a Kurla address.",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem('userAddress', location);
    setHasLocation(true); // Set hasLocation to true on successful manual entry

    toast({
      title: "Location Confirmed",
      description: `Delivering to ${location}. Detecting precise location...`,
    });

    // Auto-detect precise location after manual search
    setTimeout(async () => {
      await getUserLocation(); // This will update location state if detection is successful
      scrollToProducts();
    }, 500);
  };


  const scrollToProducts = () => {
    setTimeout(() => {
      const productsSection = document.getElementById("products-section");
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 300);
  };

  const handleChangeLocation = () => {
    setLocation("");
    localStorage.removeItem('userLatitude');
    localStorage.removeItem('userLongitude');
    localStorage.removeItem('userAddress'); // Clear userAddress as well
    setDeliveryAvailable(null);
    setShowManualInput(true);
    setHasLocation(false); // Reset hasLocation when changing location
  };

  return (
    <section className="relative h-[50vh] sm:h-[60vh] min-h-[350px] sm:min-h-[400px] max-h-[600px] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />

      <div className="relative h-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 flex flex-col items-center justify-center text-center">
        <h2
          className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 drop-shadow-lg"
          data-testid="text-hero-title"
        >
          Fresh Rotis Delivered
          <br />
          <span className="text-primary-foreground/90">Ghar Jaisa Swaad</span>
        </h2>
        <p className="text-sm sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl px-4 drop-shadow" data-testid="text-hero-subtitle">
          Fresh rotis, homestyle meals, and restaurant specials in 30 minutes
        </p>

        <div className="w-full max-w-xl">
          {location && hasLocation && !showManualInput ? (
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-foreground truncate">{location}</p>
                    <p className="text-xs text-muted-foreground">
                      {deliveryAvailable ? "Delivery available" : "Coming soon to your area"}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-primary hover:text-primary hover:bg-primary/10 flex-shrink-0"
                    onClick={handleChangeLocation}
                    data-testid="button-change-location"
                  >
                    Change
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
              {deliveryAvailable && (
                <div className="border-t px-4 py-3 bg-primary/5">
                  <Button 
                    className="w-full gap-2"
                    onClick={scrollToProducts}
                    data-testid="button-browse-menu"
                  >
                    <Search className="h-4 w-4" />
                    Browse Menu
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
              <div className="p-4 sm:p-5">
                <div className="flex flex-col gap-3">
                  <div className="text-center pb-2">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      Enable location access
                    </p>
                    <p className="text-xs text-muted-foreground">
                      We'll detect your location automatically for faster delivery
                    </p>
                  </div>

                  <Button
                    size="lg"
                    variant="default"
                    onClick={getUserLocation}
                    disabled={isGettingLocation}
                    className="w-full gap-2"
                    data-testid="button-get-location"
                  >
                    {isGettingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Detecting Location...
                      </>
                    ) : (
                      <>
                        <Navigation className="h-4 w-4" />
                        Detect My Location
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="border-t">
                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center px-4">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-muted-foreground">Or enter manually</span>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Enter Kurla address (e.g., Kurla West)"
                        className="pl-10 h-11"
                        data-testid="input-location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchFood()}
                      />
                    </div>
                    <Button 
                      size="default"
                      variant="default" 
                      className="gap-2 h-11 px-5" 
                      data-testid="button-search-food"
                      onClick={handleSearchFood}
                    >
                      <Search className="h-4 w-4" />
                      <span className="hidden sm:inline">Search</span>
                    </Button>
                  </div>
                  {hasLocation && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={getUserLocation}
                      disabled={isGettingLocation}
                      className="w-full gap-2 mt-3"
                    >
                      {isGettingLocation ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Detecting...
                        </>
                      ) : (
                        <>
                          <Navigation className="h-3 w-3" />
                          Detect Precise Location
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {deliveryAvailable === false && (
          <div className="mt-4 bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 rounded-lg px-4 py-2 max-w-md">
            <p className="text-xs sm:text-sm text-white font-medium">
              Coming soon to your area! Currently serving Kurla West, Mumbai.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}