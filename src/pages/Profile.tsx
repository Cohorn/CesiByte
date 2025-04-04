
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import Map from '@/components/Map';
import NavBar from '@/components/NavBar';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, Edit, X, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import EditProfileForm from '@/components/EditProfileForm';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';
import { userApi } from '@/api/services/userService';

const Profile = () => {
  const { user, updateProfile, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
