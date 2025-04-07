
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
  const [bucketExists, setBucketExists] = useState(false);
  const { toast } = useToast();

  // Check if the bucket exists on component mount
  useEffect(() => {
    checkBucketExists();
  }, []);

  const checkBucketExists = async () => {
    try {
      console.log('Checking if restaurant_images bucket exists');
      const { data: buckets, error } = await supabase
        .storage
        .listBuckets();
        
      if (error) throw error;
      
      const exists = buckets.some(bucket => bucket.name === 'restaurant_images');
      setBucketExists(exists);
      
      console.log('Bucket exists:', exists);
      
      if (!exists) {
        console.log('Creating restaurant_images bucket');
        await createBucket();
      }
      
      return exists;
    } catch (error) {
      console.error('Error checking bucket:', error);
      return false;
    }
  };

  const createBucket = async () => {
    try {
      const { error } = await supabase.storage.createBucket('restaurant_images', {
        public: true
      });
      
      if (error) throw error;
      
      console.log('Bucket created successfully');
      setBucketExists(true);
      return true;
    } catch (error) {
      console.error('Error creating bucket:', error);
      toast({
        title: "Error",
        description: "Could not create storage bucket. Please contact support.",
        variant: "destructive"
      });
      return false;
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
      // Ensure the storage bucket exists
      if (!bucketExists) {
        const created = await createBucket();
        if (!created) {
          throw new Error('Unable to create storage bucket');
        }
      }
      
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
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
