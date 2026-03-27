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
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  FileText,
  Mic,
  Calendar as CalendarIcon,
  Clock,
  X,
  Play,
  Pause,
  User,
  BookOpen,
  Filter,
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { useParams, useRouter } from 'next/navigation';

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

export default function MentorMenteeDiaryPage() {
  const params = useParams();
  const router = useRouter();
  const menteeId = params.menteeId as string;

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCalendarFilter, setShowCalendarFilter] = useState(false);
  const [showMenteeFilter, setShowMenteeFilter] = useState(false);

  // Get mentee info
  const { data: menteeInfo, isLoading: menteeLoading, error: menteeError } = trpc.mentor.getMenteeInfo.useQuery(
    { menteeId },
    { enabled: !!menteeId }
  );

  // Get all mentees for the filter
  const { data: allMentees = [] } = trpc.mentor.getMyMentees.useQuery();

  // Build query params based on selected date
  const queryParams = {
    menteeId,
    ...(selectedDate && {
      startDate: startOfDay(selectedDate).toISOString(),
      endDate: endOfDay(selectedDate).toISOString(),
    }),
    limit: 50,
    offset: 0,
    sortOrder: 'desc' as const,
  };

  const { data: diaryData, isLoading: entriesLoading } = trpc.mentor.getMenteeDiaryEntries.useQuery(
    queryParams,
    { enabled: !!menteeId }
  );
  const entries = diaryData?.entries ?? [];
  const diaryNotShared = diaryData?.diaryNotShared ?? false;

  // Get entry counts for calendar highlighting
  const currentMonth = new Date();
  const { data: entryCounts = {} } = trpc.mentor.getMenteeDiaryEntriesCount.useQuery(
    {
      menteeId,
      startDate: startOfMonth(currentMonth).toISOString(),
      endDate: endOfMonth(currentMonth).toISOString(),
    },
    { enabled: !!menteeId }
  );

  // Handle date filter
  const handleDateSelect = useCallback((date: Date | undefined) => {
    setSelectedDate(date || null);
    setShowCalendarFilter(false);
  }, []);

  // Clear date filter
  const clearDateFilter = useCallback(() => {
    setSelectedDate(null);
  }, []);

  // Handle mentee selection from filter
  const handleMenteeSelect = useCallback((newMenteeId: string) => {
    setShowMenteeFilter(false);
    router.push(`/mentor/mentee/${newMenteeId}/diary`);
  }, [router]);

  // Get dates with entries for calendar
  const datesWithEntries = Object.keys(entryCounts).map(dateStr => new Date(dateStr));

  // Loading state
  if (menteeLoading) {
    return (
      <MobileLayout title="Mentee Diary" showBack showNotifications>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-rdy-orange-500 border-t-transparent" />
        </div>
      </MobileLayout>
    );
  }

  // Error state
  if (menteeError) {
    return (
      <MobileLayout title="Mentee Diary" showBack showNotifications>
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-6" data-testid="diary-error">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <BookOpen className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-rdy-black">Access Denied</h2>
          <p className="text-center text-rdy-gray-400">
            You do not have access to this mentee&apos;s diary.
          </p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title={menteeInfo?.name ? `${menteeInfo.name}'s Diary` : 'Mentee Diary'}
      showBack
      showNotifications
    >
      <div className="flex flex-col px-4 py-4" data-testid="mentor-mentee-diary">
        {/* Mentee Info Header */}
        <div className="mb-4 rounded-xl bg-rdy-gray-100 p-4" data-testid="mentee-info-header">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rdy-orange-500/10">
              <User className="h-6 w-6 text-rdy-orange-500" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-rdy-black" data-testid="mentee-name">
                {menteeInfo?.name || 'Unknown'}
              </h2>
              <p className="text-sm text-rdy-gray-400" data-testid="mentee-email">
                {menteeInfo?.email}
              </p>
              {menteeInfo?.classes && menteeInfo.classes.length > 0 && (
                <p className="mt-1 text-xs text-rdy-orange-500" data-testid="mentee-class">
                  {menteeInfo.classes.map(c => c.className).join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Read-only notice */}
        <div className="mb-4 rounded-lg bg-rdy-orange-500/10 px-3 py-2 text-sm text-rdy-orange-500" data-testid="readonly-notice">
          <span className="font-medium">Read-only access</span> - You can view diary entries but cannot modify them.
        </div>

        {/* Filters */}
        <div className="mb-4 flex items-center gap-2" data-testid="diary-filters">
          {/* Mentee Filter */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMenteeFilter(true)}
            className="gap-2 border-rdy-gray-200 bg-rdy-gray-100 text-rdy-gray-600 hover:bg-rdy-gray-200"
            data-testid="mentee-filter-button"
          >
            <Filter className="h-4 w-4" />
            Change Mentee
          </Button>

          {/* Date Filter */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCalendarFilter(true)}
            className="gap-2 border-rdy-gray-200 bg-rdy-gray-100 text-rdy-gray-600 hover:bg-rdy-gray-200"
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
              className="h-8 w-8 p-0 text-rdy-gray-400 hover:text-rdy-black"
              data-testid="clear-date-filter"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Entries list */}
        <div className="space-y-4" data-testid="diary-entries-list">
          {entriesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-rdy-orange-500 border-t-transparent" />
            </div>
          ) : diaryNotShared ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-center"
              data-testid="diary-not-shared-state"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rdy-gray-100">
                <BookOpen className="h-8 w-8 text-rdy-gray-400" />
              </div>
              <p className="text-lg font-medium text-rdy-black">Diary not shared</p>
              <p className="mt-1 text-sm text-rdy-gray-400">
                This mentee has not enabled diary sharing with their mentor yet.
              </p>
            </div>
          ) : entries.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-center"
              data-testid="empty-state"
            >
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rdy-gray-100">
                <FileText className="h-8 w-8 text-rdy-gray-500" />
              </div>
              <p className="text-lg font-medium text-rdy-black">No diary entries</p>
              <p className="mt-1 text-sm text-rdy-gray-400">
                {selectedDate
                  ? `No entries for ${format(selectedDate, 'MMMM d, yyyy')}`
                  : 'This mentee has not created any diary entries yet'}
              </p>
            </div>
          ) : (
            entries.map(entry => (
              <ReadOnlyDiaryEntryCard key={entry.id} entry={entry} />
            ))
          )}
        </div>
      </div>

      {/* Mentee Filter Dialog */}
      <Dialog open={showMenteeFilter} onOpenChange={setShowMenteeFilter}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Mentee</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-2" data-testid="mentee-filter-list">
            {allMentees.length === 0 ? (
              <p className="py-4 text-center text-rdy-gray-400">No mentees found</p>
            ) : (
              allMentees.map(mentee => (
                <button
                  key={`${mentee.classId}-${mentee.userId}`}
                  onClick={() => handleMenteeSelect(mentee.userId)}
                  className={`w-full rounded-lg p-3 text-left transition-colors ${
                    mentee.userId === menteeId
                      ? 'bg-rdy-orange-500/10 ring-1 ring-rdy-orange-500'
                      : 'bg-rdy-gray-100 hover:bg-rdy-gray-200'
                  }`}
                  data-testid={`mentee-option-${mentee.userId}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rdy-gray-200">
                      <User className="h-5 w-5 text-rdy-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-rdy-black">
                        {mentee.user.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-rdy-gray-400">{mentee.className}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Calendar Filter Dialog */}
      <Dialog open={showCalendarFilter} onOpenChange={setShowCalendarFilter}>
        <DialogContent className="sm:max-w-sm">
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
                hasEntries: 'bg-rdy-orange-500/20 text-rdy-orange-500',
              }}
              className="rounded-xl border border-rdy-gray-200"
            />
          </div>

          {selectedDate && (
            <Button
              onClick={() => {
                setSelectedDate(null);
                setShowCalendarFilter(false);
              }}
              variant="outline"
              className="mt-4 w-full border-rdy-gray-200 bg-rdy-gray-100 text-rdy-gray-600 hover:bg-rdy-gray-200"
            >
              Clear Filter
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}

// Read-only Diary Entry Card Component - no edit/delete buttons
function ReadOnlyDiaryEntryCard({ entry }: { entry: DiaryEntry }) {
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
      className="rounded-xl bg-rdy-gray-100 p-4"
      data-testid={`diary-entry-${entry.id}`}
      data-entry-type={entry.entryType}
    >
      {/* Entry header - read-only, no action buttons */}
      <div className="mb-3 flex items-center gap-2 text-sm text-rdy-gray-400">
        <CalendarIcon className="h-4 w-4" />
        <span data-testid={`entry-date-${entry.id}`}>
          {format(new Date(entry.entryDate), 'MMMM d, yyyy')}
        </span>
        <span className="text-rdy-gray-400">|</span>
        <Clock className="h-4 w-4" />
        <span>{format(new Date(entry.entryDate), 'h:mm a')}</span>
      </div>

      {/* Text content */}
      {entry.content && (
        <p className="whitespace-pre-wrap text-rdy-gray-600" data-testid={`entry-content-${entry.id}`}>
          {entry.content}
        </p>
      )}

      {/* Voice recording with playback support */}
      {entry.voiceRecordingUrl && (
        <div
          className={`rounded-lg bg-rdy-gray-100 p-3 ${entry.content ? 'mt-3' : ''}`}
          data-testid={`entry-voice-${entry.id}`}
        >
          <div className="flex items-center gap-3">
            <Button
              onClick={togglePlayback}
              size="sm"
              className="h-10 w-10 rounded-full bg-rdy-orange-500 p-0 hover:bg-rdy-orange-600"
              data-testid={`play-voice-${entry.id}`}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-rdy-orange-500" />
                <span className="text-sm text-rdy-black">Voice Note</span>
              </div>
              {entry.voiceRecordingDuration && (
                <p className="text-xs text-rdy-gray-400">
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
          <span className="flex items-center gap-1 rounded-full bg-rdy-gray-100 px-2 py-1 text-xs text-rdy-gray-400">
            <FileText className="h-3 w-3" />
            Text
          </span>
        )}
        {entry.entryType === 'voice' && (
          <span className="flex items-center gap-1 rounded-full bg-rdy-orange-500/20 px-2 py-1 text-xs text-rdy-orange-500">
            <Mic className="h-3 w-3" />
            Voice
          </span>
        )}
        {entry.entryType === 'mixed' && (
          <>
            <span className="flex items-center gap-1 rounded-full bg-rdy-gray-100 px-2 py-1 text-xs text-rdy-gray-400">
              <FileText className="h-3 w-3" />
              Text
            </span>
            <span className="flex items-center gap-1 rounded-full bg-rdy-orange-500/20 px-2 py-1 text-xs text-rdy-orange-500">
              <Mic className="h-3 w-3" />
              Voice
            </span>
          </>
        )}
      </div>
    </div>
  );
}
