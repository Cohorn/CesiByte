
import React, { useState, useEffect } from 'react';
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
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const { bucketReady, verifyBucketAccess, actualBucketId } = useStorageBucket(RESTAURANT_IMAGES_BUCKET);

  // Check if bucket exists on component mount and set appropriate error messages
  useEffect(() => {
    const checkBucket = async () => {
      try {
        // List all buckets to find the correct one
        const { data: buckets, error } = await supabase.storage.listBuckets();
        
        if (error) {
          console.error('Error checking buckets:', error);
          setErrorMessage("Storage service unavailable. Try again later.");
          return;
        }
        
        if (!buckets || buckets.length === 0) {
          console.error('No storage buckets available');
          setErrorMessage("Storage configuration missing. Please contact support.");
          return;
        }
        
        // Check if either bucket exists
        const bucket = buckets?.find(b => 
          b.id === RESTAURANT_IMAGES_BUCKET || 
          b.id === 'Restaurant Images' ||
          b.name === RESTAURANT_IMAGES_BUCKET || 
          b.name === 'Restaurant Images'
        );
        
        if (!bucket) {
          console.error(`Restaurant images bucket not found. Available buckets: ${buckets.map(b => b.id).join(', ')}`);
          setErrorMessage("Image storage is not properly configured. Please contact support.");
        }
      } catch (error) {
        console.error('Error checking bucket:', error);
        setErrorMessage("Unknown error with storage service. Please try again later.");
      }
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
      // Verify bucket access once more before upload
      const { success, bucketId } = await verifyBucketAccess();
      
      if (!success || !bucketId) {
        // List available buckets for debugging
        const { data: availableBuckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
          throw new Error(`Cannot access storage: ${bucketsError.message}`);
        }
        
        console.log("Available buckets:", availableBuckets?.map(b => `${b.id} (${b.name})`).join(', '));
        
        // Try to use any available bucket that might work
        const alternateBucket = availableBuckets?.find(b => 
          b.id === 'restaurant_images' || 
          b.id === 'Restaurant Images'
        );
        
        if (!alternateBucket) {
          throw new Error(`No suitable image storage bucket found`);
        }
        
        console.log(`Using alternate bucket: ${alternateBucket.id}`);
        
        // Create a unique file name
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
        const filePath = `restaurants/${fileName}`;
        
        console.log(`Uploading file to ${alternateBucket.id}/${filePath}`);
        
        // Upload file to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from(alternateBucket.id)
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
          .from(alternateBucket.id)
          .getPublicUrl(data.path);
        
        console.log('Image uploaded successfully to alternate bucket, public URL:', publicUrl);
        onImageUpload(publicUrl);
        
        toast({
          title: "Success",
          description: "Image uploaded successfully",
        });
      } else {
        // Create a unique file name
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
        const filePath = `restaurants/${fileName}`;
        
        console.log(`Uploading file to verified bucket ${bucketId}/${filePath}`);
        
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
      }
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
          errorMessage={errorMessage}
        />
      )}
    </div>
  );
};

export default RestaurantImageUpload;
