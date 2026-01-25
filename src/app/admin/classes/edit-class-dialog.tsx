'use client';

import { useState, useEffect } from 'react';
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

interface SessionConfig {
  monthlySessionCount: number;
  sessionDurationMinutes: number;
}

interface ClassData {
  id: string;
  name: string;
  status: 'active' | 'disabled';
  mentorId: string;
  durationMonths: number;
  startDate: Date;
  endDate: Date;
  sessionConfig: unknown;
}

interface EditClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classData: ClassData | null;
  onSuccess: () => void;
}

export function EditClassDialog({
  open,
  onOpenChange,
  classData,
  onSuccess,
}: EditClassDialogProps) {
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

  const updateMutation = trpc.classes.update.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  useEffect(() => {
    if (classData) {
      setName(classData.name);
      setMentorId(classData.mentorId);
      setStatus(classData.status);
      setDurationMonths(String(classData.durationMonths));
      setStartDate(new Date(classData.startDate).toISOString().split('T')[0]);
      setEndDate(new Date(classData.endDate).toISOString().split('T')[0]);

      const config = classData.sessionConfig as SessionConfig | null;
      if (config) {
        setMonthlySessionCount(String(config.monthlySessionCount ?? 2));
        setSessionDurationMinutes(String(config.sessionDurationMinutes ?? 60));
      }
      setErrorMessage(null);
    }
  }, [classData]);

  const handleSubmit = async () => {
    if (!classData) return;

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
    await updateMutation.mutateAsync({
      id: classData.id,
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
      setErrorMessage(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-gray-800 bg-gray-900 text-white sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Class</DialogTitle>
          <DialogDescription className="text-gray-400">
            Update class details and configuration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Name *</label>
            <Input
              placeholder="Class name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Mentor */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Mentor *</label>
            <Select value={mentorId} onValueChange={setMentorId}>
              <SelectTrigger className="w-full border-gray-700 bg-gray-800 text-white">
                <SelectValue placeholder="Select mentor" />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-800">
                {mentors?.map((mentor) => (
                  <SelectItem key={mentor.id} value={mentor.id} className="text-white">
                    {mentor.name || mentor.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Status</label>
            <Select
              value={status}
              onValueChange={(value: 'active' | 'disabled') => setStatus(value)}
            >
              <SelectTrigger className="w-full border-gray-700 bg-gray-800 text-white">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-800">
                <SelectItem value="active" className="text-white">
                  Active
                </SelectItem>
                <SelectItem value="disabled" className="text-white">
                  Disabled
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Duration (months) *</label>
            <Input
              type="number"
              min="1"
              placeholder="3"
              value={durationMonths}
              onChange={(e) => setDurationMonths(e.target.value)}
              className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Start Date *</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">End Date *</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Session Configuration */}
          <div className="space-y-4 rounded-lg border border-gray-700 p-4">
            <p className="text-sm font-medium text-gray-300">Session Configuration</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Sessions per month</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="2"
                  value={monthlySessionCount}
                  onChange={(e) => setMonthlySessionCount(e.target.value)}
                  className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Duration (minutes)</label>
                <Input
                  type="number"
                  min="15"
                  step="15"
                  placeholder="60"
                  value={sessionDurationMinutes}
                  onChange={(e) => setSessionDurationMinutes(e.target.value)}
                  className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                />
              </div>
            </div>
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
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !mentorId || !startDate || !endDate || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
