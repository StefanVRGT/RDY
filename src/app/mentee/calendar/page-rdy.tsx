'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { trpc } from '@/lib/trpc/client';
import { Menu } from 'lucide-react';
import { format, addDays, subDays, isToday, startOfDay } from 'date-fns';
import { RdyHeader } from '@/components/ui/rdy-header';
import { TrackingCircle } from '@/components/ui/tracking-circle';
import { cn } from '@/lib/utils';

// Type for enriched scheduled exercise
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

// Format time for display
function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

export default function MenteeDailyCalendarPageRdy() {
  const router = useRouter();
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());

  // tRPC query for exercises
  const utils = trpc.useUtils();
  const { data: exercisesData, isLoading } = trpc.mentee.getExercisesForDate.useQuery({
    date: startOfDay(currentDate).toISOString(),
  });

  // Toggle completion mutation
  const toggleCompletion = trpc.mentee.toggleExerciseCompletion.useMutation({
    onSuccess: () => {
      utils.mentee.getExercisesForDate.invalidate();
    },
  });

  const isTodaySelected = isToday(currentDate);
  const scheduledExercises = exercisesData?.scheduledExercises || [];

  // Handle exercise tap
  const handleExerciseTap = useCallback(
    (exercise: ScheduledExercise) => {
      router.push(`/mentee/exercise/${exercise.id}`);
    },
    [router]
  );

  // Handle completion toggle
  const handleToggleCompletion = useCallback(
    (exercise: ScheduledExercise, e: React.MouseEvent) => {
      e.stopPropagation();
      toggleCompletion.mutate({
        scheduledExerciseId: exercise.id,
        completed: !exercise.completed,
      });
    },
    [toggleCompletion]
  );

  return (
    <div className="min-h-screen bg-rdy-white">
      {/* Hamburger Menu */}
      <div className="fixed top-4 left-4 z-50">
        <button
          className="p-2 active:opacity-60 transition-opacity"
          aria-label="Menu"
        >
          <Menu className="h-6 w-6 text-rdy-black" />
        </button>
      </div>

      {/* Main Content */}
      <div className="rdy-content-width px-rdy-lg pt-16 pb-20">
        {/* Header */}
        <div className="mb-rdy-xl">
          <RdyHeader
            title={isTodaySelected ? 'TODAY' : format(currentDate, 'EEEE').toUpperCase()}
            subtitle={format(currentDate, 'd MMM').toUpperCase()}
          />
        </div>

        {/* Exercise Sections */}
        {isLoading ? (
          <div className="flex items-center justify-center py-rdy-xl">
            <div className="rdy-circle-active animate-pulse" />
          </div>
        ) : scheduledExercises.length === 0 ? (
          <div className="text-center py-rdy-2xl">
            <p className="rdy-body">No exercises scheduled for today</p>
          </div>
        ) : (
          <div className="space-y-rdy-xl">
            {scheduledExercises.map((exercise) => (
              <button
                key={exercise.id}
                onClick={() => handleExerciseTap(exercise)}
                className="w-full text-center space-y-rdy-sm active:opacity-60 transition-opacity"
              >
                <h2 className="rdy-heading-lg">
                  {exercise.exercise?.titleDe || 'Unknown Exercise'}
                </h2>
                <p className="rdy-subtitle">
                  {exercise.exercise?.durationMinutes
                    ? `${exercise.exercise.durationMinutes} MINS`
                    : 'LESSON'}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Image Placeholder - You can add meditation imagery here */}
        <div className="mt-rdy-2xl flex justify-center">
          {/* Add meditation bells or other imagery here */}
        </div>

        {/* RDY Branding */}
        <div className="mt-rdy-2xl text-center">
          <p className="text-rdy-lg font-bold text-rdy-black tracking-wide">RDY</p>
        </div>
      </div>
    </div>
  );
}
