
import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateReferralCode } from '@/utils/referralUtils';

interface ReferralCodeDisplayProps {
  userId: string;
  userName: string;
  existingCode?: string;
}

const ReferralCodeDisplay: React.FC<ReferralCodeDisplayProps> = ({ 
  userId, 
  userName,
  existingCode
}) => {
  const [copied, setCopied] = useState(false);
  const [code] = useState<string>(existingCode || generateReferralCode(userId, userName));

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Referral Code</CardTitle>
        <CardDescription>
          Share this code with friends to earn rewards when they sign up
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-3 bg-gray-100 rounded-md">
          <span className="font-mono text-lg">{code}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={copyToClipboard} 
            className="flex items-center gap-1"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span className="text-xs">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          This is a mock referral system. Currently, no rewards are being issued.
        </p>
      </CardContent>
    </Card>
  );
};

export default ReferralCodeDisplay;
