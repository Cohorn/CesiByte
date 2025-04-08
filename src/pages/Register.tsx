import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authApi } from '@/api/services/authService';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, MapPin } from 'lucide-react';
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
import { UserType } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import Map from '@/components/Map';
import { registerUserWithReferral } from '@/utils/userRegistrationFix';

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
  referralCode: z.string().optional(),
});

const Register = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userType, setUserType] = useState<UserType>('customer');
  const [userLocation, setUserLocation] = useState({ lat: 40.7128, lng: -74.0060 });
  const [isMapLoaded, setIsMapLoaded] = useState(false);
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

  const allowEmployeeRegistration = import.meta.env.VITE_ALLOW_EMPLOYEE_REGISTRATION === 'true';
  const allowDevRegistration = import.meta.env.VITE_ALLOW_DEV_REGISTRATION === 'true';
  const allowComAgentRegistration = import.meta.env.VITE_ALLOW_COM_AGENT_REGISTRATION === 'true';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      address: '',
      userType: 'customer',
      referralCode: referralCode,
    },
  });

  useEffect(() => {
    form.setValue('referralCode', referralCode);
  }, [referralCode, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      const { success, error } = await registerUserWithReferral({
        name: values.name,
        email: values.email, 
        password: values.password,
        address: values.address,
        lat: userLocation.lat,
        lng: userLocation.lng,
        userType: values.userType as UserType,
        referralCode: values.referralCode
      });

      if (success) {
        toast({
          title: "Registration successful!",
          description: "You have been registered successfully.",
        });
        
        navigate('/login');
      } else {
        toast({
          title: "Registration failed",
          description: error || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      
      toast({
        title: "Registration failed",
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserTypeChange = (value: UserType) => {
    setUserType(value);
    form.setValue('userType', value);
  };

  const handleLocationSelected = (lat: number, lng: number, address: string) => {
    setUserLocation({ lat, lng });
    form.setValue('address', address);
  };

  const handleMapLoad = () => {
    setIsMapLoaded(true);
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
                        onValueChange={field.onChange}
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

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="relative">
                          <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                          <Input
                            placeholder="123 Main St, City"
                            className="pl-8"
                            {...field}
                          />
                        </div>
                        <div className="h-48 rounded-md overflow-hidden border border-gray-300">
                          <Map
                            initialLat={userLocation.lat}
                            initialLng={userLocation.lng}
                            onLocationSelected={handleLocationSelected}
                            onMapLoad={handleMapLoad}
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          {isMapLoaded
                            ? "Click on the map to set your location"
                            : "Loading map..."}
                        </p>
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
