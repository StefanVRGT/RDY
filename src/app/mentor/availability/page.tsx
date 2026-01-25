'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { MobileLayout } from '@/components/mobile';
import { trpc } from '@/lib/trpc/client';
import {
  Plus,
  RefreshCw,
  Clock,
  Trash2,
  Calendar,
  Repeat,
  ChevronRight,
  Edit2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { format, addDays, startOfWeek } from 'date-fns';

// Day names for display
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Type for availability slot from API
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
function formatTime(date: Date | string): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

// Format date for display
function formatDate(date: Date | string): string {
  return format(new Date(date), 'EEE, MMM d');
}

// Swipeable slot item component
function SwipeableSlot({
  slot,
  onDelete,
  onEdit,
  isDeleting,
}: {
  slot: AvailabilitySlot;
  onDelete: (id: string) => void;
  onEdit: (slot: AvailabilitySlot) => void;
  isDeleting: boolean;
}) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipingLeft, setIsSwipingLeft] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const slotRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    // Only horizontal swipe
    if (Math.abs(diffX) > Math.abs(diffY) && diffX < 0) {
      setIsSwipingLeft(true);
      setSwipeOffset(Math.max(diffX, -100));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (swipeOffset < -60) {
      // Trigger delete
      onDelete(slot.id);
    } else if (Math.abs(swipeOffset) < 5) {
      // Tap detected - open edit dialog
      onEdit(slot);
    }
    setSwipeOffset(0);
    setIsSwipingLeft(false);
    touchStartX.current = null;
    touchStartY.current = null;
  }, [swipeOffset, slot, onDelete, onEdit]);

  return (
    <div className="relative overflow-hidden rounded-xl" data-testid={`slot-item-${slot.id}`}>
      {/* Delete background */}
      <div
        className="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-red-500"
        style={{ opacity: Math.min(Math.abs(swipeOffset) / 60, 1) }}
      >
        <Trash2 className="h-6 w-6 text-white" />
      </div>

      {/* Slot content */}
      <div
        ref={slotRef}
        className={`relative bg-gray-900 p-4 transition-transform ${isDeleting ? 'opacity-50' : ''}`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="swipeable-slot"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {slot.isRecurring ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-twilight-600/20">
                <Repeat className="h-5 w-5 text-twilight-400" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-600/20">
                <Calendar className="h-5 w-5 text-cyan-400" />
              </div>
            )}
            <div>
              {slot.isRecurring ? (
                <>
                  <p className="font-medium text-white">
                    {DAY_NAMES[slot.dayOfWeek ?? 0]}
                  </p>
                  <p className="text-sm text-gray-400">
                    {slot.recurringStartTime} - {slot.recurringEndTime}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-white">
                    {formatDate(slot.startTime)}
                  </p>
                  <p className="text-sm text-gray-400">
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {slot.isRecurring && (
              <span className="rounded-full bg-twilight-600/30 px-2 py-0.5 text-xs text-twilight-300">
                Recurring
              </span>
            )}
            <ChevronRight className="h-4 w-4 text-gray-500" />
          </div>
        </div>
        {isSwipingLeft && (
          <p className="mt-2 text-center text-xs text-gray-500">
            Swipe left to delete
          </p>
        )}
      </div>
    </div>
  );
}

export default function MentorAvailabilityPage() {
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showEditSlot, setShowEditSlot] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);

  // Pull to refresh state
  const [touchStartPull, setTouchStartPull] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // tRPC queries and mutations
  const utils = trpc.useUtils();
  const { data: availabilityData, isLoading } = trpc.mentor.getAvailabilitySlots.useQuery();

  const deleteSlot = trpc.mentor.deleteAvailabilitySlot.useMutation({
    onSuccess: () => {
      utils.mentor.getAvailabilitySlots.invalidate();
      setDeletingSlotId(null);
    },
    onError: () => {
      setDeletingSlotId(null);
    },
  });

  // Combine and sort all slots
  const allSlots = useMemo(() => {
    if (!availabilityData) return [];
    const combined = [...availabilityData.slots, ...availabilityData.recurringSlots];
    return combined.sort((a, b) => {
      // Sort recurring slots by day of week, others by start time
      if (a.isRecurring && b.isRecurring) {
        return (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0);
      }
      if (a.isRecurring) return 1;
      if (b.isRecurring) return -1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [availabilityData]);

  // Separate one-time and recurring slots
  const oneTimeSlots = allSlots.filter(s => !s.isRecurring);
  const recurringSlots = allSlots.filter(s => s.isRecurring);

  // Pull to refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollTop = contentRef.current?.scrollTop ?? 0;
    if (scrollTop <= 0) {
      setTouchStartPull(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartPull !== null) {
      const currentTouch = e.touches[0].clientY;
      const distance = currentTouch - touchStartPull;
      if (distance > 0) {
        setPullDistance(Math.min(distance, 100));
      }
    }
  }, [touchStartPull]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= 60 && !isRefreshing) {
      setIsRefreshing(true);
      await utils.mentor.getAvailabilitySlots.invalidate();
      setIsRefreshing(false);
    }
    setTouchStartPull(null);
    setPullDistance(0);
  }, [pullDistance, isRefreshing, utils]);

  const handleDeleteSlot = useCallback((slotId: string) => {
    setDeletingSlotId(slotId);
    deleteSlot.mutate({ slotId });
  }, [deleteSlot]);

  const handleEditSlot = useCallback((slot: AvailabilitySlot) => {
    setEditingSlot(slot);
    setShowEditSlot(true);
  }, []);

  return (
    <MobileLayout title="Availability" showNotifications>
      <div
        ref={contentRef}
        className="flex flex-col px-4 py-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="availability-page"
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

        {/* Quick Stats */}
        <div className="mb-4 grid grid-cols-2 gap-3" data-testid="availability-stats">
          <div className="rounded-xl bg-gray-900 p-3">
            <p className="text-2xl font-bold text-white">{oneTimeSlots.length}</p>
            <p className="text-xs text-gray-400">One-time slots</p>
          </div>
          <div className="rounded-xl bg-gray-900 p-3">
            <p className="text-2xl font-bold text-white">{recurringSlots.length}</p>
            <p className="text-xs text-gray-400">Recurring slots</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex gap-3">
          <Button
            onClick={() => setShowAddSlot(true)}
            className="flex-1 gap-2 bg-twilight-600 text-white hover:bg-twilight-500"
            data-testid="add-slot-button"
          >
            <Plus className="h-4 w-4" />
            Add Slot
          </Button>
          <Button
            onClick={() => setShowBulkAdd(true)}
            variant="outline"
            className="flex-1 gap-2 border-gray-700 text-white hover:bg-gray-800"
            data-testid="bulk-add-button"
          >
            <Repeat className="h-4 w-4" />
            Bulk Add
          </Button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-twilight-400" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && allSlots.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-state">
            <Clock className="mb-4 h-12 w-12 text-gray-600" />
            <p className="mb-2 text-lg font-medium text-white">No availability slots</p>
            <p className="mb-6 text-gray-400">Add your first availability slot to let mentees know when you&apos;re free.</p>
            <Button
              onClick={() => setShowAddSlot(true)}
              className="gap-2 bg-twilight-600 text-white hover:bg-twilight-500"
            >
              <Plus className="h-4 w-4" />
              Add First Slot
            </Button>
          </div>
        )}

        {/* Slots List */}
        {!isLoading && allSlots.length > 0 && (
          <div className="space-y-6">
            {/* One-time slots section */}
            {oneTimeSlots.length > 0 && (
              <div data-testid="one-time-slots-section">
                <h3 className="mb-3 text-sm font-medium text-gray-400">Upcoming Slots</h3>
                <div className="space-y-2">
                  {oneTimeSlots.map(slot => (
                    <SwipeableSlot
                      key={slot.id}
                      slot={slot}
                      onDelete={handleDeleteSlot}
                      onEdit={handleEditSlot}
                      isDeleting={deletingSlotId === slot.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recurring slots section */}
            {recurringSlots.length > 0 && (
              <div data-testid="recurring-slots-section">
                <h3 className="mb-3 text-sm font-medium text-gray-400">Recurring Weekly</h3>
                <div className="space-y-2">
                  {recurringSlots.map(slot => (
                    <SwipeableSlot
                      key={slot.id}
                      slot={slot}
                      onDelete={handleDeleteSlot}
                      onEdit={handleEditSlot}
                      isDeleting={deletingSlotId === slot.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Swipe hint */}
        {allSlots.length > 0 && (
          <p className="mt-6 text-center text-xs text-gray-500">
            Swipe left on a slot to delete it
          </p>
        )}
      </div>

      {/* Add Single Slot Dialog */}
      <Dialog open={showAddSlot} onOpenChange={setShowAddSlot}>
        <DialogContent className="max-h-[80vh] overflow-y-auto bg-gray-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Availability Slot</DialogTitle>
            <DialogDescription>
              Add a new time slot when you&apos;re available for sessions.
            </DialogDescription>
          </DialogHeader>
          <AddSlotForm
            onSuccess={() => {
              setShowAddSlot(false);
              utils.mentor.getAvailabilitySlots.invalidate();
            }}
            onCancel={() => setShowAddSlot(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={showBulkAdd} onOpenChange={setShowBulkAdd}>
        <DialogContent className="max-h-[80vh] overflow-y-auto bg-gray-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Add Recurring Slots</DialogTitle>
            <DialogDescription>
              Set up your weekly recurring availability.
            </DialogDescription>
          </DialogHeader>
          <BulkAddForm
            onSuccess={() => {
              setShowBulkAdd(false);
              utils.mentor.getAvailabilitySlots.invalidate();
            }}
            onCancel={() => setShowBulkAdd(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Slot Dialog */}
      <Dialog open={showEditSlot} onOpenChange={setShowEditSlot}>
        <DialogContent className="max-h-[80vh] overflow-y-auto bg-gray-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5" />
                Edit Availability Slot
              </div>
            </DialogTitle>
            <DialogDescription>
              Update the time slot details.
            </DialogDescription>
          </DialogHeader>
          {editingSlot && (
            <EditSlotForm
              slot={editingSlot}
              onSuccess={() => {
                setShowEditSlot(false);
                setEditingSlot(null);
                utils.mentor.getAvailabilitySlots.invalidate();
              }}
              onCancel={() => {
                setShowEditSlot(false);
                setEditingSlot(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}

// Add Single Slot Form Component
function AddSlotForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const tomorrow = addDays(new Date(), 1);
  const [date, setDate] = useState(format(tomorrow, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [error, setError] = useState<string | null>(null);

  const addSlot = trpc.mentor.addAvailabilitySlot.useMutation({
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

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startDateTime = new Date(date);
    startDateTime.setHours(startHour, startMin, 0, 0);

    const endDateTime = new Date(date);
    endDateTime.setHours(endHour, endMin, 0, 0);

    if (endDateTime <= startDateTime) {
      setError('End time must be after start time');
      return;
    }

    addSlot.mutate({
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      isRecurring: false,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4" data-testid="add-slot-form">
      {error && (
        <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-400">{error}</div>
      )}

      {/* Date Selection */}
      <div>
        <label htmlFor="slot-date" className="mb-1 block text-sm text-gray-400">
          Date
        </label>
        <input
          id="slot-date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          min={format(new Date(), 'yyyy-MM-dd')}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
          required
          data-testid="slot-date-input"
        />
      </div>

      {/* Time Selection */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="start-time" className="mb-1 block text-sm text-gray-400">
            Start Time
          </label>
          <input
            id="start-time"
            type="time"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
            required
            data-testid="start-time-input"
          />
        </div>
        <div>
          <label htmlFor="end-time" className="mb-1 block text-sm text-gray-400">
            End Time
          </label>
          <input
            id="end-time"
            type="time"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
            required
            data-testid="end-time-input"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={addSlot.isPending}
          className="flex-1 bg-twilight-600 text-white hover:bg-twilight-500"
          data-testid="submit-slot-button"
        >
          {addSlot.isPending ? 'Adding...' : 'Add Slot'}
        </Button>
      </div>
    </form>
  );
}

// Bulk Add Form Component
function BulkAddForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const nextMonday = startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 });
  const [validFrom, setValidFrom] = useState(format(nextMonday, 'yyyy-MM-dd'));
  const [validUntil, setValidUntil] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [slotTimes, setSlotTimes] = useState([{ startTime: '09:00', endTime: '12:00' }]);
  const [error, setError] = useState<string | null>(null);

  const bulkAdd = trpc.mentor.bulkAddRecurringSlots.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: err => {
      setError(err.message);
    },
  });

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const addTimeSlot = () => {
    setSlotTimes(prev => [...prev, { startTime: '14:00', endTime: '17:00' }]);
  };

  const removeTimeSlot = (index: number) => {
    setSlotTimes(prev => prev.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setSlotTimes(prev =>
      prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedDays.length === 0) {
      setError('Please select at least one day');
      return;
    }

    if (slotTimes.length === 0) {
      setError('Please add at least one time slot');
      return;
    }

    // Generate slots for each day and time combination
    const slots = selectedDays.flatMap(day =>
      slotTimes.map(time => ({
        dayOfWeek: day,
        startTime: time.startTime,
        endTime: time.endTime,
      }))
    );

    const validFromDate = new Date(validFrom);
    validFromDate.setHours(0, 0, 0, 0);

    bulkAdd.mutate({
      slots,
      validFrom: validFromDate.toISOString(),
      validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4" data-testid="bulk-add-form">
      {error && (
        <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-400">{error}</div>
      )}

      {/* Day Selection */}
      <div>
        <label className="mb-2 block text-sm text-gray-400">Days of the Week</label>
        <div className="flex flex-wrap gap-2" data-testid="day-selector">
          {DAY_SHORT.map((day, index) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(index)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                selectedDays.includes(index)
                  ? 'bg-twilight-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              data-testid={`day-${day.toLowerCase()}`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Time Slots */}
      <div>
        <label className="mb-2 block text-sm text-gray-400">Time Slots</label>
        <div className="space-y-2">
          {slotTimes.map((slot, index) => (
            <div key={index} className="flex items-center gap-2" data-testid={`time-slot-${index}`}>
              <input
                type="time"
                value={slot.startTime}
                onChange={e => updateTimeSlot(index, 'startTime', e.target.value)}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
                required
              />
              <span className="text-gray-500">to</span>
              <input
                type="time"
                value={slot.endTime}
                onChange={e => updateTimeSlot(index, 'endTime', e.target.value)}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
                required
              />
              {slotTimes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTimeSlot(index)}
                  className="p-2 text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={addTimeSlot}
          className="mt-2 w-full text-twilight-400 hover:text-twilight-300"
          data-testid="add-time-slot-button"
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Time Slot
        </Button>
      </div>

      {/* Valid From */}
      <div>
        <label htmlFor="valid-from" className="mb-1 block text-sm text-gray-400">
          Start From
        </label>
        <input
          id="valid-from"
          type="date"
          value={validFrom}
          onChange={e => setValidFrom(e.target.value)}
          min={format(new Date(), 'yyyy-MM-dd')}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
          required
          data-testid="valid-from-input"
        />
      </div>

      {/* Valid Until (optional) */}
      <div>
        <label htmlFor="valid-until" className="mb-1 block text-sm text-gray-400">
          End Date (optional)
        </label>
        <input
          id="valid-until"
          type="date"
          value={validUntil}
          onChange={e => setValidUntil(e.target.value)}
          min={validFrom}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
          data-testid="valid-until-input"
        />
        <p className="mt-1 text-xs text-gray-500">Leave empty for indefinite recurring availability</p>
      </div>

      {/* Summary */}
      <div className="rounded-lg bg-gray-800 p-3">
        <p className="text-sm text-gray-400">
          This will create <span className="font-medium text-white">{selectedDays.length * slotTimes.length}</span> recurring
          slots per week
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={bulkAdd.isPending}
          className="flex-1 bg-twilight-600 text-white hover:bg-twilight-500"
          data-testid="submit-bulk-button"
        >
          {bulkAdd.isPending ? 'Creating...' : 'Create Slots'}
        </Button>
      </div>
    </form>
  );
}

// Edit Slot Form Component
function EditSlotForm({
  slot,
  onSuccess,
  onCancel,
}: {
  slot: AvailabilitySlot;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isRecurring = slot.isRecurring;

  // For non-recurring slots
  const [date, setDate] = useState(format(new Date(slot.startTime), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(
    isRecurring && slot.recurringStartTime
      ? slot.recurringStartTime
      : format(new Date(slot.startTime), 'HH:mm')
  );
  const [endTime, setEndTime] = useState(
    isRecurring && slot.recurringEndTime
      ? slot.recurringEndTime
      : format(new Date(slot.endTime), 'HH:mm')
  );

  // For recurring slots
  const [dayOfWeek, setDayOfWeek] = useState(slot.dayOfWeek ?? 1);
  const [validFrom, setValidFrom] = useState(
    slot.validFrom ? format(new Date(slot.validFrom), 'yyyy-MM-dd') : ''
  );
  const [validUntil, setValidUntil] = useState(
    slot.validUntil ? format(new Date(slot.validUntil), 'yyyy-MM-dd') : ''
  );

  const [error, setError] = useState<string | null>(null);

  const updateSlot = trpc.mentor.updateAvailabilitySlot.useMutation({
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

    if (isRecurring) {
      // Update recurring slot
      updateSlot.mutate({
        slotId: slot.id,
        dayOfWeek,
        recurringStartTime: startTime,
        recurringEndTime: endTime,
        validFrom: validFrom ? new Date(validFrom).toISOString() : undefined,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
      });
    } else {
      // Update one-time slot
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const startDateTime = new Date(date);
      startDateTime.setHours(startHour, startMin, 0, 0);

      const endDateTime = new Date(date);
      endDateTime.setHours(endHour, endMin, 0, 0);

      if (endDateTime <= startDateTime) {
        setError('End time must be after start time');
        return;
      }

      updateSlot.mutate({
        slotId: slot.id,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4" data-testid="edit-slot-form">
      {error && (
        <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-400">{error}</div>
      )}

      {isRecurring ? (
        <>
          {/* Day of Week Selection for Recurring */}
          <div>
            <label htmlFor="edit-day-of-week" className="mb-1 block text-sm text-gray-400">
              Day of Week
            </label>
            <select
              id="edit-day-of-week"
              value={dayOfWeek}
              onChange={e => setDayOfWeek(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
              data-testid="edit-day-of-week-select"
            >
              {DAY_NAMES.map((name, index) => (
                <option key={index} value={index}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Time Selection for Recurring */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-recurring-start" className="mb-1 block text-sm text-gray-400">
                Start Time
              </label>
              <input
                id="edit-recurring-start"
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
                required
                data-testid="edit-recurring-start-input"
              />
            </div>
            <div>
              <label htmlFor="edit-recurring-end" className="mb-1 block text-sm text-gray-400">
                End Time
              </label>
              <input
                id="edit-recurring-end"
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
                required
                data-testid="edit-recurring-end-input"
              />
            </div>
          </div>

          {/* Valid From/Until for Recurring */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-valid-from" className="mb-1 block text-sm text-gray-400">
                Valid From
              </label>
              <input
                id="edit-valid-from"
                type="date"
                value={validFrom}
                onChange={e => setValidFrom(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
                data-testid="edit-valid-from-input"
              />
            </div>
            <div>
              <label htmlFor="edit-valid-until" className="mb-1 block text-sm text-gray-400">
                Valid Until
              </label>
              <input
                id="edit-valid-until"
                type="date"
                value={validUntil}
                onChange={e => setValidUntil(e.target.value)}
                min={validFrom}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
                data-testid="edit-valid-until-input"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Date Selection for One-time */}
          <div>
            <label htmlFor="edit-slot-date" className="mb-1 block text-sm text-gray-400">
              Date
            </label>
            <input
              id="edit-slot-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
              required
              data-testid="edit-slot-date-input"
            />
          </div>

          {/* Time Selection for One-time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-start-time" className="mb-1 block text-sm text-gray-400">
                Start Time
              </label>
              <input
                id="edit-start-time"
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
                required
                data-testid="edit-start-time-input"
              />
            </div>
            <div>
              <label htmlFor="edit-end-time" className="mb-1 block text-sm text-gray-400">
                End Time
              </label>
              <input
                id="edit-end-time"
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-twilight-500 focus:outline-none focus:ring-1 focus:ring-twilight-500"
                required
                data-testid="edit-end-time-input"
              />
            </div>
          </div>
        </>
      )}

      {/* Slot type indicator */}
      <div className="rounded-lg bg-gray-800 p-3">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          {isRecurring ? (
            <>
              <Repeat className="h-4 w-4 text-twilight-400" />
              <span>Recurring weekly slot</span>
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4 text-cyan-400" />
              <span>One-time slot</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={updateSlot.isPending}
          className="flex-1 bg-twilight-600 text-white hover:bg-twilight-500"
          data-testid="submit-edit-button"
        >
          {updateSlot.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
