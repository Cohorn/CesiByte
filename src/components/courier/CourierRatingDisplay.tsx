
import React from 'react';
import { Star } from 'lucide-react';

interface CourierRatingDisplayProps {
  rating: number | null;
}

const CourierRatingDisplay: React.FC<CourierRatingDisplayProps> = ({ rating }) => {
  if (rating === null) return null;
  
  return (
    <div className="flex items-center bg-white p-2 rounded shadow">
      <span className="font-semibold mr-1">Your rating:</span>
      <span className="font-bold mr-1">{rating.toFixed(1)}</span>
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
    </div>
  );
};

export default CourierRatingDisplay;
