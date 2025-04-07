
import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoadingStateProps {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading data...',
  error = null,
  onRetry
}) => {
  return (
    <div className="text-center py-8 bg-white rounded shadow flex flex-col items-center justify-center">
      {error ? (
        <>
          <p className="text-red-500 mb-2">{error}</p>
          {onRetry && (
            <Button 
              variant="outline"
              className="mt-2 px-4 py-2"
              onClick={onRetry}
            >
              Try Again
            </Button>
          )}
        </>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-gray-500">{message}</p>
        </>
      )}
    </div>
  );
};

export default LoadingState;
