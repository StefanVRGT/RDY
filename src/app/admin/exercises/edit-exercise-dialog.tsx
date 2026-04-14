'use client';

import { useState, useEffect } from 'react';
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
import { Video, Mic, FileText } from 'lucide-react';
import { FileDropZone } from '@/components/ui/file-dropzone';

interface Exercise {
  id: string;
  type: 'video' | 'audio' | 'text';
  groupName: string | null;
  titleDe: string;
  titleEn: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  durationMinutes: number | null;
  videoUrlDe: string | null;
  videoUrlEn: string | null;
  audioUrl: string | null;
  contentDe: string | null;
  contentEn: string | null;
  imageUrl: string | null;
}

interface EditExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
  onSuccess: () => void;
}

export function EditExerciseDialog({ open, onOpenChange, exercise, onSuccess }: EditExerciseDialogProps) {
  const [groupName, setGroupName]     = useState('');
  const [titleDe, setTitleDe]         = useState('');
  const [titleEn, setTitleEn]         = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [videoUrlDe, setVideoUrlDe]   = useState('');
  const [videoUrlEn, setVideoUrlEn]   = useState('');
  const [audioUrl, setAudioUrl]       = useState('');
  const [descriptionDe, setDescriptionDe] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [contentDe, setContentDe]     = useState('');
  const [contentEn, setContentEn]     = useState('');
  const [imageUrl, setImageUrl]       = useState('');
  const [errorMessage, setErrorMessage]     = useState<string | null>(null);

  useEffect(() => {
    if (exercise) {
      setGroupName(exercise.groupName || '');
      setTitleDe(exercise.titleDe);
      setTitleEn(exercise.titleEn || '');
      setDurationMinutes(exercise.durationMinutes?.toString() || '');
      setVideoUrlDe(exercise.videoUrlDe || '');
      setVideoUrlEn(exercise.videoUrlEn || '');
      setAudioUrl(exercise.audioUrl || '');
      setDescriptionDe(exercise.descriptionDe || '');
      setDescriptionEn(exercise.descriptionEn || '');
      setContentDe(exercise.contentDe || '');
      setContentEn(exercise.contentEn || '');
      setImageUrl(exercise.imageUrl || '');
      setErrorMessage(null);
    }
  }, [exercise]);

  const updateMutation = trpc.exercises.update.useMutation({
    onSuccess: () => onSuccess(),
    onError: (error) => setErrorMessage(error.message),
  });

  // Auto-detect primary type from content
  const detectType = (): 'video' | 'audio' | 'text' => {
    if (videoUrlDe.trim() || videoUrlEn.trim()) return 'video';
    if (audioUrl.trim()) return 'audio';
    if (contentDe.trim()) return 'text';
    return exercise?.type ?? 'video';
  };

  const handleSubmit = async () => {
    if (!exercise) return;
    if (!titleDe.trim()) { setErrorMessage('German title is required'); return; }
    setErrorMessage(null);
    await updateMutation.mutateAsync({
      id:              exercise.id,
      type:            detectType(),
      groupName:       groupName.trim() || null,
      titleDe:         titleDe.trim(),
      titleEn:         titleEn.trim() || null,
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
      videoUrlDe:      videoUrlDe.trim() || null,
      videoUrlEn:      videoUrlEn.trim() || null,
      audioUrl:        audioUrl.trim() || null,
      descriptionDe:   descriptionDe.trim() || null,
      descriptionEn:   descriptionEn.trim() || null,
      contentDe:       contentDe.trim() || null,
      contentEn:       contentEn.trim() || null,
      imageUrl:        imageUrl.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setErrorMessage(null); onOpenChange(o); }}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Edit Exercise</DialogTitle>
          <DialogDescription>
            Add content in any or all formats — mentees choose their preferred one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Group */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-rdy-gray-600">Group</label>
            <Input placeholder="e.g. Atemübungen, Meditation, Bewegung"
              value={groupName} onChange={(e) => setGroupName(e.target.value)} />
          </div>

          {/* Title */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-rdy-gray-600">Title (DE) *</label>
              <Input placeholder="Titel auf Deutsch" value={titleDe} onChange={(e) => setTitleDe(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-rdy-gray-600">Title (EN)</label>
              <Input placeholder="Title in English" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-rdy-gray-600">Duration (minutes)</label>
            <Input type="number" placeholder="e.g. 15" min="1" value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)} className="w-40" />
          </div>

          {/* Description */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-rdy-gray-600">Description (DE)</label>
              <textarea rows={4} placeholder="Kurze Beschreibung…" value={descriptionDe}
                onChange={(e) => setDescriptionDe(e.target.value)}
                className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 text-sm placeholder:text-rdy-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-rdy-gray-600">Description (EN)</label>
              <textarea rows={4} placeholder="Short description…" value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 text-sm placeholder:text-rdy-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500" />
            </div>
          </div>

          {/* VIDEO */}
          <div className="space-y-3 rounded-lg border border-rdy-gray-200 bg-rdy-gray-100/40 p-4">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-blue-500" />
              <p className="text-sm font-semibold text-rdy-black">Video</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-rdy-gray-500">German (DE)</label>
                <FileDropZone
                  accept="video/*"
                  endpoint="/api/upload/video"
                  label="Upload video"
                  hint="MP4, WebM, MOV — max 500 MB"
                  value={videoUrlDe}
                  onChange={setVideoUrlDe}
                  onError={setErrorMessage}
                />
                <Input type="url" placeholder="or paste URL" value={videoUrlDe} onChange={(e) => setVideoUrlDe(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-rdy-gray-500">English (EN)</label>
                <FileDropZone
                  accept="video/*"
                  endpoint="/api/upload/video"
                  label="Upload video"
                  hint="MP4, WebM, MOV — max 500 MB"
                  value={videoUrlEn}
                  onChange={setVideoUrlEn}
                  onError={setErrorMessage}
                />
                <Input type="url" placeholder="or paste URL" value={videoUrlEn} onChange={(e) => setVideoUrlEn(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
          </div>

          {/* AUDIO */}
          <div className="space-y-3 rounded-lg border border-rdy-gray-200 bg-rdy-gray-100/40 p-4">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-purple-500" />
              <p className="text-sm font-semibold text-rdy-black">Audio</p>
            </div>
            <FileDropZone
              accept="audio/*"
              endpoint="/api/upload/audio"
              label="Upload audio"
              hint="MP3, WAV, OGG, WebM — max 50 MB"
              value={audioUrl}
              onChange={setAudioUrl}
              onError={setErrorMessage}
            />
            <Input type="url" placeholder="or paste URL" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} className="h-8 text-xs" />
          </div>

          {/* TEXT */}
          <div className="space-y-3 rounded-lg border border-rdy-gray-200 bg-rdy-gray-100/40 p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600" />
              <p className="text-sm font-semibold text-rdy-black">Text content</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-rdy-gray-500">German (DE)</label>
                <textarea rows={5} placeholder="Inhalt auf Deutsch…" value={contentDe}
                  onChange={(e) => setContentDe(e.target.value)}
                  className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 text-sm placeholder:text-rdy-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-rdy-gray-500">English (EN)</label>
                <textarea rows={5} placeholder="Content in English…" value={contentEn}
                  onChange={(e) => setContentEn(e.target.value)}
                  className="w-full rounded-md border border-rdy-gray-200 bg-white px-3 py-2 text-sm placeholder:text-rdy-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rdy-orange-500" />
              </div>
            </div>
          </div>

          {/* ── IMAGE ──────────────────────────────────────── */}
          <div className="space-y-3 rounded-lg border border-rdy-gray-200 bg-rdy-gray-100/40 p-4">
            <p className="text-sm font-semibold text-rdy-black">Image</p>
            <FileDropZone
              accept="image/*"
              endpoint="/api/upload/image"
              label="Upload image"
              hint="JPG, PNG, WebP, SVG — max 10 MB"
              value={imageUrl}
              onChange={setImageUrl}
              onError={setErrorMessage}
            />
          </div>

          {errorMessage && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-500">{errorMessage}</div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}
            className="border-rdy-gray-200 text-rdy-gray-600 hover:bg-rdy-gray-200">Cancel</Button>
          <Button onClick={handleSubmit} disabled={!titleDe.trim() || updateMutation.isPending}
            className="bg-rdy-orange-500 text-white hover:bg-rdy-orange-600">
            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
