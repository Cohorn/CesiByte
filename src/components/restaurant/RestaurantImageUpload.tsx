
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import ImageUploadPreview from './ImageUploadPreview';
import ImageUploadArea from './ImageUploadArea';
import { useStorageBucket } from '@/hooks/useStorageBucket';
import { supabase } from '@/lib/supabase';

// Define the bucket name as a constant
const RESTAURANT_IMAGES_BUCKET = 'restaurant_images';

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
  const { toast } = useToast();
  const { 
    bucketReady, 
    verifyBucketAccess, 
    actualBucketId, 
    errorMessage 
  } = useStorageBucket(RESTAURANT_IMAGES_BUCKET);

  // Function to get a working bucket ID
  const getWorkingBucketId = async () => {
    try {
      console.log('Attempting to get a working bucket ID');
      
      // First try the primary bucket
      const { success, bucketId, error } = await verifyBucketAccess();
      
      if (success && bucketId) {
        console.log(`Using verified bucket: ${bucketId}`);
        return bucketId;
      }
      
      // If that fails, check all available buckets directly
      console.log(`Bucket verification failed: ${error}. Checking all available buckets...`);
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error listing buckets:', listError);
        throw new Error('Cannot access storage service');
      }
      
      if (!buckets || buckets.length === 0) {
        throw new Error('No storage buckets available');
      }
      
      console.log('Available buckets:', buckets.map(b => `${b.id} (${b.name})`).join(', '));
      
      // Try any bucket
      for (const bucket of buckets) {
        // Try to verify access to this bucket
        const { error: listFilesError } = await supabase.storage
          .from(bucket.id)
          .list();
          
        if (!listFilesError) {
          console.log(`Found working bucket: ${bucket.id}`);
          return bucket.id;
        }
      }
      
      throw new Error('No accessible storage buckets found');
    } catch (error) {
      console.error('Error finding a working bucket:', error);
      throw error;
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
      // Get a working bucket ID
      const bucketId = await getWorkingBucketId();
      
      if (!bucketId) {
        throw new Error('Could not find a working storage bucket');
      }
      
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
      const filePath = `restaurants/${fileName}`;
      
      console.log(`Uploading file to ${bucketId}/${filePath}`);
      
      // Upload file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucketId)
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
        .from(bucketId)
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
          bucketReady={true} // Always show the upload area
          onFileSelect={handleImageUpload}
          errorMessage={errorMessage}
        />
      )}
    </div>
  );
};

export default RestaurantImageUpload;
