import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { format, addWeeks, subWeeks, startOfWeek, addDays } from 'date-fns';

// Mock tRPC
const mockUseQueryTheme = vi.fn();
const mockUseQueryExercises = vi.fn();
const mockToggleCompletionMutate = vi.fn();
const mockUpdateExerciseTimeMutate = vi.fn();
const mockRescheduleSeriesMutate = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    mentee: {
      getCurrentWeekTheme: {
        useQuery: () => mockUseQueryTheme(),
      },
      getExercisesForWeek: {
        useQuery: () => mockUseQueryExercises(),
      },
      toggleExerciseCompletion: {
        useMutation: () => ({
          mutate: mockToggleCompletionMutate,
          isPending: false,
        }),
      },
      updateExerciseTime: {
        useMutation: () => ({
          mutate: mockUpdateExerciseTimeMutate,
          isPending: false,
        }),
      },
      rescheduleExerciseSeries: {
        useMutation: () => ({
          mutate: mockRescheduleSeriesMutate,
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      mentee: {
        getCurrentWeekTheme: {
          invalidate: mockInvalidate,
        },
        getExercisesForWeek: {
          invalidate: mockInvalidate,
        },
        getExercisesForDate: {
          invalidate: mockInvalidate,
        },
      },
    }),
  },
}));

// Mock the mobile layout
vi.mock('@/components/mobile', () => ({
  MobileLayout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="mobile-layout">
      <header>{title}</header>
      {children}
    </div>
  ),
}));

// Mock the user provider and language provider
vi.mock('@/components/providers', () => ({
  useUser: () => ({
    user: {
      id: 'test-mentee-id',
      name: 'Test Mentee',
      email: 'mentee@test.com',
      roles: ['mentee'],
    },
  }),
  useLanguage: () => ({
    language: 'de',
    setLanguage: vi.fn(),
    toggleLanguage: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    t: <T extends string | null | undefined>(de: T, en: T): T => de,
  }),
}));

// Get current Monday
const today = new Date();
const currentMonday = startOfWeek(today, { weekStartsOn: 1 });

// Mock week theme data
const mockWeekThemeData = {
  monthTheme: {
    id: 'month-theme-1',
    titleDe: 'Innere Ruhe',
    titleEn: 'Inner Peace',
    descriptionDe: 'Finde deine innere Ruhe und Balance',
    descriptionEn: 'Find your inner peace and balance',
    herkunftDe: 'Die Praxis der inneren Ruhe hat ihre Wurzeln in jahrtausendealten Traditionen.',
    herkunftEn: 'The practice of inner peace has its roots in ancient traditions.',
    zielDe: 'Am Ende dieses Monats wirst du tiefe Entspannung erfahren können.',
    zielEn: 'By the end of this month, you will be able to experience deep relaxation.',
    imageUrl: null,
  },
  weekTheme: {
    id: 'week-theme-1',
    weekNumber: '1',
    titleDe: 'Achtsamkeit im Alltag',
    titleEn: 'Mindfulness in Daily Life',
    descriptionDe: 'Lerne Achtsamkeit in deinen Alltag zu integrieren',
    descriptionEn: 'Learn to integrate mindfulness into your daily life',
    herkunftDe: 'Achtsamkeit wurde aus buddhistischen Traditionen entwickelt.',
    herkunftEn: 'Mindfulness was developed from Buddhist traditions.',
    zielDe: 'Tägliche Achtsamkeitsübungen etablieren',
    zielEn: 'Establish daily mindfulness practices',
  },
  weekNumber: 1,
  levelNumber: 1,
};

// Mock exercises data - create exercises for each day
const createMockExercisesData = () => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(currentMonday, i);
    // Use format() to ensure consistent date key formatting with component
    const dateStr = format(date, 'yyyy-MM-dd');

    // Add exercises only on weekdays (Mon-Fri)
    if (i < 5) {
      days.push({
        date: dateStr,
        exercises: [
          {
            id: `scheduled-${i}-1`,
            scheduledAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 7, 0),
            completed: i < 2, // First two days completed
            completedAt: i < 2 ? new Date() : null,
            notes: null,
            exerciseId: 'exercise-1',
            classId: 'class-1',
            exercise: {
              id: 'exercise-1',
              type: 'video' as const,
              titleDe: 'Morgen Meditation',
              titleEn: 'Morning Meditation',
              descriptionDe: 'Eine beruhigende Morgenmeditation',
              descriptionEn: 'A calming morning meditation',
              durationMinutes: 15,
            },
            isObligatory: true,
          },
          {
            id: `scheduled-${i}-2`,
            scheduledAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 0),
            completed: i < 1, // Only first day completed
            completedAt: i < 1 ? new Date() : null,
            notes: null,
            exerciseId: 'exercise-2',
            classId: 'class-1',
            exercise: {
              id: 'exercise-2',
              type: 'audio' as const,
              titleDe: 'Abend Entspannung',
              titleEn: 'Evening Relaxation',
              descriptionDe: 'Entspannung vor dem Schlafengehen',
              descriptionEn: 'Relaxation before bed',
              durationMinutes: 10,
            },
            isObligatory: false,
          },
        ],
        totalCount: 2,
        completedCount: i < 2 ? (i < 1 ? 2 : 1) : 0,
      });
    } else {
      // Weekend - no exercises
      days.push({
        date: dateStr,
        exercises: [],
        totalCount: 0,
        completedCount: 0,
      });
    }
  }
  return {
    weekStartDate: currentMonday.toISOString(),
    days,
  };
};

const mockExercisesData = createMockExercisesData();

// Import the component after mocks
import MenteeWeeklyCalendarPage from '@/app/mentee/calendar/weekly/page';

describe('S6.9 - Mentee Weekly Calendar View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQueryTheme.mockReturnValue({
      data: mockWeekThemeData,
      isLoading: false,
    });
    mockUseQueryExercises.mockReturnValue({
      data: mockExercisesData,
      isLoading: false,
    });
  });

  describe('AC1: Weekly calendar grid', () => {
    it('renders weekly calendar view', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('mentee-weekly-calendar')).toBeInTheDocument();
    });

    it('displays a 7-day grid (Monday to Sunday)', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('weekly-calendar-grid')).toBeInTheDocument();

      // Check all day headers are present
      expect(screen.getByTestId('day-header-mon')).toBeInTheDocument();
      expect(screen.getByTestId('day-header-tue')).toBeInTheDocument();
      expect(screen.getByTestId('day-header-wed')).toBeInTheDocument();
      expect(screen.getByTestId('day-header-thu')).toBeInTheDocument();
      expect(screen.getByTestId('day-header-fri')).toBeInTheDocument();
      expect(screen.getByTestId('day-header-sat')).toBeInTheDocument();
      expect(screen.getByTestId('day-header-sun')).toBeInTheDocument();
    });

    it('displays day cells for each day of the week', () => {
      render(<MenteeWeeklyCalendarPage />);

      // Check that 7 day cells are rendered (now droppable-day instead of day-cell)
      const dayCells = screen.getAllByTestId(/^droppable-day-/);
      expect(dayCells).toHaveLength(7);
    });

    it('highlights today in the grid', () => {
      render(<MenteeWeeklyCalendarPage />);

      // Check that there's exactly one day marked as today (if today is within the current week view)
      const dayCells = screen.getAllByTestId(/^droppable-day-/);
      const todayCells = dayCells.filter(cell => cell.getAttribute('data-is-today') === 'true');

      // Since we're always showing the current week, today should be highlighted
      expect(todayCells.length).toBe(1);
    });

    it('shows exercise count on days with exercises', () => {
      render(<MenteeWeeklyCalendarPage />);

      // Monday should have 2 exercises
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');
      const exerciseCount = screen.getByTestId(`exercise-count-${mondayStr}`);
      expect(exerciseCount).toHaveTextContent('2');
    });

    it('shows completion indicator for completed days', () => {
      render(<MenteeWeeklyCalendarPage />);

      // First day (Monday) should be fully completed
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');
      expect(screen.getByTestId(`completed-indicator-${mondayStr}`)).toBeInTheDocument();
    });

    it('shows progress indicator for partially completed days', () => {
      render(<MenteeWeeklyCalendarPage />);

      // Tuesday should be partially completed (1/2)
      const tuesdayStr = format(addDays(currentMonday, 1), 'yyyy-MM-dd');
      const progressIndicator = screen.getByTestId(`progress-indicator-${tuesdayStr}`);
      expect(progressIndicator).toHaveTextContent('1/2');
    });
  });

  describe('AC2: Week theme displayed prominently', () => {
    it('displays week theme card', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('week-topic-card')).toBeInTheDocument();
    });

    it('shows week theme title', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('week-theme-title')).toHaveTextContent('Achtsamkeit im Alltag');
    });

    it('shows week theme description', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('week-theme-description')).toHaveTextContent(
        'Lerne Achtsamkeit in deinen Alltag zu integrieren'
      );
    });

    it('displays weekly progress percentage', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('weekly-progress')).toBeInTheDocument();
      // 3 completed out of 10 total = 30%
      expect(screen.getByText('30%')).toBeInTheDocument();
    });

    it('falls back to month theme when week theme is not available', () => {
      mockUseQueryTheme.mockReturnValue({
        data: {
          ...mockWeekThemeData,
          weekTheme: null,
        },
        isLoading: false,
      });

      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('week-theme-title')).toHaveTextContent('Innere Ruhe');
    });
  });

  describe('AC3: All scheduled exercises visible', () => {
    it('displays exercises summary section', () => {
      render(<MenteeWeeklyCalendarPage />);

      // Now uses drag-drop-exercises-summary testId
      expect(screen.getByTestId('drag-drop-exercises-summary')).toBeInTheDocument();
    });

    it('lists exercises grouped by day', () => {
      render(<MenteeWeeklyCalendarPage />);

      // Monday exercises should be visible
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');
      expect(screen.getByTestId(`day-exercises-${mondayStr}`)).toBeInTheDocument();
    });

    it('shows all exercises for each day', () => {
      render(<MenteeWeeklyCalendarPage />);

      // Should show morning and evening exercises
      expect(screen.getAllByText('Morgen Meditation')).toHaveLength(5); // 5 weekdays
      expect(screen.getAllByText('Abend Entspannung')).toHaveLength(5); // 5 weekdays
    });

    it('displays exercise completion status via draggable cards', () => {
      render(<MenteeWeeklyCalendarPage />);

      // Check that draggable exercise cards are present
      expect(screen.getByTestId('draggable-exercise-scheduled-0-1')).toBeInTheDocument();
      expect(screen.getByTestId('draggable-exercise-scheduled-0-2')).toBeInTheDocument();
    });

    it('highlights obligatory exercises', () => {
      render(<MenteeWeeklyCalendarPage />);

      // Obligatory exercises should have amber border class (now on draggable card)
      const obligatoryExercise = screen.getByTestId('draggable-exercise-scheduled-0-1');
      expect(obligatoryExercise).toHaveClass('border-amber-500');
    });

    it('shows empty state when no exercises for the week', () => {
      mockUseQueryExercises.mockReturnValue({
        data: {
          weekStartDate: currentMonday.toISOString(),
          days: Array(7)
            .fill(null)
            .map((_, i) => ({
              date: format(addDays(currentMonday, i), 'yyyy-MM-dd'),
              exercises: [],
              totalCount: 0,
              completedCount: 0,
            })),
        },
        isLoading: false,
      });

      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('no-exercises-state')).toBeInTheDocument();
      expect(screen.getByText('No exercises scheduled for this week')).toBeInTheDocument();
    });
  });

  describe('AC4: Tap to see day detail', () => {
    it('opens day detail dialog when tapping a day cell', async () => {
      render(<MenteeWeeklyCalendarPage />);

      const mondayStr = format(currentMonday, 'yyyy-MM-dd');
      // Now using droppable-day testId
      fireEvent.click(screen.getByTestId(`droppable-day-${mondayStr}`));

      await waitFor(() => {
        expect(screen.getByTestId('day-detail-title')).toBeInTheDocument();
      });
    });

    it('shows correct day name in dialog title', async () => {
      render(<MenteeWeeklyCalendarPage />);

      const mondayStr = format(currentMonday, 'yyyy-MM-dd');
      fireEvent.click(screen.getByTestId(`droppable-day-${mondayStr}`));

      await waitFor(() => {
        // The dialog should show the day name - check that it contains a weekday name
        const title = screen.getByTestId('day-detail-title');
        expect(title.textContent).toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
      });
    });

    it('shows exercises for selected day in detail view', async () => {
      render(<MenteeWeeklyCalendarPage />);

      const mondayStr = format(currentMonday, 'yyyy-MM-dd');
      fireEvent.click(screen.getByTestId(`droppable-day-${mondayStr}`));

      await waitFor(() => {
        expect(screen.getByTestId('day-detail-content')).toBeInTheDocument();
      });

      // Should show day's exercises in detail
      expect(screen.getByTestId('day-detail-exercise-scheduled-0-1')).toBeInTheDocument();
      expect(screen.getByTestId('day-detail-exercise-scheduled-0-2')).toBeInTheDocument();
    });

    it('shows completion checkboxes in day detail', async () => {
      render(<MenteeWeeklyCalendarPage />);

      const mondayStr = format(currentMonday, 'yyyy-MM-dd');
      fireEvent.click(screen.getByTestId(`droppable-day-${mondayStr}`));

      await waitFor(() => {
        expect(screen.getByTestId('day-detail-checkbox-scheduled-0-1')).toBeInTheDocument();
      });
    });

    it('can toggle completion from day detail', async () => {
      render(<MenteeWeeklyCalendarPage />);

      const mondayStr = format(currentMonday, 'yyyy-MM-dd');
      fireEvent.click(screen.getByTestId(`droppable-day-${mondayStr}`));

      await waitFor(() => {
        expect(screen.getByTestId('day-detail-checkbox-scheduled-0-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('day-detail-checkbox-scheduled-0-1'));

      expect(mockToggleCompletionMutate).toHaveBeenCalledWith({
        scheduledExerciseId: 'scheduled-0-1',
        completed: false, // Toggle from completed to not completed
      });
    });

    it('shows close button in day detail', async () => {
      render(<MenteeWeeklyCalendarPage />);

      const mondayStr = format(currentMonday, 'yyyy-MM-dd');
      fireEvent.click(screen.getByTestId(`droppable-day-${mondayStr}`));

      await waitFor(() => {
        expect(screen.getByTestId('close-day-detail-button')).toBeInTheDocument();
      });
    });

    it('closes dialog when clicking close button', async () => {
      render(<MenteeWeeklyCalendarPage />);

      const mondayStr = format(currentMonday, 'yyyy-MM-dd');
      fireEvent.click(screen.getByTestId(`droppable-day-${mondayStr}`));

      await waitFor(() => {
        expect(screen.getByTestId('day-detail-content')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('close-day-detail-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('day-detail-content')).not.toBeInTheDocument();
      });
    });
  });

  describe('AC5: Navigate between weeks', () => {
    it('displays week navigation buttons', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('prev-week-button')).toBeInTheDocument();
      expect(screen.getByTestId('next-week-button')).toBeInTheDocument();
    });

    it('displays current week date range', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('week-date-range')).toBeInTheDocument();
    });

    it('navigates to previous week when clicking prev button', () => {
      render(<MenteeWeeklyCalendarPage />);

      const prevWeek = subWeeks(currentMonday, 1);
      fireEvent.click(screen.getByTestId('prev-week-button'));

      const expectedStartDate = format(prevWeek, 'MMM d');
      expect(screen.getByTestId('week-date-range')).toHaveTextContent(expectedStartDate);
    });

    it('navigates to next week when clicking next button', () => {
      render(<MenteeWeeklyCalendarPage />);

      const nextWeek = addWeeks(currentMonday, 1);
      fireEvent.click(screen.getByTestId('next-week-button'));

      const expectedStartDate = format(nextWeek, 'MMM d');
      expect(screen.getByTestId('week-date-range')).toHaveTextContent(expectedStartDate);
    });

    it('shows "Back to Current Week" when not on current week', () => {
      render(<MenteeWeeklyCalendarPage />);

      // Navigate to next week
      fireEvent.click(screen.getByTestId('next-week-button'));

      expect(screen.getByTestId('current-week-button')).toBeInTheDocument();
      expect(screen.getByText('Back to Current Week')).toBeInTheDocument();
    });

    it('does not show "Back to Current Week" when on current week', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.queryByTestId('current-week-button')).not.toBeInTheDocument();
    });

    it('returns to current week when clicking "Back to Current Week"', () => {
      render(<MenteeWeeklyCalendarPage />);

      // Navigate away
      fireEvent.click(screen.getByTestId('next-week-button'));
      fireEvent.click(screen.getByTestId('next-week-button'));

      expect(screen.getByTestId('current-week-button')).toBeInTheDocument();

      // Click back to current week
      fireEvent.click(screen.getByTestId('current-week-button'));

      expect(screen.queryByTestId('current-week-button')).not.toBeInTheDocument();
    });

    it('supports swipe navigation to previous week', () => {
      render(<MenteeWeeklyCalendarPage />);

      const container = screen.getByTestId('mentee-weekly-calendar');

      // Simulate right swipe (go to previous week)
      fireEvent.touchStart(container, { touches: [{ clientX: 100, clientY: 200 }] });
      fireEvent.touchMove(container, { touches: [{ clientX: 200, clientY: 200 }] });
      fireEvent.touchEnd(container);

      const prevWeek = subWeeks(currentMonday, 1);
      const expectedStartDate = format(prevWeek, 'MMM d');
      expect(screen.getByTestId('week-date-range')).toHaveTextContent(expectedStartDate);
    });

    it('supports swipe navigation to next week', () => {
      render(<MenteeWeeklyCalendarPage />);

      const container = screen.getByTestId('mentee-weekly-calendar');

      // Simulate left swipe (go to next week)
      fireEvent.touchStart(container, { touches: [{ clientX: 200, clientY: 200 }] });
      fireEvent.touchMove(container, { touches: [{ clientX: 100, clientY: 200 }] });
      fireEvent.touchEnd(container);

      const nextWeek = addWeeks(currentMonday, 1);
      const expectedStartDate = format(nextWeek, 'MMM d');
      expect(screen.getByTestId('week-date-range')).toHaveTextContent(expectedStartDate);
    });
  });

  describe('Loading and empty states', () => {
    it('shows loading indicator when fetching data', () => {
      mockUseQueryTheme.mockReturnValue({
        data: null,
        isLoading: true,
      });
      mockUseQueryExercises.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<MenteeWeeklyCalendarPage />);

      // Calendar container should still be present
      expect(screen.getByTestId('mentee-weekly-calendar')).toBeInTheDocument();
    });

    it('does not render calendar grid while loading', () => {
      mockUseQueryTheme.mockReturnValue({
        data: null,
        isLoading: true,
      });
      mockUseQueryExercises.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<MenteeWeeklyCalendarPage />);

      expect(screen.queryByTestId('weekly-calendar-grid')).not.toBeInTheDocument();
    });
  });

  describe('Mobile optimizations', () => {
    it('renders within MobileLayout wrapper', () => {
      render(<MenteeWeeklyCalendarPage />);

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
    });

    it('has pull to refresh capability', async () => {
      render(<MenteeWeeklyCalendarPage />);

      const container = screen.getByTestId('mentee-weekly-calendar');

      // Simulate pull down
      fireEvent.touchStart(container, { touches: [{ clientX: 200, clientY: 100 }] });
      fireEvent.touchMove(container, { touches: [{ clientX: 200, clientY: 200 }] });
      fireEvent.touchEnd(container);

      // Should trigger invalidate if pulled enough
      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalled();
      });
    });

    it('has touch-friendly day cells', () => {
      render(<MenteeWeeklyCalendarPage />);

      const mondayStr = format(currentMonday, 'yyyy-MM-dd');
      const dayCell = screen.getByTestId(`droppable-day-${mondayStr}`);
      expect(dayCell).toHaveClass('rounded-xl', 'p-2');
    });
  });

  describe('Exercise completion', () => {
    it('shows completed state via draggable cards', () => {
      render(<MenteeWeeklyCalendarPage />);

      // The draggable cards should be present with exercises
      expect(screen.getByTestId('draggable-exercise-scheduled-0-1')).toBeInTheDocument();
    });

    it('shows strikethrough on completed exercises', () => {
      render(<MenteeWeeklyCalendarPage />);

      // The completed exercises should have line-through styling
      // Monday's exercises are completed
      const exerciseItem = screen.getByTestId('draggable-exercise-scheduled-0-1');
      const titleElement = exerciseItem.querySelector('.line-through');
      expect(titleElement).toBeInTheDocument();
    });
  });
});
