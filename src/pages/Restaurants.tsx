
import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import Map from '@/components/Map';
import { Restaurant } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Star, RefreshCw, AlertTriangle, Image } from 'lucide-react';
import { calculateDistance, formatDistance } from '@/lib/distanceUtils';
import { restaurantApi } from '@/api/services';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const DEFAULT_RESTAURANT_IMAGE = 'https://placehold.co/600x400/orange/white?text=Restaurant';

const Restaurants = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [restaurantRatings, setRestaurantRatings] = useState<{[key: string]: number}>({});
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchRestaurants = async (showToast = false) => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      console.log("Fetching restaurants");
      const data = await restaurantApi.getAllRestaurants();
      
      console.log(`Fetched ${data?.length || 0} restaurants:`, data);
      setRestaurants(data || []);
      
      if (showToast) {
        toast({
          title: "Refreshed",
          description: "Restaurant list has been updated",
        });
      }
    } catch (err) {
      console.error("Error fetching restaurants:", err);
      setError("Could not load restaurants. Please try again later.");
      setRestaurants(null); // Make sure to set restaurants to null so we know it failed
      
      toast({
        title: "Error",
        description: "Could not fetch restaurants",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Initial load of restaurants
  useEffect(() => {
    console.log("Restaurants component mounted, fetching restaurants");
    fetchRestaurants();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRestaurants(true);
  };

  if (!user) {
    return <Navigate to="/" />;
  }

  // Prepare map locations if we have data
  const mapLocations = [
    ...(user ? [{ 
      id: user.id, 
      lat: user.lat, 
      lng: user.lng, 
      type: 'user' as const, 
      name: 'You are here' 
    }] : []),
    ...(restaurants || []).map(restaurant => ({
      id: restaurant.id,
      lat: restaurant.lat,
      lng: restaurant.lng,
      type: 'restaurant' as const,
      name: restaurant.name
    }))
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Restaurants Near You</h1>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {/* Error message with retry button */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex flex-col">
              <span>{error}</span>
              <Button onClick={handleRefresh} size="sm" variant="outline" className="mt-2 w-fit">
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <p className="text-gray-500">Loading restaurants...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div className="space-y-4">
                {restaurants && restaurants.length === 0 ? (
                  <p className="text-center py-8 bg-white rounded shadow p-4">No restaurants available</p>
                ) : restaurants ? (
                  restaurants.map(restaurant => {
                    const distance = calculateDistance(
                      user?.lat || 0,
                      user?.lng || 0,
                      restaurant.lat,
                      restaurant.lng
                    );
                    
                    const rating = restaurantRatings[restaurant.id];
                    
                    return (
                      <Link 
                        key={restaurant.id} 
                        to={`/restaurant/${restaurant.id}`}
                        className="block border p-4 rounded hover:bg-gray-50 bg-white shadow-sm"
                      >
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="w-full sm:w-24 h-24 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                            <img 
                              src={restaurant.image_url || DEFAULT_RESTAURANT_IMAGE} 
                              alt={restaurant.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = DEFAULT_RESTAURANT_IMAGE;
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <h2 className="font-bold">{restaurant.name}</h2>
                            <p className="text-sm text-gray-600">{restaurant.address}</p>
                            
                            <div className="flex items-center text-sm text-blue-600 mt-1">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span>{formatDistance(distance)} from you</span>
                            </div>
                            
                            {rating && (
                              <div className="flex items-center mt-2">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="ml-1 text-sm">{rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded text-center">
                    <p className="text-amber-800">Could not load restaurant data</p>
                    <Button onClick={handleRefresh} size="sm" className="mt-2" variant="outline">
                      Try Again
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="md:col-span-2">
              <div className="bg-gray-100 rounded overflow-hidden shadow-sm" style={{ height: '400px' }}>
                <Map locations={mapLocations} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Restaurants;
