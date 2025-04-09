
import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { MenuItem } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import NavBar from '@/components/NavBar';
import { useReviews } from '@/hooks/useReviews';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MenuItemsList from '@/components/restaurant/menu/MenuItemsList';
import RestaurantReviewsList from '@/components/RestaurantReviewsList';

const RestaurantMenu = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurantId, setRestaurantId] = useState('');
  const [activeTab, setActiveTab] = useState("items");

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { reviews, reviewers, averageRating, isLoading: reviewsLoading } = useReviews({ 
    restaurantId: restaurantId 
  });

  useEffect(() => {
    const fetchRestaurantId = async () => {
      if (!user) return;

      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (restaurantError) {
        toast({
          title: "Error",
          description: "Could not fetch restaurant data",
          variant: "destructive"
        });
        return;
      }

      setRestaurantId(restaurantData.id);
      fetchMenuItems(restaurantData.id);
    };

    fetchRestaurantId();
  }, [user, toast]);

  const fetchMenuItems = async (restaurantId: string) => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId);

    if (error) {
      toast({
        title: "Error",
        description: "Could not fetch menu items",
        variant: "destructive"
      });
      return;
    }

    setMenuItems(data as MenuItem[]);
  };

  if (!user || user.user_type !== 'restaurant') {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background w-full">
      <NavBar />
      
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold">Restaurant Dashboard</h1>
              <p className="text-muted-foreground">Manage your menu and reviews</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="items">Menu Items</TabsTrigger>
              <TabsTrigger value="reviews">Customer Reviews</TabsTrigger>
            </TabsList>
            
            <TabsContent value="items" className="mt-4">
              <MenuItemsList
                menuItems={menuItems}
                restaurantId={restaurantId}
                onMenuItemsChange={() => fetchMenuItems(restaurantId)}
              />
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-4">
              <div className="bg-white rounded-lg border border-border shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Customer Reviews</h2>
                {reviewsLoading ? (
                  <p className="text-center py-4">Loading reviews...</p>
                ) : (
                  <RestaurantReviewsList reviews={reviews} reviewers={reviewers} />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default RestaurantMenu;
