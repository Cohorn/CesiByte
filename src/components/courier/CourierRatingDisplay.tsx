
import React, { memo } from 'react';
import { Star } from 'lucide-react';

interface CourierRatingDisplayProps {
  rating: number | null;
}

// Using memo to prevent unnecessary re-renders
const CourierRatingDisplay: React.FC<CourierRatingDisplayProps> = memo(({ rating }) => {
  if (rating === null) return null;
  
  // Format to 1 decimal place to prevent tiny changes from causing re-renders
  const formattedRating = rating.toFixed(1);
  
  return (
    <div className="flex items-center bg-white p-2 rounded shadow">
      <span className="font-semibold mr-1">Your rating:</span>
      <span className="font-bold mr-1">{formattedRating}</span>
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
    </div>
  );
});

CourierRatingDisplay.displayName = 'CourierRatingDisplay';

export default CourierRatingDisplay;
