'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Exercise {
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
}

interface EditExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
  onSuccess: () => void;
}

export function EditExerciseDialog({
  open,
  onOpenChange,
  exercise,
  onSuccess,
}: EditExerciseDialogProps) {
  const [type, setType] = useState<'video' | 'audio' | 'text'>('text');
  const [titleDe, setTitleDe] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descriptionDe, setDescriptionDe] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [contentDe, setContentDe] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Populate form when exercise changes
  useEffect(() => {
    if (exercise) {
      setType(exercise.type);
      setTitleDe(exercise.titleDe);
      setTitleEn(exercise.titleEn || '');
      setDescriptionDe(exercise.descriptionDe || '');
      setDescriptionEn(exercise.descriptionEn || '');
      setDurationMinutes(exercise.durationMinutes?.toString() || '');
      setVideoUrl(exercise.videoUrl || '');
      setAudioUrl(exercise.audioUrl || '');
      setContentDe(exercise.contentDe || '');
      setContentEn(exercise.contentEn || '');
      setErrorMessage(null);
    }
  }, [exercise]);

  const updateMutation = trpc.exercises.update.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const handleSubmit = async () => {
    if (!exercise) return;

    if (!titleDe.trim()) {
      setErrorMessage('German title is required');
      return;
    }

    setErrorMessage(null);
    await updateMutation.mutateAsync({
      id: exercise.id,
      type,
      titleDe: titleDe.trim(),
      titleEn: titleEn.trim() || null,
      descriptionDe: descriptionDe.trim() || null,
      descriptionEn: descriptionEn.trim() || null,
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
      videoUrl: videoUrl.trim() || null,
      audioUrl: audioUrl.trim() || null,
      contentDe: contentDe.trim() || null,
      contentEn: contentEn.trim() || null,
    });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setErrorMessage(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-gray-800 bg-gray-900 text-white sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Exercise</DialogTitle>
          <DialogDescription className="text-gray-400">
            Update the exercise details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Type *</label>
            <Select
              value={type}
              onValueChange={(value: 'video' | 'audio' | 'text') => setType(value)}
            >
              <SelectTrigger className="w-full border-gray-700 bg-gray-800 text-white">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-800">
                <SelectItem value="video" className="text-white">
                  Video
                </SelectItem>
                <SelectItem value="audio" className="text-white">
                  Audio
                </SelectItem>
                <SelectItem value="text" className="text-white">
                  Text
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title (DE) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Title (German) *</label>
            <Input
              placeholder="Titel auf Deutsch"
              value={titleDe}
              onChange={(e) => setTitleDe(e.target.value)}
              className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Title (EN) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Title (English)</label>
            <Input
              placeholder="Title in English"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Description (DE) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Description (German)</label>
            <textarea
              placeholder="Beschreibung auf Deutsch"
              value={descriptionDe}
              onChange={(e) => setDescriptionDe(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description (EN) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Description (English)</label>
            <textarea
              placeholder="Description in English"
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Duration (minutes)</label>
            <Input
              type="number"
              placeholder="e.g., 15"
              min="1"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Video URL - shown for video type */}
          {type === 'video' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Video URL</label>
              <Input
                type="url"
                placeholder="https://example.com/video.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
              />
            </div>
          )}

          {/* Audio URL - shown for audio type */}
          {type === 'audio' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Audio URL</label>
              <Input
                type="url"
                placeholder="https://example.com/audio.mp3"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
              />
            </div>
          )}

          {/* Text Content - shown for text type */}
          {type === 'text' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Content (German)</label>
                <textarea
                  placeholder="Inhalt auf Deutsch"
                  value={contentDe}
                  onChange={(e) => setContentDe(e.target.value)}
                  rows={5}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Content (English)</label>
                <textarea
                  placeholder="Content in English"
                  value={contentEn}
                  onChange={(e) => setContentEn(e.target.value)}
                  rows={5}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {errorMessage && (
            <div className="rounded-lg bg-red-900/20 p-3 text-sm text-red-400">{errorMessage}</div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!titleDe.trim() || updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
