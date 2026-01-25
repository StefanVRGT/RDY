'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Video,
  Music,
  FileText,
  Star,
  SkipForward,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

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

export default function ExerciseExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const scheduledExerciseId = params.id as string;

  // State
  const [skipExplanation, setSkipExplanation] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [localCompleted, setLocalCompleted] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch scheduled exercise data
  const utils = trpc.useUtils();
  const { data: exerciseData, isLoading, error } = trpc.mentee.getScheduledExerciseById.useQuery({
    scheduledExerciseId,
  });

  // Complete exercise mutation
  const completeExercise = trpc.mentee.completeExerciseWithNotes.useMutation({
    onSuccess: () => {
      utils.mentee.getScheduledExerciseById.invalidate({ scheduledExerciseId });
      utils.mentee.getExercisesForDate.invalidate();
      utils.mentee.getExercisesForWeek.invalidate();
    },
  });

  // Update notes mutation
  const updateNotes = trpc.mentee.updateExerciseNotes.useMutation({
    onSuccess: () => {
      utils.mentee.getScheduledExerciseById.invalidate({ scheduledExerciseId });
      setIsSavingNotes(false);
    },
    onError: () => {
      setIsSavingNotes(false);
    },
  });

  // Initialize local state from fetched data
  useEffect(() => {
    if (exerciseData) {
      setLocalCompleted(exerciseData.completed);
      setNotes(exerciseData.notes || '');
      // Automatically show notes section if exercise is completed and has notes
      if (exerciseData.completed && exerciseData.notes) {
        setShowNotes(true);
      }
    }
  }, [exerciseData]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Handle mark as done
  const handleMarkAsDone = useCallback(() => {
    const newCompleted = !localCompleted;
    setLocalCompleted(newCompleted);

    completeExercise.mutate({
      scheduledExerciseId,
      completed: newCompleted,
      notes: notes || undefined,
    });

    // Show notes section when marking as complete
    if (newCompleted) {
      setShowNotes(true);
    }
  }, [localCompleted, scheduledExerciseId, notes, completeExercise]);

  // Handle notes save
  const handleSaveNotes = useCallback(() => {
    if (!notes.trim()) return;
    setIsSavingNotes(true);
    updateNotes.mutate({
      scheduledExerciseId,
      notes,
    });
  }, [scheduledExerciseId, notes, updateNotes]);

  // Auto-save notes on blur (debounced)
  const handleNotesBlur = useCallback(() => {
    if (notes !== (exerciseData?.notes || '')) {
      handleSaveNotes();
    }
  }, [notes, exerciseData?.notes, handleSaveNotes]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-950 text-white">
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-twilight-400" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !exerciseData) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-950 text-white">
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <p className="text-lg text-red-400">Exercise not found</p>
          <Button
            onClick={handleBack}
            className="mt-4 bg-twilight-600 hover:bg-twilight-500"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const exercise = exerciseData.exercise;
  const isVideo = exercise?.type === 'video';
  const isAudio = exercise?.type === 'audio';
  const isText = exercise?.type === 'text';

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-white" data-testid="exercise-execution-view">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full bg-gray-950/95 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-gray-800"
            aria-label="Go back"
            data-testid="back-button"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            {exercise && <ExerciseTypeIcon type={exercise.type} className="h-5 w-5 text-twilight-400" />}
            {exerciseData.isObligatory && <Star className="h-4 w-4 text-amber-400" />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-14 pb-safe">
        {/* Skip Explanation Toggle */}
        {(isVideo || isAudio) && (exercise?.descriptionDe || exercise?.descriptionEn) && (
          <div
            className="flex items-center justify-between border-b border-gray-800 px-4 py-3"
            data-testid="skip-explanation-section"
          >
            <div className="flex items-center gap-2">
              <SkipForward className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-300">Skip explanation (advanced)</span>
            </div>
            <Switch
              checked={skipExplanation}
              onCheckedChange={setSkipExplanation}
              data-testid="skip-explanation-toggle"
            />
          </div>
        )}

        {/* Exercise Title and Info */}
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-white" data-testid="exercise-title">
            {exercise?.titleDe || 'Exercise'}
          </h1>

          <div className="mt-2 flex items-center gap-4 text-sm text-gray-400">
            {exercise?.durationMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {exercise.durationMinutes} min
              </span>
            )}
            <span className="flex items-center gap-1">
              Scheduled: {formatTime(exerciseData.scheduledAt)}
            </span>
          </div>
        </div>

        {/* Description (if not skipped) */}
        {!skipExplanation && (exercise?.descriptionDe || exercise?.descriptionEn) && (
          <div className="px-4 pb-4" data-testid="exercise-description">
            <p className="text-sm text-gray-400">{exercise.descriptionDe || exercise.descriptionEn}</p>
          </div>
        )}

        {/* Video Player */}
        {isVideo && exercise?.videoUrl && (
          <div
            className="mx-4 overflow-hidden rounded-xl bg-black"
            data-testid="video-player-container"
          >
            <video
              controls
              className="w-full"
              src={exercise.videoUrl}
              data-testid="video-player"
              playsInline
            >
              Your browser does not support the video element.
            </video>
          </div>
        )}

        {/* Audio Player */}
        {isAudio && exercise?.audioUrl && (
          <div
            className="mx-4 rounded-xl bg-gray-800 p-6"
            data-testid="audio-player-container"
          >
            <div className="mb-6 flex items-center justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-twilight-600">
                <Music className="h-12 w-12 text-white" />
              </div>
            </div>
            <audio
              controls
              className="w-full"
              src={exercise.audioUrl}
              data-testid="audio-player"
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {/* Text Content */}
        {isText && (exercise?.contentDe || exercise?.contentEn) && (
          <div
            className="mx-4 rounded-xl bg-gray-800 p-6"
            data-testid="text-content-container"
          >
            <div className="prose prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-gray-300">
                {exercise.contentDe || exercise.contentEn}
              </p>
            </div>
          </div>
        )}

        {/* Notes Section */}
        <div className="mt-6 px-4" data-testid="notes-section">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex w-full items-center justify-between rounded-xl bg-gray-900 p-4 transition-colors hover:bg-gray-800"
            data-testid="notes-toggle"
          >
            <div className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-twilight-400" />
              <span className="font-medium text-white">Notes</span>
              {notes && <span className="text-xs text-gray-400">(saved)</span>}
            </div>
            {showNotes ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {showNotes && (
            <div className="mt-3" data-testid="notes-input-container">
              <textarea
                ref={notesTextareaRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Add your thoughts, reflections, or notes about this exercise..."
                className="min-h-[120px] w-full resize-none rounded-xl bg-gray-900 p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-twilight-500"
                data-testid="notes-textarea"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {isSavingNotes ? 'Saving...' : 'Notes are auto-saved'}
                </span>
                <Button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes || notes === (exerciseData.notes || '')}
                  size="sm"
                  className="bg-twilight-600 hover:bg-twilight-500 disabled:opacity-50"
                  data-testid="save-notes-button"
                >
                  {isSavingNotes ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Save Notes'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Spacer for bottom button */}
        <div className="h-24" />
      </main>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950/95 px-4 py-4 backdrop-blur-sm pb-safe">
        <Button
          onClick={handleMarkAsDone}
          disabled={completeExercise.isPending}
          className={cn(
            'w-full gap-2 py-6 text-lg font-semibold',
            localCompleted
              ? 'bg-green-600 hover:bg-green-500'
              : 'bg-twilight-600 hover:bg-twilight-500'
          )}
          data-testid="mark-as-done-button"
        >
          {completeExercise.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : localCompleted ? (
            <>
              <CheckCircle2 className="h-5 w-5" />
              Completed
            </>
          ) : (
            <>
              <Circle className="h-5 w-5" />
              Mark as Done
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
