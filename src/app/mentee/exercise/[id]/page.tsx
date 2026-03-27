'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { CheckCircle2, Circle, Video, Mic, FileText } from 'lucide-react';
import { RdyHeader } from '@/components/ui/rdy-header';
import { MobileLayout } from '@/components/mobile';

type Format = 'video' | 'audio' | 'text';

export default function ExerciseExecutionPage() {
  const params = useParams();
  const scheduledExerciseId = params.id as string;
  const [localCompleted, setLocalCompleted] = useState(false);
  const [activeFormat, setActiveFormat] = useState<Format | null>(null);
  const [videoLang, setVideoLang] = useState<'de' | 'en'>('de');

  const utils = trpc.useUtils();
  const { data: exerciseData, isLoading } = trpc.mentee.getScheduledExerciseById.useQuery({
    scheduledExerciseId,
  });

  const toggleCompletion = trpc.mentee.toggleExerciseCompletion.useMutation({
    onSuccess: () => {
      utils.mentee.getScheduledExerciseById.invalidate({ scheduledExerciseId });
      utils.mentee.getExercisesForDate.invalidate();
    },
  });

  useEffect(() => {
    if (exerciseData) {
      setLocalCompleted(exerciseData.completed);
    }
  }, [exerciseData]);

  // Set default format once exercise loads
  useEffect(() => {
    if (exerciseData?.exercise && activeFormat === null) {
      const ex = exerciseData.exercise;
      const hasVideo = !!(ex.videoUrlDe || ex.videoUrlEn || ex.videoUrl);
      const hasAudio = !!ex.audioUrl;
      const hasText  = !!ex.contentDe;
      // Default to the exercise's primary type if available, else first available
      const primary = ex.type as Format;
      if (primary === 'video' && hasVideo) setActiveFormat('video');
      else if (primary === 'audio' && hasAudio) setActiveFormat('audio');
      else if (primary === 'text' && hasText) setActiveFormat('text');
      else if (hasVideo) setActiveFormat('video');
      else if (hasAudio) setActiveFormat('audio');
      else if (hasText) setActiveFormat('text');
    }
  }, [exerciseData, activeFormat]);

  const handleToggleCompletion = () => {
    toggleCompletion.mutate({ scheduledExerciseId, completed: !localCompleted });
    setLocalCompleted(!localCompleted);
  };

  if (isLoading) {
    return (
      <MobileLayout title="Exercise" showBack>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-rdy-orange-500 animate-pulse" />
        </div>
      </MobileLayout>
    );
  }

  if (!exerciseData || !exerciseData.exercise) {
    return (
      <MobileLayout title="Exercise" showBack>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="rdy-body">Exercise not found</p>
        </div>
      </MobileLayout>
    );
  }

  const exercise = exerciseData.exercise;
  const hasVideo = !!(exercise.videoUrlDe || exercise.videoUrlEn || exercise.videoUrl);
  const hasAudio = !!exercise.audioUrl;
  const hasText  = !!exercise.contentDe;

  const availableFormats: { format: Format; label: string; icon: React.ReactNode }[] = [];
  if (hasVideo) availableFormats.push({ format: 'video', label: 'Video', icon: <Video className="h-4 w-4" /> });
  if (hasAudio) availableFormats.push({ format: 'audio', label: 'Audio', icon: <Mic className="h-4 w-4" /> });
  if (hasText)  availableFormats.push({ format: 'text',  label: 'Text',  icon: <FileText className="h-4 w-4" /> });

  const videoSrc = videoLang === 'de'
    ? (exercise.videoUrlDe || exercise.videoUrlEn || exercise.videoUrl)
    : (exercise.videoUrlEn || exercise.videoUrlDe || exercise.videoUrl);

  return (
    <MobileLayout title={exercise.titleDe.toUpperCase()} showBack>
      <div className="rdy-content-width px-rdy-lg py-rdy-lg">
        {/* Header */}
        <div className="mb-rdy-xl">
          <RdyHeader
            title={exercise.titleDe.toUpperCase()}
            subtitle={exercise.durationMinutes ? `${exercise.durationMinutes} MINS` : undefined}
          />
        </div>

        {/* Format picker — only shown when multiple formats available */}
        {availableFormats.length > 1 && (
          <div className="mb-rdy-lg flex gap-2 justify-center">
            {availableFormats.map(({ format, label, icon }) => (
              <button
                key={format}
                onClick={() => setActiveFormat(format)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeFormat === format
                    ? 'bg-rdy-orange-500 text-white'
                    : 'bg-rdy-gray-100 text-rdy-gray-600 hover:bg-rdy-gray-200'
                }`}
              >
                {icon}{label}
              </button>
            ))}
          </div>
        )}

        {/* VIDEO */}
        {activeFormat === 'video' && videoSrc && (
          <div className="mb-rdy-xl">
            <div className="relative w-full aspect-video bg-rdy-black rounded-lg overflow-hidden">
              {videoSrc.includes('youtube.com') || videoSrc.includes('youtu.be') ? (
                <iframe className="w-full h-full" src={videoSrc} title={exercise.titleDe}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen />
              ) : (
                <video controls className="w-full h-full" src={videoSrc} key={videoSrc}>
                  Your browser does not support the video element.
                </video>
              )}
            </div>
            {/* Language toggle */}
            {exercise.videoUrlDe && exercise.videoUrlEn && (
              <div className="mt-2 flex justify-center gap-2">
                {(['de', 'en'] as const).map((lang) => (
                  <button key={lang}
                    onClick={() => setVideoLang(lang)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      videoLang === lang ? 'bg-rdy-gray-300 text-rdy-black' : 'text-rdy-gray-400 hover:text-rdy-black'
                    }`}>
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AUDIO */}
        {activeFormat === 'audio' && exercise.audioUrl && (
          <div className="mb-rdy-xl">
            <div className="flex justify-center mb-rdy-md">
              <div className="w-32 h-32 rounded-full bg-rdy-gray-100 flex items-center justify-center">
                <span className="text-5xl">🎵</span>
              </div>
            </div>
            <div className="bg-rdy-gray-100 rounded-lg p-rdy-md">
              {exercise.audioUrl.includes('youtube.com') || exercise.audioUrl.includes('youtu.be') ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                  <iframe className="w-full h-full" src={exercise.audioUrl} title={exercise.titleDe}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              ) : (
                <audio controls className="w-full" src={exercise.audioUrl}>
                  Your browser does not support the audio element.
                </audio>
              )}
            </div>
          </div>
        )}

        {/* TEXT */}
        {activeFormat === 'text' && exercise.contentDe && (
          <div className="mb-rdy-xl">
            <div className="bg-rdy-gray-100 rounded-lg p-rdy-lg">
              <p className="rdy-body leading-relaxed whitespace-pre-wrap">{exercise.contentDe}</p>
            </div>
          </div>
        )}

        {/* Description (shown for all formats) */}
        {exercise.descriptionDe && (
          <div className="mb-rdy-xl">
            <p className="rdy-body text-center leading-relaxed">{exercise.descriptionDe}</p>
          </div>
        )}

        {/* Completion Toggle */}
        <div className="flex justify-center mb-rdy-xl">
          <button onClick={handleToggleCompletion}
            className="flex flex-col items-center gap-rdy-sm active:opacity-60 transition-opacity">
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

        <div className="text-center">
          <p className="text-rdy-lg font-bold text-rdy-black tracking-wide">RDY</p>
        </div>
      </div>
    </MobileLayout>
  );
}
