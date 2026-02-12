'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import { RdyHeader } from '@/components/ui/rdy-header';

export default function ExerciseExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const scheduledExerciseId = params.id as string;

  const [localCompleted, setLocalCompleted] = useState(false);

  // Fetch scheduled exercise data
  const utils = trpc.useUtils();
  const { data: exerciseData, isLoading } = trpc.mentee.getScheduledExerciseById.useQuery({
    scheduledExerciseId,
  });

  // Complete exercise mutation
  const toggleCompletion = trpc.mentee.toggleExerciseCompletion.useMutation({
    onSuccess: () => {
      utils.mentee.getScheduledExerciseById.invalidate({ scheduledExerciseId });
      utils.mentee.getExercisesForDate.invalidate();
    },
  });

  // Initialize local state from fetched data
  useEffect(() => {
    if (exerciseData) {
      setLocalCompleted(exerciseData.completed);
    }
  }, [exerciseData]);

  const handleToggleCompletion = () => {
    toggleCompletion.mutate({
      scheduledExerciseId,
      completed: !localCompleted,
    });
    setLocalCompleted(!localCompleted);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rdy-white flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-rdy-orange-500 animate-pulse" />
      </div>
    );
  }

  if (!exerciseData || !exerciseData.exercise) {
    return (
      <div className="min-h-screen bg-rdy-white flex items-center justify-center">
        <p className="rdy-body">Exercise not found</p>
      </div>
    );
  }

  const exercise = exerciseData.exercise;

  return (
    <div className="min-h-screen bg-rdy-white">
      {/* Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => router.back()}
          className="p-2 active:opacity-60 transition-opacity"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6 text-rdy-black" />
        </button>
      </div>

      {/* Main Content */}
      <div className="rdy-content-width px-rdy-lg pt-16 pb-20">
        {/* Header */}
        <div className="mb-rdy-xl">
          <RdyHeader
            title={exercise.titleDe.toUpperCase()}
            subtitle={exercise.durationMinutes ? `${exercise.durationMinutes} MINS` : undefined}
          />
        </div>

        {/* Media Content */}
        {exercise.type === 'video' && exercise.videoUrl && (
          <div className="mb-rdy-xl">
            <div className="relative w-full aspect-video bg-rdy-black rounded-lg overflow-hidden">
              <video
                controls
                className="w-full h-full"
                src={exercise.videoUrl}
              >
                Your browser does not support the video element.
              </video>
            </div>
          </div>
        )}

        {exercise.type === 'audio' && exercise.audioUrl && (
          <div className="mb-rdy-xl">
            <div className="flex justify-center mb-rdy-md">
              <div className="w-32 h-32 rounded-full bg-rdy-gray-100 flex items-center justify-center">
                <span className="text-5xl">🎵</span>
              </div>
            </div>
            <div className="bg-rdy-gray-100 rounded-lg p-rdy-md">
              <audio controls className="w-full" src={exercise.audioUrl}>
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        )}

        {/* Description */}
        {exercise.descriptionDe && (
          <div className="mb-rdy-xl">
            <p className="rdy-body text-center leading-relaxed">{exercise.descriptionDe}</p>
          </div>
        )}

        {/* Text Content */}
        {exercise.type === 'text' && exercise.contentDe && (
          <div className="mb-rdy-xl">
            <div className="bg-rdy-gray-100 rounded-lg p-rdy-lg">
              <p className="rdy-body leading-relaxed whitespace-pre-wrap">
                {exercise.contentDe}
              </p>
            </div>
          </div>
        )}

        {/* Completion Toggle */}
        <div className="flex justify-center mb-rdy-xl">
          <button
            onClick={handleToggleCompletion}
            className="flex flex-col items-center gap-rdy-sm active:opacity-60 transition-opacity"
          >
            {localCompleted ? (
              <>
                <CheckCircle2 className="h-16 w-16 text-rdy-orange-500" />
                <span className="rdy-label text-rdy-orange-500">COMPLETED</span>
              </>
            ) : (
              <>
                <Circle className="h-16 w-16 text-rdy-gray-300" />
                <span className="rdy-label text-rdy-gray-500">MARK COMPLETE</span>
              </>
            )}
          </button>
        </div>

        {/* RDY Branding */}
        <div className="text-center">
          <p className="text-rdy-lg font-bold text-rdy-black tracking-wide">RDY</p>
        </div>
      </div>
    </div>
  );
}
