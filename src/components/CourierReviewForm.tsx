
import React, { useState, useEffect } from 'react';
import { StarRating } from '@/components/ui/star-rating';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useReviews } from '@/hooks/useReviews';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  const { user } = useAuth();
  const { toast } = useToast();
  const { reviews, submitReview } = useReviews({ courierId, userId: user?.id });
  
  // Check if user has already reviewed this courier
  useEffect(() => {
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
    
    try {
      if (!user) {
        throw new Error("You must be logged in to submit a review");
      }
      
      const result = await submitReview({
        user_id: user.id,
        courier_id: courierId,
        rating,
        comment: comment.trim() || undefined
      });
      
      if (result.success) {
        toast({
          title: "Review Submitted",
          description: "Thank you for your feedback!",
        });
        onSubmit({ rating, comment });
      } else {
        throw new Error(result.error || "Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
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
