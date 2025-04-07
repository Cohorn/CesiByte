
import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { userApi } from '@/api/services/userService';
import { User } from '@/lib/database.types';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import UserManagementLayout from '@/components/employee/UserManagementLayout';
import UserTable from '@/components/employee/UserTable';

const CustomerManagement = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Fetch all customers
  const { data: customers, isLoading, error, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await userApi.getUsersByType('customer');
      return response;
    }
  });

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      setIsDeleting(userId);
      try {
        await userApi.deleteUser(userId);
        toast({
          title: "User Deleted",
          description: "The user has been successfully deleted."
        });
        refetch();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete the user.",
          variant: "destructive"
        });
      } finally {
        setIsDeleting(null);
      }
    }
  };

  // Filter customers based on search term
  const filteredCustomers = customers?.filter((customer: User) => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <UserManagementLayout
      title="Customer Management"
      description="Manage customer accounts"
      backLink="/employee/dashboard"
      backLinkText="Back to Dashboard"
      searchPlaceholder="Search customers..."
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
          Failed to load customers. Please try again.
        </div>
      ) : (
        <UserTable
          users={filteredCustomers}
          userType="customer"
          isDeleting={isDeleting}
          onDeleteUser={handleDeleteUser}
          noUsersMessage={searchTerm ? "No customers found matching your search." : "No customers found."}
        />
      )}
    </UserManagementLayout>
  );
};

export default CustomerManagement;
