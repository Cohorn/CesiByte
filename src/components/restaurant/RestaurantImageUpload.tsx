
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { restaurantApi } from '@/api/services/restaurantService';

interface RestaurantImageUploadProps {
  currentImageUrl?: string | null;
  onImageUpload: (url: string) => void;
  onImageRemove: () => void;
}

const RestaurantImageUpload: React.FC<RestaurantImageUploadProps> = ({
  currentImageUrl,
  onImageUpload,
  onImageRemove
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [bucketReady, setBucketReady] = useState(false);
  const { toast } = useToast();

  // Check if the bucket exists on component mount
  useEffect(() => {
    const checkBucket = async () => {
      const exists = await restaurantApi.ensureStorageBucket();
      setBucketReady(exists);
      console.log('Bucket ready status:', exists);
    };
    
    checkBucket();
  }, []);

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
      // Ensure the storage bucket exists if it's not ready yet
      if (!bucketReady) {
        const created = await restaurantApi.ensureStorageBucket();
        if (!created) {
          throw new Error('Unable to create storage bucket');
        }
        setBucketReady(true);
      }
      
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      console.log('Uploading file to path:', filePath);
      
      // Upload file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('restaurant_images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw uploadError;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('restaurant_images')
        .getPublicUrl(filePath);
      
      console.log('Image uploaded successfully, public URL:', publicUrl);
      onImageUpload(publicUrl);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  return (
    <div>
      {currentImageUrl ? (
        <div className="relative w-full aspect-video mb-2 rounded-md overflow-hidden bg-gray-100">
          <img 
            src={currentImageUrl} 
            alt="Restaurant" 
            className="w-full h-full object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 rounded-full"
            onClick={onImageRemove}
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
              {isUploading ? 'Uploading...' : 'Upload restaurant photo (optional)'}
            </span>
            <span className="text-xs text-gray-400 mt-1">
              JPG, PNG, GIF up to 5MB
            </span>
          </label>
        </div>
      )}
    </div>
  );
};

export default RestaurantImageUpload;
