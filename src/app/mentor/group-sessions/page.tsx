'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile';
import { trpc } from '@/lib/trpc/client';
import {
  Users,
  RefreshCw,
  Calendar,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Format date to readable date string
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

// Format time
function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

// Get status color classes
function getStatusColor(status: string) {
  switch (status) {
    case 'scheduled':
      return 'bg-rdy-orange-500';
    case 'completed':
      return 'bg-green-500';
    case 'cancelled':
      return 'bg-red-500';
    default:
      return 'bg-rdy-gray-400';
  }
}

type TabType = 'upcoming' | 'past';

export default function GroupSessionsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    agenda: '',
    classId: '',
    scheduledAt: '',
    scheduledTime: '10:00',
    durationMinutes: 60,
    maxParticipants: '',
    location: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Get current date for upcoming sessions filter
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // TRPC queries
  const { data: upcomingSessions, isLoading: upcomingLoading } =
    trpc.groupSessions.getMyGroupSessions.useQuery({
      startDate: startOfToday.toISOString(),
      status: 'all',
      limit: 50,
    });

  const { data: pastSessions, isLoading: pastLoading } =
    trpc.groupSessions.getMyGroupSessions.useQuery(
      {
        endDate: startOfToday.toISOString(),
        status: 'all',
        limit: 50,
      },
      { enabled: activeTab === 'past' }
    );

  const { data: mentorClasses } = trpc.groupSessions.getMentorClasses.useQuery();

  // Create mutation
  const createSession = trpc.groupSessions.create.useMutation({
    onSuccess: () => {
      utils.groupSessions.getMyGroupSessions.invalidate();
      setShowCreateDialog(false);
      resetForm();
    },
  });

  // Pull to refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollTop = contentRef.current?.scrollTop ?? 0;
    if (scrollTop <= 0) {
      setTouchStart(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (touchStart === null) return;
      const currentTouch = e.touches[0].clientY;
      const distance = currentTouch - touchStart;
      if (distance > 0) {
        setPullDistance(Math.min(distance, 100));
      }
    },
    [touchStart]
  );

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= 60 && !isRefreshing) {
      setIsRefreshing(true);
      await utils.groupSessions.getMyGroupSessions.invalidate();
      setIsRefreshing(false);
    }
    setTouchStart(null);
    setPullDistance(0);
  }, [pullDistance, isRefreshing, utils]);

  useEffect(() => {
    if (touchStart === null) {
      setPullDistance(0);
    }
  }, [touchStart]);

  // Form handlers
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      agenda: '',
      classId: '',
      scheduledAt: '',
      scheduledTime: '10:00',
      durationMinutes: 60,
      maxParticipants: '',
      location: '',
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }

    if (!formData.scheduledAt) {
      errors.scheduledAt = 'Date is required';
    }

    if (!formData.scheduledTime) {
      errors.scheduledTime = 'Time is required';
    }

    if (formData.maxParticipants && parseInt(formData.maxParticipants) < 1) {
      errors.maxParticipants = 'Must be at least 1';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // Combine date and time
    const [hours, minutes] = formData.scheduledTime.split(':').map(Number);
    const scheduledDate = new Date(formData.scheduledAt);
    scheduledDate.setHours(hours, minutes, 0, 0);

    createSession.mutate({
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      agenda: formData.agenda.trim() || undefined,
      classId: formData.classId || undefined,
      scheduledAt: scheduledDate.toISOString(),
      durationMinutes: formData.durationMinutes,
      maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
      location: formData.location.trim() || undefined,
    });
  };

  const handleSessionClick = (sessionId: string) => {
    router.push(`/mentor/group-sessions/${sessionId}`);
  };

  // Get sessions based on active tab
  const sessions = activeTab === 'upcoming' ? upcomingSessions?.sessions : pastSessions?.sessions;
  const isLoading = activeTab === 'upcoming' ? upcomingLoading : pastLoading;

  return (
    <MobileLayout title="Group Sessions" showBack showNotifications>
      <div
        ref={contentRef}
        className="px-4 py-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="group-sessions-page"
      >
        {/* Pull to refresh indicator */}
        {(pullDistance > 0 || isRefreshing) && (
          <div
            className="flex items-center justify-center py-4 transition-all duration-200"
            style={{ height: isRefreshing ? 48 : pullDistance * 0.5 }}
            data-testid="pull-to-refresh-indicator"
          >
            <RefreshCw
              className={`h-6 w-6 text-rdy-orange-500 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{
                transform: isRefreshing ? 'rotate(0deg)' : `rotate(${pullDistance * 3.6}deg)`,
                opacity: isRefreshing ? 1 : Math.min(pullDistance / 60, 1),
              }}
            />
          </div>
        )}

        {/* Header with Create button */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-rdy-black">Group Sessions</h1>
            <p className="text-sm text-rdy-gray-400">Manage your group mentoring sessions</p>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 rounded-lg bg-rdy-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-rdy-orange-600"
            data-testid="create-session-button"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
        </div>

        {/* Tab navigation */}
        <div className="mb-4 flex rounded-xl bg-rdy-gray-100 p-1" data-testid="tab-navigation">
          <button
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              activeTab === 'upcoming' ? 'bg-rdy-orange-500 text-white' : 'text-rdy-gray-400 hover:text-rdy-black'
            }`}
            onClick={() => setActiveTab('upcoming')}
            data-testid="tab-upcoming"
          >
            Upcoming
          </button>
          <button
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              activeTab === 'past' ? 'bg-rdy-orange-500 text-white' : 'text-rdy-gray-400 hover:text-rdy-black'
            }`}
            onClick={() => setActiveTab('past')}
            data-testid="tab-past"
          >
            Past
          </button>
        </div>

        {/* Sessions list */}
        <div className="space-y-3" data-testid="sessions-list">
          {isLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-rdy-orange-500" />
            </div>
          ) : sessions && sessions.length > 0 ? (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSessionClick(session.id)}
                className="w-full rounded-xl bg-rdy-gray-100 p-4 text-left transition-colors hover:bg-rdy-gray-200"
                data-testid={`session-item-${session.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(session.status)}`} />
                      <h3 className="font-medium text-rdy-black">{session.title}</h3>
                    </div>
                    {session.className && (
                      <p className="mt-1 text-sm text-rdy-gray-400">{session.className}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-rdy-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(session.scheduledAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(session.scheduledAt)} ({session.durationMinutes}m)
                      </span>
                      {session.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-rdy-gray-400" />
                </div>

                {/* RSVP summary */}
                <div className="mt-3 flex items-center gap-4 text-xs" data-testid={`rsvp-summary-${session.id}`}>
                  <span className="flex items-center gap-1 text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {session.rsvpCounts.accepted} accepted
                  </span>
                  <span className="flex items-center gap-1 text-rdy-orange-500">
                    <AlertCircle className="h-3 w-3" />
                    {session.rsvpCounts.pending} pending
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="h-3 w-3" />
                    {session.rsvpCounts.declined} declined
                  </span>
                  {session.maxParticipants && (
                    <span className="flex items-center gap-1 text-rdy-gray-400">
                      <Users className="h-3 w-3" />
                      Max: {session.maxParticipants}
                    </span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-xl bg-rdy-gray-100 p-8 text-center" data-testid="empty-state">
              <Users className="mx-auto h-12 w-12 text-rdy-gray-400" />
              <p className="mt-4 text-rdy-gray-400">
                {activeTab === 'upcoming'
                  ? 'No upcoming group sessions'
                  : 'No past group sessions'}
              </p>
              {activeTab === 'upcoming' && (
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="mt-4 text-rdy-orange-500 hover:text-rdy-orange-500"
                >
                  Create your first group session
                </button>
              )}
            </div>
          )}
        </div>

        {/* Create Session Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Group Session</DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="space-y-4"
              data-testid="create-session-form"
            >
              {/* Title */}
              <div>
                <label className="mb-1 block text-sm font-medium text-rdy-gray-600">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 px-3 py-2 text-rdy-black placeholder-rdy-gray-500 focus:border-rdy-orange-500 focus:outline-none"
                  placeholder="Session title"
                  data-testid="input-title"
                />
                {formErrors.title && (
                  <p className="mt-1 text-xs text-red-400">{formErrors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-rdy-gray-600">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 px-3 py-2 text-rdy-black placeholder-rdy-gray-500 focus:border-rdy-orange-500 focus:outline-none"
                  placeholder="Brief description of the session"
                  rows={2}
                  data-testid="input-description"
                />
              </div>

              {/* Agenda */}
              <div>
                <label className="mb-1 block text-sm font-medium text-rdy-gray-600">Agenda</label>
                <textarea
                  value={formData.agenda}
                  onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                  className="w-full rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 px-3 py-2 text-rdy-black placeholder-rdy-gray-500 focus:border-rdy-orange-500 focus:outline-none"
                  placeholder="Session agenda or topics to cover"
                  rows={3}
                  data-testid="input-agenda"
                />
              </div>

              {/* Associate with Class */}
              <div>
                <label className="mb-1 block text-sm font-medium text-rdy-gray-600">
                  Associate with Class
                </label>
                <select
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  className="w-full rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 px-3 py-2 text-rdy-black focus:border-rdy-orange-500 focus:outline-none"
                  data-testid="input-class"
                >
                  <option value="">No class (invite manually)</option>
                  {mentorClasses?.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-rdy-gray-500">
                  If selected, all class members will be automatically invited
                </p>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-rdy-gray-600">
                    Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    className="w-full rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 px-3 py-2 text-rdy-black focus:border-rdy-orange-500 focus:outline-none"
                    min={new Date().toISOString().split('T')[0]}
                    data-testid="input-date"
                  />
                  {formErrors.scheduledAt && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.scheduledAt}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-rdy-gray-600">
                    Time <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="w-full rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 px-3 py-2 text-rdy-black focus:border-rdy-orange-500 focus:outline-none"
                    data-testid="input-time"
                  />
                  {formErrors.scheduledTime && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.scheduledTime}</p>
                  )}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="mb-1 block text-sm font-medium text-rdy-gray-600">
                  Duration (minutes)
                </label>
                <select
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })
                  }
                  className="w-full rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 px-3 py-2 text-rdy-black focus:border-rdy-orange-500 focus:outline-none"
                  data-testid="input-duration"
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>120 minutes</option>
                </select>
              </div>

              {/* Max Participants */}
              <div>
                <label className="mb-1 block text-sm font-medium text-rdy-gray-600">
                  Max Participants
                </label>
                <input
                  type="number"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                  className="w-full rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 px-3 py-2 text-rdy-black placeholder-rdy-gray-500 focus:border-rdy-orange-500 focus:outline-none"
                  placeholder="Leave empty for unlimited"
                  min={1}
                  data-testid="input-max-participants"
                />
                {formErrors.maxParticipants && (
                  <p className="mt-1 text-xs text-red-400">{formErrors.maxParticipants}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="mb-1 block text-sm font-medium text-rdy-gray-600">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 px-3 py-2 text-rdy-black placeholder-rdy-gray-500 focus:border-rdy-orange-500 focus:outline-none"
                  placeholder="Virtual link or physical location"
                  data-testid="input-location"
                />
              </div>

              <DialogFooter className="gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateDialog(false);
                    resetForm();
                  }}
                  className="rounded-lg border border-rdy-gray-200 px-4 py-2 text-rdy-gray-600 hover:bg-rdy-gray-200"
                  data-testid="cancel-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSession.isPending}
                  className="rounded-lg bg-rdy-orange-500 px-4 py-2 font-medium text-white hover:bg-rdy-orange-600 disabled:opacity-50"
                  data-testid="submit-button"
                >
                  {createSession.isPending ? 'Creating...' : 'Create Session'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}
