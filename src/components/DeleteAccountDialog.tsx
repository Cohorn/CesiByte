
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

const DeleteAccountDialog: React.FC<DeleteAccountDialogProps> = ({
  open,
  onOpenChange,
  onDelete,
  isDeleting = false
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your account and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button 
              variant="destructive" 
              onClick={onDelete} 
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAccountDialog;
