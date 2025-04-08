
import { useState, useEffect } from 'react';
import { reviewApi } from '@/api/services/reviewService';
import { Review } from '@/lib/database.types';
import { useAuth } from '@/lib/AuthContext';

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

interface ReviewFilters {
  restaurantId?: string;
  courierId?: string;
  userId?: string;
}

export const useReviews = (filters: ReviewFilters = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<{average: number, count: number}>({ average: 0, count: 0 });
  const { user } = useAuth();
  
  // Fetch reviews based on filters
  useEffect(() => {
    const fetchReviews = async () => {
      if (!filters.restaurantId && !filters.courierId && !filters.userId) {
        return;
      }
      
      setIsLoading(true);
      try {
        const fetchedReviews = await reviewApi.getReviewsByFilters({
          restaurantId: filters.restaurantId,
          courierId: filters.courierId,
          userId: filters.userId
        });
        
        setReviews(fetchedReviews || []);
        
        // Also fetch average rating
        if (filters.restaurantId || filters.courierId) {
          const avgRating = await reviewApi.getAverageRating({
            restaurantId: filters.restaurantId,
            courierId: filters.courierId
          });
          
          setAverageRating(avgRating);
        }
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching reviews:', err);
        setError(err.message || 'Failed to fetch reviews');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReviews();
  }, [filters.restaurantId, filters.courierId, filters.userId]);
  
  const submitReview = async (reviewData: ReviewInput): Promise<SubmitReviewResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Submitting review in useReviews hook:', reviewData);
      
      // Validate required fields
      if (!reviewData.user_id) {
        throw new Error("User ID is required");
      }
      
      if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
        throw new Error("Valid rating (1-5) is required");
      }
      
      if (!reviewData.restaurant_id && !reviewData.courier_id) {
        throw new Error("Either restaurant ID or courier ID is required");
      }
      
      // Check if user has already reviewed this restaurant/courier
      try {
        const alreadyExists = await reviewApi.checkExistingReview(
          reviewData.user_id,
          reviewData.restaurant_id,
          reviewData.courier_id
        );
        
        console.log('Check for existing review:', alreadyExists);
        
        let result;
        
        if (alreadyExists.exists && alreadyExists.existingId) {
          console.log('Updating existing review with ID:', alreadyExists.existingId);
          
          // Update existing review
          result = await reviewApi.updateReview(alreadyExists.existingId, {
            rating: reviewData.rating,
            comment: reviewData.comment
          });
        } else {
          // Create new review
          console.log('Creating new review');
          result = await reviewApi.createReview(reviewData);
        }
        
        console.log('Review submission result:', result);
        
        // Refresh the review list if we're viewing a specific entity's reviews
        if ((reviewData.restaurant_id && reviewData.restaurant_id === filters.restaurantId) ||
            (reviewData.courier_id && reviewData.courier_id === filters.courierId)) {
          const updatedReviews = [...reviews];
          const existingIndex = updatedReviews.findIndex(r => 
            r.user_id === reviewData.user_id && 
            ((reviewData.restaurant_id && r.restaurant_id === reviewData.restaurant_id) ||
             (reviewData.courier_id && r.courier_id === reviewData.courier_id))
          );
          
          if (existingIndex >= 0) {
            updatedReviews[existingIndex] = result;
          } else {
            updatedReviews.push(result);
          }
          
          setReviews(updatedReviews);
        }
        
        setIsLoading(false);
        return {
          success: true,
          data: result
        };
      } catch (requestError: any) {
        console.error('Error in submitReview API call:', requestError);
        throw new Error(requestError.message || 'Failed to communicate with review service');
      }
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
  
  const deleteReview = async (reviewId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await reviewApi.deleteReview(reviewId);
      
      // Update local state
      setReviews(reviews.filter(review => review.id !== reviewId));
      
      setIsLoading(false);
      return true;
    } catch (err: any) {
      console.error('Error deleting review:', err);
      setError(err.message || 'Failed to delete review');
      setIsLoading(false);
      return false;
    }
  };
  
  return {
    isLoading,
    error,
    reviews,
    averageRating,
    submitReview,
    deleteReview
  };
};
