
import React, { useState } from 'react';
import NavBar from '@/components/NavBar';
import { useAuth } from '@/lib/AuthContext';
import EditProfileForm from '@/components/EditProfileForm';
import DeleteAccountDialog, { DeleteAccountDialogProps } from '@/components/DeleteAccountDialog';
import { UserType } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const { user, updateProfile, setUserType, deleteAccount } = useAuth();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleProfileUpdate = async (updatedData: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  }) => {
    try {
      await updateProfile(updatedData);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleUserTypeChange = async (type: UserType) => {
    try {
      await setUserType(type);
      toast({
        title: "User Type Updated",
        description: `You are now a ${type}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user type",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      // No need for toast here as the user will be redirected after account deletion
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">You are not logged in</h1>
            <p className="text-gray-600">Please log in to view your profile.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">My Profile</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
          <EditProfileForm 
            user={user} 
            onSave={handleProfileUpdate} 
            onUserTypeChange={handleUserTypeChange}
          />
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Danger Zone</h2>
          <p className="mb-4 text-gray-600">
            Deleting your account is permanent and cannot be undone. All of your data will be permanently removed.
          </p>
          <button 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Delete Account
          </button>
        </div>
        
        <DeleteAccountDialog 
          open={isDeleteDialogOpen} 
          onOpenChange={setIsDeleteDialogOpen} 
          onConfirm={handleDeleteAccount}
        />
      </div>
    </div>
  );
};

export default Profile;
