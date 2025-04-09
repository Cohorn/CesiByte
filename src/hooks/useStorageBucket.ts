
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
          return;
        }
        
        // Check if our target bucket exists
        const targetBucket = buckets?.find(bucket => 
          bucket.name === bucketName || bucket.id === bucketName
        );
        
        if (targetBucket) {
          console.log(`Bucket found: ${targetBucket.id} (${targetBucket.name})`);
          
          // Verify access by trying to list files
          const { error: listFilesError } = await supabase.storage
            .from(targetBucket.id)
            .list();
            
          if (listFilesError) {
            console.error(`Error accessing bucket ${targetBucket.id}:`, listFilesError);
            setBucketReady(false);
            return;
          }
          
          console.log(`Successfully verified access to bucket: ${targetBucket.id}`);
          setBucketReady(true);
        } else {
          console.error(`Bucket not found with name/id: ${bucketName}`);
          console.log('Available buckets:', buckets?.map(b => `${b.id} (${b.name})`).join(', '));
          setBucketReady(false);
        }
      } catch (error) {
        console.error('Error checking storage bucket:', error);
        setBucketReady(false);
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
      
      if (listError) {
        console.error('Error accessing storage:', listError);
        return false;
      }
      
      const targetBucket = buckets?.find(bucket => 
        bucket.name === bucketName || bucket.id === bucketName
      );
      
      if (!targetBucket) {
        console.error(`Bucket not found with name/id: ${bucketName}`);
        return false;
      }
      
      // Verify access by trying to list files
      const { error: listFilesError } = await supabase.storage
        .from(targetBucket.id)
        .list();
        
      if (listFilesError) {
        console.error(`Error accessing bucket ${targetBucket.id}:`, listFilesError);
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
