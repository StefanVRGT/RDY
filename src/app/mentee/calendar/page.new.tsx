'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Menu } from 'lucide-react';
import { format, isToday, startOfDay } from 'date-fns';
import { RdyHeader } from '@/components/ui/rdy-header';

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

export default function MenteeDailyCalendarPage() {
  const router = useRouter();
  const [currentDate] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);

  // tRPC query for exercises
  const { data: exercisesData, isLoading } = trpc.mentee.getExercisesForDate.useQuery({
    date: startOfDay(currentDate).toISOString(),
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

  return (
    <div className="min-h-screen bg-rdy-white">
      {/* Hamburger Menu */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 active:opacity-60 transition-opacity"
          aria-label="Menu"
        >
          <Menu className="h-6 w-6 text-rdy-black" />
        </button>
      </div>

      {/* Menu Overlay - Simple version */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-rdy-black/50 z-40"
          onClick={() => setMenuOpen(false)}
        >
          <div className="bg-rdy-white w-64 h-full p-rdy-lg">
            <nav className="space-y-rdy-md">
              <button
                onClick={() => router.push('/mentee/calendar')}
                className="rdy-btn-primary w-full text-left"
              >
                TODAY
              </button>
              <button
                onClick={() => router.push('/mentee/calendar/tracking')}
                className="rdy-btn-primary w-full text-left"
              >
                TRACKING
              </button>
              <button
                onClick={() => router.push('/mentee/diary')}
                className="rdy-btn-primary w-full text-left"
              >
                DIARY
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="rdy-content-width px-rdy-lg pt-16 pb-20">
        {/* Header */}
        <div className="mb-rdy-2xl">
          <RdyHeader
            title={isTodaySelected ? 'TODAY' : format(currentDate, 'EEEE').toUpperCase()}
            subtitle={format(currentDate, 'd MMM').toUpperCase()}
          />
        </div>

        {/* Exercise Sections */}
        {isLoading ? (
          <div className="flex items-center justify-center py-rdy-xl">
            <div className="w-10 h-10 rounded-full bg-rdy-orange-500 animate-pulse" />
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
                  {exercise.exercise?.titleDe?.toUpperCase() || 'UNKNOWN EXERCISE'}
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

        {/* Optional: Add meditation bells image here */}
        <div className="mt-rdy-2xl flex justify-center">
          <div className="w-48 h-48 bg-rdy-gray-100 rounded-full flex items-center justify-center">
            {/* Placeholder for meditation bells or other imagery */}
            <p className="text-rdy-gray-400 text-xs">IMAGE</p>
          </div>
        </div>

        {/* RDY Branding */}
        <div className="mt-rdy-2xl text-center">
          <p className="text-rdy-lg font-bold text-rdy-black tracking-wide">RDY</p>
        </div>
      </div>
    </div>
  );
}
