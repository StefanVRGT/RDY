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

interface DeleteWeekDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  week: { id: string; title: string } | null;
  onSuccess: () => void;
}

export function DeleteWeekDialog({ open, onOpenChange, week, onSuccess }: DeleteWeekDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deleteMutation = trpc.weeks.delete.useMutation({
    onSuccess: () => {
      setErrorMessage(null);
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const handleDelete = async () => {
    if (!week) return;
    setErrorMessage(null);
    await deleteMutation.mutateAsync({ id: week.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gray-800 bg-gray-900 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Week</DialogTitle>
          <DialogDescription className="text-gray-400">
            Are you sure you want to delete this week? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {week && (
            <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-4">
              <p className="font-medium text-white">{week.title}</p>
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
            onClick={() => onOpenChange(false)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Week'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
