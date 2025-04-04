
import React from 'react';
import { Review } from '@/lib/database.types';
import { Star } from 'lucide-react';

interface ReviewStatsProps {
  reviews: Review[];
}

const ReviewStats: React.FC<ReviewStatsProps> = ({ reviews }) => {
  if (reviews.length === 0) {
    return null;
  }

  // Calculate average rating
  const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
  
  // Calculate rating distribution
  const distribution = Array(5).fill(0);
  reviews.forEach(review => {
    distribution[review.rating - 1]++;
  });

  // Convert to percentages
  const percentages = distribution.map(count => (count / reviews.length) * 100);

  return (
    <div className="mb-6">
      <div className="flex items-center mb-2">
        <div className="mr-2 text-2xl font-bold">
          {averageRating.toFixed(1)}
        </div>
        <div className="flex">
          {Array(5).fill(0).map((_, i) => (
            <Star 
              key={i} 
              className={`h-5 w-5 ${i < Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
            />
          ))}
        </div>
        <span className="ml-2 text-gray-500">({reviews.length} reviews)</span>
      </div>

      <div className="space-y-1">
        {[5, 4, 3, 2, 1].map(rating => (
          <div key={rating} className="flex items-center">
            <span className="w-2">{rating}</span>
            <Star className="h-4 w-4 ml-1 fill-yellow-400 text-yellow-400" />
            <div className="w-full bg-gray-200 rounded-full h-2 ml-2">
              <div 
                className="bg-yellow-400 h-2 rounded-full" 
                style={{ width: `${percentages[rating - 1]}%` }}
              />
            </div>
            <span className="ml-2 text-xs text-gray-500">
              {distribution[rating - 1]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewStats;
