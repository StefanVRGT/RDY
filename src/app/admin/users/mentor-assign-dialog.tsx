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

interface MentorAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string | null;
    email: string;
    mentorId: string | null;
  } | null;
  onSuccess: () => void;
}

const NO_MENTOR_VALUE = '__none__';

export function MentorAssignDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: MentorAssignDialogProps) {
  const [selectedMentorId, setSelectedMentorId] = useState<string>(NO_MENTOR_VALUE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: mentors, isLoading: mentorsLoading } = trpc.users.getMentors.useQuery(undefined, {
    enabled: open,
  });

  useEffect(() => {
    if (user) {
      setSelectedMentorId(user.mentorId || NO_MENTOR_VALUE);
      setErrorMessage(null);
    }
  }, [user]);

  const assignMentorMutation = trpc.users.assignMentor.useMutation({
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
    await assignMentorMutation.mutateAsync({
      menteeId: user.id,
      mentorId: selectedMentorId === NO_MENTOR_VALUE ? null : selectedMentorId,
    });
  };

  const displayName = user?.name || user?.email || 'User';
  const currentMentorId = user?.mentorId || NO_MENTOR_VALUE;
  const hasChanges = selectedMentorId !== currentMentorId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gray-800 bg-gray-900 text-white">
        <DialogHeader>
          <DialogTitle>Assign Mentor</DialogTitle>
          <DialogDescription className="text-gray-400">
            Assign a mentor to {displayName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Mentor</label>
            {mentorsLoading ? (
              <div className="py-2 text-sm text-gray-400">Loading mentors...</div>
            ) : (
              <Select value={selectedMentorId} onValueChange={setSelectedMentorId}>
                <SelectTrigger className="w-full border-gray-700 bg-gray-800 text-white">
                  <SelectValue placeholder="Select a mentor" />
                </SelectTrigger>
                <SelectContent className="border-gray-700 bg-gray-800">
                  <SelectItem value={NO_MENTOR_VALUE} className="text-gray-400">
                    No mentor assigned
                  </SelectItem>
                  {mentors?.map((mentor) => (
                    <SelectItem key={mentor.id} value={mentor.id} className="text-white">
                      {mentor.name || mentor.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {!mentorsLoading && mentors?.length === 0 && (
            <div className="rounded-lg bg-yellow-900/20 p-3 text-sm text-yellow-400">
              No mentors available. You need to assign the mentor role to a user first.
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
          <Button onClick={handleSubmit} disabled={!hasChanges || assignMentorMutation.isPending}>
            {assignMentorMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
