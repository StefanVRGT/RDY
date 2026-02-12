'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DeleteClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classData: { id: string; name: string } | null;
  onSuccess: () => void;
}

export function DeleteClassDialog({
  open,
  onOpenChange,
  classData,
  onSuccess,
}: DeleteClassDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deleteMutation = trpc.classes.delete.useMutation({
    onSuccess: () => {
      setErrorMessage(null);
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const handleDelete = async () => {
    if (!classData) return;

    setErrorMessage(null);
    await deleteMutation.mutateAsync({ id: classData.id });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setErrorMessage(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Class</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this class? This will also remove all member
            enrollments and curriculum assignments. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {classData && (
            <div className="rounded-lg bg-rdy-gray-100 p-4">
              <p className="font-medium">{classData.name}</p>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-500">
              {errorMessage}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
