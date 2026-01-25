'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Clock,
  Star,
  Video,
  Music,
  FileText,
  GripVertical,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExerciseData {
  id: string;
  scheduledAt: Date;
  completed: boolean;
  completedAt: Date | null;
  notes: string | null;
  exerciseId: string;
  classId: string;
  exercise: {
    id: string;
    type: 'video' | 'audio' | 'text';
    titleDe: string;
    titleEn: string | null;
    descriptionDe: string | null;
    descriptionEn: string | null;
    durationMinutes: number | null;
  } | null;
  isObligatory: boolean;
}

interface DraggableExerciseCardProps {
  exercise: ExerciseData;
  sourceDate: string;
  isDragging?: boolean;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

function ExerciseTypeIcon({
  type,
  className,
}: {
  type: 'video' | 'audio' | 'text';
  className?: string;
}) {
  switch (type) {
    case 'video':
      return <Video className={className} />;
    case 'audio':
      return <Music className={className} />;
    case 'text':
      return <FileText className={className} />;
  }
}

export function DraggableExerciseCard({
  exercise,
  sourceDate,
  isDragging: externalIsDragging,
}: DraggableExerciseCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: exercise.id,
    data: {
      exercise,
      sourceDate,
    },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  const isCurrentlyDragging = externalIsDragging || isDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 rounded-lg p-2 transition-all',
        exercise.isObligatory
          ? 'border-l-2 border-amber-500 bg-gray-800'
          : 'bg-gray-800',
        isCurrentlyDragging && 'scale-105 shadow-xl ring-2 ring-twilight-400 opacity-90',
        !isCurrentlyDragging && 'hover:bg-gray-750'
      )}
      data-testid={`draggable-exercise-${exercise.id}`}
      data-dragging={isCurrentlyDragging}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'flex h-8 w-6 cursor-grab items-center justify-center rounded text-gray-600 transition-colors active:cursor-grabbing',
          'hover:bg-gray-700 hover:text-gray-400',
          'touch-none'
        )}
        data-testid={`drag-handle-${exercise.id}`}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Completion indicator */}
      <div className="flex-shrink-0">
        {exercise.completed ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <div className="h-5 w-5 rounded-full border-2 border-gray-600" />
        )}
      </div>

      {/* Exercise info */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm font-medium',
            exercise.completed ? 'text-gray-500 line-through' : 'text-white'
          )}
        >
          {exercise.exercise?.titleDe || 'Unknown Exercise'}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          <span>{formatTime(exercise.scheduledAt)}</span>
          {exercise.isObligatory && <Star className="h-3 w-3 text-amber-400" />}
        </div>
      </div>

      {/* Exercise type icon */}
      {exercise.exercise && (
        <ExerciseTypeIcon
          type={exercise.exercise.type}
          className="h-4 w-4 flex-shrink-0 text-gray-500"
        />
      )}
    </div>
  );
}

// Static version for drag overlay
export function ExerciseCardOverlay({ exercise }: { exercise: ExerciseData }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg p-2 shadow-2xl ring-2 ring-twilight-400',
        exercise.isObligatory
          ? 'border-l-2 border-amber-500 bg-gray-800'
          : 'bg-gray-800'
      )}
      data-testid="exercise-drag-overlay"
    >
      {/* Drag handle */}
      <div className="flex h-8 w-6 cursor-grabbing items-center justify-center rounded text-twilight-400">
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Completion indicator */}
      <div className="flex-shrink-0">
        {exercise.completed ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <div className="h-5 w-5 rounded-full border-2 border-gray-600" />
        )}
      </div>

      {/* Exercise info */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm font-medium',
            exercise.completed ? 'text-gray-500 line-through' : 'text-white'
          )}
        >
          {exercise.exercise?.titleDe || 'Unknown Exercise'}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          <span>{formatTime(exercise.scheduledAt)}</span>
          {exercise.isObligatory && <Star className="h-3 w-3 text-amber-400" />}
        </div>
      </div>

      {/* Exercise type icon */}
      {exercise.exercise && (
        <ExerciseTypeIcon
          type={exercise.exercise.type}
          className="h-4 w-4 flex-shrink-0 text-gray-500"
        />
      )}
    </div>
  );
}
