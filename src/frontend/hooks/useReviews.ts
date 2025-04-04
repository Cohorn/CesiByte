
import { useState, useEffect, useCallback } from 'react';
import { reviewApi, ReviewFilters } from '@/api/services/reviewService';
import { Review } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

export function useReviews(filters: ReviewFilters = {}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchReviews = useCallback(async (force = false) => {
    // Skip fetching if we've already fetched within the last 5 minutes and not forcing refresh
    const now = Date.now();
    if (!force && lastFetched && (now - lastFetched) < 300000) {
      console.log('Skipping review fetch - data is fresh');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const data = await reviewApi.getReviewsByFilters(filters);
      
      setReviews(data || []);
      setLastFetched(now);
      
      // Calculate average rating if we have reviews
      if (data && data.length > 0) {
        const sum = data.reduce((acc, review) => acc + review.rating, 0);
        setAverageRating(sum / data.length);
      } else {
        setAverageRating(null);
      }
    } catch (err) {
      setError(err as Error);
      console.error("Error fetching reviews:", err);
      toast({
        title: "Error",
        description: "Failed to load reviews",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const submitReview = async (reviewData: Omit<Review, 'id' | 'created_at'>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if user has already reviewed this restaurant/courier
      const { exists, existingId } = await reviewApi.checkExistingReview(
        reviewData.user_id,
        reviewData.restaurant_id,
        reviewData.courier_id
      );
      
      if (exists && existingId) {
        // Update existing review
        await reviewApi.updateReview(
          existingId,
          {
            rating: reviewData.rating,
            comment: reviewData.comment
          }
        );
        
        toast({
          title: "Success",
          description: "Your review has been updated",
        });
      } else {
        // Create new review
        await reviewApi.createReview(reviewData);
        
        toast({
          title: "Success",
          description: "Your review has been submitted",
        });
      }
      
      // Refresh reviews
      fetchReviews(true);
      return { success: true };
    } catch (err) {
      setError(err as Error);
      console.error("Error submitting review:", err);
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive",
      });
      return { success: false, error: err };
    } finally {
      setIsLoading(false);
    }
  };

  const deleteReview = async (reviewId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await reviewApi.deleteReview(reviewId);
      
      toast({
        title: "Success",
        description: "Your review has been deleted",
      });
      
      // Refresh reviews
      fetchReviews(true);
      return { success: true };
    } catch (err) {
      setError(err as Error);
      console.error("Error deleting review:", err);
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive",
      });
      return { success: false, error: err };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    reviews,
    averageRating,
    isLoading,
    error,
    refetch: (force = false) => fetchReviews(force),
    submitReview,
    deleteReview,
  };
}
