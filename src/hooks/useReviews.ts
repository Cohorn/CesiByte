
import { useState, useEffect } from 'react';
import { reviewApi } from '@/api/services/reviewService';
import { Review, SimpleUser } from '@/lib/database.types';
import { useAuth } from '@/lib/AuthContext';
import { useReviews as frontendUseReviews } from '@/frontend/hooks/useReviews';

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
  // Use the existing frontend hook
  const hookResult = frontendUseReviews(filters);
  
  // Add reviewers information
  const [reviewers, setReviewers] = useState<SimpleUser[]>([]);
  
  // Fetch reviewers when reviews change
  useEffect(() => {
    const fetchReviewers = async () => {
      if (!hookResult.reviews || hookResult.reviews.length === 0) return;
      
      // Get unique user IDs from reviews
      const userIds = [...new Set(hookResult.reviews.map(review => review.user_id))];
      
      try {
        // Fetch user information for all reviewers
        const users = await Promise.all(
          userIds.map(async (userId) => {
            try {
              const userData = await fetch(`/api/users/${userId}`).then(res => res.json());
              return {
                id: userId,
                name: userData.name || userData.email || 'Anonymous User',
                avatar_url: userData.avatar_url
              };
            } catch (error) {
              console.error(`Failed to fetch reviewer info for ${userId}:`, error);
              return { id: userId, name: 'Anonymous User' };
            }
          })
        );
        
        setReviewers(users);
      } catch (error) {
        console.error('Error fetching reviewers:', error);
        // Create default entries for all reviewers
        setReviewers(userIds.map(id => ({ id, name: 'Anonymous User' })));
      }
    };
    
    fetchReviewers();
  }, [hookResult.reviews]);
  
  // Return all the data including reviewers
  return {
    ...hookResult,
    reviewers
  };
};
