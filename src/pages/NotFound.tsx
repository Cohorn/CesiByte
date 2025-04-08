
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  // Determine the most appropriate homepage based on user type
  const getHomepage = () => {
    if (!user) return "/";
    
    switch(user.user_type) {
      case 'restaurant':
        return "/restaurant/orders";
      case 'courier':
        return "/courier/available-orders";
      case 'employee':
        return "/employee/dashboard";
      case 'customer':
      default:
        return "/restaurants";
    }
  };

  // Check what type of route the user was trying to access
  const isEmployeeRoute = location.pathname.startsWith("/employee");
  const isRestaurantRoute = location.pathname.startsWith("/restaurant");
  const isCourierRoute = location.pathname.startsWith("/courier");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="flex flex-col items-center text-center">
          <div className="bg-red-100 p-3 rounded-full mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-4xl font-bold mb-2">404</h1>
          <p className="text-xl text-gray-600 mb-6">Oops! Page not found</p>
          <p className="text-gray-500 mb-6">
            The page you are looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button asChild className="flex-1" variant="default">
              <Link to={getHomepage()}>
                <Home className="mr-2 h-4 w-4" />
                Home
              </Link>
            </Button>
            
            <Button 
              className="flex-1" 
              variant="outline"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            
            {isEmployeeRoute && !user?.user_type?.includes('employee') && (
              <Button asChild className="flex-1 mt-2 sm:mt-0" variant="outline">
                <Link to="/employee/login">
                  Employee Login
                </Link>
              </Button>
            )}
            
            {isRestaurantRoute && user?.user_type !== 'restaurant' && (
              <Button asChild className="flex-1 mt-2 sm:mt-0" variant="outline">
                <Link to="/login">
                  Restaurant Login
                </Link>
              </Button>
            )}
            
            {isCourierRoute && user?.user_type !== 'courier' && (
              <Button asChild className="flex-1 mt-2 sm:mt-0" variant="outline">
                <Link to="/login">
                  Courier Login
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
