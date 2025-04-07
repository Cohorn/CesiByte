
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from './ui/button';
import { Utensils, ShoppingBag, Truck, User, LogOut, Menu, X } from 'lucide-react';
import SitemapBackButton from './SitemapBackButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import NotificationsPanel from './notifications/NotificationsPanel';

const NavBar: React.FC = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Check if user is an employee
  const isEmployee = user?.user_type === 'employee';
  const showSitemapButton = isEmployee && location.pathname !== '/employee/sitemap';

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  // Define navigation items based on user type
  const getNavItems = () => {
    if (!user) {
      return (
        <>
          <Button asChild variant="ghost" size="sm" className="nav-link">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild variant="default" size="sm">
            <Link to="/register">Register</Link>
          </Button>
        </>
      );
    }
    
    const navItems = {
      customer: [
        {
          path: '/restaurants',
          icon: <ShoppingBag className="mr-1 h-4 w-4" />,
          label: 'Restaurants',
        },
        {
          path: '/orders',
          icon: <Utensils className="mr-1 h-4 w-4" />,
          label: 'My Orders',
        },
      ],
      restaurant: [
        {
          path: '/restaurant/menu',
          icon: <Utensils className="mr-1 h-4 w-4" />,
          label: 'Menu',
        },
        {
          path: '/restaurant/orders',
          icon: <ShoppingBag className="mr-1 h-4 w-4" />,
          label: 'Orders',
        },
      ],
      courier: [
        {
          path: '/courier/available',
          icon: <ShoppingBag className="mr-1 h-4 w-4" />,
          label: 'Available',
        },
        {
          path: '/courier/active',
          icon: <Truck className="mr-1 h-4 w-4" />,
          label: 'Active',
        },
      ],
      employee: [
        {
          path: '/employee/dashboard',
          icon: <User className="mr-1 h-4 w-4" />,
          label: 'Dashboard',
        },
      ],
    };
    
    // Get navigation items based on user type
    const userNavItems = navItems[user.user_type] || [];
    
    // Add profile link
    const profilePath = isEmployee ? '/employee/profile' : '/profile';
    
    return (
      <>
        {userNavItems.map((item) => (
          <Button 
            key={item.path}
            asChild 
            variant={isActive(item.path) ? "default" : "ghost"} 
            size="sm" 
            className={cn(
              isActive(item.path) ? "nav-link-active" : "nav-link",
              isMobile && mobileMenuOpen ? "w-full justify-start" : ""
            )}
          >
            <Link to={item.path}>
              {item.icon}
              <span className={isMobile ? "inline" : "hidden md:inline"}>{item.label}</span>
            </Link>
          </Button>
        ))}
        
        <Button 
          asChild 
          variant={isActive(profilePath) ? "default" : "ghost"} 
          size="sm"
          className={cn(
            isActive(profilePath) ? "nav-link-active" : "nav-link",
            isMobile && mobileMenuOpen ? "w-full justify-start" : ""
          )}
        >
          <Link to={profilePath}>
            <User className="mr-1 h-4 w-4" />
            <span className={isMobile ? "inline" : "hidden md:inline"}>Profile</span>
          </Link>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "nav-link",
            isMobile && mobileMenuOpen ? "w-full justify-start" : ""
          )}
          onClick={() => signOut()}
        >
          <LogOut className="mr-1 h-4 w-4" />
          <span className={isMobile ? "inline" : "hidden md:inline"}>Logout</span>
        </Button>
      </>
    );
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-2 md:space-x-4">
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex items-center">
              <span className="inline-block bg-yellow-300 text-black font-bold rounded-l-md px-2 py-1">C</span>
              <span className="font-bold text-xl">esiByte</span>
            </div>
            <span className="text-xs text-muted-foreground italic hidden sm:inline-block">Food for thought, Engineer's favourite</span>
          </Link>
          {!isMobile && showSitemapButton && <SitemapBackButton />}
        </div>
        
        {isMobile ? (
          <>
            <div className="flex items-center space-x-2">
              {user && <NotificationsPanel />}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleMobileMenu}
                className="z-50"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
            
            {mobileMenuOpen && (
              <div className="fixed inset-0 top-16 z-40 bg-background p-4 flex flex-col space-y-4 animate-fade-in">
                {getNavItems()}
                {showSitemapButton && <SitemapBackButton className="w-full justify-start" />}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center space-x-1 md:space-x-2">
            {user && <NotificationsPanel />}
            {getNavItems()}
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
