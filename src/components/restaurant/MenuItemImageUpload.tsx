
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useStorage } from '@/hooks/useStorage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X, Link } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface MenuItemImageUploadProps {
  restaurantId: string;
  currentImageUrl?: string | null;
  onImageUpload: (url: string) => void;
  onImageRemove: () => void;
}

const MenuItemImageUpload: React.FC<MenuItemImageUploadProps> = ({
  restaurantId,
  currentImageUrl,
  onImageUpload,
  onImageRemove
}) => {
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState('');
  const [isUrlMode, setIsUrlMode] = useState(false);
  
  const { 
    bucketReady, 
    isUploading, 
    errorMessage, 
    uploadFile, 
    uploadProgress 
  } = useStorage('restaurant_images');

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
      // Upload the file to the menu_items/{restaurantId} folder
      const uploadedUrl = await uploadFile(file, `menu_items/${restaurantId}`);
      
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
    setIsUrlMode(false);
  };

  // Image preview component
  const ImagePreview = () => (
    <div className="relative w-full aspect-video rounded-md overflow-hidden bg-gray-100">
      <img 
        src={currentImageUrl} 
        alt="Menu item" 
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "https://placehold.co/600x400/orange/white?text=Menu+Item";
        }}
      />
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute top-2 right-2 rounded-full"
        onClick={onImageRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {currentImageUrl ? (
        <ImagePreview />
      ) : (
        <>
          {!isUrlMode ? (
            <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
              <Input 
                id="image" 
                type="file" 
                accept="image/*"
                className="hidden" 
                onChange={handleImageUpload}
                disabled={isUploading || !bucketReady}
              />
              <label 
                htmlFor="image"
                className={`cursor-pointer flex flex-col items-center justify-center py-4 ${isUploading || !bucketReady ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-10 w-10 text-gray-400 mb-2 animate-spin" />
                    <span className="text-sm text-gray-600 mb-2">Uploading...</span>
                    {uploadProgress > 0 && (
                      <div className="w-full max-w-xs mx-auto">
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">{Math.round(uploadProgress)}%</p>
                      </div>
                    )}
                  </>
                ) : (
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                )}
                {!isUploading && (
                  <>
                    <span className="text-sm text-gray-600">
                      Upload image (optional)
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      JPG, PNG, GIF up to 5MB
                    </span>
                  </>
                )}
                {!bucketReady && !errorMessage && !isUploading && (
                  <span className="text-xs text-amber-500 mt-2">
                    Storage initializing... You can still provide an image URL below.
                  </span>
                )}
              </label>
              
              {errorMessage && (
                <Alert variant="destructive" className="mt-3">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setIsUrlMode(true)} 
                  className="flex items-center"
                >
                  <Link className="h-4 w-4 mr-2" />
                  Use Image URL Instead
                </Button>
              </div>
            </div>
          ) : (
            <div className="border border-gray-300 rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="imageUrl" className="text-sm font-medium">Image URL</Label>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setIsUrlMode(false)}
                  className="h-8 px-2 text-xs"
                >
                  Switch to File Upload
                </Button>
              </div>
              
              <div className="flex gap-2 mt-2">
                <Input
                  id="imageUrl"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleUrlSubmit}
                >
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Enter a direct link to an image on the web
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MenuItemImageUpload;
