
-- Create a storage bucket for restaurant images
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant_images', 'Restaurant Images', true);

-- Create public access policy for the restaurant_images bucket
CREATE POLICY "Public Access" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'restaurant_images');

-- Allow authenticated users to insert into restaurant_images bucket
CREATE POLICY "Allow Uploads" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'restaurant_images');

-- Allow users to update their own objects
CREATE POLICY "Allow Updates" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'restaurant_images');

-- Allow users to delete their own objects
CREATE POLICY "Allow Deletion" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'restaurant_images');
