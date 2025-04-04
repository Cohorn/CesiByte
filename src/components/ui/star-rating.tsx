
import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  size = 24,
  className,
}) => {
  const totalStars = 5;
  
  return (
    <div className={cn("flex", className)}>
      {[...Array(totalStars)].map((_, index) => {
        const starValue = index + 1;
        return (
          <button
            key={index}
            type="button"
            className={`p-1 focus:outline-none ${
              starValue <= value ? 'text-yellow-400' : 'text-gray-300'
            }`}
            onClick={() => onChange(starValue)}
          >
            <Star size={size} fill={starValue <= value ? 'currentColor' : 'none'} />
          </button>
        );
      })}
    </div>
  );
};
