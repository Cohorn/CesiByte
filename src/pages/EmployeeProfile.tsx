
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import EditProfileForm from '@/components/EditProfileForm';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { User } from '@/lib/database.types';

const EmployeeProfile = () => {
  const { user, updateProfile, isLoading, deleteAccount } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Redirect if not logged in or not an employee
  if (!user) {
    return <Navigate to="/employee/login" />;
  } else if (user.user_type !== 'employee') {
    return <Navigate to="/" />;
  }

  const handleUpdateProfile = async (data: any) => {
    setIsSaving(true);
    try {
      await updateProfile(data);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/employee/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <p className="text-gray-500">Manage your employee account</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your account details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {user && (
                  <EditProfileForm
                    user={user as User}
                    onSubmit={handleUpdateProfile}
                    isLoading={isSaving || isLoading}
                  />
                )}
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="border-red-100">
              <CardHeader>
                <CardTitle className="text-red-600">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions for your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete Account
                </Button>
                <DeleteAccountDialog 
                  open={showDeleteDialog}
                  onOpenChange={setShowDeleteDialog}
                  onConfirm={handleDeleteAccount}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
