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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitation Actions</DialogTitle>
          <DialogDescription>
            Manage invitation for {invitation?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2 rounded-lg bg-rdy-gray-100 p-4">
            <p className="text-sm text-rdy-gray-400">
              Current Status:{' '}
              <span className="font-medium capitalize">{invitation?.status}</span>
            </p>
          </div>

          {canResend && (
            <div className="rounded-lg bg-rdy-orange-500/10 p-4">
              <h4 className="mb-2 font-medium text-rdy-orange-500">Resend Invitation</h4>
              <p className="mb-3 text-sm text-rdy-gray-400">
                This will generate a new invitation link and extend the expiry by 7 days.
              </p>
              <Button
                onClick={handleResend}
                disabled={isPending}
                variant="outline"
                className="border-rdy-orange-500 text-rdy-orange-500 hover:bg-rdy-orange-500/10"
              >
                {resendMutation.isPending ? 'Resending...' : 'Resend Invitation'}
              </Button>
            </div>
          )}

          {canRevoke && (
            <div className="rounded-lg bg-red-50 p-4">
              <h4 className="mb-2 font-medium text-red-500">Revoke Invitation</h4>
              <p className="mb-3 text-sm text-rdy-gray-400">
                This will permanently invalidate the invitation. The user will not be able to accept
                it.
              </p>
              <Button
                onClick={handleRevoke}
                disabled={isPending}
                variant="outline"
                className="border-red-700 text-red-500 hover:bg-red-50"
              >
                {revokeMutation.isPending ? 'Revoking...' : 'Revoke Invitation'}
              </Button>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500">{errorMessage}</div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
