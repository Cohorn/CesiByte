
import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useRestaurant } from '@/frontend/hooks';
import Map from '@/components/Map';
import NavBar from '@/components/NavBar';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, Edit, X, User, Store, Image } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import EditProfileForm from '@/components/EditProfileForm';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';
import RestaurantImageUpload from '@/components/restaurant/RestaurantImageUpload';
import { userApi } from '@/api/services/userService';

const Profile = () => {
  const { user, updateProfile, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { restaurant, fetchRestaurant, updateRestaurant } = useRestaurant();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.user_type === 'restaurant') {
      fetchRestaurant(undefined, true);
    }
  }, [user, fetchRestaurant]);

  useEffect(() => {
    if (restaurant?.image_url) {
      setImagePreview(restaurant.image_url);
    }
  }, [restaurant]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  const handleUpdateProfile = async (formData: any) => {
    setLoading(true);
    try {
      await updateProfile(formData);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update your profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    try {
      await userApi.deleteUser(user.id);
      toast({
        title: "Account deleted",
        description: "Your account has been successfully deleted.",
      });
      await signOut();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete your account.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (url: string) => {
    if (!restaurant) return;
    
    try {
      await updateRestaurant({
        image_url: url
      });
      toast({
        title: "Success",
        description: "Restaurant image updated successfully.",
      });
    } catch (error) {
      console.error('Error updating restaurant image:', error);
      toast({
        title: "Error",
        description: "Failed to update restaurant image.",
        variant: "destructive",
      });
    }
  };

  const removeImage = async () => {
    if (!restaurant) return;
    
    try {
      await updateRestaurant({
        image_url: null
      });
      setImagePreview(null);
      toast({
        title: "Success",
        description: "Restaurant image removed successfully.",
      });
    } catch (error) {
      console.error('Error removing restaurant image:', error);
      toast({
        title: "Error",
        description: "Failed to remove restaurant image.",
        variant: "destructive",
      });
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    toast({
      title: "Authentication required",
      description: "Please log in to view your profile",
      variant: "destructive",
    });
    return <Navigate to="/login" />;
  }

  // Check if user has valid location data
  const hasValidLocation = user.lat != null && !isNaN(user.lat) && 
                          user.lng != null && !isNaN(user.lng);
  
  // Inside the Profile component
  const mapLocations = hasValidLocation ? [
    {
      id: user.id,
      lat: user.lat,
      lng: user.lng,
      type: 'user' as const,
      name: user.name
    }
  ] : [];

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Your Profile</h1>
          <div className="flex space-x-2">
            <Button 
              onClick={() => setIsEditing(!isEditing)} 
              variant={isEditing ? "destructive" : "outline"}
              size="sm"
            >
              {isEditing ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </>
              )}
            </Button>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  {user.name || 'User'}
                </CardTitle>
                <CardDescription>
                  {user.email}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">User Type</p>
                    <p className="text-gray-500 capitalize">{user.user_type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-gray-500">{user.address || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Coordinates</p>
                    <p className="text-gray-500">
                      {hasValidLocation ? `${user.lat}, ${user.lng}` : 'Not available'}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col">
                <Separator className="my-4" />
                <DeleteAccountDialog onConfirm={handleDeleteAccount} />
              </CardFooter>
            </Card>

            {user.user_type === 'restaurant' && restaurant && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Store className="h-5 w-5 mr-2" />
                    Restaurant Profile
                  </CardTitle>
                  <CardDescription>
                    Manage your restaurant
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Name</p>
                      <p className="text-gray-500">{restaurant.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Address</p>
                      <p className="text-gray-500">{restaurant.address}</p>
                    </div>
                    <div className="pt-2">
                      <p className="text-sm font-medium mb-2">Restaurant Image</p>
                      <RestaurantImageUpload 
                        currentImageUrl={imagePreview}
                        onImageUpload={handleImageUpload}
                        onImageRemove={removeImage}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link to="/restaurant/setup" className="w-full">
                    <Button 
                      variant="outline" 
                      className="w-full flex items-center"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Restaurant Profile
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            )}
          </div>

          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  {isEditing ? 'Edit Your Information' : 'Your Information'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={isEditing ? "edit" : "view"} value={isEditing ? "edit" : "view"}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="view" disabled={isEditing}>View</TabsTrigger>
                    <TabsTrigger value="edit" disabled={!isEditing}>Edit</TabsTrigger>
                    <TabsTrigger value="location" disabled={!hasValidLocation}>Location</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="view" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Name</p>
                        <p className="text-gray-500">{user.name || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-gray-500">{user.email || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Address</p>
                        <p className="text-gray-500">{user.address || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">User Type</p>
                        <p className="text-gray-500 capitalize">{user.user_type || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Latitude</p>
                        <p className="text-gray-500">{hasValidLocation ? user.lat : 'Not available'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Longitude</p>
                        <p className="text-gray-500">{hasValidLocation ? user.lng : 'Not available'}</p>
                      </div>
                    </div>

                    {hasValidLocation && (
                      <div className="pt-4">
                        <h3 className="text-lg font-semibold mb-2">Your Location</h3>
                        <Map 
                          locations={mapLocations} 
                          center={[user.lng, user.lat]} 
                          height="300px" 
                        />
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="edit">
                    <EditProfileForm 
                      user={user} 
                      onSubmit={handleUpdateProfile} 
                      isLoading={loading}
                    />
                  </TabsContent>
                  
                  <TabsContent value="location">
                    {hasValidLocation ? (
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Your Location</h3>
                        <Map 
                          locations={mapLocations} 
                          center={[user.lng, user.lat]} 
                          height="300px" 
                        />
                      </div>
                    ) : (
                      <div className="text-amber-600 p-3 bg-amber-50 rounded">
                        Location data is not available or invalid.
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
