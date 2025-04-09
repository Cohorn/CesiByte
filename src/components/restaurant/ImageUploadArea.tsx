
import React from 'react';
import { Input } from '@/components/ui/input';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface ImageUploadAreaProps {
  isUploading: boolean;
  bucketReady: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  errorMessage?: string;
  uploadProgress?: number;
}

const ImageUploadArea: React.FC<ImageUploadAreaProps> = ({
  isUploading,
  bucketReady,
  onFileSelect,
  errorMessage,
  uploadProgress = 0
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
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ImageUploadArea;
