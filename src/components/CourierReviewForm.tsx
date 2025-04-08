
import React, { useState } from 'react';
import { StarRating } from '@/components/ui/star-rating';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      onSubmit({
        rating,
        comment
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
