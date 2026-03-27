'use client';

import { useState, useCallback, useMemo } from 'react';
import { MobileLayout } from '@/components/mobile';
import { trpc } from '@/lib/trpc/client';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  Calendar as CalendarIcon,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameDay, isToday } from 'date-fns';

// Type for available slot
type AvailableSlot = {
  id: string;
  mentorId: string;
  startTime: Date;
  endTime: Date;
  isRecurring: boolean;
  isBooked: boolean;
};

// Type for mentor
type Mentor = {
  id: string;
  name: string | null;
  email: string;
};

// Format time for display
function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

// Format time range
function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

// Calculate duration in minutes
function getDurationMinutes(start: Date, end: Date): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60));
}

export default function MenteeBookingPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedBookingToCancel, setSelectedBookingToCancel] = useState<string | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');

  // Get date range for the current month view
  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);

  // tRPC queries
  const utils = trpc.useUtils();

  // Get available slots for the month
  const { data: slotsData, isLoading: slotsLoading } = trpc.booking.getAvailableSlots.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  // Get monthly usage
  const { data: usageData } = trpc.booking.getMonthlyUsage.useQuery({
    year: currentMonth.getFullYear(),
    month: currentMonth.getMonth() + 1,
  });

  // Get user's bookings for the month
  const { data: bookingsData } = trpc.booking.getMyBookings.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    status: ['scheduled', 'booked', 'completed'],
  });

  // Book slot mutation
  const bookSlot = trpc.booking.bookSlot.useMutation({
    onSuccess: () => {
      utils.booking.getAvailableSlots.invalidate();
      utils.booking.getMyBookings.invalidate();
      utils.booking.getMonthlyUsage.invalidate();
      setShowBookingDialog(false);
      setSelectedSlot(null);
      setBookingNotes('');
    },
  });

  // Cancel booking mutation
  const cancelBooking = trpc.booking.cancelBooking.useMutation({
    onSuccess: () => {
      utils.booking.getAvailableSlots.invalidate();
      utils.booking.getMyBookings.invalidate();
      utils.booking.getMonthlyUsage.invalidate();
      setShowCancelDialog(false);
      setSelectedBookingToCancel(null);
    },
  });

  // Get slots for selected date
  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate || !slotsData?.slots) return [];
    return slotsData.slots.filter(slot =>
      isSameDay(new Date(slot.startTime), selectedDate)
    );
  }, [selectedDate, slotsData?.slots]);

  // Get bookings for selected date
  const bookingsForSelectedDate = useMemo(() => {
    if (!selectedDate || !bookingsData) return [];
    return bookingsData.filter(booking =>
      isSameDay(new Date(booking.scheduledAt), selectedDate)
    );
  }, [selectedDate, bookingsData]);

  // Get dates that have available slots (use format() for local-timezone-safe date strings)
  const datesWithSlots = useMemo(() => {
    if (!slotsData?.slots) return new Set<string>();
    return new Set(
      slotsData.slots.map(slot => format(new Date(slot.startTime), 'yyyy-MM-dd'))
    );
  }, [slotsData?.slots]);

  // Get dates that have bookings
  const datesWithBookings = useMemo(() => {
    if (!bookingsData) return new Set<string>();
    return new Set(
      bookingsData.map(booking => format(new Date(booking.scheduledAt), 'yyyy-MM-dd'))
    );
  }, [bookingsData]);

  // Navigation handlers
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
    setSelectedDate(null);
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
    setSelectedDate(null);
  }, []);

  const goToCurrentMonth = useCallback(() => {
    setCurrentMonth(new Date());
    setSelectedDate(null);
  }, []);

  // Handle date selection
  const handleDateSelect = useCallback((date: Date | undefined) => {
    setSelectedDate(date || null);
  }, []);

  // Handle slot selection
  const handleSlotSelect = useCallback((slot: AvailableSlot) => {
    if (usageData?.limitReached) {
      return; // Don't allow selection if limit reached
    }
    setSelectedSlot(slot);
    setShowBookingDialog(true);
  }, [usageData?.limitReached]);

  // Handle booking confirmation
  const handleConfirmBooking = useCallback(() => {
    if (!selectedSlot) return;

    const mentor = slotsData?.mentors.find(m => m.id === selectedSlot.mentorId);
    if (!mentor) return;

    bookSlot.mutate({
      mentorId: selectedSlot.mentorId,
      scheduledAt: new Date(selectedSlot.startTime).toISOString(),
      durationMinutes: getDurationMinutes(selectedSlot.startTime, selectedSlot.endTime),
      notes: bookingNotes || undefined,
    });
  }, [selectedSlot, slotsData?.mentors, bookSlot, bookingNotes]);

  // Handle cancel request
  const handleCancelRequest = useCallback((sessionId: string) => {
    setSelectedBookingToCancel(sessionId);
    setShowCancelDialog(true);
  }, []);

  // Handle cancel confirmation
  const handleConfirmCancel = useCallback(() => {
    if (!selectedBookingToCancel) return;
    cancelBooking.mutate({
      sessionId: selectedBookingToCancel,
    });
  }, [selectedBookingToCancel, cancelBooking]);

  // Find mentor by ID
  const getMentor = useCallback((mentorId: string): Mentor | undefined => {
    return slotsData?.mentors.find(m => m.id === mentorId);
  }, [slotsData?.mentors]);

  const isCurrentMonth = currentMonth.getMonth() === new Date().getMonth() &&
    currentMonth.getFullYear() === new Date().getFullYear();

  return (
    <MobileLayout title="Book Session" showBack showNotifications>
      <div className="flex flex-col px-4 py-4" data-testid="mentee-booking-page">
        {/* Monthly Usage Card */}
        <div
          className={`mb-4 rounded-xl p-4 ${
            usageData?.limitReached
              ? 'bg-gradient-to-br from-red-600 to-red-800'
              : 'bg-gradient-to-br from-rdy-orange-500 to-rdy-orange-600'
          }`}
          data-testid="monthly-usage-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Monthly Sessions</p>
              <p className="text-2xl font-bold text-white">
                {usageData?.bookedCount ?? 0} / {usageData?.monthlyLimit ?? 2}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/80">
                {format(currentMonth, 'MMMM yyyy')}
              </p>
              {usageData?.limitReached ? (
                <p className="mt-1 text-xs font-medium text-red-200">Limit Reached</p>
              ) : (
                <p className="mt-1 text-xs text-white/60">
                  {usageData?.remainingSessions ?? 0} remaining
                </p>
              )}
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  usageData?.limitReached ? 'bg-red-300' : 'bg-white'
                }`}
                style={{
                  width: `${Math.min(100, ((usageData?.bookedCount ?? 0) / (usageData?.monthlyLimit ?? 2)) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="mb-4 flex items-center justify-between" data-testid="month-navigation">
          <button
            onClick={goToPreviousMonth}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-rdy-gray-100 text-rdy-black transition-colors hover:bg-rdy-gray-200"
            aria-label="Previous month"
            data-testid="prev-month-button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-rdy-black" data-testid="current-month">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            {!isCurrentMonth && (
              <button
                onClick={goToCurrentMonth}
                className="mt-1 text-sm text-rdy-orange-500 hover:text-rdy-orange-500"
                data-testid="today-button"
              >
                Back to Current Month
              </button>
            )}
          </div>

          <button
            onClick={goToNextMonth}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-rdy-gray-100 text-rdy-black transition-colors hover:bg-rdy-gray-200"
            aria-label="Next month"
            data-testid="next-month-button"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Calendar */}
        <div className="mb-4 rounded-xl bg-rdy-gray-100 p-4" data-testid="booking-calendar">
          {slotsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-rdy-orange-500" />
            </div>
          ) : (
            <Calendar
              mode="single"
              selected={selectedDate || undefined}
              onSelect={handleDateSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="w-full"
              classNames={{
                day: 'relative',
                today: 'rounded-md bg-rdy-black/[0.07] font-semibold',
              }}
              modifiers={{
                hasSlots: (date) => datesWithSlots.has(format(date, 'yyyy-MM-dd')),
                hasBooking: (date) => datesWithBookings.has(format(date, 'yyyy-MM-dd')),
              }}
              modifiersClassNames={{
                hasSlots: 'ring-2 ring-rdy-orange-500 ring-inset',
                hasBooking: 'bg-green-600/20',
              }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          )}
        </div>

        {/* Legend */}
        <div className="mb-4 flex items-center justify-center gap-4 text-xs text-rdy-gray-400">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-rdy-black/[0.07] font-semibold" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm ring-2 ring-rdy-orange-500 ring-inset" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-green-600/20" />
            <span>Booked</span>
          </div>
        </div>

        {/* Selected Date Section */}
        {selectedDate && (
          <div className="space-y-4" data-testid="selected-date-section">
            <h3 className="text-lg font-semibold text-rdy-black">
              {isToday(selectedDate)
                ? 'Today'
                : format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h3>

            {/* Existing bookings for this date */}
            {bookingsForSelectedDate.length > 0 && (
              <div className="space-y-2" data-testid="existing-bookings">
                <h4 className="text-sm font-medium text-rdy-gray-400">Your Bookings</h4>
                {bookingsForSelectedDate.map(booking => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-xl bg-rdy-orange-500/10 p-4"
                    data-testid={`booking-${booking.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium text-rdy-black">
                          {formatTime(booking.scheduledAt)}
                        </p>
                        <p className="text-sm text-rdy-gray-400">
                          {booking.durationMinutes} min with {booking.mentor?.name || 'Mentor'}
                        </p>
                        <p className="text-xs text-rdy-gray-500 capitalize">
                          {booking.status}
                        </p>
                      </div>
                    </div>
                    {booking.status === 'booked' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelRequest(booking.id)}
                        className="text-red-400 hover:bg-red-500/20 hover:text-red-300"
                        data-testid={`cancel-booking-${booking.id}`}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Available slots for this date */}
            {slotsForSelectedDate.length > 0 ? (
              <div className="space-y-2" data-testid="available-slots">
                <h4 className="text-sm font-medium text-rdy-gray-400">Available Slots</h4>
                {slotsForSelectedDate.map(slot => {
                  const mentor = getMentor(slot.mentorId);
                  return (
                    <button
                      key={slot.id}
                      onClick={() => handleSlotSelect(slot)}
                      disabled={usageData?.limitReached}
                      className={`flex w-full items-center gap-4 rounded-xl p-4 text-left transition-colors ${
                        usageData?.limitReached
                          ? 'cursor-not-allowed bg-rdy-gray-100 opacity-50'
                          : 'bg-rdy-gray-100 hover:bg-rdy-gray-200'
                      }`}
                      data-testid={`slot-${slot.id}`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rdy-orange-500/10">
                        <Clock className="h-5 w-5 text-rdy-orange-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-rdy-black">
                          {formatTimeRange(slot.startTime, slot.endTime)}
                        </p>
                        <p className="text-sm text-rdy-gray-400">
                          {getDurationMinutes(slot.startTime, slot.endTime)} min with{' '}
                          {mentor?.name || 'Mentor'}
                        </p>
                      </div>
                      <CalendarIcon className="h-5 w-5 text-rdy-gray-500" />
                    </button>
                  );
                })}
              </div>
            ) : (
              bookingsForSelectedDate.length === 0 && (
                <div className="rounded-xl bg-rdy-gray-100 p-6 text-center">
                  <AlertCircle className="mx-auto mb-2 h-8 w-8 text-rdy-gray-500" />
                  <p className="text-rdy-gray-400">No available slots for this date</p>
                </div>
              )
            )}

            {/* Limit reached warning */}
            {usageData?.limitReached && slotsForSelectedDate.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-500">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>
                  You have reached your monthly session limit. You can book more
                  sessions next month.
                </span>
              </div>
            )}
          </div>
        )}

        {/* No date selected message */}
        {!selectedDate && (
          <div className="rounded-xl bg-rdy-gray-100 p-6 text-center" data-testid="no-date-selected">
            <CalendarIcon className="mx-auto mb-2 h-8 w-8 text-rdy-gray-500" />
            <p className="text-rdy-gray-400">Select a date to view available slots</p>
          </div>
        )}
      </div>

      {/* Booking Confirmation Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-md mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Confirm Booking</DialogTitle>
            <DialogDescription className="text-rdy-gray-400">
              Review and confirm your session booking
            </DialogDescription>
          </DialogHeader>

          {selectedSlot && (
            <div className="space-y-4" data-testid="booking-confirmation">
              <div className="rounded-lg bg-rdy-gray-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rdy-orange-500/10">
                    <User className="h-6 w-6 text-rdy-orange-500" />
                  </div>
                  <div>
                    <p className="font-medium text-rdy-black">
                      {getMentor(selectedSlot.mentorId)?.name || 'Mentor'}
                    </p>
                    <p className="text-sm text-rdy-gray-400">
                      {format(new Date(selectedSlot.startTime), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-rdy-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{formatTimeRange(selectedSlot.startTime, selectedSlot.endTime)}</span>
                  <span className="text-rdy-gray-500">
                    ({getDurationMinutes(selectedSlot.startTime, selectedSlot.endTime)} min)
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="booking-notes" className="mb-1 block text-sm text-rdy-gray-400">
                  Notes (optional)
                </label>
                <textarea
                  id="booking-notes"
                  value={bookingNotes}
                  onChange={e => setBookingNotes(e.target.value)}
                  placeholder="Add any notes for your mentor..."
                  className="w-full rounded-lg bg-rdy-gray-100 p-3 text-rdy-black placeholder-rdy-gray-400 focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
                  rows={3}
                  data-testid="booking-notes-input"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowBookingDialog(false)}
              className="text-rdy-gray-400 hover:bg-rdy-gray-100 hover:text-rdy-black"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBooking}
              disabled={bookSlot.isPending}
              className="bg-rdy-orange-500 text-white hover:bg-rdy-orange-500"
              data-testid="confirm-booking-button"
            >
              {bookSlot.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Confirm Booking'
              )}
            </Button>
          </DialogFooter>

          {bookSlot.error && (
            <div className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-500">
              {bookSlot.error.message}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <XCircle className="h-5 w-5" />
              Cancel Booking
            </DialogTitle>
            <DialogDescription className="text-rdy-gray-400">
              Are you sure you want to cancel this session? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowCancelDialog(false)}
              className="text-rdy-gray-400 hover:bg-rdy-gray-100 hover:text-rdy-black"
            >
              Keep Booking
            </Button>
            <Button
              onClick={handleConfirmCancel}
              disabled={cancelBooking.isPending}
              className="bg-red-600 text-white hover:bg-red-500"
              data-testid="confirm-cancel-button"
            >
              {cancelBooking.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Cancel Session'
              )}
            </Button>
          </DialogFooter>

          {cancelBooking.error && (
            <div className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-500">
              {cancelBooking.error.message}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
