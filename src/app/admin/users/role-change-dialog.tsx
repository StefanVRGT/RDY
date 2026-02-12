'use client';

import { useState, useEffect } from 'react';
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change User Role</DialogTitle>
          <DialogDescription>
            Change the role for {displayName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Role</label>
            <Select
              value={selectedRole}
              onValueChange={(value: 'mentor' | 'mentee') => setSelectedRole(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mentor">
                  Mentor
                </SelectItem>
                <SelectItem value="mentee">
                  Mentee
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {user?.role === 'mentor' && selectedRole === 'mentee' && (
            <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-600">
              Warning: Changing this user from mentor to mentee will remove them as the mentor for
              any mentees currently assigned to them.
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500">{errorMessage}</div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isRoleChanged || updateRoleMutation.isPending}
            className="bg-rdy-orange-500 text-white hover:bg-rdy-orange-600"
          >
            {updateRoleMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
