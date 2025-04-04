
import React from 'react';
import { Review, SimpleUser } from '@/lib/database.types';
import { formatDistanceToNow } from 'date-fns';
import { Star } from 'lucide-react';

interface RestaurantReviewsListProps {
  reviews: Review[];
  reviewers: SimpleUser[];
}

const RestaurantReviewsList: React.FC<RestaurantReviewsListProps> = ({
  reviews,
  reviewers,
}) => {
  // Calculate average rating
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  // Get reviewer name by ID
  const getReviewerName = (userId: string) => {
    const reviewer = reviewers.find(r => r.id === userId);
    return reviewer ? reviewer.name : 'Anonymous User';
  };

  return (
    <div className="space-y-6">
      {reviews.length > 0 ? (
        <>
          <div className="flex items-center mb-4">
            <div className="mr-2 font-bold text-lg">{averageRating.toFixed(1)}</div>
            <div className="flex">
              {[1, 2, 3, 4, 5].map(star => (
                <Star 
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(averageRating) 
                      ? 'text-yellow-400 fill-yellow-400' 
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="ml-2 text-sm text-gray-600">
              ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
            </span>
          </div>

          {reviews.map(review => (
            <div key={review.id} className="border-b pb-4 last:border-0">
              <div className="flex items-center mb-2">
                <div className="font-semibold">{getReviewerName(review.user_id)}</div>
                <div className="ml-2 flex">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                      key={star}
                      className={`w-4 h-4 ${
                        star <= review.rating 
                          ? 'text-yellow-400 fill-yellow-400' 
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <div className="ml-auto text-xs text-gray-500">
                  {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                </div>
              </div>
              {review.comment && <p className="text-gray-700">{review.comment}</p>}
            </div>
          ))}
        </>
      ) : (
        <p className="text-gray-500">No reviews yet</p>
      )}
    </div>
  );
};

export default RestaurantReviewsList;
