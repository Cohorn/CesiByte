
import { calculateDistance } from '@/lib/distanceUtils';

/**
 * Constants for time calculation
 */
const PREPARATION_TIME_MINUTES = 25; // 25 minutes for food preparation
const COURIER_SPEED_KM_PER_HOUR = 20; // 20 km/h average speed

/**
 * Calculate estimated delivery time based on restaurant and customer locations
 * @param restaurantLat Restaurant latitude
 * @param restaurantLng Restaurant longitude
 * @param customerLat Customer latitude
 * @param customerLng Customer longitude
 * @returns Estimated delivery time in ISO string format
 */
export const calculateEstimatedDeliveryTime = (
  restaurantLat: number,
  restaurantLng: number,
  customerLat: number,
  customerLng: number
): string => {
  // Calculate distance between restaurant and customer in kilometers
  const distanceKm = calculateDistance(
    restaurantLat,
    restaurantLng,
    customerLat,
    customerLng
  );
  
  // Calculate travel time in minutes (distance / speed * 60)
  const travelTimeMinutes = (distanceKm / COURIER_SPEED_KM_PER_HOUR) * 60;
  
  // Total estimated time = preparation time + travel time
  const totalEstimatedMinutes = PREPARATION_TIME_MINUTES + travelTimeMinutes;
  
  // Create a date object for the estimated delivery time
  const now = new Date();
  const estimatedDeliveryTime = new Date(now.getTime() + totalEstimatedMinutes * 60000);
  
  return estimatedDeliveryTime.toISOString();
};

/**
 * Get total estimated time in minutes
 * @param restaurantLat Restaurant latitude
 * @param restaurantLng Restaurant longitude
 * @param customerLat Customer latitude
 * @param customerLng Customer longitude
 * @returns Estimated time in minutes (preparation + travel)
 */
export const getEstimatedTimeInMinutes = (
  restaurantLat: number,
  restaurantLng: number,
  customerLat: number,
  customerLng: number
): number => {
  // Calculate distance between restaurant and customer in kilometers
  const distanceKm = calculateDistance(
    restaurantLat,
    restaurantLng,
    customerLat,
    customerLng
  );
  
  // Calculate travel time in minutes (distance / speed * 60)
  const travelTimeMinutes = (distanceKm / COURIER_SPEED_KM_PER_HOUR) * 60;
  
  // Total estimated time = preparation time + travel time
  return Math.round(PREPARATION_TIME_MINUTES + travelTimeMinutes);
};

/**
 * Format estimated delivery time in a user-friendly way
 * @param estimatedTimeIso ISO string of estimated delivery time
 * @returns Formatted time string (e.g., "Today at 2:30 PM" or date format)
 */
export const formatEstimatedDeliveryTime = (estimatedTimeIso: string | undefined): string => {
  if (!estimatedTimeIso) return "Delivery time unavailable";
  
  const estimatedTime = new Date(estimatedTimeIso);
  const now = new Date();
  
  // Check if it's today
  const isToday = now.toDateString() === estimatedTime.toDateString();
  
  if (isToday) {
    return `Today at ${estimatedTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  } else {
    return estimatedTime.toLocaleString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric', 
      minute: '2-digit'
    });
  }
};

/**
 * Calculate and format the remaining minutes until delivery
 * @param estimatedTimeIso ISO string of estimated delivery time
 * @returns Formatted remaining time string (e.g., "25 minutes remaining")
 */
export const getRemainingDeliveryTime = (estimatedTimeIso: string | undefined): string => {
  if (!estimatedTimeIso) return "Estimated time unavailable";
  
  const estimatedTime = new Date(estimatedTimeIso).getTime();
  const now = new Date().getTime();
  
  // Calculate remaining minutes
  const remainingMinutes = Math.max(0, Math.round((estimatedTime - now) / 60000));
  
  if (remainingMinutes <= 0) {
    return "Delivery imminent";
  } else if (remainingMinutes === 1) {
    return "1 minute remaining";
  } else if (remainingMinutes < 60) {
    return `${remainingMinutes} minutes remaining`;
  } else {
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;
    
    if (mins === 0) {
      return hours === 1 ? "1 hour remaining" : `${hours} hours remaining`;
    } else {
      return `${hours}h ${mins}m remaining`;
    }
  }
};
