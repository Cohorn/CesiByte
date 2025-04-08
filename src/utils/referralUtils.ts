
/**
 * Utility functions for handling referral codes
 */

/**
 * Generates a unique referral code for a user based on their ID and name
 */
export const generateReferralCode = (userId: string, userName: string): string => {
  // Take first 4 characters of user ID and first 3 characters of name (or less if shorter)
  const idPart = userId.substring(0, 4);
  const namePart = userName.substring(0, Math.min(3, userName.length)).toUpperCase();
  
  // Add a timestamp to ensure uniqueness
  const timestamp = Date.now().toString().substring(8, 12);
  
  // Combine parts to create a code
  return `${namePart}${idPart}${timestamp}`;
};

/**
 * Validates if a referral code exists
 * In a real implementation, this would check against the database
 */
export const validateReferralCode = async (referralCode: string): Promise<boolean> => {
  // For now, just validate that the code follows our format (at least 10 characters)
  return referralCode?.length >= 10;
};
