
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface RestaurantHeaderProps {
  title: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  canRefresh: boolean;
}

const RestaurantHeader: React.FC<RestaurantHeaderProps> = ({
  title,
  onRefresh,
  isRefreshing,
  canRefresh
}) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Button 
        onClick={onRefresh} 
        variant="outline" 
        size="sm"
        disabled={isRefreshing || !canRefresh}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
};

export default RestaurantHeader;
