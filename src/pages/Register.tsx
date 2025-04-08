import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { UserType } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '@/frontend/hooks';
import { validateReferralCode } from '@/utils/referralUtils';

const Register = () => {
  const [searchParams] = useSearchParams();
  const defaultType = searchParams.get('type') as UserType || 'customer';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [userType, setUserType] = useState<UserType>(defaultType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  
  const { signUp, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createRestaurant } = useRestaurant();

  useEffect(() => {
    if (errorMessage) {
      setErrorMessage(null);
    }
  }, [email, password, name, address, userType]);

  const validateCoordinates = () => {
    const errors: {[key: string]: string} = {};
    
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.lat = "Latitude must be between -90 and 90.";
    }
    
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.lng = "Longitude must be between -180 and 180.";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image file is too large (maximum 5MB)",
        variant: "destructive"
      });
      return;
    }
    
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Invalid file type. Please upload a JPG, PNG, GIF or WEBP image.",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      await ensureStorageBucket();
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('restaurant_images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw uploadError;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('restaurant_images')
        .getPublicUrl(filePath);
      
      setImagePreview(publicUrl);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
  };

  const ensureStorageBucket = async () => {
    try {
      console.log('Checking if restaurant_images bucket exists');
      const { data: buckets, error } = await supabase
        .storage
        .listBuckets();
        
      if (error) throw error;
      
      const bucketExists = buckets.some(bucket => bucket.name === 'restaurant_images');
      
      if (!bucketExists) {
        console.log('Creating restaurant_images bucket');
        const { error: createError } = await supabase.storage.createBucket('restaurant_images', {
          public: true
        });
        
        if (createError) throw createError;
        console.log('Bucket created successfully');
      } else {
        console.log('Bucket already exists');
      }
      
      return true;
    } catch (error) {
      console.error('Error ensuring storage bucket exists:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCoordinates()) {
      return;
    }
    
    setIsSubmitting(true);
    setErrorMessage(null);
    setReferralError(null);
    
    try {
      if (referralCode) {
        setIsValidatingReferral(true);
        const isValid = await validateReferralCode(referralCode);
        setIsValidatingReferral(false);
        
        if (!isValid) {
          setReferralError('Invalid referral code');
          setIsSubmitting(false);
          return;
        }
      }
      
      let userData: any = {
        email,
        password,
        name,
        user_type: userType,
        referral_code: referralCode || undefined
      };
      
      if (userType !== 'employee' && userType !== 'dev' && userType !== 'com_agent') {
        userData.address = address;
        userData.lat = lat;
        userData.lng = lng;
      } else {
        userData.address = '';
        userData.lat = 0;
        userData.lng = 0;
      }
      
      console.log('Registration data being sent:', userData);
      
      const { error } = await signUp(email, password, userData);
      
      if (error) {
        console.error("Registration error:", error);
        let errorMsg = error.message || "Registration failed";
        
        if (error.response && error.response.data && error.response.data.error) {
          errorMsg += `: ${error.response.data.error}`;
        }
        
        setErrorMessage(errorMsg);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive"
        });
      } else {
        if (userType === 'restaurant') {
          try {
            setTimeout(async () => {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                  const restaurantData = {
                    name,
                    address,
                    lat,
                    lng,
                    user_id: session.user.id,
                    image_url: imagePreview
                  };
                  
                  console.log('Creating restaurant for new user:', restaurantData);
                  await createRestaurant(restaurantData);
                  
                  toast({
                    title: "Success",
                    description: "Restaurant account created successfully!",
                  });
                  
                  navigate('/restaurant/menu');
                }
              } catch (restError) {
                console.error("Error creating restaurant:", restError);
                toast({
                  title: "Warning",
                  description: "Account created but restaurant setup failed. Please try setting up your restaurant again.",
                  variant: "destructive"
                });
                navigate('/restaurant/setup');
              }
            }, 1000);
          } catch (restError) {
            console.error("Error in restaurant creation:", restError);
          }
        } else {
          toast({
            title: "Success",
            description: "Your account has been created"
          });
          
          setTimeout(() => {
            if (userType === 'employee') {
              navigate('/employee/dashboard');
            } else if (userType === 'courier') {
              navigate('/courier/available');
            } else {
              navigate('/');
            }
          }, 500);
        }
      }
    } catch (error: any) {
      console.error("Unexpected registration error:", error);
      setErrorMessage("An unexpected error occurred during registration");
      toast({
        title: "Error",
        description: "An unexpected error occurred during registration",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validUserTypes = ['customer', 'restaurant', 'courier', 'employee', 'dev', 'com_agent'];

  if (user && !isLoading) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Create an Account</CardTitle>
            <CardDescription className="text-center">
              Register to start using our service
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {errorMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>I am a:</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    className={`p-2 ${userType === 'customer' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    onClick={() => setUserType('customer')}
                    variant={userType === 'customer' ? "default" : "outline"}
                  >
                    Customer
                  </Button>
                  <Button
                    type="button"
                    className={`p-2 ${userType === 'restaurant' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    onClick={() => setUserType('restaurant')}
                    variant={userType === 'restaurant' ? "default" : "outline"}
                  >
                    Restaurant
                  </Button>
                  <Button
                    type="button"
                    className={`p-2 ${userType === 'courier' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    onClick={() => setUserType('courier')}
                    variant={userType === 'courier' ? "default" : "outline"}
                  >
                    Courier
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    type="button"
                    className={`p-2 ${userType === 'employee' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    onClick={() => setUserType('employee')}
                    variant={userType === 'employee' ? "default" : "outline"}
                  >
                    Employee
                  </Button>
                  <Button
                    type="button"
                    className={`p-2 ${userType === 'dev' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    onClick={() => setUserType('dev')}
                    variant={userType === 'dev' ? "default" : "outline"}
                  >
                    Dev
                  </Button>
                  <Button
                    type="button"
                    className={`p-2 ${userType === 'com_agent' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    onClick={() => setUserType('com_agent')}
                    variant={userType === 'com_agent' ? "default" : "outline"}
                  >
                    Com Agent
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a secure password"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="referralCode">Referral Code (Optional)</Label>
                <Input
                  id="referralCode"
                  type="text"
                  value={referralCode}
                  onChange={(e) => {
                    setReferralCode(e.target.value);
                    setReferralError(null);
                  }}
                  placeholder="Enter referral code if you have one"
                  className={referralError ? "border-red-500" : ""}
                  disabled={isValidatingReferral}
                />
                {referralError && (
                  <p className="text-sm text-red-500">{referralError}</p>
                )}
              </div>
              
              {userType !== 'employee' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your address"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lat">Latitude</Label>
                      <Input
                        id="lat"
                        type="number"
                        step="any"
                        value={lat || ''}
                        onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                        placeholder="Latitude coordinate"
                        min="-90"
                        max="90"
                        required
                        className={validationErrors.lat ? "border-red-500" : ""}
                      />
                      {validationErrors.lat && (
                        <p className="text-sm text-red-500">{validationErrors.lat}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lng">Longitude</Label>
                      <Input
                        id="lng"
                        type="number"
                        step="any"
                        value={lng || ''}
                        onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                        placeholder="Longitude coordinate"
                        min="-180"
                        max="180"
                        required
                        className={validationErrors.lng ? "border-red-500" : ""}
                      />
                      {validationErrors.lng && (
                        <p className="text-sm text-red-500">{validationErrors.lng}</p>
                      )}
                    </div>
                  </div>
                </>
              )}
              
              {userType === 'restaurant' && (
                <div className="space-y-2">
                  <Label>Restaurant Cover Image (Optional)</Label>
                  {imagePreview ? (
                    <div className="relative w-full aspect-video mb-2 rounded-md overflow-hidden bg-gray-100">
                      <img 
                        src={imagePreview} 
                        alt="Restaurant" 
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 rounded-full"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                      <Input 
                        id="image" 
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                      <label 
                        htmlFor="image"
                        className="cursor-pointer flex flex-col items-center justify-center py-4"
                      >
                        <Upload className="h-10 w-10 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">
                          {isUploading ? 'Uploading...' : 'Upload restaurant photo (optional)'}
                        </span>
                        <span className="text-xs text-gray-400 mt-1">
                          JPG, PNG, GIF up to 5MB
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}
              
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || isValidatingReferral}
              >
                {isSubmitting ? 'Creating Account...' : 'Register'}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Button 
                onClick={() => navigate('/login')}
                variant="link"
                className="p-0 h-auto font-normal"
              >
                Login
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Register;
