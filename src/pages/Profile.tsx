import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { userApi } from '@/api/services/userService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertCircle } from 'lucide-react';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';

const Profile = () => {
  const { user, updateUser, signOut } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setAddress(user.address);
      setLat(user.lat);
      setLng(user.lng);
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const userData = {
        id: user.id,
        name,
        email,
        address,
        lat: lat || 0,
        lng: lng || 0,
      };

      const updatedUser = await userApi.updateUser(userData);

      if (updatedUser) {
        updateUser(updatedUser);
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
        setIsEditing(false);
      } else {
        setError("Failed to update profile");
      }
    } catch (error: any) {
      console.error("Update profile failed:", error);
      setError(error.message || "Failed to update profile");
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      console.error("Sign out failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      await userApi.deleteUser(user.id);
      await signOut();
      navigate('/register');
      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted.",
      });
    } catch (error: any) {
      console.error("Account deletion failed:", error);
      setError(error.message || "Failed to delete account");
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <Card className="bg-white shadow-md rounded-lg px-8 py-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-800">Your Profile</CardTitle>
            <CardDescription className="text-gray-600">Manage your account settings and preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                value={lat !== undefined ? lat : ''}
                onChange={(e) => setLat(e.target.value ? parseFloat(e.target.value) : undefined)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                value={lng !== undefined ? lng : ''}
                onChange={(e) => setLng(e.target.value ? parseFloat(e.target.value) : undefined)}
                disabled={!isEditing}
              />
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between">
              {isEditing ? (
                <div className="space-x-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setName(user?.name || '');
                      setEmail(user?.email || '');
                      setAddress(user?.address || '');
                      setLat(user?.lat);
                      setLng(user?.lng);
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={isLoading}
                  >
                    {isLoading ? "Updating..." : "Save Profile"}
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              )}
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                Delete Account
              </Button>
            </div>
            <Separator className="my-4" />
            <Button variant="outline" onClick={handleSignOut} disabled={isLoading}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
      <DeleteAccountDialog 
        open={showDeleteDialog} 
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
};

export default Profile;
