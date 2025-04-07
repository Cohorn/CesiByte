
import React, { useState, useEffect } from 'react';
import { Navigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface UserData {
  id?: string;
  name: string;
  email: string;
  address: string;
  user_type: string;
  lat?: number;
  lng?: number;
  created_at?: string;
}

const UserDetail = () => {
  const { user } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userData, setUserData] = useState<UserData>({
    name: '',
    email: '',
    address: '',
    user_type: '',
    lat: 0,
    lng: 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Redirect if not logged in or not an employee
  if (!user) {
    return <Navigate to="/login" />;
  } else if (user.user_type !== 'employee') {
    return <Navigate to="/" />;
  }

  // Fetch user data
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await axios.get(`/api/employee/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data as UserData;
    }
  });

  // Update user mutation
  const updateUser = useMutation({
    mutationFn: async (updatedData: UserData) => {
      const response = await axios.put(`/api/employee/user/${userId}`, updatedData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      toast({
        title: "User Updated",
        description: "User information has been successfully updated.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update user information.",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    if (data) {
      setUserData(data);
    }
  }, [data]);

  // Validate latitude and longitude
  const validateCoordinates = () => {
    const errors: {[key: string]: string} = {};
    
    if (userData.lat !== undefined) {
      if (isNaN(userData.lat) || userData.lat < -90 || userData.lat > 90) {
        errors.lat = "Latitude must be between -90 and 90.";
      }
    }
    
    if (userData.lng !== undefined) {
      if (isNaN(userData.lng) || userData.lng < -180 || userData.lng > 180) {
        errors.lng = "Longitude must be between -180 and 180.";
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric values for coordinates
    if (name === 'lat' || name === 'lng') {
      const numValue = parseFloat(value);
      setUserData(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
    } else {
      setUserData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate coordinates before submitting
    if (!validateCoordinates()) {
      return;
    }
    
    updateUser.mutate(userData);
  };

  // Determine the back link based on user type
  const getBackLink = () => {
    if (!data) return "/employee/dashboard";
    
    switch(data.user_type) {
      case 'customer':
        return "/employee/customers";
      case 'restaurant':
        return "/employee/restaurants";
      case 'courier':
        return "/employee/couriers";
      default:
        return "/employee/dashboard";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to={getBackLink()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {data?.user_type === 'customer' ? 'Customers' : 
                        data?.user_type === 'restaurant' ? 'Restaurants' : 
                        data?.user_type === 'courier' ? 'Couriers' : 'Dashboard'}
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">User Detail</h1>
          <p className="text-gray-500">User ID: {userId}</p>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6 text-center text-red-500">
              Failed to load user data. Please try again.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>User Information</CardTitle>
                  <CardDescription>
                    View and edit user details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          name="name"
                          value={userData.name}
                          onChange={handleInputChange}
                          readOnly={!isEditing}
                          className={!isEditing ? "bg-gray-50" : ""}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          value={userData.email}
                          onChange={handleInputChange}
                          readOnly={!isEditing}
                          className={!isEditing ? "bg-gray-50" : ""}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        name="address"
                        value={userData.address}
                        onChange={handleInputChange}
                        readOnly={!isEditing}
                        className={!isEditing ? "bg-gray-50" : ""}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="lat">Latitude</Label>
                        <Input
                          id="lat"
                          name="lat"
                          type="number"
                          step="any"
                          min="-90"
                          max="90"
                          value={userData.lat || 0}
                          onChange={handleInputChange}
                          readOnly={!isEditing}
                          className={`${!isEditing ? "bg-gray-50" : ""} ${validationErrors.lat ? "border-red-500" : ""}`}
                        />
                        {validationErrors.lat && (
                          <p className="text-sm text-red-500">{validationErrors.lat}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="lng">Longitude</Label>
                        <Input
                          id="lng"
                          name="lng"
                          type="number"
                          step="any"
                          min="-180"
                          max="180"
                          value={userData.lng || 0}
                          onChange={handleInputChange}
                          readOnly={!isEditing}
                          className={`${!isEditing ? "bg-gray-50" : ""} ${validationErrors.lng ? "border-red-500" : ""}`}
                        />
                        {validationErrors.lng && (
                          <p className="text-sm text-red-500">{validationErrors.lng}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="user_type">User Type</Label>
                      <Input
                        id="user_type"
                        name="user_type"
                        value={userData.user_type}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      {isEditing ? (
                        <>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setIsEditing(false);
                              if (data) setUserData(data);
                              setValidationErrors({});
                            }}
                            className="mr-2"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={updateUser.isPending}
                          >
                            {updateUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                          </Button>
                        </>
                      ) : (
                        <Button 
                          type="button"
                          onClick={() => setIsEditing(true)}
                        >
                          Edit User
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                  <CardDescription>
                    Other details about this user
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">User ID</p>
                    <p className="text-sm text-gray-500">{userId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Created At</p>
                    <p className="text-sm text-gray-500">
                      {data?.created_at && new Date(data.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetail;
