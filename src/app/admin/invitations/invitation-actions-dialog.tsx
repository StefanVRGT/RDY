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

interface InvitationActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invitation: {
    id: string;
    email: string;
    status: 'pending' | 'accepted' | 'expired' | 'revoked';
  } | null;
  onSuccess: () => void;
}

export function InvitationActionsDialog({
  open,
  onOpenChange,
  invitation,
  onSuccess,
}: InvitationActionsDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resendMutation = trpc.invitations.resend.useMutation({
    onSuccess: () => {
      setErrorMessage(null);
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const revokeMutation = trpc.invitations.revoke.useMutation({
    onSuccess: () => {
      setErrorMessage(null);
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const handleResend = async () => {
    if (!invitation) return;
    setErrorMessage(null);
    await resendMutation.mutateAsync({ id: invitation.id });
  };

  const handleRevoke = async () => {
    if (!invitation) return;
    setErrorMessage(null);
    await revokeMutation.mutateAsync({ id: invitation.id });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setErrorMessage(null);
    }
    onOpenChange(open);
  };

  const isPending = resendMutation.isPending || revokeMutation.isPending;
  const canResend = invitation?.status === 'pending' || invitation?.status === 'expired';
  const canRevoke = invitation?.status === 'pending';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-gray-800 bg-gray-900 text-white">
        <DialogHeader>
          <DialogTitle>Invitation Actions</DialogTitle>
          <DialogDescription className="text-gray-400">
            Manage invitation for {invitation?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2 rounded-lg bg-gray-800 p-4">
            <p className="text-sm text-gray-400">
              Current Status:{' '}
              <span className="font-medium capitalize text-white">{invitation?.status}</span>
            </p>
          </div>

          {canResend && (
            <div className="rounded-lg bg-blue-900/20 p-4">
              <h4 className="mb-2 font-medium text-blue-400">Resend Invitation</h4>
              <p className="mb-3 text-sm text-gray-400">
                This will generate a new invitation link and extend the expiry by 7 days.
              </p>
              <Button
                onClick={handleResend}
                disabled={isPending}
                variant="outline"
                className="border-blue-700 text-blue-400 hover:bg-blue-900/30"
              >
                {resendMutation.isPending ? 'Resending...' : 'Resend Invitation'}
              </Button>
            </div>
          )}

          {canRevoke && (
            <div className="rounded-lg bg-red-900/20 p-4">
              <h4 className="mb-2 font-medium text-red-400">Revoke Invitation</h4>
              <p className="mb-3 text-sm text-gray-400">
                This will permanently invalidate the invitation. The user will not be able to accept
                it.
              </p>
              <Button
                onClick={handleRevoke}
                disabled={isPending}
                variant="outline"
                className="border-red-700 text-red-400 hover:bg-red-900/30"
              >
                {revokeMutation.isPending ? 'Revoking...' : 'Revoke Invitation'}
              </Button>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg bg-red-900/20 p-3 text-sm text-red-400">{errorMessage}</div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
