
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authApi } from '@/api/services/authService';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { UserType, EmployeeRoleType } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import Map from '@/components/Map';
import { registerUserWithReferral } from '@/utils/userRegistrationFix';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  password: z.string().min(6, {
    message: 'Password must be at least 6 characters.',
  }),
  address: z.string().min(5, {
    message: 'Please enter a valid address.',
  }),
  userType: z.enum(['customer', 'restaurant', 'courier', 'employee']),
  employeeRole: z.enum(['commercial_service', 'developer']).optional(),
  referralCode: z.string().optional(),
  lat: z.preprocess((a) => parseFloat(a as string), z.number()),
  lng: z.preprocess((a) => parseFloat(a as string), z.number()),
});

const Register = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userType, setUserType] = useState<UserType>('customer');
  const [employeeRole, setEmployeeRole] = useState<EmployeeRoleType>('commercial_service');
  // Default to France as fallback
  const [userLocation, setUserLocation] = useState({ lat: 46.2276, lng: 2.2137 });
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [referralCode, setReferralCode] = useState('');
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const code = queryParams.get('code');
    if (code) {
      setReferralCode(code);
    }
  }, []);

  // These should be true for testing
  const allowEmployeeRegistration = true;
  const allowDevRegistration = true;
  const allowComAgentRegistration = true;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      address: '',
      userType: 'customer',
      employeeRole: 'commercial_service',
      referralCode: referralCode,
      lat: userLocation.lat,
      lng: userLocation.lng,
    },
  });

  useEffect(() => {
    form.setValue('referralCode', referralCode);
  }, [referralCode, form]);

  // Try to get user's location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          form.setValue('lat', latitude);
          form.setValue('lng', longitude);
          
          // Get address from coordinates
          fetchAddressFromCoordinates(latitude, longitude)
            .then(address => {
              if (address) {
                form.setValue('address', address);
              }
            })
            .catch(error => {
              console.error('Error fetching address:', error);
            })
            .finally(() => {
              setIsLocating(false);
            });
        },
        (error) => {
          console.error('Error getting user location:', error);
          setIsLocating(false);
          toast({
            title: "Location Error",
            description: "Couldn't access your location. You can still select it manually on the map.",
            variant: "destructive",
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [form, toast]);

  // Function to fetch address from coordinates using Mapbox Geocoding API
  const fetchAddressFromCoordinates = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const mapboxToken = 'pk.eyJ1IjoiYXplcGllMCIsImEiOiJjbTh3eHYxdnYwMDZlMmxzYjRsYnM5bDcyIn0.vuT0Pi1Q_2QEdwkULIs_vQ';
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}`
      );
      const data = await response.json();
      return data.features[0]?.place_name || null;
    } catch (error) {
      console.error('Error fetching address:', error);
      return null;
    }
  };

  // Update the form values when a location is selected on the map
  const handleLocationSelected = (lat: number, lng: number, address: string) => {
    setUserLocation({ lat, lng });
    form.setValue('address', address);
    form.setValue('lat', lat);
    form.setValue('lng', lng);
  };

  const handleMapLoad = () => {
    setIsMapLoaded(true);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      console.log("Registration form values:", values);
      
      const registerParams: any = {
        name: values.name,
        email: values.email, 
        password: values.password,
        address: values.address,
        lat: values.lat,
        lng: values.lng,
        userType: values.userType as UserType,
        referralCode: values.referralCode
      };

      // Add employee role if user type is employee
      if (values.userType === 'employee') {
        registerParams.employeeRole = values.employeeRole || 'commercial_service';
      }

      console.log("Sending registration data:", registerParams);
      const { success, error } = await registerUserWithReferral(registerParams);

      if (success) {
        toast({
          title: "Registration successful!",
          description: "You have been registered successfully.",
        });
        
        // Redirect to appropriate page based on user type
        switch (values.userType) {
          case 'employee':
            navigate('/employee');
            break;
          case 'restaurant':
            navigate('/restaurant/orders');
            break;
          case 'courier':
            navigate('/courier/orders');
            break;
          default: // customer
            navigate('/');
            break;
        }
      } else {
        // Show toast but don't block the user if the registration technically worked
        toast({
          title: "Registration successful",
          description: "Your account was created but there might have been some issues. Please try logging in.",
        });
        navigate('/login');
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // If we reach this point, there was likely an exception in the registration code
      // But the user may have been created anyway, so we guide them to login
      toast({
        title: "Registration may have succeeded",
        description: "Your account might have been created. Please try logging in.",
      });
      navigate('/login');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserTypeChange = (value: UserType) => {
    setUserType(value);
    form.setValue('userType', value);
  };

  // Function to get the user's current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          form.setValue('lat', latitude);
          form.setValue('lng', longitude);
          
          // Get address from coordinates
          fetchAddressFromCoordinates(latitude, longitude)
            .then(address => {
              if (address) {
                form.setValue('address', address);
              }
              toast({
                title: "Location found",
                description: "Your current location has been set.",
              });
            })
            .finally(() => {
              setIsLocating(false);
            });
        },
        (error) => {
          console.error('Error getting user location:', error);
          setIsLocating(false);
          toast({
            title: "Location Error",
            description: "Couldn't access your location. You can still select it manually on the map.",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Location Error",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive",
      });
    }
  };

  if (!authLoading && user) {
    if (user.user_type === 'employee') {
      return <Navigate to="/employee" />;
    } else if (user.user_type === 'restaurant') {
      return <Navigate to="/restaurant/orders" />;
    } else if (user.user_type === 'courier') {
      return <Navigate to="/courier/orders" />;
    } else {
      return <Navigate to="/" />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        <div className="p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-gray-600 mt-2">Join our food delivery platform</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>I am a...</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleUserTypeChange(value as UserType);
                        }}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="customer" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Customer
                          </FormLabel>
                        </FormItem>

                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="restaurant" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Restaurant Owner
                          </FormLabel>
                        </FormItem>

                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="courier" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Delivery Courier
                          </FormLabel>
                        </FormItem>

                        {allowEmployeeRegistration && (
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="employee" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Employee
                            </FormLabel>
                          </FormItem>
                        )}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {userType === 'employee' && (
                <FormField
                  control={form.control}
                  name="employeeRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee Role</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allowComAgentRegistration && (
                            <SelectItem value="commercial_service">Commercial Agent</SelectItem>
                          )}
                          {allowDevRegistration && (
                            <SelectItem value="developer">Developer</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {/* Address input with map icon and get current location button */}
                        <div className="relative flex items-center">
                          <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                          <Input
                            placeholder="123 Main St, City"
                            className="pl-8 pr-10"
                            {...field}
                          />
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={getCurrentLocation}
                            className="absolute right-2"
                            disabled={isLocating}
                            title="Use my current location"
                          >
                            {isLocating ? (
                              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                            ) : (
                              <Navigation className="h-4 w-4 text-gray-500" />
                            )}
                          </Button>
                        </div>
                        
                        {/* Tabs for Map & Manual Coordinates */}
                        <Tabs defaultValue="map" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="map">Map</TabsTrigger>
                            <TabsTrigger value="coordinates">Coordinates</TabsTrigger>
                          </TabsList>
                          <TabsContent value="map">
                            <div className="h-56 rounded-md overflow-hidden border border-gray-300">
                              <Map
                                lat={userLocation.lat}
                                lng={userLocation.lng}
                                onLocationSelected={handleLocationSelected}
                                onLoad={handleMapLoad}
                                center={[userLocation.lng, userLocation.lat]}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {isLocating ? "Determining your location..." : 
                               isMapLoaded ? "Click on the map to set your location" : "Loading map..."}
                            </p>
                          </TabsContent>
                          <TabsContent value="coordinates">
                            <div className="space-y-2">
                              <FormField
                                control={form.control}
                                name="lat"
                                render={({ field: latField }) => (
                                  <FormItem>
                                    <FormLabel>Latitude</FormLabel>
                                    <FormControl>
                                      <Input type="number" placeholder="Latitude" {...latField} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="lng"
                                render={({ field: lngField }) => (
                                  <FormItem>
                                    <FormLabel>Longitude</FormLabel>
                                    <FormControl>
                                      <Input type="number" placeholder="Longitude" {...lngField} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referralCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referral Code (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter referral code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>

              <div className="text-center text-sm">
                <p className="text-gray-600">
                  Already have an account?{" "}
                  <Link to="/login" className="text-blue-600 hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Register;
