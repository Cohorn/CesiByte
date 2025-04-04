
import React from 'react';
import { Review, SimpleUser } from '@/lib/database.types';
import { Star } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

interface ReviewListProps {
  reviews: Review[];
  onDelete?: (reviewId: string) => void;
  reviewers?: SimpleUser[];
  showControls?: boolean;
}

const ReviewList: React.FC<ReviewListProps> = ({ 
  reviews, 
  onDelete, 
  reviewers = [],
  showControls = false
}) => {
  const { user } = useAuth();

  const getReviewerName = (userId: string) => {
    const reviewer = reviewers.find(r => r.id === userId);
    return reviewer ? reviewer.name : 'Anonymous';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const renderStars = (rating: number) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star 
          key={i} 
          className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
        />
      ));
  };

  if (reviews.length === 0) {
    return <p className="text-gray-500">No reviews yet</p>;
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="border p-4 rounded">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-bold">{getReviewerName(review.user_id)}</span>
              <span className="text-gray-500 text-sm ml-2">{formatDate(review.created_at)}</span>
            </div>
            <div className="flex">
              {renderStars(review.rating)}
            </div>
          </div>
          
          {review.comment && (
            <p className="text-gray-700">{review.comment}</p>
          )}
          
          {showControls && user && user.id === review.user_id && onDelete && (
            <div className="mt-2 flex justify-end">
              <button 
                onClick={() => onDelete(review.id)}
                className="text-red-500 text-sm"
              >
                Delete Review
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ReviewList;
