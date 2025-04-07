
import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ImageUploadPreviewProps {
  imageUrl: string;
  onRemove: () => void;
}

const ImageUploadPreview: React.FC<ImageUploadPreviewProps> = ({
  imageUrl,
  onRemove
}) => {
  return (
    <div className="relative w-full aspect-video mb-2 rounded-md overflow-hidden bg-gray-100">
      <img 
        src={imageUrl} 
        alt="Restaurant" 
        className="w-full h-full object-cover"
      />
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute top-2 right-2 rounded-full"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ImageUploadPreview;
