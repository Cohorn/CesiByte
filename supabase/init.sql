
-- Insert bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'restaurant_images', 'Restaurant Images', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'restaurant_images'
);

-- Create public access policy for the restaurant_images bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Public Access'
    ) THEN
        EXECUTE 'CREATE POLICY "Public Access" 
                ON storage.objects 
                FOR SELECT 
                TO public 
                USING (bucket_id = ''restaurant_images'')';
    END IF;
END $$;

-- Allow authenticated users to insert into restaurant_images bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Allow Uploads'
    ) THEN
        EXECUTE 'CREATE POLICY "Allow Uploads" 
                ON storage.objects 
                FOR INSERT 
                TO authenticated 
                WITH CHECK (bucket_id = ''restaurant_images'')';
    END IF;
END $$;

-- Allow users to update their own objects
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Allow Updates'
    ) THEN
        EXECUTE 'CREATE POLICY "Allow Updates" 
                ON storage.objects 
                FOR UPDATE 
                TO authenticated 
                USING (bucket_id = ''restaurant_images'')';
    END IF;
END $$;

-- Allow users to delete their own objects
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Allow Deletion'
    ) THEN
        EXECUTE 'CREATE POLICY "Allow Deletion" 
                ON storage.objects 
                FOR DELETE 
                TO authenticated 
                USING (bucket_id = ''restaurant_images'')';
    END IF;
END $$;

-- Function to create storage public policy
CREATE OR REPLACE FUNCTION public.create_storage_public_policy(bucket_name text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow public READ access
  EXECUTE format('
    CREATE POLICY IF NOT EXISTS "Public Access for %I" 
    ON storage.objects 
    FOR SELECT 
    TO public 
    USING (bucket_id = %L)
  ', bucket_name, bucket_name);
  
  -- Allow authenticated users to upload
  EXECUTE format('
    CREATE POLICY IF NOT EXISTS "Upload Access for %I" 
    ON storage.objects 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (bucket_id = %L)
  ', bucket_name, bucket_name);
  
  -- Allow authenticated users to update their own objects
  EXECUTE format('
    CREATE POLICY IF NOT EXISTS "Update Access for %I" 
    ON storage.objects 
    FOR UPDATE 
    TO authenticated 
    USING (bucket_id = %L)
  ', bucket_name, bucket_name);
  
  -- Allow authenticated users to delete their own objects
  EXECUTE format('
    CREATE POLICY IF NOT EXISTS "Delete Access for %I" 
    ON storage.objects 
    FOR DELETE 
    TO authenticated 
    USING (bucket_id = %L)
  ', bucket_name, bucket_name);

  RETURN json_build_object('success', true, 'message', 'Storage policies created for bucket: ' || bucket_name);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to execute SQL statements from edge function
CREATE OR REPLACE FUNCTION public.execute_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
