
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/ui/star-rating';

interface CourierReviewFormProps {
  courierId: string;
  orderId: string;
  onSubmit: (data: { rating: number; comment: string }) => void;
}

const CourierReviewForm: React.FC<CourierReviewFormProps> = ({
  courierId,
  orderId,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<{ rating: number; comment: string }>({
    defaultValues: {
      rating: 5,
      comment: '',
    },
  });

  const rating = watch('rating');

  const handleRatingChange = (newRating: number) => {
    setValue('rating', newRating);
  };

  const submitHandler = (data: { rating: number; comment: string }) => {
    onSubmit({
      rating: data.rating,
      comment: data.comment || ''
    });
  };

  return (
    <form onSubmit={handleSubmit(submitHandler)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Rating</label>
        <StarRating
          value={rating}
          onChange={handleRatingChange}
          size={24}
        />
        {errors.rating && (
          <p className="text-red-500 text-sm mt-1">{errors.rating.message}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="comment" className="block text-sm font-medium mb-2">
          Comments (optional)
        </label>
        <Textarea
          id="comment"
          placeholder="Share your experience with this courier..."
          {...register('comment')}
          className="w-full"
        />
      </div>
      
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </Button>
    </form>
  );
};

export default CourierReviewForm;
