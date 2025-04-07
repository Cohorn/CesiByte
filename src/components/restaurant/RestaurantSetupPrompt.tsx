
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Settings, StoreIcon } from 'lucide-react';

const RestaurantSetupPrompt: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded shadow p-8 text-center">
      <StoreIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
      <h2 className="text-xl font-semibold mb-4">Restaurant Not Found</h2>
      <p className="text-gray-500 mb-4">
        Please set up your restaurant profile to continue.
      </p>
      <div className="flex flex-col space-y-2">
        <Button onClick={() => navigate('/restaurant/setup')}>
          Set Up Restaurant Profile
        </Button>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-2">
            Already have a restaurant profile?
          </p>
          <Button 
            variant="outline" 
            onClick={() => navigate('/profile')}
            className="flex items-center"
          >
            <Settings className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantSetupPrompt;
