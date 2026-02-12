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

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  onSuccess: () => void;
}

export function AddMemberDialog({
  open,
  onOpenChange,
  classId,
  onSuccess,
}: AddMemberDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: availableMentees, isLoading: menteesLoading } =
    trpc.classes.getAvailableMentees.useQuery({ id: classId }, { enabled: open });

  const addMemberMutation = trpc.classes.addMember.useMutation({
    onSuccess: () => {
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const resetForm = () => {
    setSelectedUserId('');
    setAmount('');
    setDueDate('');
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      setErrorMessage('Please select a mentee');
      return;
    }

    setErrorMessage(null);
    await addMemberMutation.mutateAsync({
      classId,
      userId: selectedUserId,
      amount: amount ? parseFloat(amount) : undefined,
      dueDate: dueDate || undefined,
    });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>
            Enroll a mentee in this class
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mentee Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Mentee *</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={menteesLoading ? 'Loading...' : 'Select a mentee'} />
              </SelectTrigger>
              <SelectContent>
                {!availableMentees?.length ? (
                  <SelectItem value="none" disabled className="text-rdy-gray-400">
                    No available mentees
                  </SelectItem>
                ) : (
                  availableMentees.map((mentee) => (
                    <SelectItem key={mentee.id} value={mentee.id}>
                      {mentee.name || mentee.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {availableMentees?.length === 0 && (
              <p className="text-sm text-yellow-400">
                All mentees are already enrolled in this class.
              </p>
            )}
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Payment Amount (EUR)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g., 299.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Payment Due Date</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

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
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedUserId || addMemberMutation.isPending}
            className="bg-rdy-orange-500 text-white hover:bg-rdy-orange-600"
          >
            {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
