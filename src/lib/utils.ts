
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { OrderStatus } from "@/lib/database.types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

// Format order status to be more human-readable
export function orderStatus(status: string): string {
  // Replace underscores with spaces and capitalize
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Get color for order status badge
export function orderStatusColor(status: OrderStatus): string {
  switch (status) {
    case 'created':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    case 'accepted_by_restaurant':
      return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
    case 'preparing':
      return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
    case 'ready_for_pickup':
      return 'bg-teal-100 text-teal-800 hover:bg-teal-200';
    case 'picked_up':
      return 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200';
    case 'on_the_way':
      return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
    case 'delivered':
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    case 'completed':
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  }
}
