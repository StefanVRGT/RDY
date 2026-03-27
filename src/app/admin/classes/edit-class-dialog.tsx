'use client';

import { useState, useEffect } from 'react';
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
import { DAYS_PER_LEVEL } from '@/lib/constants';

interface SessionConfig {
  monthlySessionCount: number;
  sessionDurationMinutes: number;
}

interface ClassData {
  id: string;
  name: string;
  status: 'active' | 'disabled';
  mentorId: string;
  durationLevels: number;
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
  const [durationLevels, setDurationLevels] = useState('5');
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
      setDurationLevels(String(classData.durationLevels));
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

  // Check if a date is a Sunday
  const isSunday = (dateStr: string) => {
    if (!dateStr) return true;
    return new Date(dateStr + 'T12:00:00').getDay() === 0;
  };

  // Auto-calculate end date: startDate + durationLevels * 21 days
  const calculateEndDate = (start: string, levels: string) => {
    if (!start || !levels) return;
    const startDt = new Date(start + 'T12:00:00');
    const totalDays = parseInt(levels, 10) * DAYS_PER_LEVEL;
    startDt.setDate(startDt.getDate() + totalDays);
    setEndDate(startDt.toISOString().split('T')[0]);
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (value && !isSunday(value)) {
      setErrorMessage('Class must start on a Sunday');
    } else {
      setErrorMessage(null);
    }
    calculateEndDate(value, durationLevels);
  };

  const handleDurationLevelsChange = (value: string) => {
    setDurationLevels(value);
    calculateEndDate(startDate, value);
  };

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
      durationLevels: parseInt(durationLevels, 10),
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Class</DialogTitle>
          <DialogDescription>
            Update class details and configuration
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
            <label className="text-sm font-medium text-rdy-gray-600">Number of Module *</label>
            <Input
              type="number"
              min="1"
              placeholder="5"
              value={durationLevels}
              onChange={(e) => handleDurationLevelsChange(e.target.value)}
            />
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Start Date * (must be a Sunday)</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
            />
            {startDate && !isSunday(startDate) && (
              <p className="text-xs text-red-500">Selected date is not a Sunday</p>
            )}
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">End Date (auto-calculated)</label>
            <Input
              type="date"
              value={endDate}
              readOnly
              className="bg-rdy-gray-100"
            />
            <p className="text-xs text-rdy-gray-400">
              Each level = 3 weeks (20 active days + 1 rest day)
            </p>
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
            disabled={!name.trim() || !mentorId || !startDate || !endDate || !isSunday(startDate) || updateMutation.isPending}
            className="bg-rdy-orange-500 text-white hover:bg-rdy-orange-600"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
