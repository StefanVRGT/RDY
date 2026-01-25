'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { MobileLayout } from '@/components/mobile';
import { trpc } from '@/lib/trpc/client';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  Circle,
  Calendar,
  Target,
  X,
  Clock,
  Star,
  Video,
  Music,
  FileText,
  Play,
  Info,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  format,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  isSameDay,
  eachDayOfInterval,
} from 'date-fns';
import { DragDropWeeklyCalendar, type DayData } from '@/components/drag-drop';
import { useLanguage } from '@/components/providers';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { SchwerpunktDetailDialog } from '@/components/schwerpunkt';

// Day info type for the calendar grid
type DayInfo = {
  date: string;
  exercises: Array<{
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
    } | null;
    isObligatory: boolean;
  }>;
  totalCount: number;
  completedCount: number;
};

// Format time for display
function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

// Get icon for exercise type
function ExerciseTypeIcon({
  type,
  className,
}: {
  type: 'video' | 'audio' | 'text';
  className?: string;
}) {
  switch (type) {
    case 'video':
      return <Video className={className} />;
    case 'audio':
      return <Music className={className} />;
    case 'text':
      return <FileText className={className} />;
  }
}

export default function MenteeWeeklyCalendarPage() {
  // Get Monday of current week as start
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [showSchwerpunktDetail, setShowSchwerpunktDetail] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Language support
  const { t, language } = useLanguage();

  // Swipe handling refs and state
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Pull to refresh state
  const [touchStartPull, setTouchStartPull] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // tRPC queries
  const utils = trpc.useUtils();

  const { data: weekThemeData, isLoading: isLoadingTheme } =
    trpc.mentee.getCurrentWeekTheme.useQuery({
      weekStartDate: currentWeekStart.toISOString(),
    });

  const { data: weekExercisesData, isLoading: isLoadingExercises } =
    trpc.mentee.getExercisesForWeek.useQuery({
      weekStartDate: currentWeekStart.toISOString(),
    });

  // Toggle completion mutation
  const toggleCompletion = trpc.mentee.toggleExerciseCompletion.useMutation({
    onSuccess: () => {
      utils.mentee.getExercisesForWeek.invalidate();
    },
  });

  const isLoading = isLoadingTheme || isLoadingExercises;

  // Get week days for the grid
  const weekDays = useMemo(() => {
    const start = currentWeekStart;
    const end = endOfWeek(start, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentWeekStart]);

  // Map exercises data to days
  const daysData = useMemo(() => {
    if (!weekExercisesData?.days) {
      return weekDays.map(date => ({
        date: date.toISOString().split('T')[0],
        exercises: [],
        totalCount: 0,
        completedCount: 0,
      }));
    }

    const dataMap = new Map(weekExercisesData.days.map(d => [d.date, d]));
    return weekDays.map(date => {
      const dateKey = date.toISOString().split('T')[0];
      return (
        dataMap.get(dateKey) || {
          date: dateKey,
          exercises: [],
          totalCount: 0,
          completedCount: 0,
        }
      );
    });
  }, [weekDays, weekExercisesData]);

  // Calculate weekly progress
  const weeklyProgress = useMemo(() => {
    const total = daysData.reduce((sum, d) => sum + d.totalCount, 0);
    const completed = daysData.reduce((sum, d) => sum + d.completedCount, 0);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [daysData]);

  // Navigation handlers
  const goToPreviousWeek = useCallback(() => {
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, []);

  // Handle day tap - open day detail
  const handleDayTap = useCallback((day: DayInfo) => {
    setSelectedDay(day);
    setShowDayDetail(true);
  }, []);

  // Handle completion toggle
  const handleToggleCompletion = useCallback(
    (exerciseId: string, currentCompleted: boolean, e: React.MouseEvent) => {
      e.stopPropagation();
      toggleCompletion.mutate({
        scheduledExerciseId: exerciseId,
        completed: !currentCompleted,
      });
    },
    [toggleCompletion]
  );

  // Swipe handlers for week navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollTop = contentRef.current?.scrollTop ?? 0;

    // Pull to refresh check
    if (scrollTop <= 0) {
      setTouchStartPull(e.touches[0].clientY);
    }

    // Swipe navigation check
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Pull to refresh
      if (touchStartPull !== null) {
        const currentTouch = e.touches[0].clientY;
        const distance = currentTouch - touchStartPull;
        if (distance > 0) {
          setPullDistance(Math.min(distance, 100));
        }
      }

      // Swipe navigation
      if (touchStartX.current === null || touchStartY.current === null) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = currentX - touchStartX.current;
      const diffY = currentY - touchStartY.current;

      // Only allow horizontal swipe if horizontal movement is greater than vertical
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        setSwipeOffset(diffX);
      }
    },
    [touchStartPull]
  );

  const handleTouchEnd = useCallback(async () => {
    // Pull to refresh
    if (pullDistance >= 60 && !isRefreshing) {
      setIsRefreshing(true);
      await Promise.all([
        utils.mentee.getCurrentWeekTheme.invalidate(),
        utils.mentee.getExercisesForWeek.invalidate(),
      ]);
      setIsRefreshing(false);
    }
    setTouchStartPull(null);
    setPullDistance(0);

    // Swipe navigation
    const threshold = 50;
    if (Math.abs(swipeOffset) > threshold) {
      if (swipeOffset > 0) {
        goToPreviousWeek();
      } else {
        goToNextWeek();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    setSwipeOffset(0);
  }, [pullDistance, isRefreshing, swipeOffset, goToPreviousWeek, goToNextWeek, utils]);

  // Check if showing current week
  const isCurrentWeek = useMemo(() => {
    const today = new Date();
    const currentWeekMonday = startOfWeek(today, { weekStartsOn: 1 });
    return isSameDay(currentWeekStart, currentWeekMonday);
  }, [currentWeekStart]);

  // Get week end date for display
  const weekEndDate = useMemo(
    () => endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    [currentWeekStart]
  );

  return (
    <MobileLayout title="Weekly Schedule" showNotifications>
      <div
        ref={contentRef}
        className="flex flex-col px-4 py-4"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="mentee-weekly-calendar"
      >
        {/* Pull to refresh indicator */}
        {(pullDistance > 0 || isRefreshing) && (
          <div
            className="flex items-center justify-center py-4 transition-all duration-200"
            style={{ height: isRefreshing ? 48 : pullDistance * 0.5 }}
            data-testid="pull-to-refresh-indicator"
          >
            <RefreshCw
              className={`h-6 w-6 text-twilight-400 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{
                transform: isRefreshing ? 'rotate(0deg)' : `rotate(${pullDistance * 3.6}deg)`,
                opacity: isRefreshing ? 1 : Math.min(pullDistance / 60, 1),
              }}
            />
          </div>
        )}

        {/* Week Header with Navigation */}
        <div className="mb-4 flex items-center justify-between" data-testid="week-header">
          <button
            onClick={goToPreviousWeek}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-white transition-colors hover:bg-gray-700"
            aria-label="Previous week"
            data-testid="prev-week-button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <h2 className="text-xl font-bold text-white" data-testid="week-date-range">
              {format(currentWeekStart, 'MMM d')} - {format(weekEndDate, 'MMM d, yyyy')}
            </h2>
            {weekThemeData?.weekNumber && (
              <p className="text-sm text-gray-400" data-testid="week-number">
                Week {weekThemeData.weekNumber}
              </p>
            )}
            {!isCurrentWeek && (
              <button
                onClick={goToCurrentWeek}
                className="mt-1 text-sm text-twilight-400 hover:text-twilight-300"
                data-testid="current-week-button"
              >
                Back to Current Week
              </button>
            )}
          </div>

          <button
            onClick={goToNextWeek}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-white transition-colors hover:bg-gray-700"
            aria-label="Next week"
            data-testid="next-week-button"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Weekly Topic Card */}
        {weekThemeData && (
          <div
            className="mb-6 rounded-xl bg-gradient-to-br from-twilight-600 to-twilight-800 p-4"
            data-testid="week-topic-card"
          >
            {/* Header with language toggle */}
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-twilight-200">
                {weekThemeData.weekTheme
                  ? language === 'de'
                    ? 'Wochenthema'
                    : 'Week Theme'
                  : language === 'de'
                    ? 'Monatsthema'
                    : 'Month Theme'}
              </p>
              <LanguageToggle size="sm" data-testid="week-card-language-toggle" />
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-twilight-500/30">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white" data-testid="week-theme-title">
                  {t(
                    weekThemeData.weekTheme?.titleDe || weekThemeData.monthTheme?.titleDe || '',
                    weekThemeData.weekTheme?.titleEn || weekThemeData.monthTheme?.titleEn
                  )}
                </h3>
                {(weekThemeData.weekTheme?.descriptionDe ||
                  weekThemeData.monthTheme?.descriptionDe ||
                  weekThemeData.weekTheme?.descriptionEn ||
                  weekThemeData.monthTheme?.descriptionEn) && (
                  <p
                    className="mt-1 line-clamp-2 text-sm text-twilight-200"
                    data-testid="week-theme-description"
                  >
                    {t(
                      weekThemeData.weekTheme?.descriptionDe ||
                        weekThemeData.monthTheme?.descriptionDe,
                      weekThemeData.weekTheme?.descriptionEn ||
                        weekThemeData.monthTheme?.descriptionEn
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Herkunft (Background) preview */}
            {(weekThemeData.weekTheme?.herkunftDe ||
              weekThemeData.monthTheme?.herkunftDe ||
              weekThemeData.weekTheme?.herkunftEn ||
              weekThemeData.monthTheme?.herkunftEn) && (
              <div
                className="mt-3 rounded-lg bg-twilight-900/30 p-3"
                data-testid="week-herkunft-preview"
              >
                <div className="mb-1 flex items-center gap-2">
                  <Compass className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-medium uppercase tracking-wide text-amber-400">
                    {language === 'de' ? 'Herkunft' : 'Background'}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-twilight-100" data-testid="herkunft-text">
                  {t(
                    weekThemeData.weekTheme?.herkunftDe || weekThemeData.monthTheme?.herkunftDe,
                    weekThemeData.weekTheme?.herkunftEn || weekThemeData.monthTheme?.herkunftEn
                  )}
                </p>
              </div>
            )}

            {/* Ziel (Goal) preview */}
            {(weekThemeData.weekTheme?.zielDe ||
              weekThemeData.monthTheme?.zielDe ||
              weekThemeData.weekTheme?.zielEn ||
              weekThemeData.monthTheme?.zielEn) && (
              <div
                className="mt-3 rounded-lg bg-twilight-900/30 p-3"
                data-testid="week-ziel-preview"
              >
                <div className="mb-1 flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-xs font-medium uppercase tracking-wide text-green-400">
                    {language === 'de' ? 'Ziel' : 'Goal'}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-twilight-100" data-testid="ziel-text">
                  {t(
                    weekThemeData.weekTheme?.zielDe || weekThemeData.monthTheme?.zielDe,
                    weekThemeData.weekTheme?.zielEn || weekThemeData.monthTheme?.zielEn
                  )}
                </p>
              </div>
            )}

            {/* View Monthly Schwerpunkt Details Button */}
            <button
              onClick={() => setShowSchwerpunktDetail(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-twilight-500/20 py-2 text-sm font-medium text-twilight-200 transition-colors hover:bg-twilight-500/30"
              data-testid="view-schwerpunkt-details-button"
            >
              <Info className="h-4 w-4" />
              {language === 'de' ? 'Schwerpunkt Details anzeigen' : 'View Focus Area Details'}
            </button>

            {/* Weekly Progress */}
            <div className="mt-4 border-t border-twilight-500/30 pt-3" data-testid="weekly-progress">
              <div className="flex items-center justify-between">
                <span className="text-sm text-twilight-200">
                  {language === 'de' ? 'Wochenfortschritt' : 'Weekly Progress'}
                </span>
                <span className="text-lg font-bold text-white">{weeklyProgress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-twilight-900/50">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${weeklyProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-twilight-400" />
          </div>
        )}

        {/* Drag-and-Drop Weekly Calendar with Exercises */}
        {!isLoading && (
          <div
            className="transition-transform duration-200"
            style={{ transform: `translateX(${swipeOffset * 0.3}px)` }}
            data-testid="weekly-calendar-grid"
          >
            <DragDropWeeklyCalendar
              weekDays={weekDays}
              daysData={daysData as DayData[]}
              onDayClick={handleDayTap}
            />
          </div>
        )}
      </div>

      {/* Day Detail Dialog */}
      <Dialog open={showDayDetail} onOpenChange={setShowDayDetail}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-gray-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="day-detail-title">
              <Calendar className="h-5 w-5" />
              {selectedDay &&
                format(new Date(selectedDay.date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
            {selectedDay && (
              <DialogDescription className="text-gray-400">
                {selectedDay.totalCount === 0
                  ? language === 'de'
                    ? 'Keine Übungen geplant'
                    : 'No exercises scheduled'
                  : language === 'de'
                    ? `${selectedDay.completedCount} von ${selectedDay.totalCount} Übungen abgeschlossen`
                    : `${selectedDay.completedCount} of ${selectedDay.totalCount} exercises completed`}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="mt-4 space-y-3" data-testid="day-detail-content">
            {selectedDay?.exercises.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                {language === 'de'
                  ? 'Keine Übungen für diesen Tag geplant'
                  : 'No exercises scheduled for this day'}
              </div>
            ) : (
              selectedDay?.exercises.map(ex => (
                <div
                  key={ex.id}
                  className={`flex items-center gap-3 rounded-xl p-4 ${
                    ex.isObligatory
                      ? 'border-l-4 border-amber-500 bg-gray-800'
                      : 'bg-gray-800'
                  }`}
                  data-testid={`day-detail-exercise-${ex.id}`}
                >
                  <button
                    onClick={e => handleToggleCompletion(ex.id, ex.completed, e)}
                    className="flex-shrink-0"
                    data-testid={`day-detail-checkbox-${ex.id}`}
                  >
                    {ex.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <Circle className="h-6 w-6 text-gray-600 hover:text-gray-400" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={`font-medium ${
                          ex.completed ? 'text-gray-400 line-through' : 'text-white'
                        }`}
                      >
                        {t(ex.exercise?.titleDe, ex.exercise?.titleEn) || (language === 'de' ? 'Unbekannte Übung' : 'Unknown Exercise')}
                      </p>
                      {ex.isObligatory && <Star className="h-4 w-4 text-amber-400" />}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(ex.scheduledAt)}
                      </span>
                      {ex.exercise?.durationMinutes && (
                        <span>{ex.exercise.durationMinutes} min</span>
                      )}
                      {ex.exercise && (
                        <ExerciseTypeIcon type={ex.exercise.type} className="h-3 w-3" />
                      )}
                    </div>
                  </div>
                  {(ex.exercise?.type === 'video' || ex.exercise?.type === 'audio') && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-twilight-500/20">
                      <Play className="h-4 w-4 text-twilight-400" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="mt-4">
            <Button
              onClick={() => setShowDayDetail(false)}
              className="w-full bg-twilight-600 text-white hover:bg-twilight-500"
              data-testid="close-day-detail-button"
            >
              <X className="mr-2 h-4 w-4" />
              {language === 'de' ? 'Schließen' : 'Close'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Monthly Schwerpunkt Detail Dialog */}
      {weekThemeData && (
        <SchwerpunktDetailDialog
          open={showSchwerpunktDetail}
          onOpenChange={setShowSchwerpunktDetail}
          monthTheme={weekThemeData.monthTheme}
          weekTheme={weekThemeData.weekTheme}
          monthNumber={weekThemeData.monthNumber}
          weekNumber={weekThemeData.weekNumber}
        />
      )}
    </MobileLayout>
  );
}
