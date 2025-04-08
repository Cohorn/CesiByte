
import { useState } from 'react';
import { reviewApi } from '@/api/services/reviewService';
import { Review } from '@/lib/database.types';

interface ReviewInput {
  user_id: string;
  restaurant_id?: string;
  courier_id?: string;
  rating: number;
  comment?: string;
}

interface SubmitReviewResult {
  success: boolean;
  data?: Review;
  error?: string;
}

export const useReviews = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const submitReview = async (reviewData: ReviewInput): Promise<SubmitReviewResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Submitting review:', reviewData);
      
      // Check if user has already reviewed this restaurant/courier
      const alreadyExists = await reviewApi.checkExistingReview(
        reviewData.user_id,
        reviewData.restaurant_id,
        reviewData.courier_id
      );
      
      let result;
      
      if (alreadyExists.exists) {
        console.log('Updating existing review:', alreadyExists.existingId);
        
        // Update existing review
        result = await reviewApi.updateReview(alreadyExists.existingId, {
          rating: reviewData.rating,
          comment: reviewData.comment
        });
      } else {
        // Create new review
        result = await reviewApi.createReview(reviewData);
      }
      
      setIsLoading(false);
      return {
        success: true,
        data: result
      };
    } catch (err: any) {
      console.error('Error submitting review:', err);
      setError(err.message || 'Failed to submit review');
      setIsLoading(false);
      
      return {
        success: false,
        error: err.message || 'Failed to submit review'
      };
    }
  };
  
  return {
    isLoading,
    error,
    submitReview
  };
};
