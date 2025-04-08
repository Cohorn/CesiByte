
import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AtSign, Lock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const EmployeeLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { signIn, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Clear error message when inputs change
  useEffect(() => {
    if (errorMessage) {
      setErrorMessage(null);
    }
  }, [email, password]);

  const handleEmployeeLogin = async (e: React.FormEvent) => {
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
    setErrorMessage(null);
    
    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        console.error("Login error:", error);
        const errorMsg = error.response?.data?.error || error.message || "Invalid credentials";
        setErrorMessage(errorMsg);
        toast({
          title: "Login Failed",
          description: errorMsg,
          variant: "destructive"
        });
      } else {
        // Wait for auth to complete and redirect only if user is an employee
        setTimeout(() => {
          if (user?.user_type === 'employee') {
            navigate('/employee/dashboard');
          } else {
            setErrorMessage("Only employees can access this portal");
            toast({
              title: "Access Denied",
              description: "Only employees can access this portal",
              variant: "destructive"
            });
          }
        }, 500);
      }
    } catch (error: any) {
      console.error("Unexpected error:", error);
      setErrorMessage("An unexpected error occurred. Please try again.");
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redirect if already logged in as employee
  if (user?.user_type === 'employee' && !isLoading) {
    return <Navigate to="/employee/dashboard" />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      
      <div className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Employee Portal</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the employee dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {errorMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleEmployeeLogin} className="space-y-4">
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
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting ? 'Logging in...' : 'Access Employee Portal'}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-2">
            <p className="text-sm text-gray-600 text-center">
              This portal is restricted to authorized employees only.
            </p>
            <p className="text-sm text-gray-600 text-center">
              Need an employee account?{' '}
              <Button 
                onClick={() => navigate('/register?type=employee')}
                className="p-0 h-auto font-normal"
                variant="link"
              >
                Register here
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeLogin;
