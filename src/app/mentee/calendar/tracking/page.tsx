'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { trpc } from '@/lib/trpc/client';
import { Menu } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { RdyHeader } from '@/components/ui/rdy-header';
import { TrackingCircle, TrackingStatus } from '@/components/ui/tracking-circle';

// Time slots from 6 AM to 9 PM
const TIME_SLOTS = [
  '6:00 AM',
  '9:00 AM',
  '12:00 PM',
  '3:00 PM',
  '6:00 PM',
  '9:00 PM',
];

// Grid columns (7 columns for a week view, or just multiple times in a day)
const GRID_COLS = 5;

export default function TrackingPage() {
  const { data: session } = useSession();
  const [currentDate] = useState(new Date());

  // Fetch exercises for the day
  const { data: exercisesData } = trpc.mentee.getExercisesForDate.useQuery({
    date: startOfDay(currentDate).toISOString(),
  });

  // Generate tracking grid data
  const trackingGrid = useMemo(() => {
    const grid: { time: string; slots: TrackingStatus[] }[] = [];
    const currentHour = new Date().getHours();

    TIME_SLOTS.forEach((time) => {
      const hour = parseInt(time.split(':')[0]);
      const isPM = time.includes('PM');
      const hour24 = isPM && hour !== 12 ? hour + 12 : !isPM && hour === 12 ? 0 : hour;

      const slots: TrackingStatus[] = [];
      for (let i = 0; i < GRID_COLS; i++) {
        if (hour24 < currentHour) {
          // Past time - could be completed
          slots.push(Math.random() > 0.3 ? 'completed' : 'incomplete');
        } else if (hour24 === currentHour && i === 0) {
          // Current time - active
          slots.push('active');
        } else {
          // Future time
          slots.push('incomplete');
        }
      }

      grid.push({ time, slots });
    });

    return grid;
  }, []);

  return (
    <div className="min-h-screen bg-rdy-white">
      {/* Hamburger Menu */}
      <div className="fixed top-4 left-4 z-50">
        <button className="p-2 active:opacity-60 transition-opacity" aria-label="Menu">
          <Menu className="h-6 w-6 text-rdy-black" />
        </button>
      </div>

      {/* Main Content */}
      <div className="rdy-content-width px-rdy-lg pt-16 pb-20">
        {/* Header */}
        <div className="mb-rdy-xl">
          <RdyHeader
            title="TODAY"
            subtitle={format(currentDate, 'd MMM').toUpperCase()}
          />
        </div>

        {/* Section Title */}
        <div className="mb-rdy-lg">
          <h2 className="rdy-heading-lg text-center">TRACKING</h2>
        </div>

        {/* Tracking Grid */}
        <div className="space-y-rdy-sm">
          {trackingGrid.map((row) => (
            <div key={row.time} className="flex items-center gap-rdy-sm">
              {/* Time Label */}
              <div className="w-20 flex-shrink-0">
                <p className="text-rdy-sm text-rdy-gray-500">{row.time}</p>
              </div>

              {/* Circle Grid */}
              <div className="flex gap-2 flex-1 justify-center">
                {row.slots.map((status, idx) => (
                  <TrackingCircle key={idx} status={status} size="md" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* RDY Branding */}
        <div className="mt-rdy-2xl text-center">
          <p className="text-rdy-lg font-bold text-rdy-black tracking-wide">RDY</p>
        </div>
      </div>
    </div>
  );
}
