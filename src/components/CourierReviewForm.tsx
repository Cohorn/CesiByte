
import React, { useState, useEffect } from 'react';
import { StarRating } from '@/components/ui/star-rating';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useReviews } from '@/hooks/useReviews';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { apiClient } from '@/api/client';

interface CourierReviewFormProps {
  courierId: string;
  orderId: string;
  onSubmit: (data: { rating: number; comment: string }) => void;
}

const CourierReviewForm: React.FC<CourierReviewFormProps> = ({
  courierId,
  orderId,
  onSubmit
}) => {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { reviews, submitReview } = useReviews({ 
    courierId, 
    userId: user?.id 
  });
  
  // Check if user has already reviewed this courier
  useEffect(() => {
    console.log("Reviews data for courier:", reviews);
    if (reviews && reviews.length > 0) {
      // User has already reviewed this courier, pre-fill the form
      const existingReview = reviews[0];
      setRating(existingReview.rating);
      if (existingReview.comment) {
        setComment(existingReview.comment);
      }
    }
  }, [reviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      if (!user) {
        throw new Error("You must be logged in to submit a review");
      }
      
      if (!courierId) {
        throw new Error("Courier ID is missing");
      }
      
      console.log("Submitting review for courier:", courierId);
      console.log("Using API client with base URL:", apiClient?.defaults?.baseURL);
      
      const result = await submitReview({
        user_id: user.id,
        courier_id: courierId,
        rating,
        comment: comment.trim() || undefined
      });
      
      console.log("Review submission result:", result);
      
      if (result.success) {
        toast({
          title: "Review Submitted",
          description: "Thank you for your feedback!",
        });
        onSubmit({ rating, comment });
      } else {
        throw new Error(result.error || "Failed to submit review");
      }
    } catch (error: any) {
      console.error("Error submitting review:", error);
      setSubmitError(error.message || "There was an error submitting your review. Please try again.");
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}
      
      <div>
        <label className="block text-sm font-medium mb-1">
          How would you rate your delivery experience?
        </label>
        <StarRating value={rating} onChange={setRating} />
      </div>
      
      <div>
        <label htmlFor="comment" className="block text-sm font-medium mb-1">
          Additional comments (optional)
        </label>
        <Textarea
          id="comment"
          placeholder="Share your experience with this courier..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
        />
      </div>
      
      <Button 
        type="submit" 
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </Button>
    </form>
  );
};

export default CourierReviewForm;
