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
import { DAYS_PER_LEVEL } from '@/lib/constants';

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateClassDialog({ open, onOpenChange, onSuccess }: CreateClassDialogProps) {
  const [name, setName] = useState('');
  const [mentorId, setMentorId] = useState('');
  const [status, setStatus] = useState<'active' | 'disabled'>('active');
  const [durationLevels, setDurationLevels] = useState('5');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthlySessionCount, setMonthlySessionCount] = useState('2');
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState('60');
  const [curriculumSelections, setCurriculumSelections] = useState<Record<number, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: mentors } = trpc.classes.getMentors.useQuery(undefined, { enabled: open });
  const { data: schwerpunktebenenData } = trpc.classes.getAvailableSchwerpunktebenen.useQuery(
    undefined,
    { enabled: open }
  );

  const createMutation = trpc.classes.create.useMutation();
  const assignCurriculumMutation = trpc.classes.assignCurriculum.useMutation();

  const resetForm = () => {
    setName('');
    setMentorId('');
    setStatus('active');
    setDurationLevels('5');
    setStartDate('');
    setEndDate('');
    setMonthlySessionCount('2');
    setSessionDurationMinutes('60');
    setCurriculumSelections({});
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
    try {
      const newClass = await createMutation.mutateAsync({
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

      // Assign selected schwerpunktebenen in parallel
      const assignments = Object.entries(curriculumSelections).filter(([, spId]) => spId);
      if (assignments.length > 0) {
        await Promise.all(
          assignments.map(([month, schwerpunktebeneId]) =>
            assignCurriculumMutation.mutateAsync({
              classId: newClass.id,
              schwerpunktebeneId,
              levelNumber: parseInt(month, 10),
            })
          )
        );
      }

      resetForm();
      onSuccess();
    } catch (err) {
      if (err instanceof Error) setErrorMessage(err.message);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

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

  const handleDurationChange = (value: string) => {
    setDurationLevels(value);
    calculateEndDate(startDate, value);
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
            <label className="text-sm font-medium text-rdy-gray-600">Number of Module *</label>
            <Input
              type="number"
              min="1"
              placeholder="5"
              value={durationLevels}
              onChange={(e) => handleDurationChange(e.target.value)}
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

          {/* Curriculum (optional) */}
          {parseInt(durationLevels, 10) > 0 && (
            <div className="space-y-3 rounded-lg border border-rdy-gray-200 p-4">
              <div>
                <p className="text-sm font-medium text-rdy-gray-600">Programm Module (optional)</p>
                <p className="text-xs text-rdy-gray-400">Assign a Modul now, or do it later from the class detail page.</p>
              </div>
              {Array.from({ length: parseInt(durationLevels, 10) }, (_, i) => i + 1).map((month) => (
                <div key={month} className="space-y-1">
                  <label className="text-xs text-rdy-gray-400">Modul {month}</label>
                  <Select
                    value={curriculumSelections[month] ?? ''}
                    onValueChange={(value) =>
                      setCurriculumSelections((prev) => ({ ...prev, [month]: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="— none —" />
                    </SelectTrigger>
                    <SelectContent>
                      {schwerpunktebenenData?.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>
                          {sp.titleDe}
                          {sp.titleEn ? ` / ${sp.titleEn}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

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
            disabled={
              !name.trim() ||
              !mentorId ||
              !startDate ||
              !endDate ||
              !isSunday(startDate) ||
              createMutation.isPending ||
              assignCurriculumMutation.isPending
            }
            className="bg-rdy-orange-500 text-white hover:bg-rdy-orange-600"
          >
            {createMutation.isPending || assignCurriculumMutation.isPending
              ? 'Creating...'
              : 'Create Class'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
