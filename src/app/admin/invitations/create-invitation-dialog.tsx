'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
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

  const createMutation = trpc.invitations.create.useMutation({
    onSuccess: () => {
      setEmail('');
      setRole('mentee');
      setExpiresInDays(7);
      setErrorMessage(null);
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

  const handleClose = (open: boolean) => {
    if (!open) {
      setEmail('');
      setRole('mentee');
      setExpiresInDays(7);
      setErrorMessage(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-gray-800 bg-gray-900 text-white">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription className="text-gray-400">
            Send an invitation to a new user to join your organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Email Address</label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Role</label>
            <Select value={role} onValueChange={(value: 'mentor' | 'mentee') => setRole(value)}>
              <SelectTrigger className="w-full border-gray-700 bg-gray-800 text-white">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-800">
                <SelectItem value="mentee" className="text-white">
                  Mentee
                </SelectItem>
                <SelectItem value="mentor" className="text-white">
                  Mentor
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Expires In</label>
            <Select
              value={expiresInDays.toString()}
              onValueChange={(value) => setExpiresInDays(parseInt(value))}
            >
              <SelectTrigger className="w-full border-gray-700 bg-gray-800 text-white">
                <SelectValue placeholder="Select expiry" />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-800">
                <SelectItem value="1" className="text-white">
                  1 day
                </SelectItem>
                <SelectItem value="3" className="text-white">
                  3 days
                </SelectItem>
                <SelectItem value="7" className="text-white">
                  7 days
                </SelectItem>
                <SelectItem value="14" className="text-white">
                  14 days
                </SelectItem>
                <SelectItem value="30" className="text-white">
                  30 days
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

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
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!email || createMutation.isPending}>
            {createMutation.isPending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
