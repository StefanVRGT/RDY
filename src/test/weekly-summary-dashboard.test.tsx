import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock tRPC queries
const mockGetWeeklySummaryQuery = vi.fn();
const mockGetWeeklyTrendsQuery = vi.fn();
const mockRefetch = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    weeklySummary: {
      getWeeklySummary: {
        useQuery: () => mockGetWeeklySummaryQuery(),
      },
      getWeeklyTrends: {
        useQuery: () => mockGetWeeklyTrendsQuery(),
      },
    },
    useUtils: () => ({}),
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

// Mock Calendar component
vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect, selected }: { onSelect: (date: Date) => void; selected?: Date }) => (
    <div data-testid="mock-calendar">
      <button
        data-testid="select-today"
        onClick={() => onSelect(new Date())}
      >
        Select Today
      </button>
      {selected && <span data-testid="selected-date">{format(selected, 'yyyy-MM-dd')}</span>}
    </div>
  ),
}));

// Create mock data
const today = new Date();
const weekStart = startOfWeek(today, { weekStartsOn: 1 });

const mockSummaryData = {
  weekStartDate: weekStart.toISOString(),
  weekEndDate: addWeeks(weekStart, 1).toISOString(),
  exerciseStats: {
    totalExercises: 10,
    completedExercises: 7,
    completionRate: 70,
    previousWeekTotal: 8,
    previousWeekCompleted: 5,
    previousWeekRate: 62,
    byType: {
      video: { total: 4, completed: 3 },
      audio: { total: 3, completed: 2 },
      text: { total: 3, completed: 2 },
    },
    byDay: [
      { date: '2025-01-20', total: 2, completed: 2 },
      { date: '2025-01-21', total: 2, completed: 1 },
      { date: '2025-01-22', total: 2, completed: 2 },
      { date: '2025-01-23', total: 1, completed: 1 },
      { date: '2025-01-24', total: 1, completed: 1 },
      { date: '2025-01-25', total: 1, completed: 0 },
      { date: '2025-01-26', total: 1, completed: 0 },
    ],
  },
  patternStats: {
    summary: {
      stress: { total: 10, strong: 3, weak: 4, none: 3, avgIntensity: 1.0, prevWeekTotal: 8, prevWeekStrong: 2 },
      energy: { total: 8, strong: 5, weak: 2, none: 1, avgIntensity: 1.5, prevWeekTotal: 6, prevWeekStrong: 3 },
      mood: { total: 12, strong: 6, weak: 4, none: 2, avgIntensity: 1.33, prevWeekTotal: 10, prevWeekStrong: 5 },
      focus: { total: 6, strong: 2, weak: 3, none: 1, avgIntensity: 1.17, prevWeekTotal: 5, prevWeekStrong: 2 },
      anxiety: { total: 4, strong: 1, weak: 2, none: 1, avgIntensity: 1.0, prevWeekTotal: 6, prevWeekStrong: 3 },
      motivation: { total: 9, strong: 4, weak: 3, none: 2, avgIntensity: 1.22, prevWeekTotal: 7, prevWeekStrong: 3 },
    },
    byDay: [
      { date: '2025-01-20', patterns: { stress: { strong: 1, weak: 1, none: 0 }, energy: { strong: 1, weak: 0, none: 0 }, mood: { strong: 1, weak: 1, none: 0 }, focus: { strong: 0, weak: 1, none: 0 }, anxiety: { strong: 0, weak: 1, none: 0 }, motivation: { strong: 1, weak: 0, none: 0 } } },
      { date: '2025-01-21', patterns: { stress: { strong: 0, weak: 1, none: 1 }, energy: { strong: 1, weak: 0, none: 0 }, mood: { strong: 1, weak: 0, none: 0 }, focus: { strong: 1, weak: 0, none: 0 }, anxiety: { strong: 0, weak: 0, none: 0 }, motivation: { strong: 1, weak: 1, none: 0 } } },
      { date: '2025-01-22', patterns: { stress: { strong: 1, weak: 0, none: 0 }, energy: { strong: 1, weak: 1, none: 0 }, mood: { strong: 1, weak: 1, none: 0 }, focus: { strong: 0, weak: 1, none: 0 }, anxiety: { strong: 0, weak: 0, none: 1 }, motivation: { strong: 0, weak: 1, none: 0 } } },
      { date: '2025-01-23', patterns: { stress: { strong: 0, weak: 1, none: 1 }, energy: { strong: 1, weak: 0, none: 0 }, mood: { strong: 1, weak: 0, none: 1 }, focus: { strong: 0, weak: 0, none: 0 }, anxiety: { strong: 1, weak: 0, none: 0 }, motivation: { strong: 1, weak: 0, none: 1 } } },
      { date: '2025-01-24', patterns: { stress: { strong: 0, weak: 0, none: 1 }, energy: { strong: 0, weak: 1, none: 0 }, mood: { strong: 1, weak: 1, none: 0 }, focus: { strong: 1, weak: 0, none: 1 }, anxiety: { strong: 0, weak: 1, none: 0 }, motivation: { strong: 1, weak: 0, none: 0 } } },
      { date: '2025-01-25', patterns: { stress: { strong: 1, weak: 0, none: 0 }, energy: { strong: 0, weak: 0, none: 1 }, mood: { strong: 0, weak: 1, none: 1 }, focus: { strong: 0, weak: 1, none: 0 }, anxiety: { strong: 0, weak: 0, none: 0 }, motivation: { strong: 0, weak: 1, none: 0 } } },
      { date: '2025-01-26', patterns: { stress: { strong: 0, weak: 1, none: 0 }, energy: { strong: 1, weak: 0, none: 0 }, mood: { strong: 1, weak: 0, none: 0 }, focus: { strong: 0, weak: 0, none: 0 }, anxiety: { strong: 0, weak: 0, none: 0 }, motivation: { strong: 0, weak: 0, none: 1 } } },
    ],
    totalEntries: 49,
  },
  moodBarometer: {
    score: 65,
    positiveScore: 35,
    negativeScore: 14,
    trend: 'positive' as const,
  },
  diaryStats: {
    totalEntries: 5,
    previousWeekEntries: 4,
    byType: { text: 3, voice: 1, mixed: 1 },
    byDay: [
      { date: '2025-01-20', count: 1 },
      { date: '2025-01-21', count: 1 },
      { date: '2025-01-22', count: 0 },
      { date: '2025-01-23', count: 1 },
      { date: '2025-01-24', count: 1 },
      { date: '2025-01-25', count: 1 },
      { date: '2025-01-26', count: 0 },
    ],
    highlights: [
      { id: 'h1', preview: 'Great progress on meditation today...', entryDate: new Date('2025-01-25'), entryType: 'text' },
      { id: 'h2', preview: 'Feeling more focused after the exercises...', entryDate: new Date('2025-01-24'), entryType: 'text' },
      { id: 'h3', preview: 'Voice note about weekly reflection...', entryDate: new Date('2025-01-23'), entryType: 'voice' },
    ],
  },
};

const mockTrendsData = {
  weeks: [
    { weekStart: subWeeks(weekStart, 3).toISOString(), exerciseCompletionRate: 55, moodScore: 48, diaryEntries: 3, totalPatternEntries: 30 },
    { weekStart: subWeeks(weekStart, 2).toISOString(), exerciseCompletionRate: 60, moodScore: 52, diaryEntries: 4, totalPatternEntries: 35 },
    { weekStart: subWeeks(weekStart, 1).toISOString(), exerciseCompletionRate: 62, moodScore: 58, diaryEntries: 4, totalPatternEntries: 40 },
    { weekStart: weekStart.toISOString(), exerciseCompletionRate: 70, moodScore: 65, diaryEntries: 5, totalPatternEntries: 49 },
  ],
  currentWeek: weekStart.toISOString(),
};

// Import the component after mocks
import WeeklySummaryPage from '@/app/mentee/weekly-summary/page';

describe('S11.4 - Weekly Summary Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWeeklySummaryQuery.mockReturnValue({
      data: mockSummaryData,
      isLoading: false,
      refetch: mockRefetch,
    });
    mockGetWeeklyTrendsQuery.mockReturnValue({
      data: mockTrendsData,
      isLoading: false,
    });
  });

  describe('AC1: Exercise completion stats', () => {
    it('displays the exercise completion stats widget', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('exercise-completion-stats')).toBeInTheDocument();
    });

    it('shows the completion rate percentage', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('completion-rate')).toHaveTextContent('70%');
    });

    it('shows completed and total exercise counts', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('completed-count')).toHaveTextContent('7');
      expect(screen.getByTestId('total-count')).toHaveTextContent('10');
    });

    it('shows previous week completion rate', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('previous-week-rate')).toHaveTextContent('62%');
    });

    it('shows trend indicator comparing to previous week', () => {
      render(<WeeklySummaryPage />);

      const trend = screen.getByTestId('completion-trend');
      expect(trend).toBeInTheDocument();
      expect(trend).toHaveTextContent('8%'); // 70 - 62 = 8% increase
    });

    it('displays daily completion bars', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('daily-bars')).toBeInTheDocument();
      // Should have 7 bars for 7 days
      for (let i = 0; i < 7; i++) {
        expect(screen.getByTestId(`daily-bar-${i}`)).toBeInTheDocument();
      }
    });

    it('displays completion by exercise type', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('by-type-breakdown')).toBeInTheDocument();
      expect(screen.getByTestId('type-video')).toBeInTheDocument();
      expect(screen.getByTestId('type-audio')).toBeInTheDocument();
      expect(screen.getByTestId('type-text')).toBeInTheDocument();
    });
  });

  describe('AC2: Mood/emotional highlights from diary', () => {
    it('displays the diary highlights widget', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('diary-highlights')).toBeInTheDocument();
    });

    it('shows total diary entry count', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('total-entries')).toHaveTextContent('5');
    });

    it('shows previous week entry count for comparison', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('previous-entries')).toHaveTextContent('4');
    });

    it('shows trend indicator for diary entries', () => {
      render(<WeeklySummaryPage />);

      const trend = screen.getByTestId('diary-trend');
      expect(trend).toBeInTheDocument();
      expect(trend).toHaveTextContent('+1'); // 5 - 4 = +1
    });

    it('displays daily activity bars', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('diary-daily-bars')).toBeInTheDocument();
    });

    it('shows entry types breakdown', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('diary-by-type')).toBeInTheDocument();
      expect(screen.getByTestId('diary-type-text')).toBeInTheDocument();
      expect(screen.getByTestId('diary-type-voice')).toBeInTheDocument();
      expect(screen.getByTestId('diary-type-mixed')).toBeInTheDocument();
    });

    it('displays recent diary highlights', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('diary-recent-highlights')).toBeInTheDocument();
      expect(screen.getByTestId('highlight-h1')).toBeInTheDocument();
      expect(screen.getByTestId('highlight-h2')).toBeInTheDocument();
      expect(screen.getByTestId('highlight-h3')).toBeInTheDocument();
    });
  });

  describe('AC3: Pattern frequency charts', () => {
    it('displays the pattern frequency chart widget', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('pattern-frequency-chart')).toBeInTheDocument();
    });

    it('shows all pattern types', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('pattern-bar-stress')).toBeInTheDocument();
      expect(screen.getByTestId('pattern-bar-energy')).toBeInTheDocument();
      expect(screen.getByTestId('pattern-bar-mood')).toBeInTheDocument();
      expect(screen.getByTestId('pattern-bar-focus')).toBeInTheDocument();
      expect(screen.getByTestId('pattern-bar-anxiety')).toBeInTheDocument();
      expect(screen.getByTestId('pattern-bar-motivation')).toBeInTheDocument();
    });

    it('shows entry counts for each pattern', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('count-stress')).toHaveTextContent('10');
      expect(screen.getByTestId('count-energy')).toHaveTextContent('8');
      expect(screen.getByTestId('count-mood')).toHaveTextContent('12');
    });

    it('shows change from previous week', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('change-stress')).toHaveTextContent('+2'); // 10 - 8
      expect(screen.getByTestId('change-energy')).toHaveTextContent('+2'); // 8 - 6
      expect(screen.getByTestId('change-mood')).toHaveTextContent('+2'); // 12 - 10
    });

    it('displays intensity legend', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('intensity-legend')).toBeInTheDocument();
    });

    it('shows weekly heatmap', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('weekly-heatmap')).toBeInTheDocument();
    });

    it('shows total pattern entries', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('total-pattern-entries')).toHaveTextContent('49');
    });
  });

  describe('AC4: Week-over-week comparison', () => {
    it('displays the week-over-week comparison widget', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('week-over-week-comparison')).toBeInTheDocument();
    });

    it('shows summary cards for key metrics', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('summary-cards')).toBeInTheDocument();
      expect(screen.getByTestId('exercise-summary')).toBeInTheDocument();
      expect(screen.getByTestId('mood-summary')).toBeInTheDocument();
      expect(screen.getByTestId('diary-summary')).toBeInTheDocument();
      expect(screen.getByTestId('pattern-summary')).toBeInTheDocument();
    });

    it('displays exercise completion trend chart', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('exercise-trend-chart')).toBeInTheDocument();
    });

    it('displays mood score trend chart', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('mood-trend-chart')).toBeInTheDocument();
    });

    it('displays activity trend chart', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('activity-trend-chart')).toBeInTheDocument();
    });

    it('shows trend bars for each week', () => {
      render(<WeeklySummaryPage />);

      // Should have 4 weeks of data
      for (let i = 0; i < 4; i++) {
        expect(screen.getByTestId(`exercise-bar-${i}`)).toBeInTheDocument();
        expect(screen.getByTestId(`mood-bar-${i}`)).toBeInTheDocument();
        expect(screen.getByTestId(`activity-bar-${i}`)).toBeInTheDocument();
      }
    });
  });

  describe('AC5: Mood barometer visualization', () => {
    it('displays the mood barometer widget', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('mood-barometer')).toBeInTheDocument();
    });

    it('shows the mood score', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('mood-score')).toHaveTextContent('65');
    });

    it('shows the mood label based on score', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('mood-label')).toHaveTextContent('Good');
    });

    it('displays a mood description', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('mood-description')).toBeInTheDocument();
    });

    it('shows the gauge visualization', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('gauge-container')).toBeInTheDocument();
      expect(screen.getByTestId('gauge-progress')).toBeInTheDocument();
      expect(screen.getByTestId('gauge-needle')).toBeInTheDocument();
    });

    it('displays positive/negative score breakdown', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('mood-breakdown')).toBeInTheDocument();
      expect(screen.getByTestId('positive-score')).toHaveTextContent('35');
      expect(screen.getByTestId('negative-score')).toHaveTextContent('14');
    });

    it('shows positive/negative balance bar', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('positive-bar')).toBeInTheDocument();
      expect(screen.getByTestId('negative-bar')).toBeInTheDocument();
    });

    it('displays mood zones legend', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('mood-legend')).toBeInTheDocument();
    });
  });

  describe('Week navigation', () => {
    it('displays the week navigation controls', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('week-navigation')).toBeInTheDocument();
      expect(screen.getByTestId('prev-week-button')).toBeInTheDocument();
      expect(screen.getByTestId('next-week-button')).toBeInTheDocument();
      expect(screen.getByTestId('week-selector')).toBeInTheDocument();
    });

    it('shows the selected week range', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('selected-week')).toBeInTheDocument();
    });

    it('navigates to previous week when clicking prev button', async () => {
      render(<WeeklySummaryPage />);

      const prevButton = screen.getByTestId('prev-week-button');
      const initialWeek = screen.getByTestId('selected-week').textContent;

      fireEvent.click(prevButton);

      await waitFor(() => {
        const newWeek = screen.getByTestId('selected-week').textContent;
        expect(newWeek).not.toBe(initialWeek);
      });
    });

    it('disables next week button when on current week', () => {
      render(<WeeklySummaryPage />);

      const nextButton = screen.getByTestId('next-week-button');
      expect(nextButton).toBeDisabled();
    });

    it('enables next week button when not on current week', async () => {
      render(<WeeklySummaryPage />);

      // Go to previous week first
      fireEvent.click(screen.getByTestId('prev-week-button'));

      await waitFor(() => {
        const nextButton = screen.getByTestId('next-week-button');
        expect(nextButton).not.toBeDisabled();
      });
    });

    it('has a "Go to Current Week" button when not on current week', async () => {
      render(<WeeklySummaryPage />);

      // Initially on current week, button should not be visible
      expect(screen.queryByTestId('go-to-current-week')).not.toBeInTheDocument();

      // Go to previous week
      fireEvent.click(screen.getByTestId('prev-week-button'));

      await waitFor(() => {
        expect(screen.getByTestId('go-to-current-week')).toBeInTheDocument();
      });
    });

    it('opens calendar dialog when clicking week selector', async () => {
      render(<WeeklySummaryPage />);

      fireEvent.click(screen.getByTestId('week-selector'));

      await waitFor(() => {
        expect(screen.getByText('Select Week')).toBeInTheDocument();
        expect(screen.getByTestId('calendar-dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('shows loading spinner while fetching data', () => {
      mockGetWeeklySummaryQuery.mockReturnValue({
        data: null,
        isLoading: true,
        refetch: mockRefetch,
      });
      mockGetWeeklyTrendsQuery.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    });

    it('shows dashboard content when data is loaded', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('shows empty state when no data is available', () => {
      mockGetWeeklySummaryQuery.mockReturnValue({
        data: null,
        isLoading: false,
        refetch: mockRefetch,
      });
      mockGetWeeklyTrendsQuery.mockReturnValue({
        data: null,
        isLoading: false,
      });

      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });

  describe('Refresh functionality', () => {
    it('has a refresh button', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
    });
  });

  describe('Mobile layout', () => {
    it('renders within MobileLayout wrapper', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
    });

    it('has the correct page title', () => {
      render(<WeeklySummaryPage />);

      expect(screen.getByText('Weekly Summary')).toBeInTheDocument();
    });
  });
});
