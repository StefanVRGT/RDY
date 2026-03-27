'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { MobileLayout } from '@/components/mobile';
import { RdyFooter } from '@/components/rdy-footer';
import { Leaf } from 'lucide-react';

type ScheduledExercise = {
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
    videoUrl: string | null;
    audioUrl: string | null;
    contentDe: string | null;
    contentEn: string | null;
  } | null;
  isObligatory: boolean;
};

export default function MenteeDailyCalendarPage() {
  const router = useRouter();
  const today = new Date();

  const { data: exercisesData, isLoading } = trpc.mentee.getExercisesForDate.useQuery({
    date: format(today, 'yyyy-MM-dd') + 'T00:00:00.000Z',
  });

  const scheduledExercises = exercisesData?.scheduledExercises || [];
  const isRestDay = exercisesData?.isRestDay ?? false;

  const handleExerciseTap = useCallback(
    (exercise: ScheduledExercise) => router.push(`/mentee/exercise/${exercise.id}`),
    [router]
  );

  return (
    <MobileLayout title="TODAY" showMenu>
      <div className="px-6 py-6">
        {/* Date display (read-only) */}
        <div className="flex items-center justify-center mb-8">
          <p className="text-xs uppercase tracking-widest text-rdy-gray-400 min-w-[60px] text-center">
            {format(today, 'd MMM')}
          </p>
        </div>

        {/* Exercises */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-rdy-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : isRestDay ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rdy-gray-100">
              <Leaf className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-rdy-black">Ruhetag / Rest Day</p>
            <p className="mt-2 text-xs text-rdy-gray-400">Take time to recover</p>
          </div>
        ) : scheduledExercises.length === 0 ? (
          <p className="text-center text-xs uppercase tracking-widest text-rdy-gray-400 py-16">
            Nothing scheduled
          </p>
        ) : (
          <div className="space-y-3">
            {scheduledExercises.map((exercise) => (
              <button
                key={exercise.id}
                onClick={() => handleExerciseTap(exercise)}
                className={cn(
                  'w-full border rounded-lg px-4 py-3 text-center active:opacity-60 transition-opacity',
                  exercise.completed
                    ? 'border-rdy-gray-200 opacity-40'
                    : 'border-rdy-gray-300'
                )}
              >
                <p className="text-sm font-semibold uppercase tracking-wide text-rdy-black">
                  {exercise.exercise?.titleDe || '—'}
                </p>
                <p className="mt-0.5 text-xs text-rdy-gray-400">
                  {format(new Date(exercise.scheduledAt), 'h:mma').toUpperCase()}
                </p>
              </button>
            ))}
          </div>
        )}

        <RdyFooter />
      </div>
    </MobileLayout>
  );
}
