
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Create a Supabase client with the service role key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

serve(async (req) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    console.log('Checking if restaurant_images bucket exists');
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      throw listError;
    }
    
    const bucketExists = buckets.some(b => b.name === 'restaurant_images');
    
    if (bucketExists) {
      return new Response(
        JSON.stringify({ message: 'Bucket already exists', success: true }),
        { headers }
      );
    }
    
    // Create bucket if it doesn't exist
    const { error: createError } = await supabase.storage.createBucket('restaurant_images', {
      public: true,
    });
    
    if (createError) {
      throw createError;
    }
    
    // Create policies
    // NOTE: This may not work in edge functions due to limitations with RLS management
    // The init.sql file should handle this instead
    
    return new Response(
      JSON.stringify({ message: 'Bucket created successfully', success: true }),
      { headers }
    );
  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ 
        message: 'Failed to create bucket', 
        error: error.message || 'Unknown error',
        success: false 
      }),
      { status: 500, headers }
    );
  }
});
