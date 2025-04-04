
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useRestaurant } from '@/frontend/hooks';
import NavBar from '@/components/NavBar';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { MapPin, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

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
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const { toast } = useToast();
  const { restaurant, loading, createRestaurant, updateRestaurant } = useRestaurant();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: restaurant?.name || "",
      address: restaurant?.address || "",
      image_url: restaurant?.image_url || "",
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
      setLat(restaurant.lat);
      setLng(restaurant.lng);
    }
  }, [restaurant, setValue]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const geocodeAddress = async (address: string) => {
    const apiKey = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setLat(lat);
        setLng(lng);
        return { lat, lng };
      } else {
        toast({
          title: "Error",
          description: "Could not geocode address",
          variant: "destructive"
        });
        return { lat: null, lng: null };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast({
        title: "Error",
        description: "Geocoding failed",
        variant: "destructive"
      });
      return { lat: null, lng: null };
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image file is too large (maximum 5MB)",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Invalid file type. Please upload a JPG, PNG, GIF or WEBP image.",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
      const filePath = `restaurants/${fileName}`;
      
      // Upload file to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('restaurant_images')
        .upload(filePath, file);
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('restaurant_images')
        .getPublicUrl(filePath);
      
      setImagePreview(publicUrl);
      setValue("image_url", publicUrl);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setValue("image_url", "");
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      // Geocode the address
      const { lat: newLat, lng: newLng } = await geocodeAddress(data.address);
      
      if (newLat === null || newLng === null) {
        toast({
          title: "Error",
          description: "Invalid address. Could not find coordinates.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      // Prepare restaurant data
      const restaurantData = {
        name: data.name,
        address: data.address,
        lat: newLat || 0,
        lng: newLng || 0,
        user_id: user.id,
        image_url: data.image_url || null
      };
      
      let result;
      
      if (restaurant) {
        // Update existing restaurant
        result = await updateRestaurant(restaurantData);
      } else {
        // Create new restaurant
        result = await createRestaurant(restaurantData);
      }

      if (result) {
        toast({
          title: "Success!",
          description: restaurant ? "Restaurant updated" : "Restaurant created",
        });
        navigate('/restaurant/menu');
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
              </div>
              
              {lat && lng && (
                <div className="flex items-center text-sm text-blue-600 mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>Lat: {lat}, Lng: {lng}</span>
                </div>
              )}
              
              <div>
                <Label htmlFor="image">Restaurant Photo</Label>
                <div className="mt-1">
                  {imagePreview ? (
                    <div className="relative w-full aspect-video mb-2 rounded-md overflow-hidden bg-gray-100">
                      <img 
                        src={imagePreview} 
                        alt="Restaurant" 
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 rounded-full"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                      <Input 
                        id="image" 
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                      <label 
                        htmlFor="image"
                        className="cursor-pointer flex flex-col items-center justify-center py-4"
                      >
                        <Upload className="h-10 w-10 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">
                          {isUploading ? 'Uploading...' : 'Upload restaurant photo'}
                        </span>
                        <span className="text-xs text-gray-400 mt-1">
                          JPG, PNG, GIF up to 5MB
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
              
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Saving...' : 'Save Restaurant'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantSetup;
