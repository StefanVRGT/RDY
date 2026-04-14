'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    token: string;
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
  const [copied, setCopied] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const getInviteLink = (token: string) =>
    `${window.location.origin}/auth/accept-invite?token=${token}`;

  const handleCopy = async (token: string) => {
    const link = getInviteLink(token);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const el = document.createElement('textarea');
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resendMutation = trpc.invitations.resend.useMutation({
    onSuccess: (data) => {
      setErrorMessage(null);
      setNewToken(data.token);
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
      // Close the dialog after revoking since no further actions are possible
      onOpenChange(false);
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
      setNewToken(null);
      setCopied(false);
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

          {/* Copy Link section for pending invitations */}
          {canRevoke && invitation && (
            <div className="rounded-lg bg-rdy-gray-100 p-4">
              <h4 className="mb-2 font-medium text-rdy-black">Copy Invitation Link</h4>
              <p className="mb-3 text-sm text-rdy-gray-400">
                Share this link with the invited user so they can create their account.
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={getInviteLink(newToken ?? invitation.token)}
                  className="flex-1 border-rdy-gray-200 bg-background text-xs text-rdy-black"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  onClick={() => handleCopy(newToken ?? invitation.token)}
                  variant="outline"
                  className="shrink-0 border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
          )}

          {canResend && (
            <div className="rounded-lg bg-rdy-orange-500/10 p-4">
              <h4 className="mb-2 font-medium text-rdy-orange-500">Regenerate Link</h4>
              <p className="mb-3 text-sm text-rdy-gray-400">
                This will generate a new invitation link and extend the expiry by 7 days. The old
                link will no longer work.
              </p>
              <Button
                onClick={handleResend}
                disabled={isPending}
                variant="outline"
                className="border-rdy-orange-500 text-rdy-orange-500 hover:bg-rdy-orange-500/10"
              >
                {resendMutation.isPending ? 'Regenerating...' : 'Regenerate Link'}
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
