
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import ImageUploadPreview from './ImageUploadPreview';
import ImageUploadArea from './ImageUploadArea';
import { useStorageBucket } from '@/hooks/useStorageBucket';
import { supabase } from '@/lib/supabase';
import { restaurantApi } from '@/api/services/restaurantService';

// Define the bucket name as a constant
const RESTAURANT_IMAGES_BUCKET = 'Restaurant Images';

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

  // Check if bucket exists on component mount
  useEffect(() => {
    const checkBucket = async () => {
      try {
        const bucketExists = await restaurantApi.ensureStorageBucket();
        setBucketReady(bucketExists);
        if (!bucketExists) {
          console.error(`"${RESTAURANT_IMAGES_BUCKET}" bucket not found or not accessible`);
          toast({
            title: "Storage Error",
            description: "Image upload is currently unavailable. Please try again later.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error checking bucket:', error);
        setBucketReady(false);
      }
    };
    
    checkBucket();
  }, [toast]);

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
      // Verify bucket exists before proceeding
      if (!bucketReady) {
        const bucketExists = await restaurantApi.ensureStorageBucket();
        if (!bucketExists) {
          throw new Error(`Cannot upload: "${RESTAURANT_IMAGES_BUCKET}" bucket not accessible.`);
        }
        setBucketReady(true);
      }
      
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
      const filePath = `restaurants/${fileName}`;
      
      console.log(`Uploading file to ${RESTAURANT_IMAGES_BUCKET}/${filePath}`);
      
      // Upload file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(RESTAURANT_IMAGES_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw uploadError;
      }
      
      if (!data?.path) {
        throw new Error('Upload succeeded but no file path was returned');
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(RESTAURANT_IMAGES_BUCKET)
        .getPublicUrl(data.path);
      
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
        description: error instanceof Error ? error.message : "Failed to upload image. Please try again later.",
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
        <ImageUploadPreview imageUrl={currentImageUrl} onRemove={onImageRemove} />
      ) : (
        <ImageUploadArea 
          isUploading={isUploading} 
          bucketReady={bucketReady} 
          onFileSelect={handleImageUpload} 
        />
      )}
    </div>
  );
};

export default RestaurantImageUpload;
