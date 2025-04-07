import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Loader2, MapPin, Mail, User as UserIcon, Home, Calendar, Tag, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/api/services/userService';

interface UserData {
  id?: string;
  name: string;
  email: string;
  address: string;
  user_type: string;
  lat?: number;
  lng?: number;
  created_at?: string;
  employee_role?: string;
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

  if (!user) {
    return <Navigate to="/login" />;
  } else if (user.user_type !== 'employee') {
    return <Navigate to="/" />;
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await userApi.getUserById(userId);
      return response;
    }
  });

  const updateUser = useMutation({
    mutationFn: async (updatedData: UserData) => {
      if (!userId) throw new Error("User ID is required");
      const typedData: Partial<User> = {
        ...updatedData,
        user_type: updatedData.user_type as UserType
      };
      const response = await userApi.updateUser(userId, typedData);
      return response;
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

  const validateCoordinates = useCallback(() => {
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
  }, [userData.lat, userData.lng]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'lat' || name === 'lng') {
      const numValue = parseFloat(value);
      setUserData(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
    } else {
      setUserData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCoordinates()) {
      return;
    }
    
    updateUser.mutate(userData);
  };

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                        <Label htmlFor="name" className="flex items-center">
                          <UserIcon className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                          Name
                        </Label>
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
                        <Label htmlFor="email" className="flex items-center">
                          <Mail className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                          Email
                        </Label>
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
                      <Label htmlFor="address" className="flex items-center">
                        <Home className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                        Address
                      </Label>
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
                        <Label htmlFor="lat" className="flex items-center">
                          <MapPin className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                          Latitude
                        </Label>
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
                        <Label htmlFor="lng" className="flex items-center">
                          <MapPin className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                          Longitude
                        </Label>
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
                      <Label htmlFor="user_type" className="flex items-center">
                        <Tag className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                        User Type
                      </Label>
                      <Input
                        id="user_type"
                        name="user_type"
                        value={userData.user_type}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>

                    {userData.user_type === 'employee' && (
                      <div className="space-y-2">
                        <Label htmlFor="employee_role" className="flex items-center">
                          <Info className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                          Employee Role
                        </Label>
                        <Input
                          id="employee_role"
                          name="employee_role"
                          value={userData.employee_role || 'N/A'}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                    )}
                    
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
                  <div className="flex items-center pt-2">
                    <div className="min-w-8">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">User ID</p>
                      <p className="text-sm text-gray-500 break-all">{userId}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center">
                    <div className="min-w-8">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-sm text-gray-500">{formatDate(data?.created_at)}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {userData.user_type === 'restaurant' && (
                    <>
                      <div className="flex items-center">
                        <div className="min-w-8">
                          <Info className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Restaurant Management</p>
                          <Button asChild variant="outline" size="sm" className="mt-2">
                            <Link to={`/restaurant/${userId}/menu`}>
                              View Restaurant Menu
                            </Link>
                          </Button>
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {userData.user_type === 'courier' && (
                    <>
                      <div className="flex items-center">
                        <div className="min-w-8">
                          <Info className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Courier Management</p>
                          <Button asChild variant="outline" size="sm" className="mt-2">
                            <Link to={`/courier/${userId}/orders`}>
                              View Courier Orders
                            </Link>
                          </Button>
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col items-start">
                  <p className="text-sm font-medium mb-2">Quick Actions</p>
                  <div className="flex flex-wrap gap-2 w-full">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/orders?userId=${userId}`}>
                        View Orders
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/reviews?userId=${userId}`}>
                        View Reviews
                      </Link>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetail;
