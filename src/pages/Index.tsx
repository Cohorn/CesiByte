
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import NavBar from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { User, Utensils, Truck } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect logged-in users to appropriate dashboard
  React.useEffect(() => {
    if (user && user.user_type === 'employee') {
      navigate('/employee');
    } else if (user && user.user_type === 'restaurant') {
      navigate('/restaurant/orders');
    } else if (user && user.user_type === 'courier') {
      navigate('/courier/orders');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-100">
      <NavBar />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-24 flex flex-col md:flex-row items-center">
        <div className="flex-1 mb-8 md:mb-0 md:pr-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-food-900 mb-4">
            <span className="text-food-500">CesiByte</span> Food Delivery
          </h1>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl">
            Engineered for satisfaction: Food delivery that understands the tech-savvy appetite.
            From your favorite local restaurants to your doorstep, faster than a compiler optimization.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button 
              size="lg" 
              onClick={() => navigate('/register')}
              className="bg-food-500 hover:bg-food-600"
            >
              Sign Up Now
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate('/restaurants')}
              className="border-food-500 text-food-500 hover:bg-food-50"
            >
              Browse Restaurants
            </Button>
          </div>
        </div>
        <div className="flex-1">
          <div className="relative rounded-xl overflow-hidden shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1482049016688-2d3e1b311543?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=840&q=80" 
              alt="Delicious food" 
              className="w-full h-auto object-cover rounded-xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How CesiByte Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Connecting hungry developers with local restaurants and efficient couriers
              through a streamlined, tech-powered platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* For Customers */}
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="p-6 text-center">
                <div className="mb-4 mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-food-100">
                  <User size={32} className="text-food-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">For Customers</h3>
                <p className="text-gray-600">
                  Browse your favorite restaurants, order with a few clicks, and track your delivery in real-time.
                  Pay securely online and enjoy food delivered to your door.
                </p>
              </CardContent>
            </Card>

            {/* For Restaurants */}
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100">
              <CardContent className="p-6 text-center">
                <div className="mb-4 mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-food-100">
                  <Utensils size={32} className="text-food-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">For Restaurants</h3>
                <p className="text-gray-600">
                  Partner with us to reach more customers, manage your menu online, and receive orders instantly.
                  Focus on cooking while we handle the delivery logistics.
                </p>
              </CardContent>
            </Card>

            {/* For Couriers */}
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow overflow-hidden bg-gradient-to-br from-yellow-50 to-yellow-100">
              <CardContent className="p-6 text-center">
                <div className="mb-4 mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-food-100">
                  <Truck size={32} className="text-food-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">For Couriers</h3>
                <p className="text-gray-600">
                  Join our network of delivery partners, choose your own schedule, and earn competitive pay.
                  Our app optimizes routes to maximize your efficiency and earnings.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Images Carousel */}
      <section className="py-16 bg-gradient-to-t from-orange-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Delicious Choices</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Explore a world of culinary delights, from comfort food to exotic cuisines
            </p>
          </div>

          <Carousel className="w-full max-w-5xl mx-auto">
            <CarouselContent>
              {[
                {
                  img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
                  title: "Gourmet Pizza"
                },
                {
                  img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
                  title: "Fresh Salads"
                },
                {
                  img: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
                  title: "Delicious Burgers"
                },
                {
                  img: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
                  title: "Authentic Ramen"
                },
                {
                  img: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
                  title: "Healthy Bowls"
                }
              ].map((item, index) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                  <div className="p-1">
                    <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      <CardContent className="p-0">
                        <div className="relative aspect-square">
                          <img 
                            src={item.img} 
                            alt={item.title} 
                            className="object-cover w-full h-full"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
                            <h3 className="text-white font-bold text-xl p-4">{item.title}</h3>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-food-500 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Order?</h2>
          <p className="max-w-2xl mx-auto mb-8 text-white/90">
            Join thousands of satisfied customers and experience the future of food delivery today.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate('/register')}
            className="bg-white text-food-500 hover:bg-gray-100"
          >
            Get Started
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">CesiByte</h3>
              <p className="text-gray-400">
                Food for thought, Engineer's favourite.
                The smart choice for food delivery.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="/register" className="text-gray-400 hover:text-white transition-colors">Sign Up</a></li>
                <li><a href="/login" className="text-gray-400 hover:text-white transition-colors">Log In</a></li>
                <li><a href="/restaurants" className="text-gray-400 hover:text-white transition-colors">Restaurants</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <p className="text-gray-400">
                123 Tech Avenue<br />
                Silicon Valley, CA 94043<br />
                contact@cesibyte.com
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500">
            <p>&copy; {new Date().getFullYear()} CesiByte. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
