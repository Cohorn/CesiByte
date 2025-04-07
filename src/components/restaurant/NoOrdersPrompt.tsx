
import React from 'react';
import { Button } from '@/components/ui/button';

interface NoOrdersPromptProps {
  onRefresh: () => void;
}

const NoOrdersPrompt: React.FC<NoOrdersPromptProps> = ({ onRefresh }) => {
  return (
    <div className="bg-white rounded shadow p-8 text-center">
      <p className="text-gray-500 mb-4">No orders yet.</p>
      <Button variant="outline" onClick={onRefresh}>
        Check for new orders
      </Button>
    </div>
  );
};

export default NoOrdersPrompt;
