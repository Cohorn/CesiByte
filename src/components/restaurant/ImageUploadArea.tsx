
import React from 'react';
import { Input } from '@/components/ui/input';
import { Upload, Loader2 } from 'lucide-react';

interface ImageUploadAreaProps {
  isUploading: boolean;
  bucketReady: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ImageUploadArea: React.FC<ImageUploadAreaProps> = ({
  isUploading,
  bucketReady,
  onFileSelect
}) => {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
      <Input 
        id="image" 
        type="file" 
        accept="image/*"
        className="hidden" 
        onChange={onFileSelect}
        disabled={isUploading || !bucketReady}
      />
      <label 
        htmlFor="image"
        className={`cursor-pointer flex flex-col items-center justify-center py-4 ${(!bucketReady || isUploading) ? 'opacity-50' : ''}`}
      >
        {isUploading ? (
          <Loader2 className="h-10 w-10 text-gray-400 mb-2 animate-spin" />
        ) : (
          <Upload className="h-10 w-10 text-gray-400 mb-2" />
        )}
        <span className="text-sm text-gray-600">
          {isUploading ? 'Uploading...' : 'Upload restaurant photo (optional)'}
        </span>
        <span className="text-xs text-gray-400 mt-1">
          JPG, PNG, GIF up to 5MB
        </span>
        {!bucketReady && (
          <span className="text-xs text-red-500 mt-2">
            Image upload not available. Please try again later.
          </span>
        )}
      </label>
    </div>
  );
};

export default ImageUploadArea;
