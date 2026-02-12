'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Mic,
  Layers,
} from 'lucide-react';
import { format } from 'date-fns';

interface DiaryStats {
  totalEntries: number;
  previousWeekEntries: number;
  byType: Record<string, number>;
  byDay: Array<{ date: string; count: number }>;
  highlights: Array<{
    id: string;
    preview: string;
    entryDate: Date;
    entryType: string;
  }>;
}

interface DiaryHighlightsProps {
  stats: DiaryStats;
  className?: string;
}

const TYPE_ICONS = {
  text: { icon: FileText, label: 'Text', color: 'text-green-400' },
  voice: { icon: Mic, label: 'Voice', color: 'text-rdy-orange-500' },
  mixed: { icon: Layers, label: 'Mixed', color: 'text-rdy-orange-500' },
};

export function DiaryHighlights({ stats, className }: DiaryHighlightsProps) {
  const trend = useMemo(() => {
    const diff = stats.totalEntries - Number(stats.previousWeekEntries);
    if (diff > 0) return { type: 'up', value: diff, Icon: TrendingUp, color: 'text-green-400' };
    if (diff < 0) return { type: 'down', value: Math.abs(diff), Icon: TrendingDown, color: 'text-red-400' };
    return { type: 'neutral', value: 0, Icon: Minus, color: 'text-rdy-gray-400' };
  }, [stats.totalEntries, stats.previousWeekEntries]);

  // Calculate daily bars
  const dailyBars = useMemo(() => {
    const maxCount = Math.max(...stats.byDay.map(d => d.count), 1);
    return stats.byDay.map(day => ({
      ...day,
      dayLabel: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
      height: (day.count / maxCount) * 100,
    }));
  }, [stats.byDay]);

  return (
    <div
      className={cn('rounded-xl bg-rdy-gray-100 p-4', className)}
      data-testid="diary-highlights"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-rdy-orange-500" />
          <h3 className="font-semibold text-rdy-black">Diary Entries</h3>
        </div>
        <div className={cn('flex items-center gap-1 text-sm', trend.color)}>
          <trend.Icon className="h-4 w-4" />
          <span data-testid="diary-trend">
            {trend.type === 'neutral' ? 'No change' : `${trend.value > 0 ? '+' : ''}${trend.value}`}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div
        className="mb-4 flex items-center justify-around rounded-lg bg-rdy-gray-100 p-3"
        data-testid="diary-counts"
      >
        <div className="text-center">
          <p className="text-2xl font-bold text-rdy-orange-500" data-testid="total-entries">
            {stats.totalEntries}
          </p>
          <p className="text-xs text-rdy-gray-400">This Week</p>
        </div>
        <div className="h-8 w-px bg-rdy-gray-200" />
        <div className="text-center">
          <p className="text-2xl font-bold text-rdy-gray-400" data-testid="previous-entries">
            {stats.previousWeekEntries}
          </p>
          <p className="text-xs text-rdy-gray-400">Last Week</p>
        </div>
      </div>

      {/* Daily activity bars */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-medium text-rdy-gray-400">Daily Activity</p>
        <div className="flex items-end justify-between gap-1" data-testid="diary-daily-bars">
          {dailyBars.map((day, idx) => (
            <div
              key={day.date}
              className="flex flex-1 flex-col items-center"
              data-testid={`diary-bar-${idx}`}
            >
              <div className="relative mb-1 h-12 w-full rounded-t bg-rdy-gray-100">
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t bg-emerald-500 transition-all duration-300"
                  style={{ height: `${day.height}%` }}
                  data-testid={`diary-bar-fill-${idx}`}
                  data-count={day.count}
                />
              </div>
              <span className="text-[10px] text-rdy-gray-500">{day.dayLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By type */}
      {Object.keys(stats.byType).length > 0 && (
        <div className="mb-4" data-testid="diary-by-type">
          <p className="mb-2 text-xs font-medium text-rdy-gray-400">Entry Types</p>
          <div className="flex items-center gap-4">
            {Object.entries(stats.byType).map(([type, count]) => {
              const config = TYPE_ICONS[type as keyof typeof TYPE_ICONS];
              if (!config) return null;
              const Icon = config.icon;

              return (
                <div
                  key={type}
                  className="flex items-center gap-2"
                  data-testid={`diary-type-${type}`}
                >
                  <Icon className={cn('h-4 w-4', config.color)} />
                  <span className="text-sm text-rdy-gray-600">
                    {count} {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent highlights */}
      {stats.highlights.length > 0 && (
        <div data-testid="diary-recent-highlights">
          <p className="mb-2 text-xs font-medium text-rdy-gray-400">Recent Highlights</p>
          <div className="space-y-2">
            {stats.highlights.map(highlight => {
              const config = TYPE_ICONS[highlight.entryType as keyof typeof TYPE_ICONS] || TYPE_ICONS.text;
              const Icon = config.icon;

              return (
                <div
                  key={highlight.id}
                  className="rounded-lg bg-rdy-gray-100 p-3"
                  data-testid={`highlight-${highlight.id}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-3 w-3', config.color)} />
                      <span className="text-xs text-rdy-gray-400">
                        {format(new Date(highlight.entryDate), 'EEE, MMM d')}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-rdy-gray-600 line-clamp-2">
                    {highlight.preview || 'No text content'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats.highlights.length === 0 && stats.totalEntries === 0 && (
        <div className="rounded-lg bg-rdy-gray-100 p-4 text-center">
          <p className="text-sm text-rdy-gray-400">No diary entries this week</p>
          <p className="mt-1 text-xs text-rdy-gray-500">Start journaling to see your highlights here</p>
        </div>
      )}
    </div>
  );
}
