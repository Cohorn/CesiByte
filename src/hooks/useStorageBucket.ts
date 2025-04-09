
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useStorageBucket = (bucketName: string) => {
  const [bucketReady, setBucketReady] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [actualBucketId, setActualBucketId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkBucket = async () => {
      setIsChecking(true);
      try {
        console.log(`Checking for storage bucket: "${bucketName}"`);
        
        // Try to list buckets to check if the storage is accessible
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
          console.error('Error accessing storage:', listError);
          setBucketReady(false);
          return;
        }
        
        if (!buckets || buckets.length === 0) {
          console.error('No buckets found in storage');
          setBucketReady(false);
          return;
        }
        
        console.log('Available buckets:', buckets.map(b => `${b.id} (${b.name})`).join(', '));
        
        // Check if our target bucket exists (either by exact name or case insensitive match)
        const targetBucket = buckets?.find(bucket => 
          bucket.name === bucketName || 
          bucket.id === bucketName || 
          bucket.id.toLowerCase() === bucketName.toLowerCase() ||
          bucket.name.toLowerCase() === bucketName.toLowerCase()
        );
        
        if (targetBucket) {
          console.log(`Bucket found: ${targetBucket.id} (${targetBucket.name})`);
          setActualBucketId(targetBucket.id);
          
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

  const verifyBucketAccess = async (): Promise<{success: boolean, bucketId: string | null}> => {
    if (bucketReady && actualBucketId) {
      return { success: true, bucketId: actualBucketId };
    }
    
    try {
      // Try one more time to check if the bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error accessing storage:', listError);
        return { success: false, bucketId: null };
      }
      
      // Look for the bucket with more flexible matching
      const targetBucket = buckets?.find(bucket => 
        bucket.name === bucketName || 
        bucket.id === bucketName || 
        bucket.id.toLowerCase() === bucketName.toLowerCase() ||
        bucket.name.toLowerCase() === bucketName.toLowerCase()
      );
      
      if (!targetBucket) {
        console.error(`Bucket not found with name/id: ${bucketName}`);
        return { success: false, bucketId: null };
      }
      
      // Verify access by trying to list files
      const { error: listFilesError } = await supabase.storage
        .from(targetBucket.id)
        .list();
        
      if (listFilesError) {
        console.error(`Error accessing bucket ${targetBucket.id}:`, listFilesError);
        return { success: false, bucketId: null };
      }
      
      setBucketReady(true);
      setActualBucketId(targetBucket.id);
      return { success: true, bucketId: targetBucket.id };
    } catch (error) {
      console.error('Error verifying bucket access:', error);
      return { success: false, bucketId: null };
    }
  };

  return { bucketReady, isChecking, verifyBucketAccess, actualBucketId };
};
