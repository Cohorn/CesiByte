
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const RestaurantSetupPrompt: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded shadow p-8 text-center">
      <h2 className="text-xl font-semibold mb-4">Restaurant Not Found</h2>
      <p className="text-gray-500 mb-4">
        Please set up your restaurant profile to continue.
      </p>
      <Button onClick={() => navigate('/restaurant/setup')}>
        Set Up Restaurant Profile
      </Button>
    </div>
  );
};

export default RestaurantSetupPrompt;
