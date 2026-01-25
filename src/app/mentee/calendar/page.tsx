'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MobileLayout } from '@/components/mobile';
import { trpc } from '@/lib/trpc/client';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  Circle,
  Play,
  Plus,
  Video,
  Music,
  FileText,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { format, addDays, subDays, isToday, startOfDay } from 'date-fns';

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

// Get icon for exercise type
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

export default function MenteeDailyCalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedExercise, setSelectedExercise] = useState<ScheduledExercise | null>(null);
  const [showMediaPopup, setShowMediaPopup] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Swipe handling refs and state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Pull to refresh state
  const [touchStartPull, setTouchStartPull] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // tRPC query for exercises
  const utils = trpc.useUtils();
  const { data: exercisesData, isLoading } = trpc.mentee.getExercisesForDate.useQuery({
    date: startOfDay(currentDate).toISOString(),
  });

  // Get optional exercises
  const { data: optionalExercises = [] } = trpc.mentee.getOptionalExercises.useQuery();

  // Toggle completion mutation
  const toggleCompletion = trpc.mentee.toggleExerciseCompletion.useMutation({
    onSuccess: () => {
      utils.mentee.getExercisesForDate.invalidate();
    },
  });

  // Add exercise mutation
  const addExercise = trpc.mentee.addExerciseToSchedule.useMutation({
    onSuccess: () => {
      utils.mentee.getExercisesForDate.invalidate();
      setShowAddExercise(false);
    },
  });

  // Separate obligatory and optional scheduled exercises
  const { obligatoryExercises, optionalScheduledExercises } = useMemo(() => {
    const scheduled = exercisesData?.scheduledExercises || [];
    return {
      obligatoryExercises: scheduled.filter(e => e.isObligatory),
      optionalScheduledExercises: scheduled.filter(e => !e.isObligatory),
    };
  }, [exercisesData]);

  // Calculate progress
  const progress = useMemo(() => {
    const allScheduled = exercisesData?.scheduledExercises || [];
    const total = allScheduled.length;
    const completed = allScheduled.filter(e => e.completed).length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [exercisesData]);

  // Navigation handlers
  const goToPreviousDay = useCallback(() => {
    setCurrentDate(prev => subDays(prev, 1));
  }, []);

  const goToNextDay = useCallback(() => {
    setCurrentDate(prev => addDays(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Handle exercise tap - navigate to exercise execution view
  const handleExerciseTap = useCallback((exercise: ScheduledExercise) => {
    router.push(`/mentee/exercise/${exercise.id}`);
  }, [router]);

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

  // Handle adding optional exercise
  const handleAddOptionalExercise = useCallback(
    (exerciseId: string) => {
      // Schedule for the next hour
      const scheduledAt = new Date(currentDate);
      scheduledAt.setHours(scheduledAt.getHours() + 1, 0, 0, 0);
      addExercise.mutate({
        exerciseId,
        scheduledAt: scheduledAt.toISOString(),
      });
    },
    [currentDate, addExercise]
  );

  // Swipe handlers for day navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollTop = contentRef.current?.scrollTop ?? 0;

    // Pull to refresh check
    if (scrollTop <= 0) {
      setTouchStartPull(e.touches[0].clientY);
    }

    // Swipe navigation check
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Pull to refresh
      if (touchStartPull !== null) {
        const currentTouch = e.touches[0].clientY;
        const distance = currentTouch - touchStartPull;
        if (distance > 0) {
          setPullDistance(Math.min(distance, 100));
        }
      }

      // Swipe navigation
      if (touchStartX.current === null || touchStartY.current === null) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = currentX - touchStartX.current;
      const diffY = currentY - touchStartY.current;

      // Only allow horizontal swipe if horizontal movement is greater than vertical
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        setSwipeOffset(diffX);
      }
    },
    [touchStartPull]
  );

  const handleTouchEnd = useCallback(async () => {
    // Pull to refresh
    if (pullDistance >= 60 && !isRefreshing) {
      setIsRefreshing(true);
      await utils.mentee.getExercisesForDate.invalidate();
      setIsRefreshing(false);
    }
    setTouchStartPull(null);
    setPullDistance(0);

    // Swipe navigation
    const threshold = 50;
    if (Math.abs(swipeOffset) > threshold) {
      if (swipeOffset > 0) {
        goToPreviousDay();
      } else {
        goToNextDay();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    setSwipeOffset(0);
  }, [pullDistance, isRefreshing, swipeOffset, goToPreviousDay, goToNextDay, utils]);

  const isTodaySelected = isToday(currentDate);

  return (
    <MobileLayout title="Daily Schedule" showNotifications>
      <div
        ref={contentRef}
        className="flex flex-col px-4 py-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="mentee-daily-calendar"
      >
        {/* Pull to refresh indicator */}
        {(pullDistance > 0 || isRefreshing) && (
          <div
            className="flex items-center justify-center py-4 transition-all duration-200"
            style={{ height: isRefreshing ? 48 : pullDistance * 0.5 }}
            data-testid="pull-to-refresh-indicator"
          >
            <RefreshCw
              className={`h-6 w-6 text-twilight-400 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{
                transform: isRefreshing ? 'rotate(0deg)' : `rotate(${pullDistance * 3.6}deg)`,
                opacity: isRefreshing ? 1 : Math.min(pullDistance / 60, 1),
              }}
            />
          </div>
        )}

        {/* Date Header with Navigation */}
        <div className="mb-4 flex items-center justify-between" data-testid="date-header">
          <button
            onClick={goToPreviousDay}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-white transition-colors hover:bg-gray-700"
            aria-label="Previous day"
            data-testid="prev-day-button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-white" data-testid="current-date">
              {isTodaySelected ? 'Today' : format(currentDate, 'EEEE')}
            </h2>
            <p className="text-sm text-gray-400">{format(currentDate, 'MMMM d, yyyy')}</p>
            {!isTodaySelected && (
              <button
                onClick={goToToday}
                className="mt-1 text-sm text-twilight-400 hover:text-twilight-300"
                data-testid="today-button"
              >
                Back to Today
              </button>
            )}
          </div>

          <button
            onClick={goToNextDay}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-white transition-colors hover:bg-gray-700"
            aria-label="Next day"
            data-testid="next-day-button"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Card */}
        <div
          className="mb-6 rounded-xl bg-gradient-to-br from-twilight-600 to-twilight-800 p-4"
          data-testid="progress-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-twilight-200">Daily Progress</p>
              <p className="text-3xl font-bold text-white">{progress}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-twilight-200">
                {exercisesData?.scheduledExercises.filter(e => e.completed).length || 0} of{' '}
                {exercisesData?.scheduledExercises.length || 0}
              </p>
              <p className="text-xs text-twilight-300">completed</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-twilight-900/50">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-twilight-400" />
          </div>
        )}

        {/* Obligatory Exercises Section */}
        {!isLoading && (
          <div className="mb-6" data-testid="obligatory-exercises-section">
            <div className="mb-3 flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-white">Required Exercises</h3>
            </div>

            {obligatoryExercises.length === 0 ? (
              <div className="rounded-xl bg-gray-900 p-4 text-center text-gray-400">
                No required exercises for today
              </div>
            ) : (
              <div
                className="space-y-3 transition-transform duration-200"
                style={{ transform: `translateX(${swipeOffset * 0.3}px)` }}
                data-testid="obligatory-exercises-list"
              >
                {obligatoryExercises.map(exercise => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onTap={handleExerciseTap}
                    onToggleCompletion={handleToggleCompletion}
                    isObligatory={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Optional Scheduled Exercises Section */}
        {!isLoading && optionalScheduledExercises.length > 0 && (
          <div className="mb-6" data-testid="optional-scheduled-section">
            <h3 className="mb-3 text-lg font-semibold text-white">Optional Exercises</h3>
            <div className="space-y-3" data-testid="optional-scheduled-list">
              {optionalScheduledExercises.map(exercise => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  onTap={handleExerciseTap}
                  onToggleCompletion={handleToggleCompletion}
                  isObligatory={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Add Optional Exercise Button */}
        {!isLoading && optionalExercises.length > 0 && (
          <Button
            onClick={() => setShowAddExercise(true)}
            className="mb-4 w-full gap-2 border border-dashed border-gray-600 bg-transparent text-gray-400 hover:border-twilight-500 hover:bg-gray-900 hover:text-white"
            data-testid="add-optional-exercise-button"
          >
            <Plus className="h-4 w-4" />
            Add Optional Exercise
          </Button>
        )}

        {/* Empty state */}
        {!isLoading && exercisesData?.scheduledExercises.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-12 text-center"
            data-testid="empty-state"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
              <Clock className="h-8 w-8 text-gray-500" />
            </div>
            <p className="text-lg font-medium text-white">No exercises scheduled</p>
            <p className="mt-1 text-sm text-gray-400">
              {isTodaySelected
                ? 'Add an optional exercise to get started'
                : 'Check another day for your schedule'}
            </p>
            {isTodaySelected && optionalExercises.length > 0 && (
              <Button
                onClick={() => setShowAddExercise(true)}
                className="mt-4 gap-2 bg-twilight-600 text-white hover:bg-twilight-500"
              >
                <Plus className="h-4 w-4" />
                Add Exercise
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Media Popup Dialog */}
      <Dialog open={showMediaPopup} onOpenChange={setShowMediaPopup}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-gray-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="media-popup-title">
              {selectedExercise?.exercise && (
                <ExerciseTypeIcon type={selectedExercise.exercise.type} className="h-5 w-5" />
              )}
              {selectedExercise?.exercise?.titleDe || 'Exercise'}
            </DialogTitle>
            {selectedExercise?.exercise?.descriptionDe && (
              <DialogDescription className="text-gray-400">
                {selectedExercise.exercise.descriptionDe}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="mt-4 space-y-4" data-testid="media-popup-content">
            {/* Duration and time info */}
            <div className="flex items-center gap-4 text-sm text-gray-400">
              {selectedExercise?.exercise?.durationMinutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {selectedExercise.exercise.durationMinutes} min
                </span>
              )}
              {selectedExercise && (
                <span className="flex items-center gap-1">
                  Scheduled: {formatTime(selectedExercise.scheduledAt)}
                </span>
              )}
            </div>

            {/* Video Player */}
            {selectedExercise?.exercise?.type === 'video' &&
              selectedExercise.exercise.videoUrl && (
                <div
                  className="overflow-hidden rounded-xl bg-black"
                  data-testid="video-player-container"
                >
                  <video
                    controls
                    className="w-full"
                    src={selectedExercise.exercise.videoUrl}
                    data-testid="video-player"
                  >
                    Your browser does not support the video element.
                  </video>
                </div>
              )}

            {/* Audio Player */}
            {selectedExercise?.exercise?.type === 'audio' &&
              selectedExercise.exercise.audioUrl && (
                <div
                  className="rounded-xl bg-gray-800 p-4"
                  data-testid="audio-player-container"
                >
                  <div className="mb-3 flex items-center justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-twilight-600">
                      <Music className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  <audio
                    controls
                    className="w-full"
                    src={selectedExercise.exercise.audioUrl}
                    data-testid="audio-player"
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

            {/* Text Content */}
            {selectedExercise?.exercise?.type === 'text' &&
              selectedExercise.exercise.contentDe && (
                <div
                  className="rounded-xl bg-gray-800 p-4"
                  data-testid="text-content-container"
                >
                  <div className="prose prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-gray-300">
                      {selectedExercise.exercise.contentDe}
                    </p>
                  </div>
                </div>
              )}

            {/* Completion toggle in popup */}
            {selectedExercise && (
              <Button
                onClick={() => {
                  toggleCompletion.mutate({
                    scheduledExerciseId: selectedExercise.id,
                    completed: !selectedExercise.completed,
                  });
                  setSelectedExercise({
                    ...selectedExercise,
                    completed: !selectedExercise.completed,
                  });
                }}
                className={`w-full gap-2 ${
                  selectedExercise.completed
                    ? 'bg-green-600 hover:bg-green-500'
                    : 'bg-twilight-600 hover:bg-twilight-500'
                }`}
                data-testid="popup-completion-button"
              >
                {selectedExercise.completed ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Completed
                  </>
                ) : (
                  <>
                    <Circle className="h-4 w-4" />
                    Mark as Complete
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Optional Exercise Dialog */}
      <Dialog open={showAddExercise} onOpenChange={setShowAddExercise}>
        <DialogContent className="max-h-[80vh] overflow-y-auto bg-gray-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Optional Exercise</DialogTitle>
            <DialogDescription>
              Choose an exercise to add to today&apos;s schedule
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3" data-testid="optional-exercises-list">
            {optionalExercises.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                No optional exercises available
              </div>
            ) : (
              optionalExercises.map(exercise => (
                <button
                  key={exercise.id}
                  onClick={() => handleAddOptionalExercise(exercise.id)}
                  disabled={addExercise.isPending}
                  className="flex w-full items-center gap-3 rounded-xl bg-gray-800 p-4 text-left transition-colors hover:bg-gray-700 disabled:opacity-50"
                  data-testid={`add-exercise-${exercise.id}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-twilight-500/20">
                    <ExerciseTypeIcon type={exercise.type} className="h-5 w-5 text-twilight-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{exercise.titleDe}</p>
                    {exercise.durationMinutes && (
                      <p className="text-sm text-gray-400">{exercise.durationMinutes} min</p>
                    )}
                  </div>
                  <Plus className="h-5 w-5 text-gray-400" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}

// Exercise Card Component
function ExerciseCard({
  exercise,
  onTap,
  onToggleCompletion,
  isObligatory,
}: {
  exercise: ScheduledExercise;
  onTap: (exercise: ScheduledExercise) => void;
  onToggleCompletion: (exercise: ScheduledExercise, e: React.MouseEvent) => void;
  isObligatory: boolean;
}) {
  return (
    <div
      onClick={() => onTap(exercise)}
      className={`relative flex cursor-pointer items-center gap-4 rounded-xl p-4 transition-colors ${
        isObligatory
          ? 'border-l-4 border-amber-500 bg-gray-900 hover:bg-gray-800'
          : 'bg-gray-900 hover:bg-gray-800'
      }`}
      data-testid={`exercise-card-${exercise.id}`}
      data-obligatory={isObligatory}
      data-completed={exercise.completed}
    >
      {/* Completion checkbox */}
      <button
        onClick={e => onToggleCompletion(exercise, e)}
        className="flex-shrink-0"
        aria-label={exercise.completed ? 'Mark as incomplete' : 'Mark as complete'}
        data-testid={`completion-checkbox-${exercise.id}`}
      >
        {exercise.completed ? (
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        ) : (
          <Circle className="h-6 w-6 text-gray-600 hover:text-gray-400" />
        )}
      </button>

      {/* Exercise info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`font-medium truncate ${
              exercise.completed ? 'text-gray-400 line-through' : 'text-white'
            }`}
          >
            {exercise.exercise?.titleDe || 'Unknown Exercise'}
          </p>
          {isObligatory && <Star className="h-4 w-4 flex-shrink-0 text-amber-400" />}
        </div>
        <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(exercise.scheduledAt)}
          </span>
          {exercise.exercise?.durationMinutes && (
            <span>{exercise.exercise.durationMinutes} min</span>
          )}
          {exercise.exercise && (
            <ExerciseTypeIcon type={exercise.exercise.type} className="h-3 w-3" />
          )}
        </div>
      </div>

      {/* Play indicator */}
      <div className="flex-shrink-0">
        {exercise.exercise?.type === 'video' || exercise.exercise?.type === 'audio' ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-twilight-500/20">
            <Play className="h-4 w-4 text-twilight-400" />
          </div>
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500" />
        )}
      </div>
    </div>
  );
}
