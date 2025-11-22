/**
 * Shared delivery calculation utilities
 * Used by cart hook, checkout dialog, and order processing
 */

export interface DeliverySetting {
  id: string;
  name: string;
  minDistance: string;
  maxDistance: string;
  price: number;
  isActive: boolean;
}

// Haversine formula to calculate distance between two coordinates in kilometers
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.asin(Math.sqrt(a));
  const distance = R * c;
  
  return parseFloat(distance.toFixed(2));
}

export interface DeliveryCalculation {
  distance: number;
  deliveryFee: number;
  freeDeliveryEligible: boolean;
  amountForFreeDelivery?: number;
  deliveryRangeName?: string;
}

/**
 * Calculate delivery fee based on admin-configured delivery settings
 * All pricing is dynamic and controlled by admin settings
 */
export function calculateDelivery(
  distance: number,
  subtotal: number,
  deliverySettings?: DeliverySetting[]
): Omit<DeliveryCalculation, 'distance'> {
  let deliveryFee: number = 0;
  let freeDeliveryEligible = false;
  let amountForFreeDelivery: number | undefined;
  let deliveryRangeName: string | undefined;

  // Require admin-configured settings
  if (!deliverySettings || deliverySettings.length === 0) {
    // No settings configured - return zero fee with warning message
    console.warn("No delivery settings configured by admin");
    return {
      deliveryFee: 0,
      freeDeliveryEligible: false,
      amountForFreeDelivery: undefined,
      deliveryRangeName: "No delivery settings configured",
    };
  }

  const activeSettings = deliverySettings.filter(s => s.isActive);
  
  if (activeSettings.length === 0) {
    console.warn("No active delivery settings found");
    return {
      deliveryFee: 0,
      freeDeliveryEligible: false,
      amountForFreeDelivery: undefined,
      deliveryRangeName: "No active delivery settings",
    };
  }
  
  // Find matching delivery range based on distance
  console.log(`[Delivery Calc] Distance: ${distance}km, Subtotal: ₹${subtotal}`);
  console.log(`[Delivery Calc] Active settings:`, activeSettings.map(s => 
    `${s.name}: ${s.minDistance}-${s.maxDistance}km = ₹${s.price}`
  ));
  
  const matchingSetting = activeSettings.find(setting => {
    const minDist = parseFloat(setting.minDistance);
    const maxDist = parseFloat(setting.maxDistance);
    const matches = distance >= minDist && distance <= maxDist;
    console.log(`[Delivery Calc] Checking ${setting.name} (${minDist}-${maxDist}km): ${matches ? 'MATCH' : 'no match'}`);
    return matches;
  });
  
  console.log(`[Delivery Calc] Matching setting:`, matchingSetting?.name || 'NONE');

  if (matchingSetting) {
    deliveryFee = matchingSetting.price;
    deliveryRangeName = matchingSetting.name;
    
    // Free delivery logic: if fee is 0 in settings, it's free
    if (deliveryFee === 0) {
      freeDeliveryEligible = true;
    } else {
      // Calculate how much more is needed for free delivery
      // This would need to be configured per range, but for now we don't apply free delivery
      freeDeliveryEligible = false;
    }
  } else {
    // No matching range found - outside delivery zone
    deliveryFee = 0;
    deliveryRangeName = "Outside delivery zone";
  }

  const result = {
    deliveryFee,
    freeDeliveryEligible,
    amountForFreeDelivery,
    deliveryRangeName,
  };
  
  console.log(`[Delivery Calc] Final result:`, result);
  
  return result;
}

/**
 * Calculate full delivery details given user and chef coordinates
 */
export function calculateFullDelivery(
  userLat: number,
  userLon: number,
  chefLat: number,
  chefLon: number,
  subtotal: number,
  deliverySettings?: DeliverySetting[]
): DeliveryCalculation {
  const distance = calculateDistance(userLat, userLon, chefLat, chefLon);
  const delivery = calculateDelivery(distance, subtotal, deliverySettings);
  
  return {
    distance,
    ...delivery,
  };
}

// Restaurant/store default location (you can change this)
export const STORE_LOCATION = {
  latitude: 28.6139, // Example: New Delhi
  longitude: 77.2090,
  address: "Main Store, Connaught Place, New Delhi"
};
