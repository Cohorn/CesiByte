
import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { userApi } from '@/api/services/userService';
import { User } from '@/lib/database.types';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import UserManagementLayout from '@/components/employee/UserManagementLayout';
import UserTable from '@/components/employee/UserTable';

const RestaurantManagement = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Fetch all restaurants
  const { data: restaurants, isLoading, error, refetch } = useQuery({
    queryKey: ['restaurant-users'],
    queryFn: async () => {
      const response = await userApi.getUsersByType('restaurant');
      return response;
    }
  });

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this restaurant? This action cannot be undone.')) {
      setIsDeleting(userId);
      try {
        await userApi.deleteUser(userId);
        toast({
          title: "Restaurant Deleted",
          description: "The restaurant account has been successfully deleted."
        });
        refetch();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete the restaurant.",
          variant: "destructive"
        });
      } finally {
        setIsDeleting(null);
      }
    }
  };

  // Filter restaurants based on search term
  const filteredRestaurants = restaurants?.filter((restaurant: User) => 
    restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    restaurant.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <UserManagementLayout
      title="Restaurant Management"
      description="Manage restaurant accounts"
      backLink="/employee/dashboard"
      backLinkText="Back to Dashboard"
      searchPlaceholder="Search restaurants..."
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      isLoading={isLoading}
      error={error}
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          Failed to load restaurants. Please try again.
        </div>
      ) : (
        <UserTable
          users={filteredRestaurants}
          userType="restaurant"
          isDeleting={isDeleting}
          onDeleteUser={handleDeleteUser}
          noUsersMessage={searchTerm ? "No restaurants found matching your search." : "No restaurants found."}
        />
      )}
    </UserManagementLayout>
  );
};

export default RestaurantManagement;
