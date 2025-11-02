const KURLA_LAT = 19.0728;
const KURLA_LON = 72.8826;
const MAX_DELIVERY_DISTANCE_KM = 5;

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.asin(Math.sqrt(a));
  return parseFloat((R * c).toFixed(2));
}

export function isInDeliveryZone(latitude: number, longitude: number): boolean {
  const distance = calculateDistance(KURLA_LAT, KURLA_LON, latitude, longitude);
  return distance <= MAX_DELIVERY_DISTANCE_KM;
}

export function getDeliveryMessage(latitude: number, longitude: number): { available: boolean; message: string; distance: number } {
  const distance = calculateDistance(KURLA_LAT, KURLA_LON, latitude, longitude);
  
  if (distance <= MAX_DELIVERY_DISTANCE_KM) {
    return {
      available: true,
      message: `Great! We deliver to your area (${distance.toFixed(1)}km from our kitchen in Kurla West).`,
      distance
    };
  }
  
  return {
    available: false,
    message: `We're coming soon to your area! Currently, we deliver within ${MAX_DELIVERY_DISTANCE_KM}km of Kurla West, Mumbai. You're ${distance.toFixed(1)}km away.`,
    distance
  };
}
