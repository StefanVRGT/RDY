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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateInvitationDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateInvitationDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'mentor' | 'mentee'>('mentee');
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createMutation = trpc.invitations.create.useMutation({
    onSuccess: (data) => {
      setErrorMessage(null);
      const link = `${window.location.origin}/auth/accept-invite?token=${data.token}`;
      setInviteLink(link);
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const handleSubmit = async () => {
    if (!email) {
      setErrorMessage('Email is required');
      return;
    }

    setErrorMessage(null);
    await createMutation.mutateAsync({
      email,
      role,
      expiresInDays,
    });
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const el = document.createElement('textarea');
      el.value = inviteLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setEmail('');
      setRole('mentee');
      setExpiresInDays(7);
      setErrorMessage(null);
      setInviteLink(null);
      setCopied(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>
            {inviteLink
              ? 'Invitation created. Share this link with the user.'
              : 'Create an invitation link to share with a new user.'}
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-green-50 p-4">
              <p className="mb-3 text-sm font-medium text-green-700">
                Invitation link created successfully
              </p>
              <p className="mb-3 text-xs text-rdy-gray-400">
                Share this link manually with the invited user. The link will expire based on your
                selected duration.
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteLink}
                  className="flex-1 border-rdy-gray-200 bg-rdy-gray-100 text-xs text-rdy-black"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="shrink-0 border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-rdy-gray-600">Email Address</label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-rdy-gray-600">Role</label>
              <Select value={role} onValueChange={(value: 'mentor' | 'mentee') => setRole(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mentee">Mentee</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-rdy-gray-600">Expires In</label>
              <Select
                value={expiresInDays.toString()}
                onValueChange={(value) => setExpiresInDays(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select expiry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {errorMessage && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500">{errorMessage}</div>
            )}
          </div>
        )}

        <DialogFooter>
          {inviteLink ? (
            <Button
              onClick={() => handleClose(false)}
              className="bg-rdy-orange-500 text-white hover:bg-rdy-orange-600"
            >
              Done
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!email || createMutation.isPending}
                className="bg-rdy-orange-500 text-white hover:bg-rdy-orange-600"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Invitation'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
