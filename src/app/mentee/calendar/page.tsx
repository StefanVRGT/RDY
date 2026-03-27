'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { MobileLayout } from '@/components/mobile';
import { RdyFooter } from '@/components/rdy-footer';
import { Leaf, Clock, CalendarCheck, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type ScheduledExercise = {
  id: string;
  scheduledAt: Date;
  completed: boolean;
  completedAt: Date | null;
  notes: string | null;
  exerciseId: string;
  classId: string;
  exercise: {
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
  } | null;
  isObligatory: boolean;
};

const TIME_SLOTS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00',
];

export default function MenteeDailyCalendarPage() {
  const router = useRouter();
  const today = new Date();
  const utils = trpc.useUtils();

  const [rescheduleTarget, setRescheduleTarget] = useState<ScheduledExercise | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const { data: exercisesData, isLoading } = trpc.mentee.getExercisesForDate.useQuery({
    date: format(today, 'yyyy-MM-dd') + 'T00:00:00.000Z',
  });

  // Booking reminder
  const { data: bookingReminder } = trpc.mentee.getBookingReminder.useQuery();

  // Check-in status
  const { data: checkInStatus } = trpc.mentee.getCheckInStatus.useQuery();

  const updateTimeMutation = trpc.mentee.updateExerciseTime.useMutation({
    onSuccess: () => {
      utils.mentee.getExercisesForDate.invalidate();
      setRescheduleTarget(null);
      setIsRescheduling(false);
    },
    onError: () => {
      setIsRescheduling(false);
    },
  });

  const scheduledExercises = exercisesData?.scheduledExercises || [];
  const isRestDay = exercisesData?.isRestDay ?? false;

  const handleExerciseTap = useCallback(
    (exercise: ScheduledExercise) => router.push(`/mentee/exercise/${exercise.id}`),
    [router]
  );

  const handleClockTap = useCallback(
    (e: React.MouseEvent, exercise: ScheduledExercise) => {
      e.stopPropagation();
      setRescheduleTarget(exercise);
    },
    []
  );

  const handleTimeSelect = useCallback(
    (timeSlot: string) => {
      if (!rescheduleTarget || isRescheduling) return;
      setIsRescheduling(true);

      // Build new scheduledAt: same date, new time
      const dateStr = format(new Date(rescheduleTarget.scheduledAt), 'yyyy-MM-dd');
      const newScheduledAt = `${dateStr}T${timeSlot}:00.000Z`;

      updateTimeMutation.mutate({
        scheduledExerciseId: rescheduleTarget.id,
        scheduledAt: newScheduledAt,
      });
    },
    [rescheduleTarget, isRescheduling, updateTimeMutation]
  );

  const currentTimeStr = rescheduleTarget
    ? format(new Date(rescheduleTarget.scheduledAt), 'HH:mm')
    : '';

  return (
    <MobileLayout title="TODAY" showMenu>
      <div className="px-6 py-6">
        {/* Booking Reminder Banner */}
        {bookingReminder?.needsBooking && (
          <Link
            href="/mentee/booking"
            className="mb-4 flex items-center gap-3 rounded-xl bg-orange-50 border border-rdy-orange-500/30 px-4 py-3 active:opacity-80 transition-opacity"
          >
            <CalendarCheck className="h-5 w-5 text-rdy-orange-500 flex-shrink-0" />
            <p className="text-sm text-rdy-black">
              Du hast noch keine 1:1 Session f{'\u00fc'}r{' '}
              <span className="font-semibold">{bookingReminder.moduleName}</span> gebucht
            </p>
          </Link>
        )}

        {/* Check-In Banner */}
        {checkInStatus?.showBanner && (
          <Link
            href="/mentee/check-in"
            className="mb-4 flex items-center gap-3 rounded-xl bg-orange-50 border border-rdy-orange-500/30 px-4 py-3 active:opacity-80 transition-opacity"
          >
            <ClipboardList className="h-5 w-5 text-rdy-orange-500 flex-shrink-0" />
            <p className="text-sm text-rdy-black">
              Bitte f{'\u00fc'}lle den <span className="font-semibold">RDY Check-In</span> aus
            </p>
          </Link>
        )}

        {/* Date display (read-only) */}
        <div className="flex items-center justify-center mb-8">
          <p className="text-xs uppercase tracking-widest text-rdy-gray-400 min-w-[60px] text-center">
            {format(today, 'd MMM')}
          </p>
        </div>

        {/* Exercises */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-rdy-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : isRestDay ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rdy-gray-100">
              <Leaf className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-rdy-black">Ruhetag / Rest Day</p>
            <p className="mt-2 text-xs text-rdy-gray-400">Take time to recover</p>
          </div>
        ) : scheduledExercises.length === 0 ? (
          <p className="text-center text-xs uppercase tracking-widest text-rdy-gray-400 py-16">
            Nothing scheduled
          </p>
        ) : (
          <div className="space-y-3">
            {scheduledExercises.map((exercise) => (
              <div
                key={exercise.id}
                className={cn(
                  'relative w-full border rounded-lg px-4 py-3 transition-opacity',
                  exercise.completed
                    ? 'border-rdy-gray-200 opacity-40'
                    : 'border-rdy-gray-300'
                )}
              >
                <button
                  onClick={() => handleExerciseTap(exercise)}
                  className="w-full text-center active:opacity-60"
                >
                  <p className="text-sm font-semibold uppercase tracking-wide text-rdy-black">
                    {exercise.exercise?.titleDe || '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-rdy-gray-400">
                    {format(new Date(exercise.scheduledAt), 'h:mma').toUpperCase()}
                  </p>
                </button>

                {/* Reschedule clock icon */}
                {!exercise.completed && (
                  <button
                    onClick={(e) => handleClockTap(e, exercise)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-rdy-gray-100 active:bg-rdy-gray-200 transition-colors"
                    aria-label="Reschedule exercise"
                  >
                    <Clock className="h-4 w-4 text-rdy-gray-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <RdyFooter />
      </div>

      {/* Reschedule Time Picker Dialog */}
      <Dialog
        open={rescheduleTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRescheduleTarget(null);
        }}
      >
        <DialogContent className="max-w-xs rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-center text-sm uppercase tracking-widest">
              Reschedule
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-rdy-gray-400">
              {rescheduleTarget?.exercise?.titleDe || 'Exercise'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto py-2">
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot}
                disabled={isRescheduling}
                onClick={() => handleTimeSelect(slot)}
                className={cn(
                  'rounded-md px-2 py-2 text-xs font-medium transition-colors',
                  'border border-rdy-gray-200 hover:border-rdy-orange-500 hover:bg-orange-50',
                  'active:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed',
                  slot === currentTimeStr
                    ? 'bg-orange-100 border-rdy-orange-500 text-rdy-orange-500'
                    : 'text-rdy-black'
                )}
              >
                {slot}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
