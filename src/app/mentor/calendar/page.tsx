'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { MobileLayout } from '@/components/mobile';
import { trpc } from '@/lib/trpc/client';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Clock,
  User,
  BookOpen,
  Check,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';

// Type for enriched session from the API
type Session = {
  id: string;
  scheduledAt: Date;
  completed: boolean;
  classId: string;
  userId: string;
  notes: string | null;
  className: string;
  mentee: { id: string; name: string | null; email: string } | null;
};

// Type for availability slot from the API
type AvailabilitySlot = {
  id: string;
  mentorId: string;
  tenantId: string;
  startTime: Date;
  endTime: Date;
  isRecurring: boolean;
  dayOfWeek: number | null;
  recurringStartTime: string | null;
  recurringEndTime: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// Format time for display
function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

// Group sessions by date key
function groupSessionsByDate(sessions: Session[]): Map<string, Session[]> {
  const grouped = new Map<string, Session[]>();
  sessions.forEach(session => {
    const dateKey = format(new Date(session.scheduledAt), 'yyyy-MM-dd');
    const existing = grouped.get(dateKey) || [];
    grouped.set(dateKey, [...existing, session]);
  });
  return grouped;
}

// Get availability slots for a specific date (including recurring slots)
function getAvailabilitySlotsForDate(
  slots: AvailabilitySlot[],
  recurringSlots: AvailabilitySlot[],
  date: Date
): AvailabilitySlot[] {
  const dateKey = format(date, 'yyyy-MM-dd');
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Get one-time slots for this date
  const oneTimeSlots = slots.filter(slot => {
    const slotDateKey = format(new Date(slot.startTime), 'yyyy-MM-dd');
    return slotDateKey === dateKey;
  });

  // Get recurring slots that apply to this day
  const applicableRecurring = recurringSlots.filter(slot => {
    if (slot.dayOfWeek !== dayOfWeek) return false;

    // Check if date is within valid range
    if (slot.validFrom && date < new Date(slot.validFrom)) return false;
    if (slot.validUntil && date > new Date(slot.validUntil)) return false;

    return true;
  });

  return [...oneTimeSlots, ...applicableRecurring];
}

export default function MentorCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showSessionList, setShowSessionList] = useState(false);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Swipe handling refs and state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Pull to refresh state
  const [touchStartPull, setTouchStartPull] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Calculate the date range for the current month view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // tRPC query for sessions
  const utils = trpc.useUtils();
  const { data: sessions = [], isLoading } = trpc.mentor.getSessionsForDateRange.useQuery({
    startDate: calendarStart.toISOString(),
    endDate: calendarEnd.toISOString(),
  });

  // Get classes for creating sessions
  const { data: myClasses = [] } = trpc.mentor.getMyClasses.useQuery();

  // Get availability slots
  const { data: availabilityData } = trpc.mentor.getAvailabilitySlots.useQuery({
    startDate: calendarStart.toISOString(),
    endDate: calendarEnd.toISOString(),
    includeRecurring: true,
  });

  // Group sessions by date for calendar display
  const sessionsByDate = useMemo(() => groupSessionsByDate(sessions), [sessions]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  // Get sessions for selected date
  const selectedDateSessions = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return sessionsByDate.get(dateKey) || [];
  }, [selectedDate, sessionsByDate]);

  // Get availability slots for selected date
  const selectedDateAvailability = useMemo(() => {
    if (!selectedDate || !availabilityData) return [];
    return getAvailabilitySlotsForDate(
      availabilityData.slots,
      availabilityData.recurringSlots,
      selectedDate
    );
  }, [selectedDate, availabilityData]);

  // Navigation handlers
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
    setShowSessionList(true);
  }, []);

  // Day tap handler
  const handleDayTap = useCallback((day: Date) => {
    setSelectedDate(day);
    setShowSessionList(true);
  }, []);

  // Swipe handlers for month navigation
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

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
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
  }, [touchStartPull]);

  const handleTouchEnd = useCallback(async () => {
    // Pull to refresh
    if (pullDistance >= 60 && !isRefreshing) {
      setIsRefreshing(true);
      await utils.mentor.getSessionsForDateRange.invalidate();
      setIsRefreshing(false);
    }
    setTouchStartPull(null);
    setPullDistance(0);

    // Swipe navigation
    const threshold = 50; // Minimum swipe distance to trigger navigation
    if (Math.abs(swipeOffset) > threshold) {
      if (swipeOffset > 0) {
        goToPreviousMonth();
      } else {
        goToNextMonth();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    setSwipeOffset(0);
  }, [pullDistance, isRefreshing, swipeOffset, goToPreviousMonth, goToNextMonth, utils]);

  // Weekday headers
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <MobileLayout title="Calendar" showNotifications>
      <div
        ref={contentRef}
        className="flex flex-col px-4 py-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="mentor-calendar"
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

        {/* Calendar Header with Month Navigation */}
        <div className="mb-4 flex items-center justify-between" data-testid="calendar-header">
          <button
            onClick={goToPreviousMonth}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-white transition-colors hover:bg-gray-700"
            aria-label="Previous month"
            data-testid="prev-month-button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-white" data-testid="current-month">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <button
              onClick={goToToday}
              className="mt-1 text-sm text-twilight-400 hover:text-twilight-300"
              data-testid="today-button"
            >
              Today
            </button>
          </div>

          <button
            onClick={goToNextMonth}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-white transition-colors hover:bg-gray-700"
            aria-label="Next month"
            data-testid="next-month-button"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="mb-2 grid grid-cols-7 gap-1" data-testid="weekday-headers">
          {weekDays.map(day => (
            <div key={day} className="py-2 text-center text-xs font-medium text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div
          className="mb-4 grid grid-cols-7 gap-1 transition-transform duration-200"
          style={{ transform: `translateX(${swipeOffset * 0.3}px)` }}
          data-testid="calendar-grid"
        >
          {calendarDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const daySessions = sessionsByDate.get(dateKey) || [];
            const hasCompletedSessions = daySessions.some(s => s.completed);
            const hasIncompleteSessions = daySessions.some(s => !s.completed);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            // Get availability slots for this day
            const dayAvailability = availabilityData
              ? getAvailabilitySlotsForDate(
                  availabilityData.slots,
                  availabilityData.recurringSlots,
                  day
                )
              : [];
            const hasAvailability = dayAvailability.length > 0;

            return (
              <button
                key={dateKey}
                onClick={() => handleDayTap(day)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-lg p-1 transition-colors ${
                  !isCurrentMonth
                    ? 'text-gray-600'
                    : isSelected
                      ? 'bg-twilight-600 text-white'
                      : isTodayDate
                        ? 'bg-twilight-500/20 text-twilight-400'
                        : hasAvailability
                          ? 'bg-cyan-900/30 text-white hover:bg-cyan-900/50'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
                data-testid={`calendar-day-${dateKey}`}
                data-has-sessions={daySessions.length > 0}
                data-has-availability={hasAvailability}
                data-is-today={isTodayDate}
                data-is-selected={isSelected}
                aria-label={`${format(day, 'MMMM d, yyyy')}${daySessions.length > 0 ? `, ${daySessions.length} sessions` : ''}${hasAvailability ? `, ${dayAvailability.length} availability slots` : ''}`}
              >
                <span className={`text-sm font-medium ${!isCurrentMonth ? 'opacity-40' : ''}`}>
                  {format(day, 'd')}
                </span>

                {/* Indicators (dots) */}
                {(daySessions.length > 0 || hasAvailability) && isCurrentMonth && (
                  <div className="mt-0.5 flex gap-0.5" data-testid={`session-dots-${dateKey}`}>
                    {hasAvailability && (
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    )}
                    {hasIncompleteSessions && (
                      <span className="h-1.5 w-1.5 rounded-full bg-twilight-400" />
                    )}
                    {hasCompletedSessions && (
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-twilight-400" />
          </div>
        )}

        {/* Quick Stats */}
        <div className="mb-4 grid grid-cols-3 gap-3" data-testid="calendar-stats">
          <div className="rounded-xl bg-gray-900 p-3">
            <p className="text-2xl font-bold text-white">{sessions.length}</p>
            <p className="text-xs text-gray-400">Sessions</p>
          </div>
          <div className="rounded-xl bg-gray-900 p-3">
            <p className="text-2xl font-bold text-white">
              {sessions.filter(s => s.completed).length}
            </p>
            <p className="text-xs text-gray-400">Completed</p>
          </div>
          <div className="rounded-xl bg-gray-900 p-3">
            <p className="text-2xl font-bold text-cyan-400">
              {(availabilityData?.slots.length ?? 0) + (availabilityData?.recurringSlots.length ?? 0)}
            </p>
            <p className="text-xs text-gray-400">Availability</p>
          </div>
        </div>

        {/* Create Session Button */}
        <Button
          onClick={() => setShowCreateSession(true)}
          className="mb-4 w-full gap-2 bg-twilight-600 text-white hover:bg-twilight-500"
          data-testid="create-session-button"
        >
          <Plus className="h-4 w-4" />
          Create Session
        </Button>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-twilight-400" />
            <span>Scheduled</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span>Completed</span>
          </div>
        </div>
      </div>

      {/* Session List Dialog */}
      <Dialog open={showSessionList} onOpenChange={setShowSessionList}>
        <DialogContent className="max-h-[80vh] overflow-y-auto bg-gray-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="session-list-title">
              {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Sessions'}
            </DialogTitle>
            <DialogDescription>
              {selectedDateSessions.length} session{selectedDateSessions.length !== 1 ? 's' : ''}, {selectedDateAvailability.length} availability slot{selectedDateAvailability.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4" data-testid="session-list">
            {/* Availability Slots Section */}
            {selectedDateAvailability.length > 0 && (
              <div data-testid="availability-slots-section">
                <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-cyan-400">
                  <CalendarIcon className="h-4 w-4" />
                  Availability Slots
                </h4>
                <div className="space-y-2">
                  {selectedDateAvailability.map(slot => (
                    <div
                      key={slot.id}
                      className="rounded-xl border-l-4 border-cyan-500 bg-gray-800 p-3"
                      data-testid={`availability-slot-${slot.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-white">
                          <Clock className="h-4 w-4 text-cyan-400" />
                          {slot.isRecurring && slot.recurringStartTime && slot.recurringEndTime ? (
                            <span>{slot.recurringStartTime} - {slot.recurringEndTime}</span>
                          ) : (
                            <span>
                              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                            </span>
                          )}
                        </div>
                        {slot.isRecurring && (
                          <span className="rounded-full bg-cyan-600/30 px-2 py-0.5 text-xs text-cyan-300">
                            Recurring
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sessions Section */}
            {selectedDateSessions.length > 0 ? (
              <div data-testid="sessions-section">
                <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-twilight-400">
                  <User className="h-4 w-4" />
                  Scheduled Sessions
                </h4>
                <div className="space-y-2">
                  {selectedDateSessions.map(session => (
                    <div
                      key={session.id}
                      className={`rounded-xl border-l-4 bg-gray-800 p-4 ${
                        session.completed ? 'border-green-500' : 'border-twilight-500'
                      }`}
                      data-testid={`session-item-${session.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <p className="font-medium text-white">
                              {session.mentee?.name || 'Unknown Mentee'}
                            </p>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
                            <BookOpen className="h-3 w-3" />
                            <span>{session.className}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-sm text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(session.scheduledAt)}</span>
                          </div>
                          {session.notes && (
                            <p className="mt-2 text-sm italic text-gray-400">{session.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          {session.completed ? (
                            <span className="flex items-center gap-1 text-xs text-green-400">
                              <Check className="h-3 w-3" />
                              Done
                            </span>
                          ) : (
                            <span className="text-xs text-twilight-400">Scheduled</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedDateAvailability.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <p>No sessions or availability for this day</p>
                <Button
                  onClick={() => {
                    setShowSessionList(false);
                    setShowCreateSession(true);
                  }}
                  variant="ghost"
                  className="mt-2 text-twilight-400 hover:text-twilight-300"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Session
                </Button>
              </div>
            ) : null}
          </div>

          <Button
            onClick={() => {
              setShowSessionList(false);
              setShowCreateSession(true);
            }}
            className="mt-4 w-full gap-2 bg-twilight-600 text-white hover:bg-twilight-500"
          >
            <Plus className="h-4 w-4" />
            Add Session
          </Button>
        </DialogContent>
      </Dialog>

      {/* Create Session Dialog */}
      <Dialog open={showCreateSession} onOpenChange={setShowCreateSession}>
        <DialogContent className="bg-gray-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Session</DialogTitle>
            <DialogDescription>
              Schedule a new session{selectedDate ? ` for ${format(selectedDate, 'MMMM d, yyyy')}` : ''}
            </DialogDescription>
          </DialogHeader>

          <CreateSessionForm
            selectedDate={selectedDate}
            classes={myClasses}
            onSuccess={() => {
              setShowCreateSession(false);
              utils.mentor.getSessionsForDateRange.invalidate();
            }}
            onCancel={() => setShowCreateSession(false)}
          />
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}

// Create Session Form Component
function CreateSessionForm({
  selectedDate,
  classes,
  onSuccess,
  onCancel,
}: {
  selectedDate: Date | null;
  classes: Array<{ id: string; name: string; memberCount: number }>;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [sessionTime, setSessionTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Get class details with members when a class is selected
  const { data: classDetail, isLoading: isLoadingMembers } = trpc.mentor.getClassDetail.useQuery(
    { classId: selectedClassId },
    { enabled: !!selectedClassId }
  );

  const createSession = trpc.mentor.createSession.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: err => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedClassId || !selectedUserId) {
      setError('Please select a class and mentee');
      return;
    }

    const sessionDate = selectedDate || new Date();
    const [hours, minutes] = sessionTime.split(':').map(Number);
    const scheduledAt = new Date(sessionDate);
    scheduledAt.setHours(hours, minutes, 0, 0);

    createSession.mutate({
      classId: selectedClassId,
      userId: selectedUserId,
      scheduledAt: scheduledAt.toISOString(),
      notes: notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4" data-testid="create-session-form">
      {error && (
        <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-400">{error}</div>
      )}

      {/* Class Selection */}
      <div>
        <label htmlFor="class-select" className="mb-1 block text-sm text-gray-400">
          Class
        </label>
        <select
          id="class-select"
          value={selectedClassId}
          onChange={e => {
            setSelectedClassId(e.target.value);
            setSelectedUserId('');
          }}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
          required
          data-testid="class-select"
        >
          <option value="">Select a class</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>
              {cls.name} ({cls.memberCount} mentee{cls.memberCount !== 1 ? 's' : ''})
            </option>
          ))}
        </select>
      </div>

      {/* Mentee Selection */}
      <div>
        <label htmlFor="mentee-select" className="mb-1 block text-sm text-gray-400">
          Mentee
        </label>
        <select
          id="mentee-select"
          value={selectedUserId}
          onChange={e => setSelectedUserId(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500 disabled:opacity-50"
          disabled={!selectedClassId || isLoadingMembers}
          required
          data-testid="mentee-select"
        >
          <option value="">
            {isLoadingMembers ? 'Loading...' : 'Select a mentee'}
          </option>
          {classDetail?.members.map(member => (
            <option key={member.userId} value={member.userId}>
              {member.user.name || member.user.email}
            </option>
          ))}
        </select>
      </div>

      {/* Time Selection */}
      <div>
        <label htmlFor="session-time" className="mb-1 block text-sm text-gray-400">
          Time
        </label>
        <input
          id="session-time"
          type="time"
          value={sessionTime}
          onChange={e => setSessionTime(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
          required
          data-testid="session-time-input"
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="session-notes" className="mb-1 block text-sm text-gray-400">
          Notes (optional)
        </label>
        <textarea
          id="session-notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
          placeholder="Add any notes for this session..."
          data-testid="session-notes-input"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createSession.isPending}
          className="flex-1 bg-twilight-600 text-white hover:bg-twilight-500"
          data-testid="submit-session-button"
        >
          {createSession.isPending ? 'Creating...' : 'Create Session'}
        </Button>
      </div>
    </form>
  );
}
