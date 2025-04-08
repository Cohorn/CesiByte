
import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AtSign, Lock, AlertCircle, RefreshCw, Briefcase } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiClient } from '@/api/client';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  
  const { signIn, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check API connection on component mount
  useEffect(() => {
    checkApiConnection();
  }, []);

  const checkApiConnection = async () => {
    setIsCheckingConnection(true);
    setConnectionError(null);
    
    try {
      console.log('Checking API connection...');
      // Try a simple health check
      await apiClient.get('/health', { timeout: 5000 });
      console.log('API health check successful');
      setConnectionError(null);
    } catch (error: any) {
      console.error('API health check failed:', error);
      
      // Provide more specific error messages based on error type
      if (error.code === 'ECONNABORTED') {
        setConnectionError('Connection timeout when trying to reach the backend API. Please ensure the backend server is running.');
      } else if (error.code === 'ERR_NETWORK') {
        setConnectionError('Cannot connect to the backend API. Please check your network connection and ensure the backend server is accessible.');
      } else {
        setConnectionError(`Cannot connect to backend API: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setConnectionError(null);
    
    try {
      console.log(`Attempting to sign in with email: ${email}`);
      const { error } = await signIn(email, password);
      
      if (error) {
        console.error('Login error details:', error);
        
        if (error.code === 'ECONNABORTED') {
          toast({
            title: "Connection Timeout",
            description: "Connection to the server timed out. Please try again or check your network connection.",
            variant: "destructive"
          });
          setConnectionError("Connection to the server timed out. Please ensure the backend server is running.");
        } else if (error.response && error.response.data) {
          // Display specific error message from the backend
          toast({
            title: "Login Failed",
            description: error.response.data.error || error.response.data.message || "Authentication failed",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Login Failed",
            description: error.message || "Invalid credentials",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Success",
          description: "You have successfully logged in"
        });
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      
      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        setConnectionError("Connection to the server timed out. Please ensure the backend server is running.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user && !isLoading) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {connectionError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>
                  {connectionError}
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={checkApiConnection}
                      disabled={isCheckingConnection}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-3 w-3 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                      {isCheckingConnection ? 'Checking...' : 'Check Again'}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || isLoading || !!connectionError}
              >
                {isSubmitting ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-2">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Button 
                variant="link" 
                className="p-0 h-auto font-normal"
                onClick={() => navigate('/register')}
              >
                Register
              </Button>
            </p>
            <div className="w-full flex justify-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-sm flex items-center gap-2"
                onClick={() => navigate('/employee/login')}
              >
                <Briefcase className="h-4 w-4" />
                Employee Portal
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
