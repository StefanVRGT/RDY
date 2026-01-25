'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RemoveMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  member: { userId: string; userName: string } | null;
  onSuccess: () => void;
}

export function RemoveMemberDialog({
  open,
  onOpenChange,
  classId,
  member,
  onSuccess,
}: RemoveMemberDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const removeMemberMutation = trpc.classes.removeMember.useMutation({
    onSuccess: () => {
      setErrorMessage(null);
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const handleRemove = async () => {
    if (!member) return;

    setErrorMessage(null);
    await removeMemberMutation.mutateAsync({
      classId,
      userId: member.userId,
    });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setErrorMessage(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-gray-800 bg-gray-900 text-white">
        <DialogHeader>
          <DialogTitle>Remove Member</DialogTitle>
          <DialogDescription className="text-gray-400">
            Are you sure you want to remove this member from the class? This will delete their
            enrollment record.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {member && (
            <div className="rounded-lg bg-gray-800 p-4">
              <p className="font-medium text-white">{member.userName}</p>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 rounded-lg bg-red-900/20 p-3 text-sm text-red-400">
              {errorMessage}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={removeMemberMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {removeMemberMutation.isPending ? 'Removing...' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
