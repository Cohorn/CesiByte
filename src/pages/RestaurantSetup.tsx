import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useRestaurant } from '@/frontend/hooks';
import NavBar from '@/components/NavBar';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MapPin, RotateCcw, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import RestaurantImageUpload from '@/components/restaurant/RestaurantImageUpload';

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Restaurant name must be at least 2 characters.",
  }),
  address: z.string().min(10, {
    message: "Address must be at least 10 characters.",
  }),
  image_url: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const RestaurantSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();
  const { restaurant, loading, createRestaurant, updateRestaurant, deleteRestaurant } = useRestaurant();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      image_url: "",
    },
  });

  useEffect(() => {
    if (restaurant) {
      setValue("name", restaurant.name);
      setValue("address", restaurant.address);
      if (restaurant.image_url) {
        setValue("image_url", restaurant.image_url);
        setImagePreview(restaurant.image_url);
      }
    }
  }, [restaurant, setValue]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleImageUpload = (url: string) => {
    setImagePreview(url);
    setValue("image_url", url, { shouldDirty: true });
  };

  const removeImage = () => {
    setImagePreview(null);
    setValue("image_url", "", { shouldDirty: true });
  };

  const handleDeleteRestaurant = async () => {
    if (!restaurant) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteRestaurant();
      if (success) {
        toast({
          title: "Success",
          description: "Restaurant deleted successfully. You can create a new one now.",
        });
        reset({
          name: "",
          address: "",
          image_url: ""
        });
        setImagePreview(null);
      }
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      toast({
        title: "Error",
        description: "Failed to delete restaurant",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    if (restaurant) {
      setValue("name", restaurant.name);
      setValue("address", restaurant.address);
      if (restaurant.image_url) {
        setValue("image_url", restaurant.image_url);
        setImagePreview(restaurant.image_url);
      } else {
        setValue("image_url", "");
        setImagePreview(null);
      }
    } else {
      reset({
        name: "",
        address: "",
        image_url: ""
      });
      setImagePreview(null);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to manage a restaurant",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const restaurantData = {
        name: data.name,
        address: data.address,
        lat: user.lat || 0,
        lng: user.lng || 0,
        user_id: user.id,
        image_url: data.image_url || null
      };
      
      console.log("Submitting restaurant data:", restaurantData);
      
      let result;
      
      if (restaurant) {
        result = await updateRestaurant(restaurantData);
      } else {
        result = await createRestaurant(restaurantData);
      }

      if (result) {
        toast({
          title: "Success!",
          description: restaurant ? "Restaurant updated" : "Restaurant created",
        });
        
        if (!restaurant) {
          navigate('/restaurant/menu');
        }
      }
    } catch (error) {
      console.error('Error saving restaurant:', error);
      toast({
        title: "Error",
        description: "Failed to save restaurant information",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">
          {restaurant ? 'Update Your Restaurant' : 'Set Up Your Restaurant'}
        </h1>
        
        {loading ? (
          <div className="flex justify-center">
            <p>Loading...</p>
          </div>
        ) : (
          <div className="max-w-md mx-auto bg-white rounded-md shadow-md p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="name">Restaurant Name</Label>
                <Input
                  id="name"
                  type="text"
                  {...register("name")}
                  placeholder="Enter restaurant name"
                  className="mt-1 block w-full"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  type="text"
                  {...register("address")}
                  placeholder="Enter address"
                  className="mt-1 block w-full"
                />
                {errors.address && (
                  <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  We'll use the location you provided during registration.
                </p>
              </div>
              
              {user && (
                <div className="flex items-center text-sm text-blue-600 mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>Using your registered location: Lat: {user.lat}, Lng: {user.lng}</span>
                </div>
              )}
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="image">Restaurant Photo (Optional)</Label>
                  <span className="text-xs text-gray-500">You can add this later</span>
                </div>
                <div className="mt-1">
                  <RestaurantImageUpload 
                    currentImageUrl={imagePreview}
                    onImageUpload={handleImageUpload}
                    onImageRemove={removeImage}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1"
                >
                  {isSubmitting ? 'Saving...' : (restaurant ? 'Update Restaurant' : 'Create Restaurant')}
                </Button>
                
                {isDirty && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={isSubmitting}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </form>
            
            {restaurant && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Delete Restaurant</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Deleting your restaurant will remove all associated information and cannot be undone.
                  You will be able to create a new restaurant afterward.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="w-full"
                      disabled={isDeleting}
                    >
                      <Trash className="h-4 w-4 mr-1" />
                      {isDeleting ? 'Deleting...' : 'Delete Restaurant'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        restaurant and all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteRestaurant}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantSetup;
