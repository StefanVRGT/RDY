'use client';

import { useState, useMemo, useCallback } from 'react';
import { MobileLayout } from '@/components/mobile';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  RefreshCw,
  Users,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import {
  ExerciseCompletionStats,
  DiaryHighlights,
  PatternFrequencyChart,
  WeekOverWeekComparison,
  MoodBarometer,
} from '@/components/weekly-summary';

// Helper to get Monday of the week
function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday start
}

export default function WeeklySummaryPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => getWeekStart(new Date()));
  const [showCalendar, setShowCalendar] = useState(false);

  // Get week start ISO string
  const weekStartISO = useMemo(() => {
    const start = getWeekStart(selectedDate);
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }, [selectedDate]);

  // Fetch weekly summary data
  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
  } = trpc.weeklySummary.getWeeklySummary.useQuery({
    weekStartDate: weekStartISO,
  });

  // Privacy settings
  const utils = trpc.useUtils();
  const { data: privacySettings } = trpc.mentee.getPrivacySettings.useQuery();
  const updatePrivacyMutation = trpc.mentee.updatePrivacySettings.useMutation({
    onSuccess: () => utils.mentee.getPrivacySettings.invalidate(),
  });

  // Fetch weekly trends (for week-over-week comparison)
  const { data: trendsData, isLoading: isLoadingTrends } = trpc.weeklySummary.getWeeklyTrends.useQuery({
    weekStartDate: weekStartISO,
    weeksToCompare: 4,
  });

  const isLoading = isLoadingSummary || isLoadingTrends;

  // Navigation handlers
  const goToPreviousWeek = useCallback(() => {
    setSelectedDate(prev => subWeeks(prev, 1));
  }, []);

  const goToNextWeek = useCallback(() => {
    setSelectedDate(prev => addWeeks(prev, 1));
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setSelectedDate(getWeekStart(new Date()));
  }, []);

  // Handle date selection from calendar
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setSelectedDate(getWeekStart(date));
    }
    setShowCalendar(false);
  }, []);

  // Format week range string
  const weekRangeString = useMemo(() => {
    const start = getWeekStart(selectedDate);
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  }, [selectedDate]);

  // Check if current week
  const isCurrentWeek = useMemo(() => {
    const currentWeekStart = getWeekStart(new Date());
    const selectedWeekStart = getWeekStart(selectedDate);
    return currentWeekStart.getTime() === selectedWeekStart.getTime();
  }, [selectedDate]);

  return (
    <MobileLayout title="Weekly Summary" showBack showNotifications>
      <div className="flex flex-col px-4 py-4" data-testid="weekly-summary-page">
        {/* Week Navigation */}
        <div
          className="mb-4 flex items-center justify-between rounded-xl bg-rdy-gray-100 p-3"
          data-testid="week-navigation"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousWeek}
            className="h-10 w-10 p-0 text-rdy-gray-400 hover:text-rdy-black"
            data-testid="prev-week-button"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            onClick={() => setShowCalendar(true)}
            className="flex items-center gap-2 text-rdy-black hover:bg-rdy-gray-200"
            data-testid="week-selector"
          >
            <CalendarIcon className="h-4 w-4" />
            <span className="font-medium" data-testid="selected-week">
              {weekRangeString}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextWeek}
            className="h-10 w-10 p-0 text-rdy-gray-400 hover:text-rdy-black"
            disabled={isCurrentWeek}
            data-testid="next-week-button"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Quick actions */}
        <div className="mb-4 flex items-center justify-end gap-2">
          {!isCurrentWeek && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToCurrentWeek}
              className="border-rdy-gray-200 bg-rdy-gray-100 text-rdy-gray-600 hover:bg-rdy-gray-200"
              data-testid="go-to-current-week"
            >
              Go to Current Week
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchSummary()}
            disabled={isLoading}
            className="h-8 w-8 p-0 text-rdy-gray-400 hover:text-rdy-black"
            data-testid="refresh-button"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12" data-testid="loading-state">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rdy-orange-500 border-t-transparent" />
          </div>
        )}

        {/* Share with Mentor card */}
        <div className="mb-4 rounded-xl bg-rdy-gray-100 p-4" data-testid="share-with-mentor-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rdy-orange-500/10">
                <Users className="h-5 w-5 text-rdy-orange-500" />
              </div>
              <div>
                <h3 className="font-medium text-rdy-black">Share with Mentor</h3>
                <p className="text-sm text-rdy-gray-400">
                  {privacySettings?.shareWeeklySummaryWithMentor
                    ? 'Your mentor can view your weekly summary'
                    : 'Enable to let your mentor see your progress'}
                </p>
              </div>
            </div>
            <Switch
              checked={privacySettings?.shareWeeklySummaryWithMentor ?? false}
              onCheckedChange={(checked) =>
                updatePrivacyMutation.mutate({ shareWeeklySummaryWithMentor: checked })
              }
              disabled={updatePrivacyMutation.isPending}
              data-testid="share-summary-toggle"
            />
          </div>
        </div>

        {/* Dashboard content */}
        {!isLoading && summaryData && (
          <div className="space-y-4" data-testid="dashboard-content">
            {/* Mood Barometer - Featured at top */}
            <MoodBarometer
              data={summaryData.moodBarometer}
              data-testid="mood-barometer-widget"
            />

            {/* Exercise Completion Stats */}
            <ExerciseCompletionStats
              stats={summaryData.exerciseStats}
              data-testid="exercise-stats-widget"
            />

            {/* Pattern Frequency Chart */}
            <PatternFrequencyChart
              stats={summaryData.patternStats}
              data-testid="pattern-chart-widget"
            />

            {/* Diary Highlights */}
            <DiaryHighlights
              stats={summaryData.diaryStats}
              data-testid="diary-highlights-widget"
            />

            {/* Week-over-Week Comparison */}
            {trendsData && trendsData.weeks.length >= 2 && (
              <WeekOverWeekComparison
                weeks={trendsData.weeks}
                currentWeek={weekStartISO}
                data-testid="week-comparison-widget"
              />
            )}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !summaryData && (
          <div
            className="rounded-xl bg-rdy-gray-100 p-8 text-center"
            data-testid="empty-state"
          >
            <p className="text-rdy-gray-400">No data available for this week</p>
            <p className="mt-2 text-sm text-rdy-gray-500">
              Start tracking exercises, patterns, and diary entries to see your weekly summary
            </p>
          </div>
        )}
      </div>

      {/* Calendar Dialog */}
      <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Week</DialogTitle>
            <DialogDescription className="text-rdy-gray-400">
              Choose a date to view that week&apos;s summary
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4" data-testid="calendar-dialog">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="rounded-xl border border-rdy-gray-200"
              disabled={(date) => date > new Date()}
            />
          </div>

          <Button
            onClick={goToCurrentWeek}
            variant="outline"
            className="mt-4 w-full border-rdy-gray-200 bg-rdy-gray-100 text-rdy-gray-600 hover:bg-rdy-gray-200"
            data-testid="today-button"
          >
            Go to Current Week
          </Button>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
