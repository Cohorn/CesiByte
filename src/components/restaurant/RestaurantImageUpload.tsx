
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

  // Check if the bucket exists on component mount
  useEffect(() => {
    const checkBucket = async () => {
      try {
        // First try to list buckets to check if the storage is accessible
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
          console.error('Error accessing storage:', listError);
          setBucketReady(false);
          return;
        }
        
        // Check if our target bucket exists
        const targetBucket = buckets.find(bucket => bucket.name === RESTAURANT_IMAGES_BUCKET);
        
        if (targetBucket) {
          console.log(`"${RESTAURANT_IMAGES_BUCKET}" bucket found`);
          setBucketReady(true);
        } else {
          console.error(`"${RESTAURANT_IMAGES_BUCKET}" bucket not found`);
          setBucketReady(false);
          toast({
            title: "Storage configuration issue",
            description: `"${RESTAURANT_IMAGES_BUCKET}" bucket not found in Supabase storage.`,
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error checking storage bucket:', error);
        setBucketReady(false);
        toast({
          title: "Storage connection issue",
          description: "Could not connect to image storage. Please try again later.",
          variant: "destructive"
        });
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
        // Try one more time to check if the bucket exists
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError || !buckets.some(bucket => bucket.name === RESTAURANT_IMAGES_BUCKET)) {
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
            disabled={isUploading || !bucketReady}
          />
          <label 
            htmlFor="image"
            className={`cursor-pointer flex flex-col items-center justify-center py-4 ${!bucketReady ? 'opacity-50' : ''}`}
          >
            <Upload className="h-10 w-10 text-gray-400 mb-2" />
            <span className="text-sm text-gray-600">
              {isUploading ? 'Uploading...' : 'Upload restaurant photo (optional)'}
            </span>
            <span className="text-xs text-gray-400 mt-1">
              JPG, PNG, GIF up to 5MB
            </span>
            {!bucketReady && (
              <span className="text-xs text-red-500 mt-2">
                Image upload not available. Please try again later.
              </span>
            )}
          </label>
        </div>
      )}
    </div>
  );
};

export default RestaurantImageUpload;
