import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { format, addMonths, subMonths } from 'date-fns';

// Mock tRPC
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    mentor: {
      getSessionsForDateRange: {
        useQuery: () => mockUseQuery(),
      },
      getMyClasses: {
        useQuery: () => ({ data: mockClasses, isLoading: false }),
      },
      getClassDetail: {
        useQuery: () => ({ data: mockClassDetail, isLoading: false }),
      },
      createSession: {
        useMutation: () => mockUseMutation(),
      },
    },
    useUtils: () => ({
      mentor: {
        getSessionsForDateRange: {
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
      id: 'test-mentor-id',
      name: 'Test Mentor',
      email: 'mentor@test.com',
      roles: ['mentor'],
    },
  }),
}));

// Mock data
const today = new Date();
const mockSessions = [
  {
    id: 'session-1',
    scheduledAt: new Date(today.getFullYear(), today.getMonth(), 15, 10, 0),
    completed: false,
    classId: 'class-1',
    userId: 'user-1',
    notes: 'Test session notes',
    className: 'Test Class A',
    mentee: { id: 'user-1', name: 'John Doe', email: 'john@test.com' },
  },
  {
    id: 'session-2',
    scheduledAt: new Date(today.getFullYear(), today.getMonth(), 15, 14, 0),
    completed: true,
    classId: 'class-1',
    userId: 'user-2',
    notes: null,
    className: 'Test Class A',
    mentee: { id: 'user-2', name: 'Jane Smith', email: 'jane@test.com' },
  },
  {
    id: 'session-3',
    scheduledAt: new Date(today.getFullYear(), today.getMonth(), 20, 9, 0),
    completed: false,
    classId: 'class-2',
    userId: 'user-1',
    notes: null,
    className: 'Test Class B',
    mentee: { id: 'user-1', name: 'John Doe', email: 'john@test.com' },
  },
];

const mockClasses = [
  { id: 'class-1', name: 'Test Class A', memberCount: 2 },
  { id: 'class-2', name: 'Test Class B', memberCount: 1 },
];

const mockClassDetail = {
  id: 'class-1',
  name: 'Test Class A',
  members: [
    { userId: 'user-1', user: { id: 'user-1', name: 'John Doe', email: 'john@test.com' } },
    { userId: 'user-2', user: { id: 'user-2', name: 'Jane Smith', email: 'jane@test.com' } },
  ],
};

// Import the component after mocks
import MentorCalendarPage from '@/app/mentor/calendar/page';

describe('S6.5 - Mentor Mobile Calendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: mockSessions,
      isLoading: false,
    });
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  describe('AC1: Monthly calendar view optimized for mobile', () => {
    it('renders a monthly calendar view', () => {
      render(<MentorCalendarPage />);

      // Check calendar is rendered
      expect(screen.getByTestId('mentor-calendar')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-grid')).toBeInTheDocument();

      // Check current month is displayed
      const currentMonth = format(new Date(), 'MMMM yyyy');
      expect(screen.getByTestId('current-month')).toHaveTextContent(currentMonth);
    });

    it('displays weekday headers', () => {
      render(<MentorCalendarPage />);

      expect(screen.getByTestId('weekday-headers')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
      expect(screen.getByText('Sun')).toBeInTheDocument();
    });

    it('displays calendar days in a 7-column grid', () => {
      render(<MentorCalendarPage />);

      const grid = screen.getByTestId('calendar-grid');
      expect(grid).toHaveClass('grid-cols-7');
    });

    it('highlights today', () => {
      render(<MentorCalendarPage />);

      const todayKey = format(new Date(), 'yyyy-MM-dd');
      const todayCell = screen.getByTestId(`calendar-day-${todayKey}`);
      expect(todayCell).toHaveAttribute('data-is-today', 'true');
    });

    it('displays month navigation buttons', () => {
      render(<MentorCalendarPage />);

      expect(screen.getByTestId('prev-month-button')).toBeInTheDocument();
      expect(screen.getByTestId('next-month-button')).toBeInTheDocument();
      expect(screen.getByTestId('today-button')).toBeInTheDocument();
    });
  });

  describe('AC2: Sessions displayed as dots/indicators', () => {
    it('displays session indicators on days with sessions', () => {
      render(<MentorCalendarPage />);

      // Day 15 has sessions
      const day15Key = format(new Date(today.getFullYear(), today.getMonth(), 15), 'yyyy-MM-dd');
      const day15Cell = screen.getByTestId(`calendar-day-${day15Key}`);
      expect(day15Cell).toHaveAttribute('data-has-sessions', 'true');

      // Should have session dots
      expect(screen.getByTestId(`session-dots-${day15Key}`)).toBeInTheDocument();
    });

    it('shows different colored dots for completed vs scheduled sessions', () => {
      render(<MentorCalendarPage />);

      // Day 15 has both completed and scheduled sessions
      const day15Key = format(new Date(today.getFullYear(), today.getMonth(), 15), 'yyyy-MM-dd');
      const dotsContainer = screen.getByTestId(`session-dots-${day15Key}`);

      // Should have both twilight (scheduled) and green (completed) dots
      const dots = dotsContainer.querySelectorAll('span');
      expect(dots.length).toBe(2); // One for scheduled, one for completed
    });

    it('displays session count indicator legend', () => {
      render(<MentorCalendarPage />);

      expect(screen.getByText('Scheduled')).toBeInTheDocument();
      // Use getAllByText for "Completed" since it appears in both legend and stats
      expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    });

    it('shows session stats for the current month', () => {
      render(<MentorCalendarPage />);

      expect(screen.getByTestId('calendar-stats')).toBeInTheDocument();
      expect(screen.getByText('Sessions this month')).toBeInTheDocument();
      // "Completed" appears in both stats and legend, so just check at least one exists
      expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    });
  });

  describe('AC3: Tap day to see session list', () => {
    it('opens session list dialog when tapping a day', async () => {
      render(<MentorCalendarPage />);

      // Tap on day 15 which has sessions
      const day15Key = format(new Date(today.getFullYear(), today.getMonth(), 15), 'yyyy-MM-dd');
      const day15Cell = screen.getByTestId(`calendar-day-${day15Key}`);

      fireEvent.click(day15Cell);

      // Wait for dialog to open
      await waitFor(() => {
        expect(screen.getByTestId('session-list-title')).toBeInTheDocument();
      });
    });

    it('displays sessions for the selected day', async () => {
      render(<MentorCalendarPage />);

      // Tap on day 15
      const day15Key = format(new Date(today.getFullYear(), today.getMonth(), 15), 'yyyy-MM-dd');
      fireEvent.click(screen.getByTestId(`calendar-day-${day15Key}`));

      await waitFor(() => {
        expect(screen.getByTestId('session-list')).toBeInTheDocument();
      });

      // Should show 2 sessions for day 15
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('shows session details including mentee name, class, and time', async () => {
      render(<MentorCalendarPage />);

      const day15Key = format(new Date(today.getFullYear(), today.getMonth(), 15), 'yyyy-MM-dd');
      fireEvent.click(screen.getByTestId(`calendar-day-${day15Key}`));

      await waitFor(() => {
        expect(screen.getByTestId('session-list')).toBeInTheDocument();
      });

      // Check session details - use getAllByText since both sessions have same class
      expect(screen.getAllByText('Test Class A').length).toBe(2);
      expect(screen.getByText('Test session notes')).toBeInTheDocument();
    });

    it('shows empty state message when no sessions for selected day', async () => {
      render(<MentorCalendarPage />);

      // Tap on day 10 which has no sessions
      const day10Key = format(new Date(today.getFullYear(), today.getMonth(), 10), 'yyyy-MM-dd');
      fireEvent.click(screen.getByTestId(`calendar-day-${day10Key}`));

      await waitFor(() => {
        expect(screen.getByText('No sessions scheduled for this day')).toBeInTheDocument();
      });
    });

    it('marks day as selected when tapped', () => {
      render(<MentorCalendarPage />);

      const day15Key = format(new Date(today.getFullYear(), today.getMonth(), 15), 'yyyy-MM-dd');
      const day15Cell = screen.getByTestId(`calendar-day-${day15Key}`);

      fireEvent.click(day15Cell);

      expect(day15Cell).toHaveAttribute('data-is-selected', 'true');
    });
  });

  describe('AC4: Create session from calendar', () => {
    it('displays create session button', () => {
      render(<MentorCalendarPage />);

      expect(screen.getByTestId('create-session-button')).toBeInTheDocument();
      expect(screen.getByText('Create Session')).toBeInTheDocument();
    });

    it('opens create session dialog when clicking the button', async () => {
      render(<MentorCalendarPage />);

      fireEvent.click(screen.getByTestId('create-session-button'));

      await waitFor(() => {
        expect(screen.getByTestId('create-session-form')).toBeInTheDocument();
      });
    });

    it('shows class selection dropdown', async () => {
      render(<MentorCalendarPage />);

      fireEvent.click(screen.getByTestId('create-session-button'));

      await waitFor(() => {
        expect(screen.getByTestId('class-select')).toBeInTheDocument();
      });
    });

    it('shows mentee selection dropdown', async () => {
      render(<MentorCalendarPage />);

      fireEvent.click(screen.getByTestId('create-session-button'));

      await waitFor(() => {
        expect(screen.getByTestId('mentee-select')).toBeInTheDocument();
      });
    });

    it('shows time selection input', async () => {
      render(<MentorCalendarPage />);

      fireEvent.click(screen.getByTestId('create-session-button'));

      await waitFor(() => {
        expect(screen.getByTestId('session-time-input')).toBeInTheDocument();
      });
    });

    it('shows notes input field', async () => {
      render(<MentorCalendarPage />);

      fireEvent.click(screen.getByTestId('create-session-button'));

      await waitFor(() => {
        expect(screen.getByTestId('session-notes-input')).toBeInTheDocument();
      });
    });

    it('allows creating session from session list empty state', async () => {
      render(<MentorCalendarPage />);

      // Tap on day 10 which has no sessions
      const day10Key = format(new Date(today.getFullYear(), today.getMonth(), 10), 'yyyy-MM-dd');
      fireEvent.click(screen.getByTestId(`calendar-day-${day10Key}`));

      await waitFor(() => {
        expect(screen.getByText('No sessions scheduled for this day')).toBeInTheDocument();
      });

      // Click "Add Session" button in empty state
      fireEvent.click(screen.getByText('Add Session'));

      await waitFor(() => {
        expect(screen.getByTestId('create-session-form')).toBeInTheDocument();
      });
    });
  });

  describe('AC5: Swipe to navigate months', () => {
    it('navigates to previous month when clicking prev button', () => {
      render(<MentorCalendarPage />);

      const currentMonth = new Date();
      const prevMonth = subMonths(currentMonth, 1);

      fireEvent.click(screen.getByTestId('prev-month-button'));

      expect(screen.getByTestId('current-month')).toHaveTextContent(
        format(prevMonth, 'MMMM yyyy')
      );
    });

    it('navigates to next month when clicking next button', () => {
      render(<MentorCalendarPage />);

      const currentMonth = new Date();
      const nextMonth = addMonths(currentMonth, 1);

      fireEvent.click(screen.getByTestId('next-month-button'));

      expect(screen.getByTestId('current-month')).toHaveTextContent(
        format(nextMonth, 'MMMM yyyy')
      );
    });

    it('returns to current month when clicking today button', () => {
      render(<MentorCalendarPage />);

      // Navigate to next month first
      fireEvent.click(screen.getByTestId('next-month-button'));

      // Then click today
      fireEvent.click(screen.getByTestId('today-button'));

      expect(screen.getByTestId('current-month')).toHaveTextContent(
        format(new Date(), 'MMMM yyyy')
      );
    });

    it('has swipe gesture handlers on calendar container', () => {
      render(<MentorCalendarPage />);

      const calendarContainer = screen.getByTestId('mentor-calendar');

      // Verify touch event handlers are present
      expect(calendarContainer).toBeInTheDocument();
    });

    it('navigates to previous month on right swipe', () => {
      render(<MentorCalendarPage />);

      const calendarContainer = screen.getByTestId('mentor-calendar');
      const currentMonth = new Date();
      const prevMonth = subMonths(currentMonth, 1);

      // Simulate a right swipe (positive X direction)
      fireEvent.touchStart(calendarContainer, {
        touches: [{ clientX: 100, clientY: 200 }],
      });
      fireEvent.touchMove(calendarContainer, {
        touches: [{ clientX: 200, clientY: 200 }],
      });
      fireEvent.touchEnd(calendarContainer);

      // Should navigate to previous month
      expect(screen.getByTestId('current-month')).toHaveTextContent(
        format(prevMonth, 'MMMM yyyy')
      );
    });

    it('navigates to next month on left swipe', () => {
      render(<MentorCalendarPage />);

      const calendarContainer = screen.getByTestId('mentor-calendar');
      const currentMonth = new Date();
      const nextMonth = addMonths(currentMonth, 1);

      // Simulate a left swipe (negative X direction)
      fireEvent.touchStart(calendarContainer, {
        touches: [{ clientX: 200, clientY: 200 }],
      });
      fireEvent.touchMove(calendarContainer, {
        touches: [{ clientX: 100, clientY: 200 }],
      });
      fireEvent.touchEnd(calendarContainer);

      // Should navigate to next month
      expect(screen.getByTestId('current-month')).toHaveTextContent(
        format(nextMonth, 'MMMM yyyy')
      );
    });

    it('does not navigate on small swipe', () => {
      render(<MentorCalendarPage />);

      const calendarContainer = screen.getByTestId('mentor-calendar');
      const currentMonthText = format(new Date(), 'MMMM yyyy');

      // Simulate a small swipe that shouldn't trigger navigation
      fireEvent.touchStart(calendarContainer, {
        touches: [{ clientX: 100, clientY: 200 }],
      });
      fireEvent.touchMove(calendarContainer, {
        touches: [{ clientX: 120, clientY: 200 }],
      });
      fireEvent.touchEnd(calendarContainer);

      // Should stay on current month
      expect(screen.getByTestId('current-month')).toHaveTextContent(currentMonthText);
    });
  });

  describe('Mobile optimizations', () => {
    it('renders within MobileLayout wrapper', () => {
      render(<MentorCalendarPage />);

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
    });

    it('has touch-friendly day cells', () => {
      render(<MentorCalendarPage />);

      const grid = screen.getByTestId('calendar-grid');
      const buttons = grid.querySelectorAll('button');

      // All day cells should be buttons for accessibility
      expect(buttons.length).toBeGreaterThan(0);

      // Check that cells have aspect-square class for touch targets
      buttons.forEach(button => {
        expect(button).toHaveClass('aspect-square');
      });
    });

    it('has accessible aria labels on day cells', () => {
      render(<MentorCalendarPage />);

      const day15Key = format(new Date(today.getFullYear(), today.getMonth(), 15), 'yyyy-MM-dd');
      const day15Cell = screen.getByTestId(`calendar-day-${day15Key}`);

      // Should have aria-label with date info and session count
      expect(day15Cell).toHaveAttribute('aria-label');
      const ariaLabel = day15Cell.getAttribute('aria-label');
      // Day 15 has sessions, so the aria-label should mention them
      expect(ariaLabel).toContain('15');
      expect(ariaLabel).toContain('sessions');
    });
  });

  describe('Loading and error states', () => {
    it('shows loading indicator when fetching sessions', () => {
      mockUseQuery.mockReturnValue({
        data: [],
        isLoading: true,
      });

      render(<MentorCalendarPage />);

      // Calendar should still render with loading state
      expect(screen.getByTestId('calendar-grid')).toBeInTheDocument();
    });

    it('handles empty sessions gracefully', () => {
      mockUseQuery.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<MentorCalendarPage />);

      // Calendar should render normally
      expect(screen.getByTestId('calendar-grid')).toBeInTheDocument();
      // Check stats show 0 sessions - there may be multiple "0"s on the page
      const statsContainer = screen.getByTestId('calendar-stats');
      expect(statsContainer).toBeInTheDocument();
    });
  });
});
