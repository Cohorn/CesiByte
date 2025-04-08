
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface NoOrdersPromptProps {
  onRefresh: () => void;
  message?: string;
}

const NoOrdersPrompt: React.FC<NoOrdersPromptProps> = ({ 
  onRefresh,
  message = "No orders yet."
}) => {
  return (
    <div className="bg-white rounded shadow p-8 text-center">
      <p className="text-gray-500 mb-4">{message}</p>
      <Button 
        variant="outline" 
        onClick={onRefresh}
        className="flex items-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Check for new orders
      </Button>
    </div>
  );
};

export default NoOrdersPrompt;
