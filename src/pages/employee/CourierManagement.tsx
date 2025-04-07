
import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { userApi } from '@/api/services/userService';
import { User } from '@/lib/database.types';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import UserManagementLayout from '@/components/employee/UserManagementLayout';
import UserTable from '@/components/employee/UserTable';

const CourierManagement = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Fetch all couriers
  const { data: couriers, isLoading, error, refetch } = useQuery({
    queryKey: ['courier-users'],
    queryFn: async () => {
      const response = await userApi.getUsersByType('courier');
      return response;
    }
  });

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this courier? This action cannot be undone.')) {
      setIsDeleting(userId);
      try {
        await userApi.deleteUser(userId);
        toast({
          title: "Courier Deleted",
          description: "The courier account has been successfully deleted."
        });
        refetch();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete the courier.",
          variant: "destructive"
        });
      } finally {
        setIsDeleting(null);
      }
    }
  };

  // Filter couriers based on search term
  const filteredCouriers = couriers?.filter((courier: User) => 
    courier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    courier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (courier.address && courier.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <UserManagementLayout
      title="Courier Management"
      description="Manage courier accounts"
      backLink="/employee/dashboard"
      backLinkText="Back to Dashboard"
      searchPlaceholder="Search couriers..."
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
          Failed to load couriers. Please try again.
        </div>
      ) : (
        <UserTable
          users={filteredCouriers}
          userType="courier"
          isDeleting={isDeleting}
          onDeleteUser={handleDeleteUser}
          noUsersMessage={searchTerm ? "No couriers found matching your search." : "No couriers found."}
        />
      )}
    </UserManagementLayout>
  );
};

export default CourierManagement;
