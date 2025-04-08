
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Profile from '@/pages/Profile';
import NotFound from '@/pages/NotFound';
import RestaurantSetup from '@/pages/RestaurantSetup';
import RestaurantOrders from '@/pages/RestaurantOrders';
import RestaurantDetail from '@/pages/RestaurantDetail';
import RestaurantMenu from '@/pages/RestaurantMenu';
import Restaurants from '@/pages/Restaurants';
import CustomerOrders from '@/pages/CustomerOrders';
import CourierAvailableOrders from '@/pages/CourierAvailableOrders';
import CourierActiveOrders from '@/pages/CourierActiveOrders';
import CourierDashboard from '@/pages/CourierDashboard';
import EmployeeLogin from '@/pages/EmployeeLogin';
import EmployeeDashboard from '@/pages/EmployeeDashboard';
import EmployeeProfile from '@/pages/EmployeeProfile';
import ApiPlayground from '@/pages/employee/ApiPlayground';
import ComponentLibrary from '@/pages/employee/ComponentLibrary';
import CustomerManagement from '@/pages/employee/CustomerManagement';
import RestaurantManagement from '@/pages/employee/RestaurantManagement';
import CourierManagement from '@/pages/employee/CourierManagement';
import OrderManagement from '@/pages/employee/OrderManagement';
import UserDetail from '@/pages/employee/UserDetail';
import Sitemap from '@/pages/employee/Sitemap';
import Analytics from '@/pages/Analytics';
import './App.css';

function App() {
  const router = createBrowserRouter([
    {
      path: '/',
      element: <Index />
    },
    {
      path: '/login',
      element: <Login />
    },
    {
      path: '/register',
      element: <Register />
    },
    {
      path: '/profile',
      element: <Profile />
    },
    {
      path: '/restaurant/setup',
      element: <RestaurantSetup />
    },
    {
      path: '/restaurant/orders',
      element: <RestaurantOrders />
    },
    {
      path: '/restaurant/menu',
      element: <RestaurantMenu />
    },
    {
      path: '/analytics',
      element: <Analytics />
    },
    {
      path: '/restaurants',
      element: <Restaurants />
    },
    {
      path: '/restaurants/:id',
      element: <RestaurantDetail />
    },
    {
      path: '/restaurants/:id/menu',
      element: <RestaurantMenu />
    },
    {
      path: '/orders',
      element: <CustomerOrders />
    },
    {
      path: '/courier',
      element: <CourierDashboard />
    },
    {
      path: '/courier/orders',
      element: <CourierDashboard />
    },
    {
      path: '/courier/available-orders',
      element: <CourierAvailableOrders />
    },
    {
      path: '/courier/active-orders',
      element: <CourierActiveOrders />
    },
    {
      path: '/employee/login',
      element: <EmployeeLogin />
    },
    {
      path: '/employee',
      element: <EmployeeDashboard />
    },
    {
      path: '/employee/dashboard',
      element: <EmployeeDashboard />
    },
    {
      path: '/employee/profile',
      element: <EmployeeProfile />
    },
    {
      path: '/employee/api-playground',
      element: <ApiPlayground />
    },
    {
      path: '/employee/component-library',
      element: <ComponentLibrary />
    },
    {
      path: '/employee/customers',
      element: <CustomerManagement />
    },
    {
      path: '/employee/restaurants',
      element: <RestaurantManagement />
    },
    {
      path: '/employee/couriers',
      element: <CourierManagement />
    },
    {
      path: '/employee/couriers/:id',
      element: <UserDetail />
    },
    {
      path: '/employee/orders',
      element: <OrderManagement />
    },
    {
      path: '/employee/sitemap',
      element: <Sitemap />
    },
    {
      path: '*',
      element: <NotFound />
    }
  ]);

  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
