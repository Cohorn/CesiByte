
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface NoOrdersPromptProps {
  onRefresh: () => void;
}

const NoOrdersPrompt: React.FC<NoOrdersPromptProps> = ({ onRefresh }) => {
  return (
    <div className="bg-white rounded shadow p-8 text-center">
      <p className="text-gray-500 mb-4">No orders yet.</p>
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
