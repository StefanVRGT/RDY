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

interface DeleteExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: { id: string; title: string } | null;
  onSuccess: () => void;
}

export function DeleteExerciseDialog({
  open,
  onOpenChange,
  exercise,
  onSuccess,
}: DeleteExerciseDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deleteMutation = trpc.exercises.delete.useMutation({
    onSuccess: () => {
      setErrorMessage(null);
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const handleDelete = async () => {
    if (!exercise) return;

    setErrorMessage(null);
    await deleteMutation.mutateAsync({ id: exercise.id });
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
          <DialogTitle>Delete Exercise</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this exercise? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {exercise && (
            <div className="rounded-lg bg-rdy-gray-100 p-4">
              <p className="font-medium">{exercise.title}</p>
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
