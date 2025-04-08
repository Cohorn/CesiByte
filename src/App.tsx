
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EmployeeLogin from "./pages/EmployeeLogin";
import Profile from "./pages/Profile";
import Restaurants from "./pages/Restaurants";
import RestaurantDetail from "./pages/RestaurantDetail";
import CustomerOrders from "./pages/CustomerOrders";
import RestaurantSetup from "./pages/RestaurantSetup";
import RestaurantMenu from "./pages/RestaurantMenu";
import RestaurantOrders from "./pages/RestaurantOrders";
import CourierAvailableOrders from "./pages/CourierAvailableOrders";
import CourierActiveOrders from "./pages/CourierActiveOrders";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";

// Employee Portal Pages
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeeProfile from "./pages/EmployeeProfile";
import CustomerManagement from "./pages/employee/CustomerManagement";
import RestaurantManagement from "./pages/employee/RestaurantManagement";
import CourierManagement from "./pages/employee/CourierManagement";
import UserDetail from "./pages/employee/UserDetail";
import ApiPlayground from "./pages/employee/ApiPlayground";
import ComponentLibrary from "./pages/employee/ComponentLibrary";
import Sitemap from "./pages/employee/Sitemap";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/employee-login" element={<EmployeeLogin />} />
      <Route path="/employee/login" element={<EmployeeLogin />} />
      
      {/* Authenticated User Routes */}
      <Route path="/profile" element={<Profile />} />
      <Route path="/analytics" element={<Analytics />} />
      
      {/* Customer Routes */}
      <Route path="/restaurants" element={<Restaurants />} />
      <Route path="/restaurant/:restaurantId" element={<RestaurantDetail />} />
      <Route path="/orders" element={<CustomerOrders />} />
      
      {/* Restaurant Routes */}
      <Route path="/restaurant/setup" element={<RestaurantSetup />} />
      <Route path="/restaurant/menu" element={<RestaurantMenu />} />
      <Route path="/restaurant/orders" element={<RestaurantOrders />} />
      
      {/* Courier Routes */}
      <Route path="/courier/available" element={<CourierAvailableOrders />} />
      <Route path="/courier/active" element={<CourierActiveOrders />} />
      
      {/* Employee Portal Routes */}
      <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
      <Route path="/employee/profile" element={<EmployeeProfile />} />
      <Route path="/employee/sitemap" element={<Sitemap />} />
      
      {/* Employee Commercial Service Routes */}
      <Route path="/employee/customers" element={<CustomerManagement />} />
      <Route path="/employee/restaurants" element={<RestaurantManagement />} />
      <Route path="/employee/couriers" element={<CourierManagement />} />
      <Route path="/employee/customers/:userId" element={<UserDetail />} />
      <Route path="/employee/restaurants/:userId" element={<UserDetail />} />
      <Route path="/employee/couriers/:userId" element={<UserDetail />} />
      
      {/* Employee Developer Routes */}
      <Route path="/employee/api-playground" element={<ApiPlayground />} />
      <Route path="/employee/components" element={<ComponentLibrary />} />
      
      {/* Catch-all for 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </TooltipProvider>
);

export default App;
