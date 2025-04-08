
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, KeyRound } from 'lucide-react';

export interface DeliveryPinInputProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onVerify: (orderId: string, pin: string) => Promise<{ success: boolean; message?: string }>;
}

const DeliveryPinInput: React.FC<DeliveryPinInputProps> = ({ orderId, isOpen, onClose, onVerify }) => {
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError(null);

    try {
      console.log(`Submitting PIN ${pin} for order ${orderId}`);
      const result = await onVerify(orderId, pin);
      
      if (result.success) {
        setPin('');
        onClose();
      } else {
        setError(result.message || 'Verification failed');
      }
    } catch (err) {
      console.error('Error verifying PIN:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <KeyRound className="mr-2 h-5 w-5" />
            Enter Delivery PIN
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            Ask the customer for their delivery PIN to complete this delivery
          </p>

          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="Enter 4-digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="text-center text-xl tracking-widest"
            autoFocus
          />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isVerifying}>
              Cancel
            </Button>
            <Button type="submit" disabled={!pin || pin.length < 4 || isVerifying}>
              {isVerifying ? 'Verifying...' : 'Verify & Complete Delivery'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryPinInput;
