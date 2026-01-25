'use client';

import { useDroppable } from '@dnd-kit/core';
import { format, isToday } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DroppableDayProps {
  date: Date;
  dateKey: string;
  exerciseCount: number;
  completedCount: number;
  children?: React.ReactNode;
  onClick?: () => void;
}

export function DroppableDay({
  date,
  dateKey,
  exerciseCount,
  completedCount,
  children,
  onClick,
}: DroppableDayProps) {
  const { isOver, setNodeRef, active } = useDroppable({
    id: dateKey,
    data: {
      date,
      dateKey,
    },
  });

  const isDayToday = isToday(date);
  const hasExercises = exerciseCount > 0;
  const allCompleted = hasExercises && completedCount === exerciseCount;
  const isDropTarget = !!active && isOver;
  const isDragActive = !!active;

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        'relative flex min-h-[80px] flex-col items-center rounded-xl p-2 transition-all duration-200',
        isDayToday
          ? 'bg-twilight-600 ring-2 ring-twilight-400'
          : 'bg-gray-900',
        !isDayToday && !isDropTarget && 'hover:bg-gray-800',
        // Visual feedback during drag
        isDragActive && !isDropTarget && 'opacity-70',
        isDropTarget && 'scale-105 bg-twilight-700 ring-2 ring-twilight-400 shadow-lg',
        // Cursor
        onClick && 'cursor-pointer'
      )}
      data-testid={`droppable-day-${dateKey}`}
      data-is-over={isOver}
      data-is-today={isDayToday}
      data-has-exercises={hasExercises}
    >
      {/* Drop indicator overlay */}
      {isDropTarget && (
        <div
          className="absolute inset-0 rounded-xl border-2 border-dashed border-twilight-400 bg-twilight-500/20"
          data-testid={`drop-indicator-${dateKey}`}
        />
      )}

      {/* Day number */}
      <span
        className={cn(
          'relative z-10 text-lg font-bold',
          isDayToday ? 'text-white' : 'text-gray-300',
          isDropTarget && 'text-white'
        )}
      >
        {format(date, 'd')}
      </span>

      {/* Exercise indicator */}
      {hasExercises && (
        <div className="relative z-10 mt-1 flex flex-col items-center gap-1">
          {/* Exercise count */}
          <span
            className={cn(
              'text-xs',
              isDayToday ? 'text-twilight-200' : 'text-gray-500',
              isDropTarget && 'text-twilight-200'
            )}
            data-testid={`exercise-count-${dateKey}`}
          >
            {exerciseCount} ex
          </span>

          {/* Completion status */}
          {allCompleted ? (
            <CheckCircle2
              className={cn(
                'h-4 w-4',
                isDayToday ? 'text-green-300' : 'text-green-500'
              )}
              data-testid={`completed-indicator-${dateKey}`}
            />
          ) : (
            <div
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium',
                isDayToday
                  ? 'bg-twilight-500/50 text-white'
                  : 'bg-gray-700 text-gray-400'
              )}
              data-testid={`progress-indicator-${dateKey}`}
            >
              {completedCount}/{exerciseCount}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasExercises && (
        <span
          className={cn(
            'relative z-10 mt-1 text-[10px]',
            isDayToday ? 'text-twilight-300' : 'text-gray-600',
            isDropTarget && 'text-twilight-200'
          )}
        >
          {isDropTarget ? 'Drop here' : 'No exercises'}
        </span>
      )}

      {children}
    </div>
  );
}
