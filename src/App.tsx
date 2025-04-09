
import { Routes, Route } from 'react-router-dom';
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
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/restaurant/setup" element={<RestaurantSetup />} />
        <Route path="/restaurant/orders" element={<RestaurantOrders />} />
        <Route path="/restaurant/menu" element={<RestaurantMenu />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/restaurants" element={<Restaurants />} />
        <Route path="/restaurants/:id" element={<RestaurantDetail />} />
        <Route path="/restaurant/:id" element={<RestaurantDetail />} />
        <Route path="/restaurants/:id/menu" element={<RestaurantMenu />} />
        <Route path="/restaurant/:id/menu" element={<RestaurantMenu />} />
        <Route path="/orders" element={<CustomerOrders />} />
        <Route path="/courier" element={<CourierDashboard />} />
        <Route path="/courier/orders" element={<CourierDashboard />} />
        <Route path="/courier/available-orders" element={<CourierAvailableOrders />} />
        <Route path="/courier/active-orders" element={<CourierActiveOrders />} />
        <Route path="/employee/login" element={<EmployeeLogin />} />
        <Route path="/employee" element={<EmployeeDashboard />} />
        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
        <Route path="/employee/profile" element={<EmployeeProfile />} />
        <Route path="/employee/api-playground" element={<ApiPlayground />} />
        <Route path="/employee/component-library" element={<ComponentLibrary />} />
        <Route path="/employee/customers" element={<CustomerManagement />} />
        <Route path="/employee/restaurants" element={<RestaurantManagement />} />
        <Route path="/employee/couriers" element={<CourierManagement />} />
        <Route path="/employee/couriers/:id" element={<UserDetail />} />
        <Route path="/employee/orders" element={<OrderManagement />} />
        <Route path="/employee/sitemap" element={<Sitemap />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
