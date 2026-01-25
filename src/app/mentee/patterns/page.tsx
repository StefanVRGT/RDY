'use client';

import { useState, useMemo, useCallback } from 'react';
import { MobileLayout } from '@/components/mobile';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Activity,
  Zap,
  Smile,
  Target,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

// Pattern types with icons and colors
const PATTERN_CONFIG = {
  stress: {
    label: 'Stress',
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-900/30',
    strongColor: 'bg-red-500',
    weakColor: 'bg-red-300',
    noneColor: 'bg-gray-700',
  },
  energy: {
    label: 'Energy',
    icon: Zap,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/30',
    strongColor: 'bg-yellow-500',
    weakColor: 'bg-yellow-300',
    noneColor: 'bg-gray-700',
  },
  mood: {
    label: 'Mood',
    icon: Smile,
    color: 'text-green-400',
    bgColor: 'bg-green-900/30',
    strongColor: 'bg-green-500',
    weakColor: 'bg-green-300',
    noneColor: 'bg-gray-700',
  },
  focus: {
    label: 'Focus',
    icon: Target,
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/30',
    strongColor: 'bg-blue-500',
    weakColor: 'bg-blue-300',
    noneColor: 'bg-gray-700',
  },
  anxiety: {
    label: 'Anxiety',
    icon: Activity,
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/30',
    strongColor: 'bg-purple-500',
    weakColor: 'bg-purple-300',
    noneColor: 'bg-gray-700',
  },
  motivation: {
    label: 'Motivation',
    icon: Flame,
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/30',
    strongColor: 'bg-orange-500',
    weakColor: 'bg-orange-300',
    noneColor: 'bg-gray-700',
  },
} as const;

type PatternType = keyof typeof PATTERN_CONFIG;
type IntensityLevel = 'strong' | 'weak' | 'none';

// Time block labels for the grid
const TIME_BLOCKS = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  label: `${i.toString().padStart(2, '0')}:00`,
  shortLabel: i.toString().padStart(2, '0'),
}));

// Intensity options
const INTENSITY_OPTIONS: { value: IntensityLevel; label: string; description: string }[] = [
  { value: 'strong', label: 'Strong', description: 'High intensity' },
  { value: 'weak', label: 'Weak', description: 'Low intensity' },
  { value: 'none', label: 'None', description: 'Not present' },
];

export default function MenteePatternTrackingPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPattern, setSelectedPattern] = useState<PatternType>('stress');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [showIntensityDialog, setShowIntensityDialog] = useState(false);

  // tRPC hooks
  const utils = trpc.useUtils();

  // Fetch entries for the selected date
  const { data: entriesData, isLoading } = trpc.patterns.getEntriesForDate.useQuery({
    date: startOfDay(selectedDate).toISOString(),
  });

  // Fetch daily summary
  const { data: summaryData } = trpc.patterns.getDailySummary.useQuery({
    date: startOfDay(selectedDate).toISOString(),
  });

  // Upsert mutation
  const upsertEntry = trpc.patterns.upsertEntry.useMutation({
    onSuccess: () => {
      utils.patterns.getEntriesForDate.invalidate();
      utils.patterns.getDailySummary.invalidate();
      setShowIntensityDialog(false);
      setSelectedHour(null);
    },
  });

  // Create a map of entries for quick lookup
  const entriesMap = useMemo(() => {
    const map: Record<string, Record<number, IntensityLevel>> = {};
    for (const type of Object.keys(PATTERN_CONFIG)) {
      map[type] = {};
    }
    if (entriesData?.entries) {
      for (const entry of entriesData.entries) {
        if (!map[entry.patternType]) {
          map[entry.patternType] = {};
        }
        map[entry.patternType][entry.hour] = entry.intensity as IntensityLevel;
      }
    }
    return map;
  }, [entriesData]);

  // Get intensity for a specific pattern and hour
  const getIntensity = useCallback(
    (patternType: PatternType, hour: number): IntensityLevel | null => {
      return entriesMap[patternType]?.[hour] || null;
    },
    [entriesMap]
  );

  // Navigate to previous/next day
  const goToPreviousDay = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  }, []);

  // Handle time block click
  const handleTimeBlockClick = useCallback((hour: number) => {
    setSelectedHour(hour);
    setShowIntensityDialog(true);
  }, []);

  // Handle intensity selection
  const handleIntensitySelect = useCallback(
    (intensity: IntensityLevel) => {
      if (selectedHour === null) return;

      upsertEntry.mutate({
        date: startOfDay(selectedDate).toISOString(),
        hour: selectedHour,
        patternType: selectedPattern,
        intensity,
      });
    },
    [selectedHour, selectedDate, selectedPattern, upsertEntry]
  );

  // Handle date selection from calendar
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
    setShowCalendar(false);
  }, []);

  // Get color class for intensity
  const getIntensityColorClass = useCallback(
    (patternType: PatternType, intensity: IntensityLevel | null) => {
      const config = PATTERN_CONFIG[patternType];
      if (!intensity) return 'bg-gray-800 hover:bg-gray-700';
      switch (intensity) {
        case 'strong':
          return config.strongColor;
        case 'weak':
          return config.weakColor;
        case 'none':
          return config.noneColor;
        default:
          return 'bg-gray-800';
      }
    },
    []
  );

  // Current pattern config
  const currentPatternConfig = PATTERN_CONFIG[selectedPattern];
  const PatternIcon = currentPatternConfig.icon;

  return (
    <MobileLayout title="Pattern Tracking" showNotifications>
      <div className="flex flex-col px-4 py-4" data-testid="pattern-tracking-page">
        {/* Date Navigation */}
        <div
          className="mb-4 flex items-center justify-between rounded-xl bg-gray-900 p-3"
          data-testid="date-navigation"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousDay}
            className="h-10 w-10 p-0 text-gray-400 hover:text-white"
            data-testid="prev-day-button"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            onClick={() => setShowCalendar(true)}
            className="flex items-center gap-2 text-white hover:bg-gray-800"
            data-testid="date-selector"
          >
            <CalendarIcon className="h-4 w-4" />
            <span className="font-medium" data-testid="selected-date">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextDay}
            className="h-10 w-10 p-0 text-gray-400 hover:text-white"
            data-testid="next-day-button"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Pattern Type Selector */}
        <div className="mb-4" data-testid="pattern-selector">
          <label className="mb-2 block text-sm font-medium text-gray-400">
            Select Pattern Type
          </label>
          <Select
            value={selectedPattern}
            onValueChange={(value) => setSelectedPattern(value as PatternType)}
          >
            <SelectTrigger
              className="w-full border-gray-700 bg-gray-900 text-white"
              data-testid="pattern-type-select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-900">
              {Object.entries(PATTERN_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <SelectItem
                    key={key}
                    value={key}
                    className="text-white focus:bg-gray-800 focus:text-white"
                    data-testid={`pattern-option-${key}`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className={cn('h-4 w-4', config.color)} />
                      {config.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Intensity Legend */}
        <div
          className="mb-4 flex items-center justify-center gap-4 rounded-xl bg-gray-900 p-3"
          data-testid="intensity-legend"
        >
          <div className="flex items-center gap-2">
            <div
              className={cn('h-4 w-4 rounded', currentPatternConfig.strongColor)}
              data-testid="legend-strong"
            />
            <span className="text-xs text-gray-400">Strong</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn('h-4 w-4 rounded', currentPatternConfig.weakColor)}
              data-testid="legend-weak"
            />
            <span className="text-xs text-gray-400">Weak</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn('h-4 w-4 rounded', currentPatternConfig.noneColor)}
              data-testid="legend-none"
            />
            <span className="text-xs text-gray-400">None</span>
          </div>
        </div>

        {/* Time Block Grid */}
        <div
          className="mb-4 rounded-xl bg-gray-900 p-4"
          data-testid="time-block-grid"
        >
          <div className="mb-3 flex items-center gap-2">
            <PatternIcon className={cn('h-5 w-5', currentPatternConfig.color)} />
            <h3 className="font-medium text-white">
              {currentPatternConfig.label} by Hour
            </h3>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-twilight-400 border-t-transparent" />
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-2" data-testid="hourly-grid">
              {TIME_BLOCKS.map(({ hour, shortLabel }) => {
                const intensity = getIntensity(selectedPattern, hour);
                return (
                  <button
                    key={hour}
                    onClick={() => handleTimeBlockClick(hour)}
                    className={cn(
                      'flex h-12 flex-col items-center justify-center rounded-lg transition-all',
                      getIntensityColorClass(selectedPattern, intensity),
                      'hover:ring-2 hover:ring-twilight-500'
                    )}
                    data-testid={`time-block-${hour}`}
                    data-hour={hour}
                    data-intensity={intensity || 'unset'}
                  >
                    <span className="text-xs font-medium text-white">{shortLabel}</span>
                    {intensity && (
                      <span className="mt-0.5 text-[10px] text-white/70">
                        {intensity.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Daily Summary */}
        {summaryData && (
          <div
            className="rounded-xl bg-gray-900 p-4"
            data-testid="daily-summary"
          >
            <h3 className="mb-3 font-medium text-white">Daily Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(PATTERN_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                const summary = summaryData.summary[key];
                const total = summary?.total || 0;
                const strongCount = summary?.strong || 0;
                const weakCount = summary?.weak || 0;

                return (
                  <div
                    key={key}
                    className={cn(
                      'flex items-center gap-3 rounded-lg p-3',
                      config.bgColor
                    )}
                    data-testid={`summary-${key}`}
                  >
                    <Icon className={cn('h-5 w-5', config.color)} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{config.label}</p>
                      <p className="text-xs text-gray-400">
                        {total > 0 ? (
                          <>
                            {strongCount}S / {weakCount}W
                          </>
                        ) : (
                          'No entries'
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Calendar Dialog */}
      <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
        <DialogContent className="bg-gray-900 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Date</DialogTitle>
          </DialogHeader>

          <div className="mt-4" data-testid="calendar-dialog">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="rounded-xl border border-gray-700"
            />
          </div>

          <Button
            onClick={() => {
              setSelectedDate(new Date());
              setShowCalendar(false);
            }}
            variant="outline"
            className="mt-4 w-full border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
            data-testid="today-button"
          >
            Go to Today
          </Button>
        </DialogContent>
      </Dialog>

      {/* Intensity Selection Dialog */}
      <Dialog open={showIntensityDialog} onOpenChange={setShowIntensityDialog}>
        <DialogContent className="bg-gray-900 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle data-testid="intensity-dialog-title">
              Set {currentPatternConfig.label} at{' '}
              {selectedHour !== null ? TIME_BLOCKS[selectedHour].label : ''}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Select the intensity level for this time block
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3" data-testid="intensity-options">
            {INTENSITY_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => handleIntensitySelect(option.value)}
                disabled={upsertEntry.isPending}
                className={cn(
                  'flex w-full items-center gap-4 rounded-xl p-4 transition-all',
                  'border border-gray-700 bg-gray-800 hover:border-twilight-500',
                  upsertEntry.isPending && 'opacity-50'
                )}
                data-testid={`intensity-${option.value}`}
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-lg',
                    option.value === 'strong' && currentPatternConfig.strongColor,
                    option.value === 'weak' && currentPatternConfig.weakColor,
                    option.value === 'none' && currentPatternConfig.noneColor
                  )}
                />
                <div className="flex-1 text-left">
                  <p className="font-medium text-white">{option.label}</p>
                  <p className="text-sm text-gray-400">{option.description}</p>
                </div>
              </button>
            ))}
          </div>

          <Button
            onClick={() => {
              setShowIntensityDialog(false);
              setSelectedHour(null);
            }}
            variant="outline"
            className="mt-4 w-full border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
