'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RoleChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: 'mentor' | 'mentee';
  } | null;
  onSuccess: () => void;
}

export function RoleChangeDialog({ open, onOpenChange, user, onSuccess }: RoleChangeDialogProps) {
  const [selectedRole, setSelectedRole] = useState<'mentor' | 'mentee'>('mentee');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
      setErrorMessage(null);
    }
  }, [user]);

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const handleSubmit = async () => {
    if (!user) return;

    setErrorMessage(null);
    await updateRoleMutation.mutateAsync({
      id: user.id,
      role: selectedRole,
    });
  };

  const displayName = user?.name || user?.email || 'User';
  const isRoleChanged = user && selectedRole !== user.role;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gray-800 bg-gray-900 text-white">
        <DialogHeader>
          <DialogTitle>Change User Role</DialogTitle>
          <DialogDescription className="text-gray-400">
            Change the role for {displayName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Role</label>
            <Select
              value={selectedRole}
              onValueChange={(value: 'mentor' | 'mentee') => setSelectedRole(value)}
            >
              <SelectTrigger className="w-full border-gray-700 bg-gray-800 text-white">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-800">
                <SelectItem value="mentor" className="text-white">
                  Mentor
                </SelectItem>
                <SelectItem value="mentee" className="text-white">
                  Mentee
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {user?.role === 'mentor' && selectedRole === 'mentee' && (
            <div className="rounded-lg bg-yellow-900/20 p-3 text-sm text-yellow-400">
              Warning: Changing this user from mentor to mentee will remove them as the mentor for
              any mentees currently assigned to them.
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg bg-red-900/20 p-3 text-sm text-red-400">{errorMessage}</div>
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
          <Button onClick={handleSubmit} disabled={!isRoleChanged || updateRoleMutation.isPending}>
            {updateRoleMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
