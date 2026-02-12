'use client';

import * as React from 'react';
import { format, parse, setHours, setMinutes, isSameDay, addDays } from 'date-fns';
import { Clock, AlertTriangle, Calendar, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ScrollWheelTimePicker,
  ScrollWheelDurationPicker,
} from '@/components/ui/scroll-wheel-time-picker';

// Types for exercise time conflicts
export interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  type: 'exercise' | 'mentor_availability' | 'other';
  label: string;
}

export interface ExerciseTimeSettingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseId: string;
  exerciseTitle: string;
  currentTime: Date;
  currentDuration: number; // in minutes
  onSave: (time: Date, duration: number) => void;
  existingSlots?: TimeSlot[];
  mentorAvailability?: TimeSlot[];
}

// Conflict detection utility
function detectConflicts(
  proposedStart: Date,
  proposedDuration: number,
  existingSlots: TimeSlot[],
  excludeId?: string
): TimeSlot[] {
  const proposedEnd = new Date(proposedStart.getTime() + proposedDuration * 60 * 1000);

  return existingSlots.filter((slot) => {
    if (slot.id === excludeId) return false;

    // Check for overlap
    const overlaps =
      (proposedStart >= slot.startTime && proposedStart < slot.endTime) ||
      (proposedEnd > slot.startTime && proposedEnd <= slot.endTime) ||
      (proposedStart <= slot.startTime && proposedEnd >= slot.endTime);

    return overlaps;
  });
}

// Check if time is within mentor availability
function isWithinMentorAvailability(
  proposedStart: Date,
  proposedDuration: number,
  mentorAvailability: TimeSlot[]
): boolean {
  if (mentorAvailability.length === 0) return true;

  const proposedEnd = new Date(proposedStart.getTime() + proposedDuration * 60 * 1000);

  return mentorAvailability.some((slot) => {
    return proposedStart >= slot.startTime && proposedEnd <= slot.endTime;
  });
}

export function ExerciseTimeSettingDialog({
  open,
  onOpenChange,
  exerciseId,
  exerciseTitle,
  currentTime,
  currentDuration,
  onSave,
  existingSlots = [],
  mentorAvailability = [],
}: ExerciseTimeSettingProps) {
  // State for time selection
  const [selectedTime, setSelectedTime] = React.useState<string>(() =>
    format(currentTime, 'HH:mm')
  );
  const [selectedDuration, setSelectedDuration] = React.useState(currentDuration);
  const [selectedDate, setSelectedDate] = React.useState<Date>(currentTime);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedTime(format(currentTime, 'HH:mm'));
      setSelectedDuration(currentDuration);
      setSelectedDate(currentTime);
    }
  }, [open, currentTime, currentDuration]);

  // Calculate proposed time
  const proposedTime = React.useMemo(() => {
    const [hours, minutes] = selectedTime.split(':').map(Number);
    let newDate = new Date(selectedDate);
    newDate = setHours(newDate, hours);
    newDate = setMinutes(newDate, minutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    return newDate;
  }, [selectedTime, selectedDate]);

  // Detect conflicts
  const conflicts = React.useMemo(() => {
    return detectConflicts(
      proposedTime,
      selectedDuration,
      existingSlots,
      exerciseId
    );
  }, [proposedTime, selectedDuration, existingSlots, exerciseId]);

  // Check mentor availability
  const withinAvailability = React.useMemo(() => {
    return isWithinMentorAvailability(
      proposedTime,
      selectedDuration,
      mentorAvailability
    );
  }, [proposedTime, selectedDuration, mentorAvailability]);

  const hasWarnings = conflicts.length > 0 || !withinAvailability;

  const handleSave = () => {
    onSave(proposedTime, selectedDuration);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        data-testid="exercise-time-setting-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-rdy-orange-500" />
            Set Exercise Time
          </DialogTitle>
          <DialogDescription>
            {exerciseTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date display */}
          <div className="flex items-center justify-center gap-2 text-sm text-rdy-gray-400">
            <Calendar className="h-4 w-4" />
            <span data-testid="selected-date">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </span>
          </div>

          {/* Time picker */}
          <div className="flex justify-center" data-testid="time-picker-section">
            <ScrollWheelTimePicker
              value={selectedTime}
              onChange={setSelectedTime}
            />
          </div>

          {/* Duration picker */}
          <div className="border-t border-rdy-gray-200 pt-4">
            <h4 className="mb-3 text-center text-sm font-medium text-rdy-gray-400">
              Duration
            </h4>
            <div className="flex justify-center" data-testid="duration-picker-section">
              <ScrollWheelDurationPicker
                value={selectedDuration}
                onChange={setSelectedDuration}
                minDuration={5}
                maxDuration={120}
                step={5}
              />
            </div>
          </div>

          {/* Conflict warnings */}
          {hasWarnings && (
            <div
              className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4"
              data-testid="conflict-warning"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
                <div className="space-y-2">
                  {conflicts.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-yellow-600">
                        Time Conflict Detected
                      </p>
                      <ul className="mt-1 text-sm text-yellow-600/80">
                        {conflicts.map((conflict) => (
                          <li key={conflict.id}>
                            {conflict.label} ({format(conflict.startTime, 'h:mm a')} -{' '}
                            {format(conflict.endTime, 'h:mm a')})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!withinAvailability && (
                    <p className="text-sm text-yellow-600/80">
                      This time is outside your mentor&apos;s available hours.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Time summary */}
          <div className="rounded-lg bg-rdy-gray-100 p-4 text-center">
            <p className="text-sm text-rdy-gray-400">Scheduled for</p>
            <p className="text-2xl font-bold text-rdy-black" data-testid="time-summary">
              {format(proposedTime, 'h:mm a')}
            </p>
            <p className="text-sm text-rdy-gray-400" data-testid="duration-summary">
              {selectedDuration} minutes
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            data-testid="cancel-button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className={cn(
              hasWarnings && 'bg-yellow-600 hover:bg-yellow-700'
            )}
            data-testid="save-button"
          >
            {hasWarnings ? 'Save Anyway' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Bulk time setting for the week
export interface BulkTimeSettingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStartDate: Date;
  exercises: Array<{
    id: string;
    exerciseId: string;
    title: string;
    date: Date;
    currentTime: Date;
  }>;
  onSave: (updates: Array<{ id: string; time: Date }>) => void;
  existingSlots?: TimeSlot[];
}

export function BulkTimeSettingDialog({
  open,
  onOpenChange,
  weekStartDate,
  exercises,
  onSave,
  existingSlots = [],
}: BulkTimeSettingProps) {
  const [selectedTime, setSelectedTime] = React.useState('08:00');
  const [selectedDays, setSelectedDays] = React.useState<number[]>([0, 1, 2, 3, 4]); // Days 0-4 (first 5 days from week start)

  const days = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStartDate, i);
      return {
        index: i,
        label: format(date, 'EEE'),
        fullLabel: format(date, 'EEEE'),
        date,
      };
    });
  }, [weekStartDate]);

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  // Calculate conflicts for all proposed times
  const allConflicts = React.useMemo(() => {
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const conflictsByDay: Record<number, TimeSlot[]> = {};

    selectedDays.forEach((dayIndex) => {
      const dayDate = days[dayIndex].date;
      let proposedTime = new Date(dayDate);
      proposedTime = setHours(proposedTime, hours);
      proposedTime = setMinutes(proposedTime, minutes);

      const dayExercises = exercises.filter((ex) =>
        isSameDay(ex.date, dayDate)
      );

      if (dayExercises.length > 0) {
        const exerciseConflicts = detectConflicts(
          proposedTime,
          30, // Default duration
          existingSlots.filter((slot) => isSameDay(slot.startTime, dayDate)),
          undefined
        );
        if (exerciseConflicts.length > 0) {
          conflictsByDay[dayIndex] = exerciseConflicts;
        }
      }
    });

    return conflictsByDay;
  }, [selectedTime, selectedDays, days, exercises, existingSlots]);

  const hasConflicts = Object.keys(allConflicts).length > 0;

  const handleSave = () => {
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const updates: Array<{ id: string; time: Date }> = [];

    selectedDays.forEach((dayIndex) => {
      const dayDate = days[dayIndex].date;
      const dayExercises = exercises.filter((ex) =>
        isSameDay(ex.date, dayDate)
      );

      dayExercises.forEach((ex) => {
        let newTime = new Date(ex.date);
        newTime = setHours(newTime, hours);
        newTime = setMinutes(newTime, minutes);
        newTime.setSeconds(0);
        newTime.setMilliseconds(0);

        updates.push({ id: ex.id, time: newTime });
      });
    });

    onSave(updates);
    onOpenChange(false);
  };

  const affectedExerciseCount = React.useMemo(() => {
    return selectedDays.reduce((count, dayIndex) => {
      const dayDate = days[dayIndex].date;
      return count + exercises.filter((ex) => isSameDay(ex.date, dayDate)).length;
    }, 0);
  }, [selectedDays, days, exercises]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        data-testid="bulk-time-setting-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-rdy-orange-500" />
            Bulk Set Time
          </DialogTitle>
          <DialogDescription>
            Set the same time for exercises on selected days
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Day selection */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-rdy-gray-400">
              Apply to days
            </h4>
            <div
              className="flex justify-center gap-2"
              data-testid="day-selection"
            >
              {days.map((day) => (
                <button
                  key={day.index}
                  type="button"
                  onClick={() => toggleDay(day.index)}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    selectedDays.includes(day.index)
                      ? 'bg-rdy-orange-500 text-white'
                      : 'bg-rdy-gray-100 text-rdy-gray-400 hover:bg-rdy-gray-200'
                  )}
                  title={day.fullLabel}
                  data-testid={`day-toggle-${day.index}`}
                >
                  {day.label.charAt(0)}
                </button>
              ))}
            </div>
          </div>

          {/* Time picker */}
          <div className="border-t border-rdy-gray-200 pt-4">
            <h4 className="mb-3 text-center text-sm font-medium text-rdy-gray-400">
              Set Time
            </h4>
            <div className="flex justify-center" data-testid="bulk-time-picker">
              <ScrollWheelTimePicker
                value={selectedTime}
                onChange={setSelectedTime}
              />
            </div>
          </div>

          {/* Conflict warnings */}
          {hasConflicts && (
            <div
              className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4"
              data-testid="bulk-conflict-warning"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-yellow-600">
                    Conflicts on some days
                  </p>
                  <ul className="mt-1 text-sm text-yellow-600/80">
                    {Object.entries(allConflicts).map(([dayIndex, conflicts]) => (
                      <li key={dayIndex}>
                        {days[Number(dayIndex)].fullLabel}: {conflicts.length} conflict(s)
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="rounded-lg bg-rdy-gray-100 p-4 text-center">
            <p className="text-sm text-rdy-gray-400">
              Will update <span className="font-bold text-rdy-black">{affectedExerciseCount}</span> exercise(s)
            </p>
            <p className="text-sm text-rdy-gray-400">
              on{' '}
              <span className="font-bold text-rdy-black">
                {selectedDays.length} day(s)
              </span>
            </p>
            <p className="mt-2 text-lg font-bold text-rdy-black" data-testid="bulk-time-summary">
              {format(
                parse(selectedTime, 'HH:mm', new Date()),
                'h:mm a'
              )}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            data-testid="bulk-cancel-button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={selectedDays.length === 0 || affectedExerciseCount === 0}
            className={cn(
              hasConflicts && 'bg-yellow-600 hover:bg-yellow-700'
            )}
            data-testid="bulk-save-button"
          >
            {hasConflicts ? 'Apply Anyway' : 'Apply to All'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
