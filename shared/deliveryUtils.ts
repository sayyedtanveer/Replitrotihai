
// Haversine formula to calculate distance between two coordinates in kilometers
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
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

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Calculate delivery fee based on distance
export function calculateDeliveryFee(distanceKm: number): number {
  // Base delivery fee
  const baseFee = 20;
  
  // Free delivery for orders within 2km
  if (distanceKm <= 2) {
    return baseFee;
  }
  
  // ₹10 per km after 2km
  const additionalFee = Math.ceil(distanceKm - 2) * 10;
  
  return baseFee + additionalFee;
}

// Restaurant/store default location (you can change this)
export const STORE_LOCATION = {
  latitude: 28.6139, // Example: New Delhi
  longitude: 77.2090,
  address: "Main Store, Connaught Place, New Delhi"
};
