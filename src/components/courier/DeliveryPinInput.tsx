
import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface DeliveryPinInputProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onVerify: (orderId: string, pin: string) => Promise<{ success: boolean, message?: string }>;
}

const DeliveryPinInput: React.FC<DeliveryPinInputProps> = ({
  orderId,
  isOpen,
  onClose,
  onVerify
}) => {
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  
  // Reset pin and error when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setIsVerifying(false);
      setAttemptCount(0);
    }
  }, [isOpen]);

  const handleVerify = async () => {
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      console.log(`Attempting to verify PIN for order ${orderId}: ${pin}`);
      const result = await onVerify(orderId, pin);
      console.log('Verification result:', result);
      
      if (result.success) {
        // Wait a moment before closing to show success state
        setTimeout(() => {
          setPin('');
          onClose();
        }, 1000);
      } else {
        setAttemptCount(prev => prev + 1);
        setError(result.message || 'Invalid PIN. Please try again.');
        
        // If there have been several failed attempts, give a more helpful message
        if (attemptCount >= 2) {
          setError((result.message || 'Invalid PIN') + '. Please double-check the PIN with the customer.');
        }
      }
    } catch (err) {
      console.error('Error during pin verification:', err);
      setError('Failed to verify PIN. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setPin('');
    setError(null);
  };
  
  const handleDialogClose = () => {
    // Prevent accidental closing if verification is in progress
    if (!isVerifying) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleDialogClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Delivery PIN</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          <p className="text-sm text-gray-500 text-center mb-2">
            Ask the customer for their 4-digit delivery PIN to confirm delivery
          </p>
          
          <InputOTP 
            maxLength={4} 
            value={pin} 
            onChange={setPin}
            disabled={isVerifying}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
          
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>
        
        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleReset}
              disabled={isVerifying || pin.length === 0}
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
            
            <Button 
              type="submit" 
              onClick={handleVerify}
              disabled={isVerifying || pin.length !== 4}
              className={isVerifying ? "opacity-80" : ""}
            >
              <Check className="mr-2 h-4 w-4" />
              {isVerifying ? "Verifying..." : "Verify PIN"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryPinInput;
