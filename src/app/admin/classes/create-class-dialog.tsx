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

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateClassDialog({ open, onOpenChange, onSuccess }: CreateClassDialogProps) {
  const [name, setName] = useState('');
  const [mentorId, setMentorId] = useState('');
  const [status, setStatus] = useState<'active' | 'disabled'>('active');
  const [durationMonths, setDurationMonths] = useState('3');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthlySessionCount, setMonthlySessionCount] = useState('2');
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState('60');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: mentors } = trpc.classes.getMentors.useQuery(undefined, {
    enabled: open,
  });

  const createMutation = trpc.classes.create.useMutation({
    onSuccess: () => {
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const resetForm = () => {
    setName('');
    setMentorId('');
    setStatus('active');
    setDurationMonths('3');
    setStartDate('');
    setEndDate('');
    setMonthlySessionCount('2');
    setSessionDurationMinutes('60');
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setErrorMessage('Name is required');
      return;
    }
    if (!mentorId) {
      setErrorMessage('Mentor is required');
      return;
    }
    if (!startDate) {
      setErrorMessage('Start date is required');
      return;
    }
    if (!endDate) {
      setErrorMessage('End date is required');
      return;
    }

    setErrorMessage(null);
    await createMutation.mutateAsync({
      name: name.trim(),
      mentorId,
      status,
      durationMonths: parseInt(durationMonths, 10),
      startDate,
      endDate,
      sessionConfig: {
        monthlySessionCount: parseInt(monthlySessionCount, 10),
        sessionDurationMinutes: parseInt(sessionDurationMinutes, 10),
      },
    });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  // Auto-calculate end date when start date and duration change
  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (value && durationMonths) {
      const start = new Date(value);
      start.setMonth(start.getMonth() + parseInt(durationMonths, 10));
      setEndDate(start.toISOString().split('T')[0]);
    }
  };

  const handleDurationChange = (value: string) => {
    setDurationMonths(value);
    if (startDate && value) {
      const start = new Date(startDate);
      start.setMonth(start.getMonth() + parseInt(value, 10));
      setEndDate(start.toISOString().split('T')[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Class</DialogTitle>
          <DialogDescription>
            Create a new class with a mentor and schedule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Name *</label>
            <Input
              placeholder="Class name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Mentor */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Mentor *</label>
            <Select value={mentorId} onValueChange={setMentorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select mentor" />
              </SelectTrigger>
              <SelectContent>
                {mentors?.map((mentor) => (
                  <SelectItem key={mentor.id} value={mentor.id}>
                    {mentor.name || mentor.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Status</label>
            <Select
              value={status}
              onValueChange={(value: 'active' | 'disabled') => setStatus(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  Active
                </SelectItem>
                <SelectItem value="disabled">
                  Disabled
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Duration (months) *</label>
            <Input
              type="number"
              min="1"
              placeholder="3"
              value={durationMonths}
              onChange={(e) => handleDurationChange(e.target.value)}
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Start Date *</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">End Date *</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Session Configuration */}
          <div className="space-y-4 rounded-lg border border-rdy-gray-200 p-4">
            <p className="text-sm font-medium text-rdy-gray-600">Session Configuration</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-rdy-gray-400">Sessions per month</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="2"
                  value={monthlySessionCount}
                  onChange={(e) => setMonthlySessionCount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-rdy-gray-400">Duration (minutes)</label>
                <Input
                  type="number"
                  min="15"
                  step="15"
                  placeholder="60"
                  value={sessionDurationMinutes}
                  onChange={(e) => setSessionDurationMinutes(e.target.value)}
                />
              </div>
            </div>
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
            disabled={!name.trim() || !mentorId || !startDate || !endDate || createMutation.isPending}
            className="bg-rdy-orange-500 text-white hover:bg-rdy-orange-600"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Class'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
