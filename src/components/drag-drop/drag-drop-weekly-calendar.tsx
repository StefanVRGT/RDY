'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { format, startOfDay } from 'date-fns';
import { trpc } from '@/lib/trpc/client';
import { DroppableDay } from './droppable-day';
import {
  DraggableExerciseCard,
  ExerciseCardOverlay,
  type ExerciseData,
} from './draggable-exercise-card';
import { RescheduleConfirmDialog } from './reschedule-confirm-dialog';

export interface DayData {
  date: string;
  exercises: ExerciseData[];
  totalCount: number;
  completedCount: number;
}

interface DragDropWeeklyCalendarProps {
  weekDays: Date[];
  daysData: DayData[];
  onDayClick?: (day: DayData) => void;
}

interface PendingReschedule {
  exercise: ExerciseData;
  sourceDate: string;
  targetDate: string;
  targetDateObj: Date;
}

export function DragDropWeeklyCalendar({
  weekDays,
  daysData,
  onDayClick,
}: DragDropWeeklyCalendarProps) {
  const utils = trpc.useUtils();
  const [activeExercise, setActiveExercise] = useState<ExerciseData | null>(null);
  const [pendingReschedule, setPendingReschedule] = useState<PendingReschedule | null>(null);

  // Configure sensors for both pointer and touch events
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms press required to start drag on touch
        tolerance: 5, // 5px movement allowed during delay
      },
    })
  );

  // Update single exercise time mutation
  const updateExerciseTime = trpc.mentee.updateExerciseTime.useMutation({
    onSuccess: () => {
      utils.mentee.getExercisesForWeek.invalidate();
      utils.mentee.getExercisesForDate.invalidate();
      setPendingReschedule(null);
    },
  });

  // Reschedule series mutation
  const rescheduleExerciseSeries = trpc.mentee.rescheduleExerciseSeries.useMutation({
    onSuccess: () => {
      utils.mentee.getExercisesForWeek.invalidate();
      utils.mentee.getExercisesForDate.invalidate();
      setPendingReschedule(null);
    },
  });

  const isLoading = updateExerciseTime.isPending || rescheduleExerciseSeries.isPending;

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const exerciseData = active.data.current as { exercise: ExerciseData; sourceDate: string };
    setActiveExercise(exerciseData.exercise);
  }, []);

  // Handle drag over - visual feedback handled by DroppableDay's isOver state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDragOver = useCallback((_event: DragOverEvent) => undefined, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveExercise(null);

      if (!over) return;

      const exerciseData = active.data.current as { exercise: ExerciseData; sourceDate: string };
      const targetData = over.data.current as { date: Date; dateKey: string };

      const sourceDate = exerciseData.sourceDate;
      const targetDate = targetData.dateKey;

      // If dropped on the same day, do nothing
      if (sourceDate === targetDate) return;

      // Set up the pending reschedule to show the confirmation dialog
      setPendingReschedule({
        exercise: exerciseData.exercise,
        sourceDate,
        targetDate,
        targetDateObj: targetData.date,
      });
    },
    []
  );

  // Handle single occurrence update
  const handleConfirmSingle = useCallback(() => {
    if (!pendingReschedule) return;

    const { exercise, targetDateObj } = pendingReschedule;
    const originalTime = new Date(exercise.scheduledAt);

    // Create new scheduled time preserving the time of day
    const newScheduledAt = new Date(targetDateObj);
    newScheduledAt.setHours(originalTime.getHours());
    newScheduledAt.setMinutes(originalTime.getMinutes());
    newScheduledAt.setSeconds(0);
    newScheduledAt.setMilliseconds(0);

    updateExerciseTime.mutate({
      scheduledExerciseId: exercise.id,
      scheduledAt: newScheduledAt.toISOString(),
    });
  }, [pendingReschedule, updateExerciseTime]);

  // Handle series update
  const handleConfirmSeries = useCallback(() => {
    if (!pendingReschedule) return;

    const { exercise, targetDateObj } = pendingReschedule;
    const originalTime = new Date(exercise.scheduledAt);

    // Create new scheduled time preserving the time of day
    const newScheduledAt = new Date(targetDateObj);
    newScheduledAt.setHours(originalTime.getHours());
    newScheduledAt.setMinutes(originalTime.getMinutes());
    newScheduledAt.setSeconds(0);
    newScheduledAt.setMilliseconds(0);

    rescheduleExerciseSeries.mutate({
      scheduledExerciseId: exercise.id,
      newScheduledAt: newScheduledAt.toISOString(),
    });
  }, [pendingReschedule, rescheduleExerciseSeries]);

  // Map data to day info
  const dayInfoMap = useMemo(() => {
    const map = new Map<string, DayData>();
    daysData.forEach((day) => {
      map.set(day.date, day);
    });
    return map;
  }, [daysData]);

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Calendar Grid */}
        <div
          className="grid grid-cols-7 gap-2"
          data-testid="drag-drop-weekly-calendar"
        >
          {/* Day headers */}
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium uppercase text-gray-500"
              data-testid={`day-header-${day.toLowerCase()}`}
            >
              {day}
            </div>
          ))}

          {/* Day cells */}
          {weekDays.map((dayDate) => {
            const dateKey = format(dayDate, 'yyyy-MM-dd');
            const dayInfo = dayInfoMap.get(dateKey) || {
              date: dateKey,
              exercises: [],
              totalCount: 0,
              completedCount: 0,
            };

            return (
              <DroppableDay
                key={dateKey}
                date={dayDate}
                dateKey={dateKey}
                exerciseCount={dayInfo.totalCount}
                completedCount={dayInfo.completedCount}
                onClick={onDayClick ? () => onDayClick(dayInfo) : undefined}
              />
            );
          })}
        </div>

        {/* Exercises Summary List with Draggable Cards */}
        <div className="mt-6" data-testid="drag-drop-exercises-summary">
          <h3 className="mb-3 text-lg font-semibold text-rdy-black">
            This Week&apos;s Exercises
          </h3>
          {daysData.every((d) => d.totalCount === 0) ? (
            <div
              className="flex flex-col items-center justify-center rounded-xl bg-rdy-gray-100 py-8 text-center"
              data-testid="no-exercises-state"
            >
              <p className="text-rdy-gray-400">No exercises scheduled for this week</p>
            </div>
          ) : (
            <div className="space-y-2" data-testid="exercises-list">
              {daysData.map((dayInfo, index) => {
                if (dayInfo.exercises.length === 0) return null;
                const dayDate = weekDays[index];
                return (
                  <div
                    key={dayInfo.date}
                    className="rounded-xl bg-rdy-gray-100 p-3"
                    data-testid={`day-exercises-${dayInfo.date}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-rdy-gray-400">
                        {format(dayDate, 'EEEE, MMM d')}
                      </span>
                      <span className="text-xs text-rdy-gray-500">
                        {dayInfo.completedCount}/{dayInfo.totalCount} done
                      </span>
                    </div>
                    <div className="space-y-2">
                      {dayInfo.exercises.map((exercise) => (
                        <DraggableExerciseCard
                          key={exercise.id}
                          exercise={exercise}
                          sourceDate={dayInfo.date}
                          isDragging={activeExercise?.id === exercise.id}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drag Overlay - shows during drag */}
        <DragOverlay dropAnimation={null}>
          {activeExercise && (
            <div className="w-[280px]">
              <ExerciseCardOverlay exercise={activeExercise} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Reschedule Confirmation Dialog */}
      <RescheduleConfirmDialog
        open={!!pendingReschedule}
        onOpenChange={(open) => {
          if (!open) setPendingReschedule(null);
        }}
        exerciseTitle={pendingReschedule?.exercise.exercise?.titleDe || 'Exercise'}
        fromDate={
          pendingReschedule
            ? startOfDay(new Date(pendingReschedule.sourceDate + 'T12:00:00'))
            : new Date()
        }
        toDate={pendingReschedule?.targetDateObj || new Date()}
        onConfirmSingle={handleConfirmSingle}
        onConfirmSeries={handleConfirmSeries}
        isLoading={isLoading}
      />
    </>
  );
}
