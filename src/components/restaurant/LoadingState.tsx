
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading data...'
}) => {
  return (
    <div className="text-center py-8 bg-white rounded shadow flex flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
      <p className="text-gray-500">{message}</p>
    </div>
  );
};

export default LoadingState;
