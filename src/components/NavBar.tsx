
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserCircle2, LogOut, ShoppingBag, Store, Truck, User, UserCog, Map } from 'lucide-react';
import NotificationsPanel from './notifications/NotificationsPanel';

const NavBar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Generate user's initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Get dashboard route based on user type
  const getDashboardRoute = () => {
    if (!user) return '/';
    
    switch (user.user_type) {
      case 'customer':
        return '/orders';
      case 'restaurant':
        return '/restaurant/orders';
      case 'courier':
        return '/courier/orders';
      case 'employee':
        return '/employee';
      default:
        return '/';
    }
  };

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto flex justify-between items-center py-3">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-xl font-bold">FoodApp</Link>
          
          {user && (
            <div className="hidden md:flex space-x-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to={getDashboardRoute()}>Dashboard</Link>
              </Button>
              
              {/* User-specific navigation links */}
              {user.user_type === 'customer' && (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/restaurants">Restaurants</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/orders">My Orders</Link>
                  </Button>
                </>
              )}
              
              {user.user_type === 'restaurant' && (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/restaurant/orders">Orders</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/restaurant/menu">Menu</Link>
                  </Button>
                </>
              )}
              
              {user.user_type === 'courier' && (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/courier/orders">My Deliveries</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/courier/available">Available Orders</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/courier/map">Map</Link>
                  </Button>
                </>
              )}
              
              {user.user_type === 'employee' && (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/employee">Dashboard</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/employee/restaurants">Restaurants</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/employee/customers">Customers</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/employee/couriers">Couriers</Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {user ? (
            <>
              {/* Notifications */}
              <NotificationsPanel />
              
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                className="flex items-center space-x-2"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <span className="hidden md:block">{user.name}</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  signOut();
                  navigate('/');
                }}
              >
                <LogOut className="h-5 w-5 md:mr-2" />
                <span className="hidden md:block">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
