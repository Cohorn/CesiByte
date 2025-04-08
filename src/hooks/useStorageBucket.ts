
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useStorageBucket = (bucketName: string) => {
  const [bucketReady, setBucketReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkBucket = async () => {
      setIsChecking(true);
      try {
        // Try to list buckets to check if the storage is accessible
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
          console.error('Error accessing storage:', listError);
          setBucketReady(false);
          
          // Only show toast for non-connection errors
          if (listError.message !== 'Failed to fetch') {
            toast({
              title: "Storage connection issue",
              description: "Could not connect to image storage. Please try again later.",
              variant: "destructive"
            });
          }
          return;
        }
        
        // Check if our target bucket exists
        const targetBucket = buckets?.find(bucket => bucket.name === bucketName);
        
        if (targetBucket) {
          console.log(`"${bucketName}" bucket found`);
          
          // Verify access by trying to list files
          const { error: listFilesError } = await supabase.storage
            .from(bucketName)
            .list();
            
          if (listFilesError) {
            console.error('Error accessing bucket:', listFilesError);
            setBucketReady(false);
            
            // Only show toast for non-connection errors
            if (listFilesError.message !== 'Failed to fetch') {
              toast({
                title: "Storage access issue",
                description: `Cannot access "${bucketName}" bucket.`,
                variant: "destructive"
              });
            }
            return;
          }
          
          setBucketReady(true);
        } else {
          console.error(`"${bucketName}" bucket not found`);
          setBucketReady(false);
          toast({
            title: "Storage configuration issue",
            description: `"${bucketName}" bucket not found in Supabase storage.`,
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error checking storage bucket:', error);
        setBucketReady(false);
        
        // Only show toast if it's not a network error
        if (error instanceof Error && error.message !== 'Failed to fetch') {
          toast({
            title: "Storage connection issue",
            description: "Could not connect to image storage. Please try again later.",
            variant: "destructive"
          });
        }
      } finally {
        setIsChecking(false);
      }
    };
    
    checkBucket();
  }, [bucketName, toast]);

  const verifyBucketAccess = async (): Promise<boolean> => {
    if (bucketReady) return true;
    
    try {
      // Try one more time to check if the bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError || !buckets?.some(bucket => bucket.name === bucketName)) {
        console.error(`Cannot upload: "${bucketName}" bucket not accessible.`);
        return false;
      }
      
      // Verify access by trying to list files
      const { error: listFilesError } = await supabase.storage
        .from(bucketName)
        .list();
        
      if (listFilesError) {
        console.error(`Cannot access "${bucketName}" bucket.`);
        return false;
      }
      
      setBucketReady(true);
      return true;
    } catch (error) {
      console.error('Error verifying bucket access:', error);
      return false;
    }
  };

  return { bucketReady, isChecking, verifyBucketAccess };
};
