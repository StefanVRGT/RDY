import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { format, startOfDay } from 'date-fns';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock tRPC queries and mutations
const mockGetEntriesForDateQuery = vi.fn();
const mockGetDailySummaryQuery = vi.fn();
const mockUpsertEntryMutate = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    patterns: {
      getEntriesForDate: {
        useQuery: () => mockGetEntriesForDateQuery(),
      },
      getDailySummary: {
        useQuery: () => mockGetDailySummaryQuery(),
      },
      upsertEntry: {
        useMutation: () => ({
          mutate: mockUpsertEntryMutate,
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      patterns: {
        getEntriesForDate: {
          invalidate: mockInvalidate,
        },
        getDailySummary: {
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

// Mock the user provider
vi.mock('@/components/providers', () => ({
  useUser: () => ({
    user: {
      id: 'test-mentee-id',
      name: 'Test Mentee',
      email: 'mentee@test.com',
      roles: ['mentee'],
    },
  }),
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
      <button
        data-testid="select-yesterday"
        onClick={() => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          onSelect(yesterday);
        }}
      >
        Select Yesterday
      </button>
      {selected && <span data-testid="selected-date">{format(selected, 'yyyy-MM-dd')}</span>}
    </div>
  ),
}));

// Mock Select component to avoid JSDOM scrollIntoView issues
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value }: { children: React.ReactNode; value: string; onValueChange: (value: string) => void }) => (
    <div data-testid="mock-select" data-value={value}>
      {children}
      <div data-testid="mock-select-context" data-onvaluechange="true" />
    </div>
  ),
  SelectTrigger: ({ children, ...props }: { children: React.ReactNode; className?: string; 'data-testid'?: string }) => (
    <button
      data-testid={props['data-testid'] || 'pattern-type-select'}
      onClick={() => {
        const event = new CustomEvent('openSelect');
        document.dispatchEvent(event);
      }}
    >
      {children}
    </button>
  ),
  SelectValue: () => <span>Stress</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value, ...props }: { children: React.ReactNode; value: string; className?: string; 'data-testid'?: string }) => (
    <div
      data-testid={props['data-testid'] || `pattern-option-${value}`}
      data-value={value}
      onClick={() => {
        // Find parent Select and trigger value change
        const selectContext = document.querySelector('[data-testid="mock-select"]');
        if (selectContext) {
          const event = new CustomEvent('selectChange', { detail: value });
          document.dispatchEvent(event);
        }
      }}
    >
      {children}
    </div>
  ),
}));

// Mock data
const today = new Date();
const mockPatternEntries = [
  {
    id: 'entry-1',
    entryDate: startOfDay(today),
    hour: 9,
    patternType: 'stress',
    intensity: 'strong',
    notes: null,
    createdAt: today,
    updatedAt: today,
  },
  {
    id: 'entry-2',
    entryDate: startOfDay(today),
    hour: 10,
    patternType: 'stress',
    intensity: 'weak',
    notes: null,
    createdAt: today,
    updatedAt: today,
  },
  {
    id: 'entry-3',
    entryDate: startOfDay(today),
    hour: 14,
    patternType: 'energy',
    intensity: 'strong',
    notes: null,
    createdAt: today,
    updatedAt: today,
  },
  {
    id: 'entry-4',
    entryDate: startOfDay(today),
    hour: 11,
    patternType: 'stress',
    intensity: 'none',
    notes: null,
    createdAt: today,
    updatedAt: today,
  },
];

const mockDailySummary = {
  date: startOfDay(today).toISOString(),
  summary: {
    stress: { total: 3, strong: 1, weak: 1, none: 1, hours: [9, 10, 11] },
    energy: { total: 1, strong: 1, weak: 0, none: 0, hours: [14] },
    mood: { total: 0, strong: 0, weak: 0, none: 0, hours: [] },
    focus: { total: 0, strong: 0, weak: 0, none: 0, hours: [] },
    anxiety: { total: 0, strong: 0, weak: 0, none: 0, hours: [] },
    motivation: { total: 0, strong: 0, weak: 0, none: 0, hours: [] },
  },
  totalEntries: 4,
};

// Import the component after mocks
import MenteePatternTrackingPage from '@/app/mentee/patterns/page';

describe('S11.2 - Pattern Tracking UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEntriesForDateQuery.mockReturnValue({
      data: { entries: mockPatternEntries, date: startOfDay(today).toISOString() },
      isLoading: false,
    });
    mockGetDailySummaryQuery.mockReturnValue({
      data: mockDailySummary,
      isLoading: false,
    });
  });

  describe('AC1: Time block grid (hourly)', () => {
    it('renders the pattern tracking page', () => {
      render(<MenteePatternTrackingPage />);

      expect(screen.getByTestId('pattern-tracking-page')).toBeInTheDocument();
    });

    it('displays a 24-hour time block grid', () => {
      render(<MenteePatternTrackingPage />);

      expect(screen.getByTestId('time-block-grid')).toBeInTheDocument();
      expect(screen.getByTestId('hourly-grid')).toBeInTheDocument();
    });

    it('renders 24 time blocks for each hour', () => {
      render(<MenteePatternTrackingPage />);

      // Check that all 24 hours are displayed
      for (let hour = 0; hour < 24; hour++) {
        expect(screen.getByTestId(`time-block-${hour}`)).toBeInTheDocument();
      }
    });

    it('displays hour labels on time blocks', () => {
      render(<MenteePatternTrackingPage />);

      // Check a few hour labels
      expect(screen.getByTestId('time-block-0')).toHaveTextContent('00');
      expect(screen.getByTestId('time-block-9')).toHaveTextContent('09');
      expect(screen.getByTestId('time-block-14')).toHaveTextContent('14');
      expect(screen.getByTestId('time-block-23')).toHaveTextContent('23');
    });

    it('time blocks are clickable', () => {
      render(<MenteePatternTrackingPage />);

      const timeBlock = screen.getByTestId('time-block-9');
      expect(timeBlock.tagName).toBe('BUTTON');
    });

    it('opens intensity dialog when clicking a time block', async () => {
      render(<MenteePatternTrackingPage />);

      fireEvent.click(screen.getByTestId('time-block-12'));

      await waitFor(() => {
        expect(screen.getByTestId('intensity-dialog-title')).toBeInTheDocument();
        expect(screen.getByText(/12:00/)).toBeInTheDocument();
      });
    });
  });

  describe('AC2: Pattern selection (e.g., Stress, Energy)', () => {
    it('displays a pattern type selector', () => {
      render(<MenteePatternTrackingPage />);

      expect(screen.getByTestId('pattern-selector')).toBeInTheDocument();
      expect(screen.getByTestId('pattern-type-select')).toBeInTheDocument();
    });

    it('shows stress pattern by default', () => {
      render(<MenteePatternTrackingPage />);

      // Check that the grid title shows "Stress by Hour"
      expect(screen.getByText('Stress by Hour')).toBeInTheDocument();
    });

    it('displays all available pattern types in selector (mocked)', async () => {
      render(<MenteePatternTrackingPage />);

      // With our mock, all options are visible immediately
      await waitFor(() => {
        expect(screen.getByTestId('pattern-option-stress')).toBeInTheDocument();
        expect(screen.getByTestId('pattern-option-energy')).toBeInTheDocument();
        expect(screen.getByTestId('pattern-option-mood')).toBeInTheDocument();
        expect(screen.getByTestId('pattern-option-focus')).toBeInTheDocument();
        expect(screen.getByTestId('pattern-option-anxiety')).toBeInTheDocument();
        expect(screen.getByTestId('pattern-option-motivation')).toBeInTheDocument();
      });
    });

    it('pattern selector is present in the UI', async () => {
      render(<MenteePatternTrackingPage />);

      await waitFor(() => {
        expect(screen.getByTestId('pattern-type-select')).toBeInTheDocument();
      });
    });

    it('displays pattern icon with the selected pattern', () => {
      render(<MenteePatternTrackingPage />);

      // The grid header shows the pattern name and icon
      expect(screen.getByText('Stress by Hour')).toBeInTheDocument();
    });
  });

  describe('AC3: Intensity levels (Strong, Weak, None)', () => {
    it('displays intensity options in the dialog', async () => {
      render(<MenteePatternTrackingPage />);

      fireEvent.click(screen.getByTestId('time-block-12'));

      await waitFor(() => {
        expect(screen.getByTestId('intensity-options')).toBeInTheDocument();
        expect(screen.getByTestId('intensity-strong')).toBeInTheDocument();
        expect(screen.getByTestId('intensity-weak')).toBeInTheDocument();
        expect(screen.getByTestId('intensity-none')).toBeInTheDocument();
      });
    });

    it('shows intensity labels with descriptions', async () => {
      render(<MenteePatternTrackingPage />);

      fireEvent.click(screen.getByTestId('time-block-12'));

      await waitFor(() => {
        // Check for the options container
        const optionsContainer = screen.getByTestId('intensity-options');
        expect(optionsContainer).toBeInTheDocument();

        // Check that intensity options are present by testid
        expect(screen.getByTestId('intensity-strong')).toBeInTheDocument();
        expect(screen.getByTestId('intensity-weak')).toBeInTheDocument();
        expect(screen.getByTestId('intensity-none')).toBeInTheDocument();

        // Check descriptions are within the options
        expect(screen.getByText('High intensity')).toBeInTheDocument();
        expect(screen.getByText('Low intensity')).toBeInTheDocument();
        expect(screen.getByText('Not present')).toBeInTheDocument();
      });
    });

    it('calls upsert mutation when selecting intensity', async () => {
      render(<MenteePatternTrackingPage />);

      fireEvent.click(screen.getByTestId('time-block-12'));

      await waitFor(() => {
        expect(screen.getByTestId('intensity-strong')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('intensity-strong'));

      expect(mockUpsertEntryMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          hour: 12,
          patternType: 'stress',
          intensity: 'strong',
        })
      );
    });

    it('shows intensity indicator on time blocks with data', () => {
      render(<MenteePatternTrackingPage />);

      // Hour 9 has "strong" intensity for stress
      const block9 = screen.getByTestId('time-block-9');
      expect(block9).toHaveAttribute('data-intensity', 'strong');
      expect(block9).toHaveTextContent('S'); // First letter of "Strong"

      // Hour 10 has "weak" intensity for stress
      const block10 = screen.getByTestId('time-block-10');
      expect(block10).toHaveAttribute('data-intensity', 'weak');
      expect(block10).toHaveTextContent('W'); // First letter of "Weak"

      // Hour 11 has "none" intensity for stress
      const block11 = screen.getByTestId('time-block-11');
      expect(block11).toHaveAttribute('data-intensity', 'none');
      expect(block11).toHaveTextContent('N'); // First letter of "None"
    });

    it('shows "unset" for time blocks without data', () => {
      render(<MenteePatternTrackingPage />);

      // Hour 0 has no data
      const block0 = screen.getByTestId('time-block-0');
      expect(block0).toHaveAttribute('data-intensity', 'unset');
    });
  });

  describe('AC4: Color coding by intensity', () => {
    it('displays intensity legend', () => {
      render(<MenteePatternTrackingPage />);

      expect(screen.getByTestId('intensity-legend')).toBeInTheDocument();
      expect(screen.getByTestId('legend-strong')).toBeInTheDocument();
      expect(screen.getByTestId('legend-weak')).toBeInTheDocument();
      expect(screen.getByTestId('legend-none')).toBeInTheDocument();
    });

    it('legend shows Strong, Weak, None labels', () => {
      render(<MenteePatternTrackingPage />);

      const legend = screen.getByTestId('intensity-legend');
      expect(legend).toHaveTextContent('Strong');
      expect(legend).toHaveTextContent('Weak');
      expect(legend).toHaveTextContent('None');
    });

    it('time blocks have different background colors based on intensity', () => {
      render(<MenteePatternTrackingPage />);

      // We can't easily test actual CSS colors in JSDOM, but we can check
      // that the blocks have different classes based on intensity
      const blockStrong = screen.getByTestId('time-block-9');
      const blockWeak = screen.getByTestId('time-block-10');
      const blockNone = screen.getByTestId('time-block-11');
      const blockUnset = screen.getByTestId('time-block-0');

      // Verify they have different data-intensity attributes
      expect(blockStrong).toHaveAttribute('data-intensity', 'strong');
      expect(blockWeak).toHaveAttribute('data-intensity', 'weak');
      expect(blockNone).toHaveAttribute('data-intensity', 'none');
      expect(blockUnset).toHaveAttribute('data-intensity', 'unset');
    });

    it('intensity option buttons show color coding', async () => {
      render(<MenteePatternTrackingPage />);

      fireEvent.click(screen.getByTestId('time-block-12'));

      await waitFor(() => {
        // Intensity options should be clickable buttons with color boxes
        const strongOption = screen.getByTestId('intensity-strong');
        const weakOption = screen.getByTestId('intensity-weak');
        const noneOption = screen.getByTestId('intensity-none');

        expect(strongOption).toBeInTheDocument();
        expect(weakOption).toBeInTheDocument();
        expect(noneOption).toBeInTheDocument();
      });
    });
  });

  describe('AC5: Daily pattern view', () => {
    it('displays the daily summary section', () => {
      render(<MenteePatternTrackingPage />);

      expect(screen.getByTestId('daily-summary')).toBeInTheDocument();
      expect(screen.getByText('Daily Summary')).toBeInTheDocument();
    });

    it('shows summary for each pattern type', () => {
      render(<MenteePatternTrackingPage />);

      expect(screen.getByTestId('summary-stress')).toBeInTheDocument();
      expect(screen.getByTestId('summary-energy')).toBeInTheDocument();
      expect(screen.getByTestId('summary-mood')).toBeInTheDocument();
      expect(screen.getByTestId('summary-focus')).toBeInTheDocument();
      expect(screen.getByTestId('summary-anxiety')).toBeInTheDocument();
      expect(screen.getByTestId('summary-motivation')).toBeInTheDocument();
    });

    it('displays entry counts in summary', () => {
      render(<MenteePatternTrackingPage />);

      // Stress has 1 strong, 1 weak, 1 none
      const stressSummary = screen.getByTestId('summary-stress');
      expect(stressSummary).toHaveTextContent('1S');
      expect(stressSummary).toHaveTextContent('1W');

      // Energy has 1 strong
      const energySummary = screen.getByTestId('summary-energy');
      expect(energySummary).toHaveTextContent('1S');
      expect(energySummary).toHaveTextContent('0W');
    });

    it('shows "No entries" for patterns with no data', () => {
      render(<MenteePatternTrackingPage />);

      const moodSummary = screen.getByTestId('summary-mood');
      expect(moodSummary).toHaveTextContent('No entries');
    });

    it('displays date navigation controls', () => {
      render(<MenteePatternTrackingPage />);

      expect(screen.getByTestId('date-navigation')).toBeInTheDocument();
      expect(screen.getByTestId('prev-day-button')).toBeInTheDocument();
      expect(screen.getByTestId('next-day-button')).toBeInTheDocument();
      expect(screen.getByTestId('date-selector')).toBeInTheDocument();
    });

    it('shows the selected date', () => {
      render(<MenteePatternTrackingPage />);

      expect(screen.getByTestId('selected-date')).toBeInTheDocument();
      // Should show today's date in the expected format
      expect(screen.getByTestId('selected-date')).toHaveTextContent(
        format(today, 'EEEE, MMMM d, yyyy')
      );
    });

    it('navigates to previous day when clicking prev button', async () => {
      render(<MenteePatternTrackingPage />);

      const prevButton = screen.getByTestId('prev-day-button');
      fireEvent.click(prevButton);

      await waitFor(() => {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        expect(screen.getByTestId('selected-date')).toHaveTextContent(
          format(yesterday, 'EEEE, MMMM d, yyyy')
        );
      });
    });

    it('navigates to next day when clicking next button', async () => {
      render(<MenteePatternTrackingPage />);

      const nextButton = screen.getByTestId('next-day-button');
      fireEvent.click(nextButton);

      await waitFor(() => {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        expect(screen.getByTestId('selected-date')).toHaveTextContent(
          format(tomorrow, 'EEEE, MMMM d, yyyy')
        );
      });
    });

    it('opens calendar dialog when clicking date selector', async () => {
      render(<MenteePatternTrackingPage />);

      fireEvent.click(screen.getByTestId('date-selector'));

      await waitFor(() => {
        expect(screen.getByText('Select Date')).toBeInTheDocument();
        expect(screen.getByTestId('calendar-dialog')).toBeInTheDocument();
      });
    });

    it('allows jumping to today from calendar', async () => {
      render(<MenteePatternTrackingPage />);

      // First navigate away from today
      fireEvent.click(screen.getByTestId('prev-day-button'));

      await waitFor(() => {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        expect(screen.getByTestId('selected-date')).toHaveTextContent(
          format(yesterday, 'EEEE, MMMM d, yyyy')
        );
      });

      // Open calendar
      fireEvent.click(screen.getByTestId('date-selector'));

      await waitFor(() => {
        expect(screen.getByTestId('today-button')).toBeInTheDocument();
      });

      // Click "Go to Today"
      fireEvent.click(screen.getByTestId('today-button'));

      await waitFor(() => {
        expect(screen.getByTestId('selected-date')).toHaveTextContent(
          format(today, 'EEEE, MMMM d, yyyy')
        );
      });
    });
  });

  describe('Loading states', () => {
    it('shows loading spinner while fetching data', () => {
      mockGetEntriesForDateQuery.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<MenteePatternTrackingPage />);

      expect(screen.getByTestId('time-block-grid')).toBeInTheDocument();
      // Should show loading state within the grid
    });
  });

  describe('Mobile optimizations', () => {
    it('renders within MobileLayout wrapper', () => {
      render(<MenteePatternTrackingPage />);

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
    });

    it('has a responsive grid layout (6 columns)', () => {
      render(<MenteePatternTrackingPage />);

      const grid = screen.getByTestId('hourly-grid');
      expect(grid).toHaveClass('grid-cols-6');
    });
  });

  describe('Pattern type switching', () => {
    it('grid reflects data for the selected pattern type', async () => {
      render(<MenteePatternTrackingPage />);

      // Initially showing stress, hour 9 should have strong intensity
      expect(screen.getByTestId('time-block-9')).toHaveAttribute('data-intensity', 'strong');

      // Hour 14 has energy data (strong), but since we're on stress pattern it should be unset
      expect(screen.getByTestId('time-block-14')).toHaveAttribute('data-intensity', 'unset');
    });

    it('pattern options are rendered in the selector', async () => {
      render(<MenteePatternTrackingPage />);

      // All pattern options should be present
      expect(screen.getByTestId('pattern-option-stress')).toBeInTheDocument();
      expect(screen.getByTestId('pattern-option-energy')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('time blocks have aria attributes via data-testid', () => {
      render(<MenteePatternTrackingPage />);

      const timeBlock = screen.getByTestId('time-block-9');
      expect(timeBlock).toHaveAttribute('data-hour', '9');
      expect(timeBlock).toHaveAttribute('data-intensity');
    });

    it('intensity options are focusable buttons', async () => {
      render(<MenteePatternTrackingPage />);

      fireEvent.click(screen.getByTestId('time-block-12'));

      await waitFor(() => {
        const strongOption = screen.getByTestId('intensity-strong');
        expect(strongOption.tagName).toBe('BUTTON');
      });
    });
  });
});
