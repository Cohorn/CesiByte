
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import ImageUploadPreview from './ImageUploadPreview';
import ImageUploadArea from './ImageUploadArea';
import { useStorage } from '@/hooks/useStorage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface RestaurantImageUploadProps {
  currentImageUrl?: string | null;
  onImageUpload: (url: string) => void;
  onImageRemove: () => void;
}

const RestaurantImageUpload: React.FC<RestaurantImageUploadProps> = ({
  currentImageUrl,
  onImageUpload,
  onImageRemove
}) => {
  const { toast } = useToast();
  const { bucketReady, isUploading, errorMessage, uploadFile, uploadProgress } = useStorage('restaurant_images');
  const [imageUrl, setImageUrl] = useState('');
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image file is too large (maximum 5MB)",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Invalid file type. Please upload a JPG, PNG, GIF or WEBP image.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Upload the file to the restaurants folder
      const uploadedUrl = await uploadFile(file, 'restaurants');
      
      if (uploadedUrl) {
        onImageUpload(uploadedUrl);
        toast({
          title: "Success",
          description: "Image uploaded successfully",
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again later or use an image URL.",
        variant: "destructive",
      });
    } finally {
      // Reset the file input
      event.target.value = '';
    }
  };

  const handleUrlSubmit = () => {
    if (!imageUrl.trim()) return;
    
    if (!imageUrl.startsWith('http')) {
      toast({
        title: "Error",
        description: "Please enter a valid URL starting with http:// or https://",
        variant: "destructive"
      });
      return;
    }
    
    onImageUpload(imageUrl);
    setImageUrl('');
  };

  return (
    <div>
      {currentImageUrl ? (
        <ImageUploadPreview imageUrl={currentImageUrl} onRemove={onImageRemove} />
      ) : (
        <div className="space-y-4">
          <ImageUploadArea 
            isUploading={isUploading} 
            bucketReady={bucketReady} 
            onFileSelect={handleImageUpload}
            errorMessage={errorMessage || undefined}
            uploadProgress={uploadProgress}
          />
          
          <div className="mt-3">
            <Label htmlFor="image-url" className="text-sm text-gray-700">
              Or enter an image URL
            </Label>
            <div className="flex mt-1 gap-2">
              <Input
                id="image-url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleUrlSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add URL
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantImageUpload;
