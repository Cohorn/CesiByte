
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/lib/AuthContext';
import { useReviews } from '@/hooks/useReviews';
import CourierReviewForm from '@/components/CourierReviewForm';
import { useToast } from '@/hooks/use-toast';

interface DeliveryReviewButtonProps {
  orderId: string;
  courierId: string;
}

const DeliveryReviewButton: React.FC<DeliveryReviewButtonProps> = ({ orderId, courierId }) => {
  const [open, setOpen] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const { user } = useAuth();
  const { submitReview } = useReviews();
  const { toast } = useToast();

  const handleSubmitReview = async (data: { rating: number; comment: string }) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to submit a review",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await submitReview({
        user_id: user.id,
        courier_id: courierId,
        rating: data.rating,
        comment: data.comment
      });

      if (result.success) {
        setHasReviewed(true);
        setOpen(false);
        toast({
          title: "Review submitted",
          description: "Thank you for your feedback!",
        });
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={hasReviewed ? "outline" : "default"}
          className="w-full"
          disabled={hasReviewed}
        >
          {hasReviewed ? "Review Submitted" : "Rate Courier Delivery"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Courier Delivery</DialogTitle>
        </DialogHeader>
        <CourierReviewForm 
          courierId={courierId}
          orderId={orderId}
          onSubmit={handleSubmitReview}
        />
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryReviewButton;
