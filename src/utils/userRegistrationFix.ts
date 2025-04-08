
import { authApi } from '@/api/services/authService';
import { UserType } from '@/lib/database.types';
import { notificationService } from '@/services/notificationService';

interface RegisterUserParams {
  name: string;
  email: string;
  password: string;
  address: string;
  lat: number;
  lng: number;
  userType: UserType;
  referralCode?: string;
}

export const registerUserWithReferral = async (params: RegisterUserParams): Promise<{ 
  success: boolean; 
  error?: string;
}> => {
  try {
    // Register the user with the API
    const { success, error } = await authApi.register({
      email: params.email,
      password: params.password,
      name: params.name,
      address: params.address,
      lat: params.lat,
      lng: params.lng,
      user_type: params.userType,
      referral_code: params.referralCode
    });

    // If registration was successful and a referral code was provided
    if (success && params.referralCode) {
      try {
        // Create a notification for the user who made the referral
        await notificationService.createReferralNotification(params.referralCode, params.email);
      } catch (notificationError) {
        console.error("Error creating referral notification:", notificationError);
        // Continue anyway, as the registration was successful
      }
    }

    return { success, error };
  } catch (error: any) {
    console.error("Error in user registration:", error);
    return { 
      success: false, 
      error: error.message || "Failed to register user" 
    };
  }
};
