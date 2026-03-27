'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { format, subDays, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { MobileLayout } from '@/components/mobile';

const CATEGORIES = [
  { key: 'stress', label: 'Stresslevel', color: '#EF4444' },
  { key: 'breathing', label: 'Atmung', color: '#3B82F6' },
  { key: 'body', label: 'Körper', color: '#10B981' },
  { key: 'thoughts', label: 'Gedanken', color: '#8B5CF6' },
];

// Simple SVG sparkline for a category's daily tap counts
function Sparkline({
  data,
  color,
  maxVal,
}: {
  data: number[];
  color: string;
  maxVal: number;
}) {
  if (data.length === 0) return null;
  const h = 40;
  const w = 200;
  const step = w / Math.max(data.length - 1, 1);
  const safe = maxVal || 1;

  const points = data
    .map((v, i) => `${i * step},${h - (v / safe) * (h - 4)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((v, i) => (
        <circle
          key={i}
          cx={i * step}
          cy={h - (v / safe) * (h - 4)}
          r="2.5"
          fill={color}
        />
      ))}
    </svg>
  );
}

export default function MentorMenteeTrackingPage() {
  const params = useParams<{ menteeId: string }>();
  const menteeId = params.menteeId;

  const today = startOfDay(new Date());
  const startDate = subDays(today, 20); // Last 21 days

  const { data: entries, isLoading } = trpc.mentor.getMenteeTracking.useQuery({
    menteeId,
    startDate: startDate.toISOString(),
    endDate: today.toISOString(),
  });

  // Aggregate: per day, count taps per category
  const chartData = useMemo(() => {
    if (!entries?.length) return null;

    // Build day labels
    const days: string[] = [];
    for (let i = 0; i <= 20; i++) {
      days.push(format(subDays(today, 20 - i), 'yyyy-MM-dd'));
    }

    const catData: Record<string, number[]> = {};
    for (const cat of CATEGORIES) {
      catData[cat.key] = days.map((day) =>
        entries.filter(
          (e) =>
            e.category === cat.key &&
            format(new Date(e.entryDate), 'yyyy-MM-dd') === day
        ).length
      );
    }

    const maxVal = Math.max(
      ...Object.values(catData).flatMap((d) => d),
      1
    );

    return { days, catData, maxVal };
  }, [entries, today]);

  return (
    <MobileLayout title="TRACKING" showBack>
      <div className="px-5 py-6">
        <h2 className="text-xs uppercase tracking-widest text-rdy-gray-400 mb-1">
          Mentee Tracking
        </h2>
        <p className="text-sm text-rdy-gray-500 mb-6">
          Letzte 21 Tage — Taps pro Tag
        </p>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-rdy-orange-500 border-t-transparent animate-spin" />
          </div>
        ) : !chartData ? (
          <p className="text-center text-xs text-rdy-gray-400 py-16">
            Keine Tracking-Daten vorhanden
          </p>
        ) : (
          <div className="space-y-5">
            {CATEGORIES.map((cat) => (
              <div key={cat.key}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-rdy-black">{cat.label}</p>
                  <p className="text-xs text-rdy-gray-400">
                    {chartData.catData[cat.key].reduce((a, b) => a + b, 0)} total
                  </p>
                </div>
                <div className="rounded-lg bg-rdy-gray-100 p-3">
                  <Sparkline
                    data={chartData.catData[cat.key]}
                    color={cat.color}
                    maxVal={chartData.maxVal}
                  />
                  <div className="flex justify-between mt-1 text-[9px] text-rdy-gray-400">
                    <span>{format(subDays(today, 20), 'd. MMM', { locale: de })}</span>
                    <span>Heute</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
