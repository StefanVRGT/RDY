'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Menu, ArrowLeft, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { format, addDays, subDays, isToday, startOfDay } from 'date-fns';
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);

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

  // Separate obligatory and optional
  const { obligatoryExercises, optionalExercises } = useMemo(() => {
    return {
      obligatoryExercises: scheduledExercises.filter((e) => e.isObligatory),
      optionalExercises: scheduledExercises.filter((e) => !e.isObligatory),
    };
  }, [scheduledExercises]);

  // Navigation handlers
  const goToPreviousDay = useCallback(() => {
    setCurrentDate((prev) => subDays(prev, 1));
  }, []);

  const goToNextDay = useCallback(() => {
    setCurrentDate((prev) => addDays(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

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
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 active:opacity-60 transition-opacity"
          aria-label="Menu"
        >
          <Menu className="h-6 w-6 text-rdy-black" />
        </button>
      </div>

      {/* Menu Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-rdy-black/50 z-40"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="bg-rdy-white w-64 h-full p-rdy-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-rdy-md mt-16">
              <button
                onClick={() => {
                  router.push('/mentee/calendar');
                  setMenuOpen(false);
                }}
                className="rdy-btn-primary w-full text-left"
              >
                TODAY
              </button>
              <button
                onClick={() => {
                  router.push('/mentee/calendar/tracking');
                  setMenuOpen(false);
                }}
                className="rdy-btn-primary w-full text-left"
              >
                TRACKING
              </button>
              <button
                onClick={() => {
                  router.push('/mentee/diary');
                  setMenuOpen(false);
                }}
                className="rdy-btn-primary w-full text-left"
              >
                DIARY
              </button>
              <button
                onClick={() => {
                  router.push('/mentee/settings');
                  setMenuOpen(false);
                }}
                className="rdy-btn-primary w-full text-left"
              >
                SETTINGS
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="rdy-content-width px-rdy-lg pt-16 pb-20">
        {/* Date Navigation - Minimal */}
        <div className="flex items-center justify-between mb-rdy-md">
          <button
            onClick={goToPreviousDay}
            className="p-2 active:opacity-60 transition-opacity"
            aria-label="Previous day"
          >
            <ArrowLeft className="h-5 w-5 text-rdy-gray-500" />
          </button>

          {!isTodaySelected && (
            <button
              onClick={goToToday}
              className="text-rdy-sm uppercase text-rdy-orange-500 font-medium"
            >
              Back to Today
            </button>
          )}

          <button
            onClick={goToNextDay}
            className="p-2 active:opacity-60 transition-opacity"
            aria-label="Next day"
          >
            <ArrowRight className="h-5 w-5 text-rdy-gray-500" />
          </button>
        </div>

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
          <div className="space-y-rdy-2xl">
            {/* Obligatory Exercises */}
            {obligatoryExercises.length > 0 && (
              <div className="space-y-rdy-xl">
                {obligatoryExercises.map((exercise) => (
                  <div key={exercise.id} className="space-y-rdy-sm">
                    <button
                      onClick={() => handleExerciseTap(exercise)}
                      className="w-full text-center space-y-rdy-xs active:opacity-60 transition-opacity"
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

                    {/* Completion Toggle */}
                    <div className="flex justify-center">
                      <button
                        onClick={(e) => handleToggleCompletion(exercise, e)}
                        className="flex items-center gap-2 active:opacity-60 transition-opacity"
                        aria-label={exercise.completed ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        {exercise.completed ? (
                          <CheckCircle2 className="h-6 w-6 text-rdy-orange-500" />
                        ) : (
                          <Circle className="h-6 w-6 text-rdy-gray-300" />
                        )}
                        <span className="text-rdy-sm text-rdy-gray-500">
                          {exercise.completed ? 'Completed' : 'Mark Complete'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Optional Exercises */}
            {optionalExercises.length > 0 && (
              <div className="space-y-rdy-xl">
                {optionalExercises.map((exercise) => (
                  <div key={exercise.id} className="space-y-rdy-sm">
                    <button
                      onClick={() => handleExerciseTap(exercise)}
                      className="w-full text-center space-y-rdy-xs active:opacity-60 transition-opacity"
                    >
                      <h2 className="rdy-heading-lg opacity-75">
                        {exercise.exercise?.titleDe?.toUpperCase() || 'UNKNOWN EXERCISE'}
                      </h2>
                      <p className="rdy-subtitle">
                        {exercise.exercise?.durationMinutes
                          ? `${exercise.exercise.durationMinutes} MINS`
                          : 'LESSON'}
                      </p>
                    </button>

                    {/* Completion Toggle */}
                    <div className="flex justify-center">
                      <button
                        onClick={(e) => handleToggleCompletion(exercise, e)}
                        className="flex items-center gap-2 active:opacity-60 transition-opacity"
                        aria-label={exercise.completed ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        {exercise.completed ? (
                          <CheckCircle2 className="h-6 w-6 text-rdy-orange-500" />
                        ) : (
                          <Circle className="h-6 w-6 text-rdy-gray-300" />
                        )}
                        <span className="text-rdy-sm text-rdy-gray-500">
                          {exercise.completed ? 'Completed' : 'Mark Complete'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Optional: Add meditation bells image here */}
        {scheduledExercises.length > 0 && (
          <div className="mt-rdy-2xl flex justify-center">
            <div className="w-32 h-32 bg-rdy-gray-100 rounded-full flex items-center justify-center">
              {/* Placeholder for meditation bells or other imagery */}
              <span className="text-4xl">🔔</span>
            </div>
          </div>
        )}

        {/* RDY Branding */}
        <div className="mt-rdy-2xl text-center">
          <p className="text-rdy-lg font-bold text-rdy-black tracking-wide">RDY</p>
        </div>
      </div>
    </div>
  );
}
