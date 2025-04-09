
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useStorageBucket = (bucketName: string) => {
  const [bucketReady, setBucketReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [actualBucketId, setActualBucketId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  // List of possible bucket names to check (both ID and name variants)
  const possibleBucketNames = [
    'restaurant_images',
    'Restaurant Images',
    'restaurant-images',
    'restaurantimages'
  ];

  useEffect(() => {
    const checkBucket = async () => {
      setIsChecking(true);
      setErrorMessage(undefined);
      
      try {
        console.log(`Checking for storage bucket: "${bucketName}"`);
        
        // Try to list buckets to check if the storage is accessible
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
          console.error('Error accessing storage:', listError);
          setErrorMessage("Storage service unavailable. Try again later.");
          setBucketReady(false);
          return;
        }
        
        if (!buckets || buckets.length === 0) {
          console.error('No storage buckets available');
          setErrorMessage("Storage configuration missing. Please contact support.");
          setBucketReady(false);
          return;
        }
        
        console.log('Available buckets:', buckets.map(b => `${b.id} (${b.name})`).join(', '));
        
        // Try to find a matching bucket with flexible matching
        const targetBucket = buckets.find(bucket => {
          // Check if bucket ID or name matches our bucket name (case insensitive)
          if (bucket.id.toLowerCase() === bucketName.toLowerCase() || 
              bucket.name.toLowerCase() === bucketName.toLowerCase()) {
            return true;
          }
          
          // Check if bucket ID or name matches any of our possible bucket names
          return possibleBucketNames.some(name => 
            bucket.id.toLowerCase() === name.toLowerCase() || 
            bucket.name.toLowerCase() === name.toLowerCase()
          );
        });
        
        if (targetBucket) {
          console.log(`Bucket found: ${targetBucket.id} (${targetBucket.name})`);
          setActualBucketId(targetBucket.id);
          
          // Verify access by trying to list files
          const { error: listFilesError } = await supabase.storage
            .from(targetBucket.id)
            .list();
            
          if (listFilesError) {
            console.error(`Error accessing bucket ${targetBucket.id}:`, listFilesError);
            setErrorMessage(`Cannot access storage bucket. Error: ${listFilesError.message}`);
            setBucketReady(false);
            return;
          }
          
          console.log(`Successfully verified access to bucket: ${targetBucket.id}`);
          setBucketReady(true);
          setErrorMessage(undefined);
        } else {
          console.error(`Bucket not found with name/id: ${bucketName}`);
          console.log('Available buckets:', buckets?.map(b => `${b.id} (${b.name})`).join(', '));
          setErrorMessage("Storage configuration missing. Please contact support.");
          setBucketReady(false);
        }
      } catch (error) {
        console.error('Error checking storage bucket:', error);
        setErrorMessage("Unknown error with storage service. Please try again later.");
        setBucketReady(false);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkBucket();
  }, [bucketName, toast]);

  const verifyBucketAccess = async (): Promise<{success: boolean, bucketId: string | null, error?: string}> => {
    if (bucketReady && actualBucketId) {
      return { success: true, bucketId: actualBucketId };
    }
    
    try {
      // Try one more time to check if the bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error accessing storage:', listError);
        return { success: false, bucketId: null, error: "Cannot access storage service" };
      }
      
      if (!buckets || buckets.length === 0) {
        return { success: false, bucketId: null, error: "No storage buckets available" };
      }
      
      console.log('Available buckets during verify:', buckets.map(b => `${b.id} (${b.name})`).join(', '));
      
      // Try to find a matching bucket with flexible matching
      const targetBucket = buckets.find(bucket => {
        // Check if bucket ID or name matches our bucket name (case insensitive)
        if (bucket.id.toLowerCase() === bucketName.toLowerCase() || 
            bucket.name.toLowerCase() === bucketName.toLowerCase()) {
          return true;
        }
        
        // Check if bucket ID or name matches any of our possible bucket names
        return possibleBucketNames.some(name => 
          bucket.id.toLowerCase() === name.toLowerCase() || 
          bucket.name.toLowerCase() === name.toLowerCase()
        );
      });
      
      if (!targetBucket) {
        console.error(`No matching bucket found. Available buckets: ${buckets.map(b => b.id).join(', ')}`);
        return { success: false, bucketId: null, error: "Storage bucket not found" };
      }
      
      // Verify access by trying to list files
      const { error: listFilesError } = await supabase.storage
        .from(targetBucket.id)
        .list();
        
      if (listFilesError) {
        console.error(`Error accessing bucket ${targetBucket.id}:`, listFilesError);
        return { success: false, bucketId: null, error: `Cannot access storage bucket: ${listFilesError.message}` };
      }
      
      setBucketReady(true);
      setActualBucketId(targetBucket.id);
      setErrorMessage(undefined);
      console.log(`Verified access to bucket: ${targetBucket.id}`);
      return { success: true, bucketId: targetBucket.id };
    } catch (error) {
      console.error('Error verifying bucket access:', error);
      return { success: false, bucketId: null, error: "Error verifying storage access" };
    }
  };

  const getBucketId = () => actualBucketId;

  return { 
    bucketReady, 
    isChecking, 
    verifyBucketAccess, 
    actualBucketId, 
    getBucketId,
    errorMessage
  };
};
