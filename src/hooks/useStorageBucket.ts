
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
    'restaurantimages',
    'avatars',
    'public'
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
          setErrorMessage("No storage buckets available. Please contact support.");
          setBucketReady(false);
          return;
        }
        
        console.log('Available buckets:', buckets.map(b => `${b.id} (${b.name})`).join(', '));
        
        // First try to find the exact bucket
        let targetBucket = buckets.find(bucket => 
          bucket.id.toLowerCase() === bucketName.toLowerCase() || 
          bucket.name.toLowerCase() === bucketName.toLowerCase()
        );
        
        // If not found, try alternative names
        if (!targetBucket) {
          targetBucket = buckets.find(bucket => 
            possibleBucketNames.some(name => 
              bucket.id.toLowerCase() === name.toLowerCase() || 
              bucket.name.toLowerCase() === name.toLowerCase()
            )
          );
        }
        
        // If still not found, use any available bucket
        if (!targetBucket && buckets.length > 0) {
          console.log('Using first available bucket as fallback');
          targetBucket = buckets[0];
        }
        
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
          console.error(`No usable storage bucket found`);
          setErrorMessage("No storage bucket available. Please contact support.");
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
    try {
      // Try to list buckets
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error accessing storage in verifyBucketAccess:', listError);
        return { success: false, bucketId: null, error: "Cannot access storage service" };
      }
      
      if (!buckets || buckets.length === 0) {
        console.error('No storage buckets available in verifyBucketAccess');
        return { success: false, bucketId: null, error: "No storage buckets available" };
      }
      
      // First try to find the exact bucket
      let targetBucket = buckets.find(bucket => 
        bucket.id.toLowerCase() === bucketName.toLowerCase() || 
        bucket.name.toLowerCase() === bucketName.toLowerCase()
      );
      
      // If not found, try alternative names
      if (!targetBucket) {
        targetBucket = buckets.find(bucket => 
          possibleBucketNames.some(name => 
            bucket.id.toLowerCase() === name.toLowerCase() || 
            bucket.name.toLowerCase() === name.toLowerCase()
          )
        );
      }
      
      // If still not found, use any available bucket
      if (!targetBucket && buckets.length > 0) {
        console.log('Using first available bucket as fallback in verifyBucketAccess');
        targetBucket = buckets[0];
      }
      
      if (!targetBucket) {
        console.error('No usable storage bucket found in verifyBucketAccess');
        return { success: false, bucketId: null, error: "No storage bucket available" };
      }
      
      // Verify access by trying to list files
      const { error: listFilesError } = await supabase.storage
        .from(targetBucket.id)
        .list();
        
      if (listFilesError) {
        console.error(`Error accessing bucket ${targetBucket.id} in verifyBucketAccess:`, listFilesError);
        return { success: false, bucketId: null, error: `Cannot access storage bucket: ${listFilesError.message}` };
      }
      
      console.log(`Verified access to bucket in verifyBucketAccess: ${targetBucket.id}`);
      setBucketReady(true);
      setActualBucketId(targetBucket.id);
      return { success: true, bucketId: targetBucket.id };
    } catch (error) {
      console.error('Error in verifyBucketAccess:', error);
      return { success: false, bucketId: null, error: "Error verifying storage access" };
    }
  };

  return { 
    bucketReady, 
    isChecking, 
    verifyBucketAccess, 
    actualBucketId, 
    errorMessage
  };
};
