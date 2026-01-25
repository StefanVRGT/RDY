'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Activity,
  Zap,
  Smile,
  Target,
  AlertTriangle,
  Flame,
  BarChart3,
} from 'lucide-react';

// Pattern configuration matching the patterns page
const PATTERN_CONFIG = {
  stress: {
    label: 'Stress',
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500',
    lightColor: 'bg-red-300',
  },
  energy: {
    label: 'Energy',
    icon: Zap,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500',
    lightColor: 'bg-yellow-300',
  },
  mood: {
    label: 'Mood',
    icon: Smile,
    color: 'text-green-400',
    bgColor: 'bg-green-500',
    lightColor: 'bg-green-300',
  },
  focus: {
    label: 'Focus',
    icon: Target,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500',
    lightColor: 'bg-blue-300',
  },
  anxiety: {
    label: 'Anxiety',
    icon: Activity,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500',
    lightColor: 'bg-purple-300',
  },
  motivation: {
    label: 'Motivation',
    icon: Flame,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500',
    lightColor: 'bg-orange-300',
  },
} as const;

type PatternType = keyof typeof PATTERN_CONFIG;

interface PatternSummary {
  total: number;
  strong: number;
  weak: number;
  none: number;
  avgIntensity: number;
  prevWeekTotal: number;
  prevWeekStrong: number;
}

interface PatternStats {
  summary: Record<PatternType, PatternSummary>;
  byDay: Array<{
    date: string;
    patterns: Record<PatternType, { strong: number; weak: number; none: number }>;
  }>;
  totalEntries: number;
}

interface PatternFrequencyChartProps {
  stats: PatternStats;
  className?: string;
}

export function PatternFrequencyChart({
  stats,
  className,
}: PatternFrequencyChartProps) {
  // Calculate max values for scaling
  const maxTotal = useMemo(() => {
    return Math.max(...Object.values(stats.summary).map(s => s.total), 1);
  }, [stats.summary]);

  // Calculate pattern rankings by total entries
  const rankedPatterns = useMemo(() => {
    return Object.entries(stats.summary)
      .map(([type, data]) => ({
        type: type as PatternType,
        ...data,
      }))
      .sort((a, b) => b.total - a.total);
  }, [stats.summary]);

  // Calculate daily heatmap data
  const heatmapData = useMemo(() => {
    return stats.byDay.map(day => {
      const dayPatterns = Object.entries(day.patterns).map(([type, counts]) => ({
        type: type as PatternType,
        strong: counts.strong,
        weak: counts.weak,
        none: counts.none,
        total: counts.strong + counts.weak + counts.none,
      }));
      return {
        date: day.date,
        dayLabel: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
        patterns: dayPatterns,
        totalEntries: dayPatterns.reduce((sum, p) => sum + p.total, 0),
      };
    });
  }, [stats.byDay]);

  return (
    <div
      className={cn('rounded-xl bg-gray-900 p-4', className)}
      data-testid="pattern-frequency-chart"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-twilight-400" />
        <h3 className="font-semibold text-white">Pattern Frequency</h3>
      </div>

      {/* Pattern bars */}
      <div className="mb-4 space-y-3" data-testid="pattern-bars">
        {rankedPatterns.map(pattern => {
          const config = PATTERN_CONFIG[pattern.type];
          const Icon = config.icon;
          const percentage = maxTotal > 0 ? (pattern.total / maxTotal) * 100 : 0;
          const change = pattern.total - pattern.prevWeekTotal;

          return (
            <div
              key={pattern.type}
              className="space-y-1"
              data-testid={`pattern-bar-${pattern.type}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', config.color)} />
                  <span className="text-sm text-gray-300">{config.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white" data-testid={`count-${pattern.type}`}>
                    {pattern.total}
                  </span>
                  {change !== 0 && (
                    <span
                      className={cn(
                        'text-xs',
                        change > 0 ? 'text-green-400' : 'text-red-400'
                      )}
                      data-testid={`change-${pattern.type}`}
                    >
                      {change > 0 ? '+' : ''}{change}
                    </span>
                  )}
                </div>
              </div>
              {/* Stacked bar showing strong/weak/none */}
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-800">
                {pattern.strong > 0 && (
                  <div
                    className={cn(config.bgColor, 'transition-all duration-300')}
                    style={{ width: `${(pattern.strong / maxTotal) * 100}%` }}
                    data-testid={`bar-strong-${pattern.type}`}
                  />
                )}
                {pattern.weak > 0 && (
                  <div
                    className={cn(config.lightColor, 'transition-all duration-300')}
                    style={{ width: `${(pattern.weak / maxTotal) * 100}%` }}
                    data-testid={`bar-weak-${pattern.type}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mb-4 flex items-center justify-center gap-4" data-testid="intensity-legend">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-twilight-500" />
          <span className="text-xs text-gray-400">Strong</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-twilight-300" />
          <span className="text-xs text-gray-400">Weak</span>
        </div>
      </div>

      {/* Weekly heatmap */}
      <div data-testid="weekly-heatmap">
        <p className="mb-2 text-xs font-medium text-gray-400">Weekly Pattern Heatmap</p>
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Day headers */}
            <div className="mb-1 flex">
              <div className="w-16" /> {/* Spacer for pattern labels */}
              {heatmapData.map(day => (
                <div
                  key={day.date}
                  className="flex-1 text-center text-[10px] text-gray-500"
                >
                  {day.dayLabel}
                </div>
              ))}
            </div>
            {/* Pattern rows */}
            {Object.entries(PATTERN_CONFIG).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <div key={type} className="mb-1 flex items-center">
                  <div className="flex w-16 items-center gap-1">
                    <Icon className={cn('h-3 w-3', config.color)} />
                    <span className="text-[10px] text-gray-500 truncate">
                      {config.label.substring(0, 3)}
                    </span>
                  </div>
                  {heatmapData.map(day => {
                    const patternData = day.patterns.find(p => p.type === type);
                    const hasStrong = patternData && patternData.strong > 0;
                    const hasWeak = patternData && patternData.weak > 0;
                    const hasEntry = hasStrong || hasWeak;

                    return (
                      <div
                        key={day.date}
                        className="flex-1 px-0.5"
                        data-testid={`heatmap-${type}-${day.date}`}
                      >
                        <div
                          className={cn(
                            'mx-auto h-4 w-4 rounded-sm transition-all',
                            hasStrong && config.bgColor,
                            hasWeak && !hasStrong && config.lightColor,
                            !hasEntry && 'bg-gray-800'
                          )}
                          title={`${config.label}: ${patternData?.total || 0} entries`}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Total entries */}
      <div className="mt-4 text-center">
        <span className="text-sm text-gray-400">
          Total Entries: <span className="font-medium text-white" data-testid="total-pattern-entries">{stats.totalEntries}</span>
        </span>
      </div>
    </div>
  );
}
