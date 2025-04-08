
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import EditProfileForm from '@/components/EditProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';
import { UserType } from '@/lib/database.types';
import { Copy, Bell } from 'lucide-react';

const Profile = () => {
  const { user, isLoading, signOut, clearAuthError } = useAuth();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, content: "Welcome to your profile! Here you can edit your details and manage your account.", timestamp: new Date() }
  ]);

  // Generate a referral code if one doesn't exist
  const referralCode = user?.referral_code || (user ? 
    Math.random().toString(36).substring(2, 8).toUpperCase() : '');

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard"
    });
  };

  // If still loading, show a loading message
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p>Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not logged in, redirect to login page
  if (!user && !isLoading) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="profile">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications
              <span className="ml-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {notifications.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Edit Profile</CardTitle>
                    <CardDescription>
                      Update your profile information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EditProfileForm user={user!} />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium">Email</h3>
                      <p className="text-sm text-gray-600">{user?.email}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium">Account Type</h3>
                      <p className="text-sm text-gray-600 capitalize">{user?.user_type}</p>
                    </div>
                    
                    {/* Referral Code Section */}
                    <div className="pt-2 border-t">
                      <h3 className="text-sm font-medium mb-2">Your Referral Code</h3>
                      <div className="flex items-center">
                        <div className="bg-gray-100 px-3 py-2 rounded font-mono text-sm flex-1">
                          {referralCode}
                        </div>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="ml-2"
                          onClick={handleCopyReferral}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Share this code with friends to invite them to join
                      </p>
                    </div>
                    
                    {user?.referred_by && (
                      <div>
                        <h3 className="text-sm font-medium">Referred By</h3>
                        <p className="text-sm text-gray-600 font-mono">{user.referred_by}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={signOut}
                    >
                      Sign Out
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="w-full justify-start"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      Delete Account
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="mr-2 h-5 w-5" />
                  Your Notifications
                </CardTitle>
                <CardDescription>
                  Stay updated with important information
                </CardDescription>
              </CardHeader>
              <CardContent>
                {notifications.length > 0 ? (
                  <div className="space-y-4">
                    {notifications.map(notification => (
                      <div 
                        key={notification.id} 
                        className="p-3 border rounded bg-gray-50"
                      >
                        <p className="text-sm">{notification.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.timestamp.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">You have no notifications</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DeleteAccountDialog 
          open={showDeleteDialog} 
          onOpenChange={setShowDeleteDialog}
        />
      </div>
    </div>
  );
};

export default Profile;
