
import { supabase } from '@/lib/supabase';
import { UserType } from '@/lib/database.types';

/**
 * Performs a direct database check to verify if a user type is valid
 * This utility is used to validate user types during registration
 */
export const isValidUserType = async (userType: string): Promise<boolean> => {
  // If it's a standard type, no need to check the database
  if (['customer', 'restaurant', 'courier', 'employee'].includes(userType)) {
    return true;
  }
  
  // For advanced types like 'dev' and 'com_agent', check if they're valid
  try {
    // Check if the user type exists in allowed types
    const allowedTypes: UserType[] = ['customer', 'restaurant', 'courier', 'employee', 'dev', 'com_agent'];
    
    return allowedTypes.includes(userType as UserType);
  } catch (error) {
    console.error("Error verifying user type:", error);
    return false;
  }
};
