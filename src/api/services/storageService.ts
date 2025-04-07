
import { supabase } from '@/lib/supabase';

export const storageApi = {
  ensureRestaurantBucket: async () => {
    try {
      console.log('API call: Ensuring restaurant_images bucket exists');
      
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('API: Error listing buckets:', listError);
        throw listError;
      }
      
      const bucketExists = buckets.some(b => b.name === 'restaurant_images');
      
      if (bucketExists) {
        console.log('API: Bucket already exists');
        return { success: true, message: 'Bucket already exists' };
      }
      
      // Create bucket
      const { error: createError } = await supabase.storage.createBucket('restaurant_images', {
        public: true
      });
      
      if (createError) {
        console.error('API: Error creating bucket:', createError);
        throw createError;
      }
      
      console.log('API: Bucket created successfully');
      return { success: true, message: 'Bucket created successfully' };
    } catch (error) {
      console.error('API: Error ensuring bucket exists:', error);
      return { 
        success: false, 
        message: 'Failed to create bucket', 
        error: error.message || 'Unknown error' 
      };
    }
  }
};
