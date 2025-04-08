
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { checkRestaurantEndpoint } from '@/utils/apiHealthCheck';
import { useToast } from '@/hooks/use-toast';

const RestaurantSetupPrompt = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  const handleSetupRestaurant = () => {
    navigate('/restaurant/setup');
  };

  const checkApiConnection = async () => {
    if (!user) return;
    
    setIsChecking(true);
    try {
      const result = await checkRestaurantEndpoint(user.id);
      console.log('API endpoint check result:', result);
      
      if (result.working) {
        toast({
          title: "API Connection Success",
          description: `Restaurant API endpoint is working. Status: ${result.status}`,
        });
      } else {
        toast({
          title: "API Connection Issue",
          description: `Restaurant API endpoint error: ${result.error}. Status: ${result.status}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error during API check:', error);
      toast({
        title: "API Check Failed",
        description: "Could not complete API connection test",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 my-4">
      <h2 className="text-xl font-semibold mb-2">Restaurant Not Set Up</h2>
      <p className="text-gray-600 mb-4">
        You haven't set up your restaurant profile yet. To manage orders and menu items, 
        you need to create a restaurant profile first.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleSetupRestaurant}>
          Set Up Restaurant
        </Button>
        <Button 
          variant="outline" 
          onClick={checkApiConnection}
          disabled={isChecking || !user}
        >
          {isChecking ? "Checking..." : "Check API Connection"}
        </Button>
      </div>
    </div>
  );
};

export default RestaurantSetupPrompt;
