
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const fetchInProgressRef = useRef(false);
  const retryTimeoutRef = useRef<number | null>(null);

  // Clear retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  const fetchReviews = useCallback(async (force = false) => {
    // Skip fetching if a request is already in progress
    if (fetchInProgressRef.current) {
      console.log('Skipping review fetch - request already in progress');
      return;
    }

    // Skip fetching if we've already fetched within the last 30 seconds and not forcing refresh
    const now = Date.now();
    if (!force && lastFetched && (now - lastFetched) < 30000) {
      console.log('Skipping review fetch - data is fresh');
      return;
    }

    setIsLoading(true);
    setError(null);
    fetchInProgressRef.current = true;
    
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
    } catch (err: any) {
      setError(err as Error);
      console.error("Error fetching reviews:", err);
      
      // Only show toast for non-rate-limit errors to prevent toast spam
      if (!err.isRateLimited) {
        toast({
          title: "Error",
          description: "Failed to load reviews",
          variant: "destructive",
        });
      }
      
      // For rate limit errors, set up a retry with exponential backoff
      if (err.isRateLimited && !retryTimeoutRef.current) {
        const retryDelay = 10000; // 10 seconds
        console.log(`Rate limited, will retry in ${retryDelay / 1000} seconds`);
        retryTimeoutRef.current = window.setTimeout(() => {
          retryTimeoutRef.current = null;
          fetchReviews(true);
        }, retryDelay) as unknown as number;
      }
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [filters, toast]);

  useEffect(() => {
    // Clear any existing retry timeout when filters change
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
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
