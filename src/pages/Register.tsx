
import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { UserType } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  
  const { signUp, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Clear error message when inputs change
  useEffect(() => {
    if (errorMessage) {
      setErrorMessage(null);
    }
  }, [email, password, name, address, userType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      let userData: any = {
        email,
        password,
        name,
        user_type: userType
      };
      
      // Only include address and location for non-employee users
      if (userType !== 'employee') {
        userData.address = address;
        userData.lat = lat;
        userData.lng = lng;
      } else {
        // For employees, set empty address and 0 coordinates
        userData.address = '';
        userData.lat = 0;
        userData.lng = 0;
      }
      
      console.log('Registration data being sent:', userData);
      
      const { error } = await signUp(email, password, userData);
      
      if (error) {
        console.error("Registration error:", error);
        let errorMsg = error.message || "Registration failed";
        
        // Add more details from the error response if available
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
        toast({
          title: "Success",
          description: "Your account has been created"
        });
        
        // Small delay to ensure the registration is complete before redirect
        setTimeout(() => {
          // Redirect based on user type
          if (userType === 'restaurant') {
            navigate('/restaurant/setup');
          } else if (userType === 'employee') {
            navigate('/employee/dashboard');
          } else if (userType === 'courier') {
            navigate('/courier/available');
          } else {
            navigate('/');
          }
        }, 500);
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

  // Redirect if user is already logged in
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
                <div className="grid grid-cols-4 gap-2">
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
                  <Button
                    type="button"
                    className={`p-2 ${userType === 'employee' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    onClick={() => setUserType('employee')}
                    variant={userType === 'employee' ? "default" : "outline"}
                  >
                    Employee
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
              
              {/* Only show address and location fields for non-employee users */}
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
                        required
                      />
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
                        required
                      />
                    </div>
                  </div>
                </>
              )}
              
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
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
