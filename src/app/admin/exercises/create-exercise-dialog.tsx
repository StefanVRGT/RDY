'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
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

interface CreateExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateExerciseDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateExerciseDialogProps) {
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

  const createMutation = trpc.exercises.create.useMutation({
    onSuccess: () => {
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      setErrorMessage(error.message);
    },
  });

  const resetForm = () => {
    setType('text');
    setTitleDe('');
    setTitleEn('');
    setDescriptionDe('');
    setDescriptionEn('');
    setDurationMinutes('');
    setVideoUrl('');
    setAudioUrl('');
    setContentDe('');
    setContentEn('');
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    if (!titleDe.trim()) {
      setErrorMessage('German title is required');
      return;
    }

    setErrorMessage(null);
    await createMutation.mutateAsync({
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
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Exercise</DialogTitle>
          <DialogDescription>
            Add a new exercise to the content library
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Type *</label>
            <Select
              value={type}
              onValueChange={(value: 'video' | 'audio' | 'text') => setType(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">
                  Video
                </SelectItem>
                <SelectItem value="audio">
                  Audio
                </SelectItem>
                <SelectItem value="text">
                  Text
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title (DE) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Title (German) *</label>
            <Input
              placeholder="Titel auf Deutsch"
              value={titleDe}
              onChange={(e) => setTitleDe(e.target.value)}
            />
          </div>

          {/* Title (EN) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Title (English)</label>
            <Input
              placeholder="Title in English"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
            />
          </div>

          {/* Description (DE) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Description (German)</label>
            <textarea
              placeholder="Beschreibung auf Deutsch"
              value={descriptionDe}
              onChange={(e) => setDescriptionDe(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
            />
          </div>

          {/* Description (EN) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Description (English)</label>
            <textarea
              placeholder="Description in English"
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-rdy-gray-600">Duration (minutes)</label>
            <Input
              type="number"
              placeholder="e.g., 15"
              min="1"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>

          {/* Video URL - shown for video type */}
          {type === 'video' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-rdy-gray-600">Video URL</label>
              <Input
                type="url"
                placeholder="https://example.com/video.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
          )}

          {/* Audio URL - shown for audio type */}
          {type === 'audio' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-rdy-gray-600">Audio URL</label>
              <Input
                type="url"
                placeholder="https://example.com/audio.mp3"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
              />
            </div>
          )}

          {/* Text Content - shown for text type */}
          {type === 'text' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-rdy-gray-600">Content (German)</label>
                <textarea
                  placeholder="Inhalt auf Deutsch"
                  value={contentDe}
                  onChange={(e) => setContentDe(e.target.value)}
                  rows={5}
                  className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-rdy-gray-600">Content (English)</label>
                <textarea
                  placeholder="Content in English"
                  value={contentEn}
                  onChange={(e) => setContentEn(e.target.value)}
                  rows={5}
                  className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
                />
              </div>
            </>
          )}

          {errorMessage && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500">{errorMessage}</div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!titleDe.trim() || createMutation.isPending}
            className="bg-rdy-orange-500 text-white hover:bg-rdy-orange-600"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Exercise'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
