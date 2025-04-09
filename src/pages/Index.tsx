import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { Restaurant } from '@/lib/database.types';
import { Card, CardContent } from '@/components/ui/card';
import { restaurantApi } from '@/api/services/restaurantService';
import { calculateDistance } from '@/lib/distanceUtils';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (user && user.user_type === 'employee') {
      navigate('/employee');
    } else if (user && user.user_type === 'restaurant') {
      navigate('/restaurant/orders');
    } else if (user && user.user_type === 'courier') {
      navigate('/courier/orders');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        let fetchedRestaurants: Restaurant[] = [];
        
        if (userLocation) {
          // Use nearby restaurants if we have user location
          fetchedRestaurants = await restaurantApi.getNearbyRestaurants(userLocation.lat, userLocation.lng);
        } else {
          // Otherwise fetch all restaurants
          fetchedRestaurants = await restaurantApi.getRestaurants();
        }
        
        setRestaurants(fetchedRestaurants);
      } catch (error) {
        console.error('Failed to fetch restaurants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [userLocation]);

  useEffect(() => {
    // Set user location from logged in user or try to get from geolocation
    if (user && user.lat && user.lng) {
      setUserLocation({ lat: user.lat, lng: user.lng });
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting geolocation:', error);
          // Default to New York City if geolocation fails
          setUserLocation({ lat: 40.7128, lng: -74.0060 });
        }
      );
    }
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Searching for:', searchTerm);
  };

  const filteredRestaurants = searchTerm
    ? restaurants.filter(restaurant =>
        restaurant.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : restaurants;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="container mx-auto py-8 px-4">
        <section className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Hungry?</h1>
          <p className="text-gray-600 mb-4">Order food from local restaurants.</p>
          
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search restaurants..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold mb-4">Restaurants Near You</h2>
          {loading ? (
            <div className="text-center py-8">
              <p>Loading restaurants...</p>
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="text-center py-8">
              <p>No restaurants found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRestaurants.map((restaurant) => {
                // Calculate distance if user location is available
                const distance = userLocation
                  ? calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      restaurant.lat,
                      restaurant.lng
                    )
                  : null;
                
                return (
                  <Card 
                    key={restaurant.id} 
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                  >
                    <div className="h-40 bg-gray-200 relative">
                      {restaurant.image_url ? (
                        <img
                          src={restaurant.image_url}
                          alt={restaurant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full bg-gray-200">
                          <p className="text-gray-500">No image available</p>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg mb-1">{restaurant.name}</h3>
                      <p className="text-gray-600 text-sm mb-2">{restaurant.address}</p>
                      {distance !== null && (
                        <p className="text-sm text-gray-500">{distance.toFixed(1)} km away</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Index;
