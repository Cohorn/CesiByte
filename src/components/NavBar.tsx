
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NotificationsPanel from './notifications/NotificationsPanel';
import { useNotifications } from '@/hooks/useNotifications';

const NavBar: React.FC = () => {
  const { user, signOut } = useAuth(); // Changed 'logout' to 'signOut' to match AuthContext
  const location = useLocation();
  const { 
    notifications, 
    dismissNotification, 
    dismissAllNotifications, 
    markAllAsRead 
  } = useNotifications();

  // Function to check if a nav link is active
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-gray-800">
              Food Delivery
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Common navigation links */}
            <Link
              to="/"
              className={`text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/') ? 'bg-gray-100' : ''
              }`}
            >
              Home
            </Link>

            {/* User type specific navigation */}
            {user && user.user_type === 'customer' && (
              <>
                <Link
                  to="/restaurants"
                  className={`text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/restaurants') ? 'bg-gray-100' : ''
                  }`}
                >
                  Restaurants
                </Link>
                <Link
                  to="/my-orders"
                  className={`text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/my-orders') ? 'bg-gray-100' : ''
                  }`}
                >
                  My Orders
                </Link>
              </>
            )}

            {user && user.user_type === 'restaurant' && (
              <Link
                to="/restaurant-dashboard"
                className={`text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/restaurant-dashboard') ? 'bg-gray-100' : ''
                }`}
              >
                Dashboard
              </Link>
            )}
            
            {user && user.user_type === 'courier' && (
              <Link
                to="/courier-dashboard"
                className={`text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/courier-dashboard') ? 'bg-gray-100' : ''
                }`}
              >
                Dashboard
              </Link>
            )}
            
            {user && user.user_type === 'employee' && (
              <Link
                to="/admin-dashboard"
                className={`text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/admin-dashboard') ? 'bg-gray-100' : ''
                }`}
              >
                Admin
              </Link>
            )}

            {/* Notifications icon */}
            {user && (
              <NotificationsPanel
                notifications={notifications}
                onDismiss={dismissNotification}
                onDismissAll={dismissAllNotifications}
                onMarkAllAsRead={markAllAsRead}
              />
            )}

            {/* Authentication */}
            {user ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {user.name || user.email}
                </span>
                <button
                  onClick={signOut} // Changed from logout to signOut
                  className="text-red-600 hover:text-red-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
