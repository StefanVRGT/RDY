'use client';

import { useMemo } from 'react';
import { MobileLayout } from '@/components/mobile';
import { trpc } from '@/lib/trpc/client';
import { format, isAfter, isBefore, isSameDay, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { RdyFooter } from '@/components/rdy-footer';
import { cn } from '@/lib/utils';
import { BookOpen, GraduationCap, Video, Calendar } from 'lucide-react';

const ICON_MAP: Record<string, typeof BookOpen> = {
  basics: BookOpen,
  module: GraduationCap,
  endtalk: Video,
};

const EXERCISE_DAYS: Record<number, number> = { 0: 6, 1: 20, 2: 20, 3: 20, 4: 20, 5: 20 };

export default function MenteeWeeklyCalendarPage() {
  const today = startOfDay(new Date());

  const { data: timeline, isLoading } = trpc.mentee.getProgramTimeline.useQuery();

  const currentIdx = useMemo(() => {
    if (!timeline?.events) return -1;
    for (let i = timeline.events.length - 1; i >= 0; i--) {
      if (!isAfter(new Date(timeline.events[i].date), today)) return i;
    }
    return 0;
  }, [timeline, today]);

  return (
    <MobileLayout title="PROGRAMM" showMenu>
      <div className="px-5 py-6">
        <h2 className="text-center text-xs uppercase tracking-widest text-rdy-gray-400 mb-6">
          RDY Masterclass
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-rdy-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : !timeline ? (
          <p className="text-center text-xs uppercase tracking-widest text-rdy-gray-400 py-16">
            Kein Programm zugewiesen
          </p>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-rdy-gray-200" />

            <div className="space-y-0">
              {timeline.events.map((event, idx) => {
                const date = new Date(event.date);
                const isPast = isBefore(date, today) && !isSameDay(date, today);
                const isCurrent = currentIdx === idx;
                const Icon = ICON_MAP[event.type] || Calendar;

                return (
                  <div key={event.label} className="relative flex items-start gap-4 pb-6">
                    <div
                      className={cn(
                        'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        isCurrent
                          ? 'bg-rdy-orange-500 text-white shadow-md'
                          : isPast
                            ? 'bg-rdy-black text-white'
                            : 'bg-rdy-gray-100 text-rdy-gray-400'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 pt-1.5">
                      <div className="flex items-baseline justify-between">
                        <h3
                          className={cn(
                            'text-sm font-bold uppercase tracking-wide',
                            isCurrent ? 'text-rdy-orange-500' : isPast ? 'text-rdy-black' : 'text-rdy-gray-400'
                          )}
                        >
                          {event.label}
                        </h3>
                        <p className={cn('text-xs', isCurrent ? 'text-rdy-orange-500 font-medium' : 'text-rdy-gray-400')}>
                          {format(date, 'EEE d. MMM', { locale: de })}
                        </p>
                      </div>

                      {isCurrent && (
                        <p className="mt-1 text-xs text-rdy-orange-500">← Du bist hier</p>
                      )}

                      {idx < timeline.events.length - 1 && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-rdy-gray-400">
                          <Calendar className="h-3 w-3" />
                          <span>{EXERCISE_DAYS[idx] ?? 20} Tage Exercises</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <RdyFooter />
      </div>
    </MobileLayout>
  );
}
