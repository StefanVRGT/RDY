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

interface DeleteLevelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: { id: string; title: string } | null;
  onSuccess: () => void;
}

export function DeleteLevelDialog({
  open,
  onOpenChange,
  level,
  onSuccess,
}: DeleteLevelDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deleteMutation = trpc.schwerpunktebenen.delete.useMutation({
    onSuccess: () => {
      setErrorMessage(null);
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const handleDelete = async () => {
    if (!level) return;

    setErrorMessage(null);
    await deleteMutation.mutateAsync({ id: level.id });
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
          <DialogTitle>Modul löschen</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this Modul? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {level && (
            <div className="rounded-lg bg-rdy-gray-100 p-4">
              <p className="font-medium">{level.title}</p>
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
