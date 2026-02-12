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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Mentor</DialogTitle>
          <DialogDescription>
            Assign a mentor to {displayName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Mentor</label>
            {mentorsLoading ? (
              <div className="py-2 text-sm text-rdy-gray-400">Loading mentors...</div>
            ) : (
              <Select value={selectedMentorId} onValueChange={setSelectedMentorId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a mentor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MENTOR_VALUE} className="text-rdy-gray-400">
                    No mentor assigned
                  </SelectItem>
                  {mentors?.map((mentor) => (
                    <SelectItem key={mentor.id} value={mentor.id}>
                      {mentor.name || mentor.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {!mentorsLoading && mentors?.length === 0 && (
            <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-600">
              No mentors available. You need to assign the mentor role to a user first.
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
            disabled={!hasChanges || assignMentorMutation.isPending}
            className="bg-rdy-orange-500 text-white hover:bg-rdy-orange-600"
          >
            {assignMentorMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
