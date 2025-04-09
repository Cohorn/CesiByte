
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useStorage = (bucketName: string = 'restaurant_images') => {
  const [isUploading, setIsUploading] = useState(false);
  const [bucketReady, setBucketReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  // Check if the bucket exists when the hook is first used
  const checkBucket = useCallback(async () => {
    console.log(`Checking storage bucket: ${bucketName}`);
    try {
      // First check if the bucket exists
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('Error checking buckets:', error);
        setErrorMessage('Could not access storage system');
        setBucketReady(false);
        return;
      }

      // Check if our bucket exists
      const bucket = buckets?.find(b => b.id.toLowerCase() === bucketName.toLowerCase());
      if (bucket) {
        console.log(`Bucket ${bucketName} found`);
        
        // Test if we can list files in the bucket
        const { error: listError } = await supabase.storage
          .from(bucketName)
          .list();
          
        if (listError) {
          console.error(`Error accessing bucket ${bucketName}:`, listError);
          setErrorMessage(`Cannot access bucket: ${listError.message}`);
          setBucketReady(false);
          return;
        }
        
        console.log(`Successfully verified access to bucket: ${bucketName}`);
        setBucketReady(true);
        setErrorMessage(null);
      } else {
        console.log(`Bucket ${bucketName} not found`);
        setErrorMessage('Storage bucket not found or you don\'t have access to it.');
        setBucketReady(false);
      }
    } catch (error) {
      console.error('Error in bucket check:', error);
      setErrorMessage('Storage system error');
      setBucketReady(false);
    }
  }, [bucketName]);

  useEffect(() => {
    checkBucket();
  }, [checkBucket]);

  const uploadFile = async (file: File, folderPath: string = ''): Promise<string | null> => {
    if (!file) return null;
    
    if (!bucketReady) {
      // If bucket isn't ready, check it again before giving up
      await checkBucket();
      if (!bucketReady) {
        throw new Error('Storage not ready. Please try again later.');
      }
    }
    
    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress(0);
    
    try {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size exceeds 5MB limit');
      }
      
      // Create a unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
      const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
      
      console.log(`Uploading to ${bucketName}/${filePath}`);
      
      // Since onUploadProgress is not supported in the type definition,
      // we'll use a simpler approach for now
      setUploadProgress(10); // Start progress
      
      // Upload the file without the progress callback
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      // Set progress to complete after upload
      setUploadProgress(100);
      
      if (error) {
        console.error('Upload error:', error);
        throw error;
      }
      
      if (!data?.path) {
        throw new Error('Upload succeeded but no file path was returned');
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);
      
      console.log('File uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setErrorMessage(error.message || 'Failed to upload file');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    bucketReady,
    isUploading,
    errorMessage,
    uploadFile,
    uploadProgress,
    checkBucket
  };
};
