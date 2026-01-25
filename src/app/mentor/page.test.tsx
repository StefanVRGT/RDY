import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MentorHomePage from './page';

// Mock trpc
const mockInvalidate = vi.fn().mockResolvedValue(undefined);
const mockUseUtils = vi.fn(() => ({
  mentor: {
    getDashboardStats: { invalidate: mockInvalidate },
    getMyClasses: { invalidate: mockInvalidate },
    getTodaysSessions: { invalidate: mockInvalidate },
    getUpcomingSessions: { invalidate: mockInvalidate },
  },
}));

// Mock data
const mockStats = {
  totalClasses: 3,
  totalMentees: 12,
  sessionsToday: 5,
  completionRate: 85,
};

const mockClasses = [
  {
    id: 'class-1',
    name: 'Morning Class',
    status: 'active',
    memberCount: 5,
    tenantId: 'tenant-1',
    mentorId: 'mentor-1',
    durationMonths: 3,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31'),
    sessionConfig: { monthlySessionCount: 2, sessionDurationMinutes: 60 },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'class-2',
    name: 'Evening Class',
    status: 'active',
    memberCount: 7,
    tenantId: 'tenant-1',
    mentorId: 'mentor-1',
    durationMonths: 3,
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-04-30'),
    sessionConfig: { monthlySessionCount: 2, sessionDurationMinutes: 60 },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const today = new Date();
const todayAt10AM = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0);
const todayAt2PM = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowAt9AM = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 9, 0, 0);

const mockTodaysSessions = [
  {
    id: 'session-1',
    scheduledAt: todayAt10AM,
    completed: false,
    classId: 'class-1',
    userId: 'user-1',
    className: 'Morning Class',
    notes: null,
    mentee: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
  },
  {
    id: 'session-2',
    scheduledAt: todayAt2PM,
    completed: true,
    classId: 'class-2',
    userId: 'user-2',
    className: 'Evening Class',
    notes: null,
    mentee: { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com' },
  },
];

const mockUpcomingSessions = [
  {
    id: 'session-3',
    scheduledAt: tomorrowAt9AM,
    completed: false,
    classId: 'class-1',
    userId: 'user-3',
    className: 'Morning Class',
    notes: null,
    mentee: { id: 'user-3', name: 'Bob Wilson', email: 'bob@example.com' },
  },
];

// Track query states
let statsLoading = false;
let classesLoading = false;
let todaysLoading = false;
let upcomingLoading = false;

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    useUtils: () => mockUseUtils(),
    mentor: {
      getDashboardStats: {
        useQuery: () => ({
          data: statsLoading ? undefined : mockStats,
          isLoading: statsLoading,
        }),
      },
      getMyClasses: {
        useQuery: () => ({
          data: classesLoading ? undefined : mockClasses,
          isLoading: classesLoading,
        }),
      },
      getTodaysSessions: {
        useQuery: () => ({
          data: todaysLoading ? undefined : mockTodaysSessions,
          isLoading: todaysLoading,
        }),
      },
      getUpcomingSessions: {
        useQuery: () => ({
          data: upcomingLoading ? undefined : mockUpcomingSessions,
          isLoading: upcomingLoading,
        }),
      },
    },
  },
}));

// Mock user context
vi.mock('@/components/providers', () => ({
  useUser: () => ({
    user: {
      id: 'mentor-1',
      email: 'mentor@example.com',
      name: 'Test Mentor',
      roles: ['mentor'],
    },
    isLoading: false,
    isAuthenticated: true,
    hasRole: (role: string) => role === 'mentor',
    hasAnyRole: (roles: string[]) => roles.includes('mentor'),
    hasAllRoles: (roles: string[]) => roles.every(r => r === 'mentor'),
  }),
}));

// Mock MobileLayout
vi.mock('@/components/mobile', () => ({
  MobileLayout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="mobile-layout" data-title={title}>
      {children}
    </div>
  ),
}));

describe('MentorHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    statsLoading = false;
    classesLoading = false;
    todaysLoading = false;
    upcomingLoading = false;
  });

  describe('AC: My classes list with mentee counts', () => {
    it('should display the classes section', () => {
      render(<MentorHomePage />);

      expect(screen.getByTestId('my-classes-section')).toBeInTheDocument();
      expect(screen.getByText('My Classes')).toBeInTheDocument();
    });

    it('should display classes with their names', () => {
      render(<MentorHomePage />);

      const classesList = screen.getByTestId('classes-list');
      expect(classesList).toHaveTextContent('Morning Class');
      expect(classesList).toHaveTextContent('Evening Class');
    });

    it('should display mentee counts for each class', () => {
      render(<MentorHomePage />);

      expect(screen.getByText('5 mentees')).toBeInTheDocument();
      expect(screen.getByText('7 mentees')).toBeInTheDocument();
    });

    it('should show singular "mentee" for count of 1', () => {
      // Temporarily modify mock to have a class with 1 mentee
      const originalMockClasses = [...mockClasses];
      mockClasses[0] = { ...mockClasses[0], memberCount: 1 };

      render(<MentorHomePage />);

      expect(screen.getByText('1 mentee')).toBeInTheDocument();

      // Restore original mock
      mockClasses[0] = originalMockClasses[0];
    });

    it('should show total mentees count in stats', () => {
      render(<MentorHomePage />);

      expect(screen.getByTestId('stat-active-mentees')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Active mentees')).toBeInTheDocument();
    });

    it('should display classes list container', () => {
      render(<MentorHomePage />);

      expect(screen.getByTestId('classes-list')).toBeInTheDocument();
    });
  });

  describe('AC: Today\'s sessions highlighted', () => {
    it('should display today\'s sessions section', () => {
      render(<MentorHomePage />);

      expect(screen.getByTestId('todays-sessions-section')).toBeInTheDocument();
      expect(screen.getByText("Today's Sessions")).toBeInTheDocument();
    });

    it('should display session count badge', () => {
      render(<MentorHomePage />);

      // The count badge shows the number of today's sessions
      const sectionHeader = screen.getByText("Today's Sessions");
      expect(sectionHeader.parentElement).toContainHTML('2');
    });

    it('should display today\'s sessions with mentee names', () => {
      render(<MentorHomePage />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should display class name for each session', () => {
      render(<MentorHomePage />);

      const todaysList = screen.getByTestId('todays-sessions-list');
      expect(todaysList).toHaveTextContent('Morning Class');
      expect(todaysList).toHaveTextContent('Evening Class');
    });

    it('should highlight today\'s sessions with special border', () => {
      render(<MentorHomePage />);

      const session1 = screen.getByTestId('today-session-session-1');
      expect(session1).toHaveClass('border-l-4', 'border-twilight-500');
    });

    it('should show completed status for completed sessions', () => {
      render(<MentorHomePage />);

      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should show sessions today count in stats', () => {
      render(<MentorHomePage />);

      expect(screen.getByTestId('stat-sessions-today')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Sessions today')).toBeInTheDocument();
    });
  });

  describe('AC: Upcoming sessions list', () => {
    it('should display upcoming sessions section', () => {
      render(<MentorHomePage />);

      expect(screen.getByTestId('upcoming-sessions-section')).toBeInTheDocument();
      expect(screen.getByText('Upcoming Sessions')).toBeInTheDocument();
    });

    it('should display upcoming sessions list', () => {
      render(<MentorHomePage />);

      expect(screen.getByTestId('upcoming-sessions-list')).toBeInTheDocument();
    });

    it('should display upcoming session with mentee name', () => {
      render(<MentorHomePage />);

      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('should display date for upcoming sessions', () => {
      render(<MentorHomePage />);

      // Tomorrow should show "Tomorrow"
      expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    });

    it('should highlight today sessions in upcoming list', () => {
      render(<MentorHomePage />);

      const upcomingSession = screen.getByTestId('upcoming-session-session-3');
      expect(upcomingSession).toHaveAttribute('data-is-today', 'false');
    });
  });

  describe('AC: Quick action buttons', () => {
    it('should display quick actions section', () => {
      render(<MentorHomePage />);

      expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    it('should display View Classes action button', () => {
      render(<MentorHomePage />);

      const viewClassesButton = screen.getByTestId('action-view-classes');
      expect(viewClassesButton).toBeInTheDocument();
      expect(viewClassesButton).toHaveTextContent('View Classes');
      expect(viewClassesButton).toHaveAttribute('href', '/mentor/classes');
    });

    it('should display Calendar action button', () => {
      render(<MentorHomePage />);

      const calendarButton = screen.getByTestId('action-calendar');
      expect(calendarButton).toBeInTheDocument();
      expect(calendarButton).toHaveTextContent('Calendar');
      expect(calendarButton).toHaveAttribute('href', '/mentor/calendar');
    });

    it('should display Availability action button', () => {
      render(<MentorHomePage />);

      const availabilityButton = screen.getByTestId('action-availability');
      expect(availabilityButton).toBeInTheDocument();
      expect(availabilityButton).toHaveTextContent('Availability');
      expect(availabilityButton).toHaveAttribute('href', '/mentor/availability');
    });

    it('should display Analytics action button', () => {
      render(<MentorHomePage />);

      const analyticsButton = screen.getByTestId('action-analytics');
      expect(analyticsButton).toBeInTheDocument();
      expect(analyticsButton).toHaveTextContent('Analytics');
      expect(analyticsButton).toHaveAttribute('href', '/mentor/analytics');
    });
  });

  describe('AC: Pull to refresh', () => {
    it('should display pull to refresh indicator when pulling down', () => {
      render(<MentorHomePage />);

      const dashboard = screen.getByTestId('mentor-dashboard');

      // Simulate touch start
      fireEvent.touchStart(dashboard, {
        touches: [{ clientY: 0 }],
      });

      // Simulate pulling down
      fireEvent.touchMove(dashboard, {
        touches: [{ clientY: 70 }],
      });

      // Check for refresh indicator
      expect(screen.getByTestId('pull-to-refresh-indicator')).toBeInTheDocument();
    });

    it('should trigger refresh when pulled far enough', async () => {
      render(<MentorHomePage />);

      const dashboard = screen.getByTestId('mentor-dashboard');

      // Simulate touch start
      fireEvent.touchStart(dashboard, {
        touches: [{ clientY: 0 }],
      });

      // Simulate pulling down far enough (>= 60px)
      fireEvent.touchMove(dashboard, {
        touches: [{ clientY: 80 }],
      });

      // Simulate touch end
      fireEvent.touchEnd(dashboard);

      // Check that invalidate was called
      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalled();
      });
    });

    it('should not trigger refresh when not pulled far enough', async () => {
      render(<MentorHomePage />);

      const dashboard = screen.getByTestId('mentor-dashboard');

      // Simulate touch start
      fireEvent.touchStart(dashboard, {
        touches: [{ clientY: 0 }],
      });

      // Simulate pulling down not far enough (< 60px)
      fireEvent.touchMove(dashboard, {
        touches: [{ clientY: 30 }],
      });

      // Simulate touch end
      fireEvent.touchEnd(dashboard);

      // Wait a bit to ensure no refresh happens
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that invalidate was not called
      expect(mockInvalidate).not.toHaveBeenCalled();
    });

    it('should show spinning animation while refreshing', async () => {
      render(<MentorHomePage />);

      const dashboard = screen.getByTestId('mentor-dashboard');

      // Simulate pull to refresh
      fireEvent.touchStart(dashboard, {
        touches: [{ clientY: 0 }],
      });

      fireEvent.touchMove(dashboard, {
        touches: [{ clientY: 80 }],
      });

      fireEvent.touchEnd(dashboard);

      // Check for spinning animation class
      await waitFor(() => {
        const indicator = screen.getByTestId('pull-to-refresh-indicator');
        const refreshIcon = indicator.querySelector('svg');
        expect(refreshIcon).toHaveClass('animate-spin');
      });
    });
  });

  describe('Stats display', () => {
    it('should display all four stat cards', () => {
      render(<MentorHomePage />);

      expect(screen.getByTestId('stats-grid')).toBeInTheDocument();
      expect(screen.getByTestId('stat-sessions-today')).toBeInTheDocument();
      expect(screen.getByTestId('stat-active-mentees')).toBeInTheDocument();
      expect(screen.getByTestId('stat-classes')).toBeInTheDocument();
      expect(screen.getByTestId('stat-completion-rate')).toBeInTheDocument();
    });

    it('should display correct stats values', () => {
      render(<MentorHomePage />);

      expect(screen.getByText('3')).toBeInTheDocument(); // total classes
      expect(screen.getByText('12')).toBeInTheDocument(); // total mentees
      expect(screen.getByText('5')).toBeInTheDocument(); // sessions today
      expect(screen.getByText('85%')).toBeInTheDocument(); // completion rate
    });

    it('should display stats labels', () => {
      render(<MentorHomePage />);

      expect(screen.getByText('Sessions today')).toBeInTheDocument();
      expect(screen.getByText('Active mentees')).toBeInTheDocument();
      expect(screen.getByText('Active classes')).toBeInTheDocument();
      expect(screen.getByText('Completion rate')).toBeInTheDocument();
    });
  });

  describe('Welcome section', () => {
    it('should display welcome message with mentor name', () => {
      render(<MentorHomePage />);

      expect(screen.getByText('Welcome back, Test')).toBeInTheDocument();
    });

    it('should display today\'s overview message', () => {
      render(<MentorHomePage />);

      expect(screen.getByText("Here's your overview for today")).toBeInTheDocument();
    });
  });

  describe('Empty states', () => {
    it('should show empty state when no classes', () => {
      // Temporarily clear mock classes
      const originalClasses = [...mockClasses];
      mockClasses.length = 0;

      render(<MentorHomePage />);

      expect(screen.getByText('No classes yet')).toBeInTheDocument();

      // Restore
      mockClasses.push(...originalClasses);
    });

    it('should show empty state when no today\'s sessions', () => {
      // Temporarily clear mock today's sessions
      const originalSessions = [...mockTodaysSessions];
      mockTodaysSessions.length = 0;

      render(<MentorHomePage />);

      expect(screen.getByText('No sessions scheduled for today')).toBeInTheDocument();

      // Restore
      mockTodaysSessions.push(...originalSessions);
    });

    it('should show empty state when no upcoming sessions', () => {
      // Temporarily clear mock upcoming sessions
      const originalSessions = [...mockUpcomingSessions];
      mockUpcomingSessions.length = 0;

      render(<MentorHomePage />);

      expect(screen.getByText('No upcoming sessions')).toBeInTheDocument();

      // Restore
      mockUpcomingSessions.push(...originalSessions);
    });
  });
});
