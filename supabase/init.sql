
-- Create a storage bucket for restaurant images if it doesn't exist already
INSERT INTO storage.buckets (id, name, public)
SELECT 'restaurant_images', 'Restaurant Images', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'restaurant_images'
);

-- Create public access policy for the restaurant_images bucket
CREATE POLICY IF NOT EXISTS "Public Access" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'restaurant_images');

-- Allow authenticated users to insert into restaurant_images bucket
CREATE POLICY IF NOT EXISTS "Allow Uploads" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'restaurant_images');

-- Allow users to update their own objects
CREATE POLICY IF NOT EXISTS "Allow Updates" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'restaurant_images');

-- Allow users to delete their own objects
CREATE POLICY IF NOT EXISTS "Allow Deletion" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'restaurant_images');
