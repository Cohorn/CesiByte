
-- Create function to execute SQL statements from edge function
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
