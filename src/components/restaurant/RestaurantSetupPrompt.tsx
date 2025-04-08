
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BugPlay, RefreshCw, Settings, StoreIcon } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { checkApiHealth } from '@/utils/apiHealth';
import { useToast } from '@/hooks/use-toast';

const RestaurantSetupPrompt: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  const handleDebugClick = async () => {
    setIsChecking(true);
    try {
      // Perform health check
      const healthStatus = await checkApiHealth();
      
      // Display results
      if (healthStatus.status === 'ok') {
        toast({
          title: "API Health Check",
          description: "All services are operational",
        });
      } else {
        const downServices = Object.entries(healthStatus.services)
          .filter(([_, status]) => status === 'down')
          .map(([service]) => service)
          .join(', ');
          
        toast({
          title: "API Health Issues",
          description: `Some services are down: ${downServices || 'unknown'}`,
          variant: "destructive"
        });
      }
      
      // Log user info
      if (user) {
        console.log('Current user:', {
          id: user.id,
          email: user.email,
          type: user.user_type,
          name: user.name
        });
        
        toast({
          title: "User Info",
          description: `ID: ${user.id.substring(0, 8)}... | Type: ${user.user_type}`,
        });
      } else {
        toast({
          title: "No User",
          description: "No authenticated user found",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Debug check failed:', error);
      toast({
        title: "Debug Error",
        description: "Failed to perform debug checks",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

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
          
          <div className="mt-4 pt-2 border-t border-gray-100">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleDebugClick}
              disabled={isChecking}
              className="flex items-center text-xs text-gray-500 w-full justify-center"
            >
              {isChecking ? (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <BugPlay className="h-3 w-3 mr-1" />
              )}
              Run Diagnostics
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantSetupPrompt;
