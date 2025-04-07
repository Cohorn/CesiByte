
// Follow Deno conventions for edge functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse the request body
    const { bucketName } = await req.json();

    if (!bucketName) {
      return new Response(
        JSON.stringify({ error: 'Bucket name is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Creating policies for bucket: ${bucketName}`);

    // Check if bucket exists
    const { data: buckets, error: bucketError } = await supabase
      .storage
      .listBuckets();

    if (bucketError) {
      console.error('Error listing buckets:', bucketError);
      return new Response(
        JSON.stringify({ error: 'Failed to check bucket existence' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const bucketExists = buckets.some(b => b.name === bucketName);
    if (!bucketExists) {
      // Create the bucket if it doesn't exist
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create bucket' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      console.log(`Bucket ${bucketName} created successfully`);
    }

    // Create SQL command to create policies
    const createPoliciesQuery = `
      -- Allow public READ access
      BEGIN;
      
      -- Public access policy
      CREATE POLICY IF NOT EXISTS "Public Access for ${bucketName}" 
      ON storage.objects 
      FOR SELECT 
      TO public 
      USING (bucket_id = '${bucketName}');
      
      -- Allow authenticated users to upload
      CREATE POLICY IF NOT EXISTS "Upload Access for ${bucketName}" 
      ON storage.objects 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (bucket_id = '${bucketName}');
      
      -- Allow authenticated users to update their own objects
      CREATE POLICY IF NOT EXISTS "Update Access for ${bucketName}" 
      ON storage.objects 
      FOR UPDATE 
      TO authenticated 
      USING (bucket_id = '${bucketName}');
      
      -- Allow authenticated users to delete their own objects
      CREATE POLICY IF NOT EXISTS "Delete Access for ${bucketName}" 
      ON storage.objects 
      FOR DELETE 
      TO authenticated 
      USING (bucket_id = '${bucketName}');
      
      COMMIT;
    `;

    // Execute SQL to create policies
    const { error: policyError } = await supabase.rpc('execute_sql', { 
      sql_query: createPoliciesQuery 
    });

    if (policyError) {
      console.error('Error creating policies:', policyError);
      return new Response(
        JSON.stringify({ error: 'Failed to create storage policies', details: policyError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Storage policies created for bucket: ${bucketName}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
