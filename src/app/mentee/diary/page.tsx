'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  Plus,
  Mic,
  FileText,
  Trash2,
  Pencil,
  Calendar as CalendarIcon,
  Clock,
  X,
  Square,
  Play,
  Pause,
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

// Type for diary entry
type DiaryEntry = {
  id: string;
  entryType: 'text' | 'voice' | 'mixed';
  content: string | null;
  voiceRecordingUrl: string | null;
  voiceRecordingDuration: number | null;
  entryDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

// Format duration for display
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function MenteeDiaryPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [showEditEntry, setShowEditEntry] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCalendarFilter, setShowCalendarFilter] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<DiaryEntry | null>(null);
  const [entryContent, setEntryContent] = useState('');

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // tRPC hooks
  const utils = trpc.useUtils();

  // Build query params based on selected date
  const queryParams = selectedDate
    ? {
        startDate: startOfDay(selectedDate).toISOString(),
        endDate: endOfDay(selectedDate).toISOString(),
        limit: 50,
        offset: 0,
        sortOrder: 'desc' as const,
      }
    : {
        limit: 50,
        offset: 0,
        sortOrder: 'desc' as const,
      };

  const { data: entries = [], isLoading } = trpc.diary.getEntries.useQuery(queryParams);

  // Get entry counts for calendar highlighting
  const currentMonth = new Date();
  const { data: entryCounts = {} } = trpc.diary.getEntriesCount.useQuery({
    startDate: startOfMonth(currentMonth).toISOString(),
    endDate: endOfMonth(currentMonth).toISOString(),
  });

  const createEntry = trpc.diary.createEntry.useMutation({
    onSuccess: () => {
      utils.diary.getEntries.invalidate();
      utils.diary.getEntriesCount.invalidate();
      resetNewEntryForm();
      setShowNewEntry(false);
    },
  });

  const updateEntry = trpc.diary.updateEntry.useMutation({
    onSuccess: () => {
      utils.diary.getEntries.invalidate();
      utils.diary.getEntriesCount.invalidate();
      setShowEditEntry(false);
      setEditingEntry(null);
      setEntryContent('');
    },
  });

  const deleteEntry = trpc.diary.deleteEntry.useMutation({
    onSuccess: () => {
      utils.diary.getEntries.invalidate();
      utils.diary.getEntriesCount.invalidate();
      setShowDeleteConfirm(false);
      setDeletingEntry(null);
    },
  });

  // Reset new entry form
  const resetNewEntryForm = useCallback(() => {
    setEntryContent('');
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setRecordingDuration(0);
  }, [audioUrl]);

  // Start voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    } catch {
      console.error('Failed to start recording');
    }
  }, []);

  // Stop voice recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  }, [isRecording]);

  // Clear recording
  const clearRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingDuration(0);
  }, [audioUrl]);

  // Play/pause audio
  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, audioUrl]);

  // Handle audio ended
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => setIsPlaying(false);
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, [audioUrl]);

  // Handle create entry
  const handleCreateEntry = useCallback(() => {
    if (!entryContent.trim() && !audioBlob) return;

    // For now, we'll save text content directly
    // Voice recording URL would typically be uploaded to a storage service
    // For this implementation, we'll simulate a URL (in production, upload to S3/similar)
    const voiceUrl = audioBlob ? `data:audio/webm;base64,${audioUrl}` : undefined;

    createEntry.mutate({
      content: entryContent.trim() || undefined,
      voiceRecordingUrl: voiceUrl,
      voiceRecordingDuration: audioBlob ? recordingDuration : undefined,
      entryDate: new Date().toISOString(),
    });
  }, [entryContent, audioBlob, audioUrl, recordingDuration, createEntry]);

  // Handle edit entry
  const handleEditEntry = useCallback(
    (entry: DiaryEntry) => {
      setEditingEntry(entry);
      setEntryContent(entry.content || '');
      setShowEditEntry(true);
    },
    []
  );

  // Handle update entry
  const handleUpdateEntry = useCallback(() => {
    if (!editingEntry) return;

    updateEntry.mutate({
      id: editingEntry.id,
      content: entryContent.trim() || undefined,
    });
  }, [editingEntry, entryContent, updateEntry]);

  // Handle delete entry
  const handleDeleteEntry = useCallback(
    (entry: DiaryEntry) => {
      setDeletingEntry(entry);
      setShowDeleteConfirm(true);
    },
    []
  );

  // Confirm delete
  const confirmDelete = useCallback(() => {
    if (!deletingEntry) return;
    deleteEntry.mutate({ id: deletingEntry.id });
  }, [deletingEntry, deleteEntry]);

  // Handle date filter
  const handleDateSelect = useCallback((date: Date | undefined) => {
    setSelectedDate(date || null);
    setShowCalendarFilter(false);
  }, []);

  // Clear date filter
  const clearDateFilter = useCallback(() => {
    setSelectedDate(null);
  }, []);

  // Get dates with entries for calendar
  const datesWithEntries = Object.keys(entryCounts).map(dateStr => new Date(dateStr));

  return (
    <MobileLayout title="Diary" showNotifications>
      <div className="flex flex-col px-4 py-4" data-testid="mentee-diary">
        {/* Header with filters and new entry button */}
        <div className="mb-4 flex items-center justify-between" data-testid="diary-header">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCalendarFilter(true)}
              className="gap-2 border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800"
              data-testid="date-filter-button"
            >
              <CalendarIcon className="h-4 w-4" />
              {selectedDate ? format(selectedDate, 'MMM d') : 'All dates'}
            </Button>
            {selectedDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDateFilter}
                className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                data-testid="clear-date-filter"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            onClick={() => setShowNewEntry(true)}
            className="gap-2 bg-twilight-600 text-white hover:bg-twilight-500"
            data-testid="new-entry-button"
          >
            <Plus className="h-4 w-4" />
            New Entry
          </Button>
        </div>

        {/* Entries list */}
        <div className="space-y-4" data-testid="diary-entries-list">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-twilight-400 border-t-transparent" />
            </div>
          ) : entries.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-center"
              data-testid="empty-state"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
                <FileText className="h-8 w-8 text-gray-500" />
              </div>
              <p className="text-lg font-medium text-white">No diary entries</p>
              <p className="mt-1 text-sm text-gray-400">
                {selectedDate
                  ? `No entries for ${format(selectedDate, 'MMMM d, yyyy')}`
                  : 'Start journaling by creating your first entry'}
              </p>
              <Button
                onClick={() => setShowNewEntry(true)}
                className="mt-4 gap-2 bg-twilight-600 text-white hover:bg-twilight-500"
              >
                <Plus className="h-4 w-4" />
                Create Entry
              </Button>
            </div>
          ) : (
            entries.map(entry => (
              <DiaryEntryCard
                key={entry.id}
                entry={entry}
                onEdit={handleEditEntry}
                onDelete={handleDeleteEntry}
              />
            ))
          )}
        </div>
      </div>

      {/* New Entry Dialog */}
      <Dialog
        open={showNewEntry}
        onOpenChange={(open) => {
          if (!open) resetNewEntryForm();
          setShowNewEntry(open);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-gray-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="new-entry-dialog-title">New Diary Entry</DialogTitle>
            <DialogDescription className="text-gray-400">
              Write your thoughts or record a voice note
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Text editor */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Write your entry
              </label>
              <textarea
                value={entryContent}
                onChange={(e) => setEntryContent(e.target.value)}
                placeholder="What's on your mind today?"
                className="min-h-[150px] w-full rounded-xl border border-gray-700 bg-gray-800 p-4 text-white placeholder-gray-500 focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
                data-testid="diary-text-editor"
              />
            </div>

            {/* Voice recording section */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Or record a voice note
              </label>

              {!audioUrl ? (
                <div className="flex items-center gap-4">
                  {!isRecording ? (
                    <Button
                      onClick={startRecording}
                      variant="outline"
                      className="gap-2 border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
                      data-testid="voice-record-button"
                    >
                      <Mic className="h-4 w-4 text-red-400" />
                      Start Recording
                    </Button>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                        <span className="font-mono text-white" data-testid="recording-duration">
                          {formatDuration(recordingDuration)}
                        </span>
                      </div>
                      <Button
                        onClick={stopRecording}
                        variant="outline"
                        className="gap-2 border-red-600 bg-red-900/30 text-red-400 hover:bg-red-900/50"
                        data-testid="voice-stop-button"
                      >
                        <Square className="h-4 w-4" />
                        Stop
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-gray-800 p-4" data-testid="audio-preview">
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={togglePlayback}
                      size="sm"
                      className="h-10 w-10 rounded-full bg-twilight-600 p-0 hover:bg-twilight-500"
                      data-testid="audio-play-button"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5 ml-0.5" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <p className="text-sm text-white">Voice Recording</p>
                      <p className="text-xs text-gray-400">{formatDuration(recordingDuration)}</p>
                    </div>
                    <Button
                      onClick={clearRecording}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"
                      data-testid="audio-clear-button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <audio ref={audioRef} src={audioUrl} className="hidden" />
                </div>
              )}
            </div>

            {/* Submit button */}
            <Button
              onClick={handleCreateEntry}
              disabled={(!entryContent.trim() && !audioBlob) || createEntry.isPending}
              className="w-full bg-twilight-600 text-white hover:bg-twilight-500 disabled:opacity-50"
              data-testid="save-entry-button"
            >
              {createEntry.isPending ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog open={showEditEntry} onOpenChange={setShowEditEntry}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-gray-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="edit-entry-dialog-title">Edit Entry</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <textarea
              value={entryContent}
              onChange={(e) => setEntryContent(e.target.value)}
              placeholder="Edit your entry..."
              className="min-h-[150px] w-full rounded-xl border border-gray-700 bg-gray-800 p-4 text-white placeholder-gray-500 focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
              data-testid="edit-text-editor"
            />

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowEditEntry(false);
                  setEditingEntry(null);
                  setEntryContent('');
                }}
                variant="outline"
                className="flex-1 border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateEntry}
                disabled={!entryContent.trim() || updateEntry.isPending}
                className="flex-1 bg-twilight-600 text-white hover:bg-twilight-500 disabled:opacity-50"
                data-testid="update-entry-button"
              >
                {updateEntry.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-gray-900 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete this entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeletingEntry(null);
              }}
              variant="outline"
              className="flex-1 border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteEntry.isPending}
              className="flex-1 bg-red-600 text-white hover:bg-red-500"
              data-testid="confirm-delete-button"
            >
              {deleteEntry.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar Filter Dialog */}
      <Dialog open={showCalendarFilter} onOpenChange={setShowCalendarFilter}>
        <DialogContent className="bg-gray-900 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Filter by Date</DialogTitle>
          </DialogHeader>

          <div className="mt-4" data-testid="date-filter-calendar">
            <Calendar
              mode="single"
              selected={selectedDate || undefined}
              onSelect={handleDateSelect}
              modifiers={{ hasEntries: datesWithEntries }}
              modifiersClassNames={{
                hasEntries: 'bg-twilight-600/30 text-twilight-300',
              }}
              className="rounded-xl border border-gray-700"
            />
          </div>

          {selectedDate && (
            <Button
              onClick={() => {
                setSelectedDate(null);
                setShowCalendarFilter(false);
              }}
              variant="outline"
              className="mt-4 w-full border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
            >
              Clear Filter
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}

// Diary Entry Card Component
function DiaryEntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: DiaryEntry;
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (entry: DiaryEntry) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !entry.voiceRecordingUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, entry.voiceRecordingUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => setIsPlaying(false);
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, []);

  return (
    <div
      className="rounded-xl bg-gray-900 p-4"
      data-testid={`diary-entry-${entry.id}`}
      data-entry-type={entry.entryType}
    >
      {/* Entry header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <CalendarIcon className="h-4 w-4" />
          <span data-testid={`entry-date-${entry.id}`}>
            {format(new Date(entry.entryDate), 'MMMM d, yyyy')}
          </span>
          <span className="text-gray-600">|</span>
          <Clock className="h-4 w-4" />
          <span>{format(new Date(entry.entryDate), 'h:mm a')}</span>
        </div>
        <div className="flex items-center gap-1">
          {entry.entryType !== 'voice' && (
            <Button
              onClick={() => onEdit(entry)}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-gray-400 hover:text-white"
              data-testid={`edit-entry-${entry.id}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={() => onDelete(entry)}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"
            data-testid={`delete-entry-${entry.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Text content */}
      {entry.content && (
        <p className="whitespace-pre-wrap text-gray-300" data-testid={`entry-content-${entry.id}`}>
          {entry.content}
        </p>
      )}

      {/* Voice recording */}
      {entry.voiceRecordingUrl && (
        <div
          className={`rounded-lg bg-gray-800 p-3 ${entry.content ? 'mt-3' : ''}`}
          data-testid={`entry-voice-${entry.id}`}
        >
          <div className="flex items-center gap-3">
            <Button
              onClick={togglePlayback}
              size="sm"
              className="h-10 w-10 rounded-full bg-twilight-600 p-0 hover:bg-twilight-500"
              data-testid={`play-voice-${entry.id}`}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-twilight-400" />
                <span className="text-sm text-white">Voice Note</span>
              </div>
              {entry.voiceRecordingDuration && (
                <p className="text-xs text-gray-400">
                  {formatDuration(entry.voiceRecordingDuration)}
                </p>
              )}
            </div>
          </div>
          <audio ref={audioRef} src={entry.voiceRecordingUrl} className="hidden" />
        </div>
      )}

      {/* Entry type indicator */}
      <div className="mt-3 flex items-center gap-2">
        {entry.entryType === 'text' && (
          <span className="flex items-center gap-1 rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-400">
            <FileText className="h-3 w-3" />
            Text
          </span>
        )}
        {entry.entryType === 'voice' && (
          <span className="flex items-center gap-1 rounded-full bg-twilight-900/50 px-2 py-1 text-xs text-twilight-400">
            <Mic className="h-3 w-3" />
            Voice
          </span>
        )}
        {entry.entryType === 'mixed' && (
          <>
            <span className="flex items-center gap-1 rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-400">
              <FileText className="h-3 w-3" />
              Text
            </span>
            <span className="flex items-center gap-1 rounded-full bg-twilight-900/50 px-2 py-1 text-xs text-twilight-400">
              <Mic className="h-3 w-3" />
              Voice
            </span>
          </>
        )}
      </div>
    </div>
  );
}
