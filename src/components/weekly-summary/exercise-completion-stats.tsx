'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Video,
  Mic,
  FileText,
} from 'lucide-react';

interface ExerciseStats {
  totalExercises: number;
  completedExercises: number;
  completionRate: number;
  previousWeekTotal: number;
  previousWeekCompleted: number;
  previousWeekRate: number;
  byType: Record<string, { total: number; completed: number }>;
  byDay: Array<{ date: string; total: number; completed: number }>;
}

interface ExerciseCompletionStatsProps {
  stats: ExerciseStats;
  className?: string;
}

const TYPE_CONFIG = {
  video: { icon: Video, label: 'Video', color: 'text-rdy-orange-500' },
  audio: { icon: Mic, label: 'Audio', color: 'text-rdy-orange-500' },
  text: { icon: FileText, label: 'Text', color: 'text-green-400' },
};

export function ExerciseCompletionStats({
  stats,
  className,
}: ExerciseCompletionStatsProps) {
  const trend = useMemo(() => {
    const diff = stats.completionRate - stats.previousWeekRate;
    if (diff > 0) return { type: 'up', value: diff, Icon: TrendingUp, color: 'text-green-400' };
    if (diff < 0) return { type: 'down', value: Math.abs(diff), Icon: TrendingDown, color: 'text-red-400' };
    return { type: 'neutral', value: 0, Icon: Minus, color: 'text-rdy-gray-400' };
  }, [stats.completionRate, stats.previousWeekRate]);

  // Calculate daily completion bars
  const dailyBars = useMemo(() => {
    return stats.byDay.map(day => ({
      ...day,
      dayLabel: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
      rate: day.total > 0 ? (day.completed / day.total) * 100 : 0,
    }));
  }, [stats.byDay]);

  return (
    <div
      className={cn('rounded-xl bg-rdy-gray-100 p-4', className)}
      data-testid="exercise-completion-stats"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-rdy-orange-500" />
          <h3 className="font-semibold text-rdy-black">Exercise Completion</h3>
        </div>
        <div className={cn('flex items-center gap-1 text-sm', trend.color)}>
          <trend.Icon className="h-4 w-4" />
          <span data-testid="completion-trend">
            {trend.type === 'neutral' ? 'No change' : `${trend.value}%`}
          </span>
        </div>
      </div>

      {/* Main Completion Circle */}
      <div className="mb-4 flex items-center justify-center">
        <div className="relative h-32 w-32">
          {/* Background circle */}
          <svg className="h-full w-full -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-rdy-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeDasharray={`${(stats.completionRate / 100) * 352} 352`}
              strokeLinecap="round"
              className="text-rdy-orange-500 transition-all duration-500"
              data-testid="completion-progress-circle"
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-3xl font-bold text-rdy-black"
              data-testid="completion-rate"
            >
              {stats.completionRate}%
            </span>
            <span className="text-xs text-rdy-gray-400">Completed</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div
        className="mb-4 flex items-center justify-around rounded-lg bg-rdy-gray-100 p-3"
        data-testid="exercise-counts"
      >
        <div className="text-center">
          <p className="text-2xl font-bold text-rdy-orange-500" data-testid="completed-count">
            {stats.completedExercises}
          </p>
          <p className="text-xs text-rdy-gray-400">Done</p>
        </div>
        <div className="h-8 w-px bg-rdy-gray-200" />
        <div className="text-center">
          <p className="text-2xl font-bold text-rdy-black" data-testid="total-count">
            {stats.totalExercises}
          </p>
          <p className="text-xs text-rdy-gray-400">Total</p>
        </div>
        <div className="h-8 w-px bg-rdy-gray-200" />
        <div className="text-center">
          <p className="text-2xl font-bold text-rdy-gray-400" data-testid="previous-week-rate">
            {stats.previousWeekRate}%
          </p>
          <p className="text-xs text-rdy-gray-400">Last Week</p>
        </div>
      </div>

      {/* Daily completion bars */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-medium text-rdy-gray-400">Daily Progress</p>
        <div className="flex items-end justify-between gap-1" data-testid="daily-bars">
          {dailyBars.map((day, idx) => (
            <div
              key={day.date}
              className="flex flex-1 flex-col items-center"
              data-testid={`daily-bar-${idx}`}
            >
              <div className="relative mb-1 h-16 w-full rounded-t bg-rdy-gray-100">
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t bg-rdy-orange-500 transition-all duration-300"
                  style={{ height: `${day.rate}%` }}
                  data-testid={`daily-bar-fill-${idx}`}
                  data-rate={day.rate}
                />
              </div>
              <span className="text-[10px] text-rdy-gray-500">{day.dayLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By type breakdown */}
      {Object.keys(stats.byType).length > 0 && (
        <div data-testid="by-type-breakdown">
          <p className="mb-2 text-xs font-medium text-rdy-gray-400">By Type</p>
          <div className="space-y-2">
            {Object.entries(stats.byType).map(([type, data]) => {
              const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
              if (!config) return null;
              const Icon = config.icon;
              const rate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;

              return (
                <div
                  key={type}
                  className="flex items-center gap-3"
                  data-testid={`type-${type}`}
                >
                  <Icon className={cn('h-4 w-4', config.color)} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-rdy-gray-600">{config.label}</span>
                      <span className="text-rdy-gray-400">
                        {data.completed}/{data.total}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-rdy-gray-200">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          type === 'video' && 'bg-rdy-orange-500',
                          type === 'audio' && 'bg-blue-400',
                          type === 'text' && 'bg-green-400'
                        )}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
