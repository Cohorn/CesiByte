
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { userApi } from '@/api/services/userService';
import { useAuth } from '@/lib/AuthContext';
import { useRestaurant } from '@/hooks/useRestaurant';
import NavBar from '@/components/NavBar';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Clock, MapPin, Star } from 'lucide-react';
import { MenuItem, SimpleUser } from '@/lib/database.types';
import { useReviews } from '@/frontend/hooks/useReviews';
import RestaurantReviewsList from '@/components/RestaurantReviewsList';
import { calculateDistance, formatDistance } from '@/lib/distanceUtils';
import { format } from 'date-fns';
import { distanceToTime } from '@/utils/orderUtils';
import { restaurantApi } from '@/api/services/restaurantService';
import LoadingState from '@/components/restaurant/LoadingState';

const RestaurantMenu = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { restaurant, loading: isLoading, error } = useRestaurant(id);
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenuItems, setLoadingMenuItems] = useState(true);
  const [cart, setCart] = useState<any[]>([]);
  
  const { reviews, isLoading: isLoadingReviews } = useReviews({ restaurantId: id });
  const [reviewers, setReviewers] = useState<SimpleUser[]>([]);
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  
  // Fetch menu items
  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!restaurant) return;
      
      setLoadingMenuItems(true);
      try {
        const items = await restaurantApi.getMenuItems(restaurant.id);
        setMenuItems(items || []);
      } catch (error) {
        console.error('Error fetching menu items:', error);
        toast({
          title: "Error",
          description: "Failed to load menu items",
          variant: "destructive"
        });
      } finally {
        setLoadingMenuItems(false);
      }
    };
    
    fetchMenuItems();
  }, [restaurant, toast]);
  
  // Fetch reviewers
  useEffect(() => {
    const fetchReviewers = async () => {
      if (!reviews || reviews.length === 0) return;
      
      setIsLoadingReviewers(true);
      try {
        const uniqueUserIds = [...new Set(reviews.map(review => review.user_id))];
        const reviewerData: SimpleUser[] = [];
        
        for (const userId of uniqueUserIds) {
          try {
            const userData = await userApi.getSimpleUserById(userId);
            if (userData) {
              reviewerData.push(userData);
            }
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
          }
        }
        
        setReviewers(reviewerData);
      } catch (error) {
        console.error('Error fetching reviewers:', error);
      } finally {
        setIsLoadingReviewers(false);
      }
    };
    
    fetchReviewers();
  }, [reviews]);
  
  // Calculate distance and estimated time
  useEffect(() => {
    if (restaurant && user) {
      const dist = calculateDistance(
        user.lat,
        user.lng,
        restaurant.lat,
        restaurant.lng
      );
      setDistance(dist);
      
      // Calculate estimated time (25 min prep + travel time at 20km/h)
      const travelTimeMinutes = distanceToTime(dist);
      const totalMinutes = 25 + travelTimeMinutes;
      
      const now = new Date();
      const estimatedDelivery = new Date(now.getTime() + totalMinutes * 60000);
      
      setEstimatedTime(`${format(estimatedDelivery, 'h:mm a')} (approx. ${totalMinutes} min)`);
    }
  }, [restaurant, user]);
  
  // Group menu items by availability
  const availableItems = menuItems.filter(item => item.available);
  const unavailableItems = menuItems.filter(item => !item.available);
  
  const renderMenuItems = (items: MenuItem[]) => {
    return items.map(item => (
      <div key={item.id} className="flex justify-between py-3 border-b last:border-0">
        <div className="flex-1">
          <h3 className="font-medium">{item.name}</h3>
          <p className="text-sm text-gray-600">{item.description}</p>
          <p className="mt-1 font-bold">${item.price.toFixed(2)}</p>
        </div>
        <div>
          {item.available ? (
            <div className="flex items-center space-x-2">
              {user?.user_type === 'restaurant' ? (
                <Button 
                  variant="outline" 
                  size="sm"
                >
                  Edit
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={user?.user_type === 'restaurant'}
                >
                  Add to Cart
                </Button>
              )}
            </div>
          ) : (
            <Button variant="outline" disabled className="text-sm">
              Unavailable
            </Button>
          )}
        </div>
      </div>
    ));
  };
  
  if (isLoading || loadingMenuItems) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="container mx-auto px-4 py-8">
          <LoadingState message="Loading restaurant menu..." />
        </div>
      </div>
    );
  }
  
  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center p-4 bg-red-50 rounded border border-red-200">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-600">
              {error instanceof Error ? error.message : "Restaurant not found"}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <NavBar />
      
      <div className="w-full h-48 bg-gray-200 relative overflow-hidden">
        {restaurant.image_url ? (
          <img 
            src={restaurant.image_url} 
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300">
            <p className="text-gray-600">No Image Available</p>
          </div>
        )}
      </div>
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className={user?.user_type === 'restaurant' ? 'w-full' : 'md:w-2/3'}>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{restaurant.name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>{restaurant.address}</span>
                  {distance !== null && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({formatDistance(distance)} away)
                    </span>
                  )}
                </CardDescription>
                {estimatedTime && (
                  <div className="flex items-center mt-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>Estimated delivery: {estimatedTime}</span>
                  </div>
                )}
              </CardHeader>
              
              <CardContent>
                <h2 className="text-lg font-medium mb-4">Menu</h2>
                
                {menuItems.length === 0 ? (
                  <p className="text-gray-500">This restaurant has not added any menu items yet.</p>
                ) : (
                  <>
                    {availableItems.length > 0 && (
                      <div className="mb-6">
                        {renderMenuItems(availableItems)}
                      </div>
                    )}
                    
                    {unavailableItems.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Currently Unavailable</h3>
                        {renderMenuItems(unavailableItems)}
                      </div>
                    )}
                  </>
                )}
                
                <Separator className="my-6" />
                
                <h2 className="text-lg font-medium mb-4">Customer Reviews</h2>
                
                {isLoadingReviews ? (
                  <p className="text-gray-500">Loading reviews...</p>
                ) : (
                  <RestaurantReviewsList 
                    reviews={reviews} 
                    reviewers={reviewers} 
                  />
                )}
              </CardContent>
            </Card>
          </div>
          
          {user?.user_type !== 'restaurant' && (
            <div className="md:w-1/3">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Your Order</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Your cart is empty</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantMenu;
