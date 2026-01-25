'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  GitCompare,
} from 'lucide-react';
import { format } from 'date-fns';

interface WeekData {
  weekStart: string;
  exerciseCompletionRate: number;
  moodScore: number;
  diaryEntries: number;
  totalPatternEntries: number;
}

interface WeekOverWeekComparisonProps {
  weeks: WeekData[];
  currentWeek: string;
  className?: string;
}

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (diff > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-green-400">
        <TrendingUp className="h-3 w-3" />
        +{diff}
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-red-400">
        <TrendingDown className="h-3 w-3" />
        {diff}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-xs text-gray-400">
      <Minus className="h-3 w-3" />
      0
    </span>
  );
}

export function WeekOverWeekComparison({
  weeks,
  currentWeek,
  className,
}: WeekOverWeekComparisonProps) {
  // Calculate max values for scaling charts
  const maxValues = useMemo(() => {
    return {
      exerciseRate: 100, // Always 0-100%
      moodScore: 100, // Always 0-100
      diaryEntries: Math.max(...weeks.map(w => w.diaryEntries), 1),
      patternEntries: Math.max(...weeks.map(w => w.totalPatternEntries), 1),
    };
  }, [weeks]);

  // Format week labels
  const weekLabels = useMemo(() => {
    return weeks.map((week, idx) => {
      const date = new Date(week.weekStart);
      const isCurrentWeek = week.weekStart === currentWeek;
      return {
        ...week,
        label: isCurrentWeek ? 'This Week' : `Week ${weeks.length - idx}`,
        shortLabel: format(date, 'MMM d'),
        isCurrentWeek,
      };
    });
  }, [weeks, currentWeek]);

  // Get current and previous week for comparison
  const currentWeekData = weekLabels[weekLabels.length - 1];
  const previousWeekData = weekLabels[weekLabels.length - 2];

  if (weeks.length < 2) {
    return (
      <div
        className={cn('rounded-xl bg-gray-900 p-4', className)}
        data-testid="week-over-week-comparison"
      >
        <div className="flex items-center gap-2 mb-4">
          <GitCompare className="h-5 w-5 text-twilight-400" />
          <h3 className="font-semibold text-white">Week-over-Week</h3>
        </div>
        <div className="text-center text-gray-400 py-8">
          <p>Need at least 2 weeks of data for comparison</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('rounded-xl bg-gray-900 p-4', className)}
      data-testid="week-over-week-comparison"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <GitCompare className="h-5 w-5 text-twilight-400" />
        <h3 className="font-semibold text-white">Week-over-Week</h3>
      </div>

      {/* Summary Cards */}
      <div className="mb-4 grid grid-cols-2 gap-3" data-testid="summary-cards">
        {/* Exercise Completion */}
        <div className="rounded-lg bg-gray-800 p-3" data-testid="exercise-summary">
          <p className="text-xs text-gray-400 mb-1">Exercises</p>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-twilight-400">
              {currentWeekData?.exerciseCompletionRate || 0}%
            </span>
            {previousWeekData && (
              <TrendIndicator
                current={currentWeekData?.exerciseCompletionRate || 0}
                previous={previousWeekData.exerciseCompletionRate}
              />
            )}
          </div>
        </div>

        {/* Mood Score */}
        <div className="rounded-lg bg-gray-800 p-3" data-testid="mood-summary">
          <p className="text-xs text-gray-400 mb-1">Mood Score</p>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-green-400">
              {currentWeekData?.moodScore || 50}
            </span>
            {previousWeekData && (
              <TrendIndicator
                current={currentWeekData?.moodScore || 50}
                previous={previousWeekData.moodScore}
              />
            )}
          </div>
        </div>

        {/* Diary Entries */}
        <div className="rounded-lg bg-gray-800 p-3" data-testid="diary-summary">
          <p className="text-xs text-gray-400 mb-1">Diary Entries</p>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-emerald-400">
              {currentWeekData?.diaryEntries || 0}
            </span>
            {previousWeekData && (
              <TrendIndicator
                current={currentWeekData?.diaryEntries || 0}
                previous={previousWeekData.diaryEntries}
              />
            )}
          </div>
        </div>

        {/* Pattern Entries */}
        <div className="rounded-lg bg-gray-800 p-3" data-testid="pattern-summary">
          <p className="text-xs text-gray-400 mb-1">Pattern Entries</p>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-purple-400">
              {currentWeekData?.totalPatternEntries || 0}
            </span>
            {previousWeekData && (
              <TrendIndicator
                current={currentWeekData?.totalPatternEntries || 0}
                previous={previousWeekData.totalPatternEntries}
              />
            )}
          </div>
        </div>
      </div>

      {/* Trend Charts */}
      <div className="space-y-4" data-testid="trend-charts">
        {/* Exercise Completion Trend */}
        <div data-testid="exercise-trend-chart">
          <p className="mb-2 text-xs font-medium text-gray-400">Exercise Completion Trend</p>
          <div className="flex items-end justify-between gap-1 h-16">
            {weekLabels.map((week, idx) => (
              <div
                key={week.weekStart}
                className="flex flex-1 flex-col items-center"
                data-testid={`exercise-bar-${idx}`}
              >
                <div className="relative mb-1 h-12 w-full rounded-t bg-gray-800">
                  <div
                    className={cn(
                      'absolute bottom-0 left-0 right-0 rounded-t transition-all duration-300',
                      week.isCurrentWeek ? 'bg-twilight-400' : 'bg-twilight-600'
                    )}
                    style={{ height: `${(week.exerciseCompletionRate / maxValues.exerciseRate) * 100}%` }}
                    data-rate={week.exerciseCompletionRate}
                  />
                </div>
                <span className="text-[10px] text-gray-500">{week.shortLabel}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mood Score Trend */}
        <div data-testid="mood-trend-chart">
          <p className="mb-2 text-xs font-medium text-gray-400">Mood Score Trend</p>
          <div className="flex items-end justify-between gap-1 h-16">
            {weekLabels.map((week, idx) => (
              <div
                key={week.weekStart}
                className="flex flex-1 flex-col items-center"
                data-testid={`mood-bar-${idx}`}
              >
                <div className="relative mb-1 h-12 w-full rounded-t bg-gray-800">
                  <div
                    className={cn(
                      'absolute bottom-0 left-0 right-0 rounded-t transition-all duration-300',
                      week.isCurrentWeek ? 'bg-green-400' : 'bg-green-600'
                    )}
                    style={{ height: `${(week.moodScore / maxValues.moodScore) * 100}%` }}
                    data-score={week.moodScore}
                  />
                </div>
                <span className="text-[10px] text-gray-500">{week.shortLabel}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Trend (Diary + Patterns) */}
        <div data-testid="activity-trend-chart">
          <p className="mb-2 text-xs font-medium text-gray-400">Activity Trend</p>
          <div className="flex items-end justify-between gap-1 h-16">
            {weekLabels.map((week, idx) => {
              const activityScore = week.diaryEntries + week.totalPatternEntries;
              const maxActivity = maxValues.diaryEntries + maxValues.patternEntries;

              return (
                <div
                  key={week.weekStart}
                  className="flex flex-1 flex-col items-center"
                  data-testid={`activity-bar-${idx}`}
                >
                  <div className="relative mb-1 h-12 w-full rounded-t bg-gray-800">
                    <div
                      className={cn(
                        'absolute bottom-0 left-0 right-0 rounded-t transition-all duration-300',
                        week.isCurrentWeek ? 'bg-purple-400' : 'bg-purple-600'
                      )}
                      style={{ height: `${(activityScore / maxActivity) * 100}%` }}
                      data-activity={activityScore}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500">{week.shortLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
