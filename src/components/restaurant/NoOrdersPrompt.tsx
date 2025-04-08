
import React from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardList, RefreshCw } from 'lucide-react';

interface NoOrdersPromptProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const NoOrdersPrompt: React.FC<NoOrdersPromptProps> = ({ 
  onRefresh, 
  isRefreshing = false 
}) => {
  return (
    <div className="bg-white rounded shadow p-8 text-center">
      <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-400" />
      <h2 className="text-xl font-semibold mb-4">No Orders Found</h2>
      <p className="text-gray-500 mb-6">
        You don't have any orders at the moment. New orders will appear here when customers place them.
      </p>
      <Button 
        onClick={onRefresh} 
        disabled={isRefreshing}
        className="flex items-center"
      >
        {isRefreshing ? (
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        Refresh Orders
      </Button>
    </div>
  );
};

export default NoOrdersPrompt;
