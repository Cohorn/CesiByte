
import { authApi } from '@/api/services/authService';
import { UserType, EmployeeRoleType } from '@/lib/database.types';
import { notificationService } from '@/services/notificationService';

// Add this function that was missing and causing error in AuthContext.tsx
export const isValidUserType = (userType: string): boolean => {
  const validUserTypes = ['customer', 'restaurant', 'courier', 'employee'];
  return validUserTypes.includes(userType);
};

interface RegisterUserParams {
  name: string;
  email: string;
  password: string;
  address: string;
  lat: number;
  lng: number;
  userType: UserType;
  employeeRole?: EmployeeRoleType;
  referralCode?: string;
}

export const registerUserWithReferral = async (params: RegisterUserParams): Promise<{ 
  success: boolean; 
  error?: string;
}> => {
  try {
    // Register the user with the API
    const registerParams: any = {
      email: params.email,
      password: params.password,
      name: params.name,
      address: params.address,
      lat: params.lat,
      lng: params.lng,
      user_type: params.userType,
      referral_code: params.referralCode
    };

    // Add employee role if user type is employee
    if (params.userType === 'employee' && params.employeeRole) {
      registerParams.employee_role = params.employeeRole;
      console.log("Setting employee role:", params.employeeRole);
    }

    console.log("Registering user with params:", registerParams);
    
    try {
      const response = await authApi.register(registerParams);
      console.log("Registration response:", response);
      const success = response.success || !!response.token;
      const error = response.error;

      // If registration was successful and a referral code was provided
      if (success && params.referralCode) {
        try {
          // Create a notification for the user who made the referral
          if (notificationService && notificationService.addNotification) {
            const notification = {
              id: crypto.randomUUID(),
              user_id: params.referralCode, // Using the referral code as the user ID for now
              title: 'New Referral',
              message: `User ${params.email} has signed up using your referral code!`,
              type: 'referral' as 'referral' | 'order' | 'system', // Explicitly type this to match Notification type
              created_at: new Date().toISOString(),
              is_read: false
            };
            notificationService.addNotification(notification);
          } else {
            console.error("Notification service does not have addNotification method");
          }
        } catch (notificationError) {
          console.error("Error creating referral notification:", notificationError);
          // Continue anyway, as the registration was successful
        }
      }

      return { success, error };
    } catch (apiError: any) {
      console.error("API registration error:", apiError);
      
      // If error is from API but the registration might have succeeded
      return { 
        success: false, 
        error: apiError.message || "Registration failed. Please try again."
      };
    }
  } catch (error: any) {
    console.error("Error in user registration:", error);
    return { 
      success: false, 
      error: error.message || "Registration failed. Please try again."
    };
  }
};
