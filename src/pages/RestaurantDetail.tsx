import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import NavBar from '@/components/NavBar';
import { Restaurant, MenuItem, OrderItem, SimpleUser } from '@/lib/database.types';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/AuthContext';
import Map from '@/components/Map';
import ReviewStats from '@/components/ReviewStats';
import ReviewList from '@/components/ReviewList';
import ReviewForm from '@/components/ReviewForm';
import { useReviews } from '@/hooks/useReviews';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";

const RestaurantDetail = () => {
  const { id: restaurantId } = useParams();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [reviewers, setReviewers] = useState<SimpleUser[]>([]);
  const { toast } = useToast();
  
  const { reviews, submitReview, deleteReview } = useReviews({
    restaurantId
  });
  
  const DEFAULT_IMAGE_URL = 'https://placehold.co/300x200/orange/white?text=Food+Item';
  const DEFAULT_RESTAURANT_IMAGE = 'https://placehold.co/600x400/orange/white?text=Restaurant';

  useEffect(() => {
    const fetchRestaurantData = async () => {
      setLoading(true);
      try {
        console.log('Fetching restaurant with ID:', restaurantId);
        
        if (!restaurantId) {
          throw new Error('Restaurant ID is missing');
        }

        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', restaurantId)
          .single();

        if (restaurantError) {
          console.error('Error fetching restaurant:', restaurantError);
          throw restaurantError;
        }
        
        console.log('Restaurant data fetched:', restaurantData);
        setRestaurant(restaurantData);

        const { data: menuData, error: menuError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .eq('available', true);

        if (menuError) throw menuError;
        setMenuItems(menuData || []);

        if (reviews.length > 0) {
          const reviewerIds = reviews.map(review => review.user_id);
          const { data: reviewersData, error: reviewersError } = await supabase
            .from('users')
            .select('id, name')
            .in('id', reviewerIds);
          
          if (reviewersError) {
            console.error('Error fetching reviewers:', reviewersError);
          } else {
            setReviewers(reviewersData);
          }
        }

      } catch (error) {
        console.error('Error fetching restaurant data:', error);
        toast({
          title: "Error",
          description: "Failed to load restaurant data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId) {
      fetchRestaurantData();
    }
  }, [restaurantId, toast, reviews]);

  const addToCart = (menuItem: MenuItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.menu_item_id === menuItem.id);
      if (existingItem) {
        return prevCart.map(item => 
          item.menu_item_id === menuItem.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      } else {
        return [
          ...prevCart, 
          { 
            menu_item_id: menuItem.id, 
            name: menuItem.name, 
            price: menuItem.price, 
            quantity: 1 
          }
        ];
      }
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.menu_item_id === menuItemId);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map(item => 
          item.menu_item_id === menuItemId 
            ? { ...item, quantity: item.quantity - 1 } 
            : item
        );
      } else {
        return prevCart.filter(item => item.menu_item_id !== menuItemId);
      }
    });
  };

  const getItemQuantity = (menuItemId: string) => {
    const item = cart.find(item => item.menu_item_id === menuItemId);
    return item ? item.quantity : 0;
  };

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const generatePin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handlePlaceOrder = async () => {
    if (!user || !restaurant) {
      toast({
        title: "Error",
        description: "You must be logged in to place an order",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Your cart is empty",
        variant: "destructive",
      });
      return;
    }

    try {
      const deliveryPin = generatePin();
      console.log("Placing order with delivery PIN:", deliveryPin);

      const { error } = await supabase.from('orders').insert({
        user_id: user.id,
        restaurant_id: restaurant.id,
        courier_id: null,
        status: 'created',
        items: cart,
        total_price: totalPrice,
        delivery_address: user.address,
        delivery_lat: user.lat,
        delivery_lng: user.lng,
        delivery_pin: deliveryPin
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your order has been placed",
      });
      setOrderPlaced(true);
      setCart([]);
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: "Error",
        description: "Failed to place your order",
        variant: "destructive",
      });
    }
  };

  const handleSubmitReview = async (data: { rating: number; comment: string }) => {
    if (!user || !restaurantId) return;

    const reviewData = {
      user_id: user.id,
      restaurant_id: restaurantId,
      rating: data.rating,
      comment: data.comment || null
    };

    await submitReview(reviewData);
  };

  const handleDeleteReview = async (reviewId: string) => {
    await deleteReview(reviewId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavBar />
        <div className="container mx-auto px-4 py-8 flex justify-center items-center">
          <p>Loading restaurant details...</p>
        </div>
      </div>
    );
  }

  if (!restaurant && !loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavBar />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">Restaurant Not Found</h1>
          <p>The restaurant you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  if (user && user.user_type === 'restaurant') {
    return <Navigate to="/restaurant/orders" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            {restaurant.image_url && (
              <div className="w-full aspect-video rounded-lg overflow-hidden mb-4 bg-gray-100">
                <img 
                  src={restaurant.image_url}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_RESTAURANT_IMAGE;
                  }}
                />
              </div>
            )}
            
            <h1 className="text-3xl font-bold">{restaurant.name}</h1>
            <p className="text-gray-600 mb-4">{restaurant.address}</p>

            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Menu</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {menuItems.map(item => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="aspect-video bg-gray-100 overflow-hidden">
                      <img
                        src={item.image_url || DEFAULT_IMAGE_URL}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_IMAGE_URL;
                        }}
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold">{item.name}</h3>
                          <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                          <p className="font-bold mt-2">${item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center">
                          {getItemQuantity(item.id) > 0 && (
                            <>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="mx-2 font-bold">
                                {getItemQuantity(item.id)}
                              </span>
                            </>
                          )}
                          <button
                            onClick={() => addToCart(item)}
                            className="p-1 rounded-full bg-primary text-white hover:bg-primary/90"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="lg:col-span-1">
                  <h2 className="text-xl font-bold mb-4">Location</h2>
                  <div
                    className="rounded-md overflow-hidden"
                    style={{ height: "300px" }}
                  >
                    {restaurant && (
                      <Map
                        locations={[
                          {
                            id: restaurant.id,
                            lat: restaurant.lat,
                            lng: restaurant.lng,
                            type: "restaurant",
                            name: restaurant.name,
                          },
                        ]}
                      />
                    )}
                  </div>
                </div>
                <div className="lg:col-span-1">
                  <h2 className="text-xl font-bold mb-4">Review this restaurant</h2>
                  {user ? (
                    <ReviewForm onSubmit={handleSubmitReview} />
                  ) : (
                    <p>Please log in to leave a review.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="grid grid-cols-1 gap-8">
                  <div className="md:col-span-2">
                    <h2 className="text-xl font-bold mb-4">Reviews</h2>
                    
                    <ReviewStats reviews={reviews} />
                    <ReviewList 
                      reviews={reviews} 
                      reviewers={reviewers}
                      onDelete={handleDeleteReview}
                      showControls={true}
                    />
                  </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="sticky top-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button className="w-full mb-4" disabled={cart.length === 0}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    View Cart ({cart.length})
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Your Cart</SheetTitle>
                    <SheetDescription>
                      Your order from {restaurant.name}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-4">
                    {cart.length === 0 ? (
                      <p className="text-center text-gray-500">Your cart is empty</p>
                    ) : (
                      <div className="space-y-4">
                        {cart.map((item) => (
                          <div
                            key={item.menu_item_id}
                            className="flex justify-between items-center"
                          >
                            <div>
                              <p className="font-bold">
                                {item.name} x{item.quantity}
                              </p>
                              <p>${(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                            <div className="flex items-center">
                              <button
                                onClick={() => removeFromCart(item.menu_item_id)}
                                className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="mx-2 font-bold">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  addToCart({
                                    id: item.menu_item_id,
                                    name: item.name,
                                    price: item.price,
                                    description: '',
                                    available: true,
                                    restaurant_id: restaurant.id,
                                    created_at: ''
                                  })
                                }
                                className="p-1 rounded-full bg-primary text-white hover:bg-primary/90"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <SheetFooter>
                    <div className="w-full">
                      <div className="flex justify-between py-2 font-bold">
                        <span>Total:</span>
                        <span>${totalPrice.toFixed(2)}</span>
                      </div>
                      <Button
                        className="w-full mt-4"
                        disabled={cart.length === 0 || orderPlaced}
                        onClick={handlePlaceOrder}
                      >
                        {orderPlaced ? "Order Placed!" : "Place Order"}
                      </Button>
                      {!user && (
                        <p className="mt-2 text-center text-sm text-gray-500">
                          You need to be logged in to place an order
                        </p>
                      )}
                    </div>
                  </SheetFooter>
                </SheetContent>
              </Sheet>

              <div className="bg-gray-50 p-4 rounded">
                <h2 className="font-bold mb-2">Order Summary</h2>
                {cart.length === 0 ? (
                  <p className="text-gray-500">Your cart is empty</p>
                ) : (
                  <div>
                    {cart.map((item) => (
                      <div
                        key={item.menu_item_id}
                        className="flex justify-between py-1"
                      >
                        <span>
                          {item.name} x{item.quantity}
                        </span>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t mt-2 pt-2 font-bold flex justify-between">
                      <span>Total:</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantDetail;
