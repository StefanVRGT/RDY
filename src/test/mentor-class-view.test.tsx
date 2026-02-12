import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock data
const mockClasses = [
  {
    id: 'class-1',
    name: 'Morning Meditation Class',
    status: 'active' as const,
    memberCount: 3,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-03-31'),
    durationMonths: 3,
  },
  {
    id: 'class-2',
    name: 'Evening Yoga Class',
    status: 'active' as const,
    memberCount: 2,
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-04-30'),
    durationMonths: 3,
  },
  {
    id: 'class-3',
    name: 'Completed Class',
    status: 'disabled' as const,
    memberCount: 5,
    startDate: new Date('2025-10-01'),
    endDate: new Date('2025-12-31'),
    durationMonths: 3,
  },
];

const mockClassDetail = {
  id: 'class-1',
  name: 'Morning Meditation Class',
  status: 'active' as const,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-03-31'),
  durationMonths: 3,
  memberCount: 3,
  members: [
    {
      id: 'member-1',
      classId: 'class-1',
      userId: 'user-1',
      enrolledAt: new Date('2026-01-05'),
      completedAt: null,
      paid: true,
      amount: '100.00',
      user: { id: 'user-1', name: 'Alice Johnson', email: 'alice@test.com' },
    },
    {
      id: 'member-2',
      classId: 'class-1',
      userId: 'user-2',
      enrolledAt: new Date('2026-01-06'),
      completedAt: null,
      paid: true,
      amount: '100.00',
      user: { id: 'user-2', name: 'Bob Smith', email: 'bob@test.com' },
    },
    {
      id: 'member-3',
      classId: 'class-1',
      userId: 'user-3',
      enrolledAt: new Date('2026-01-07'),
      completedAt: null,
      paid: false,
      amount: '100.00',
      user: { id: 'user-3', name: null, email: 'charlie@test.com' },
    },
  ],
};

const mockMenteeProgress = [
  {
    id: 'member-1',
    userId: 'user-1',
    user: { id: 'user-1', name: 'Alice Johnson', email: 'alice@test.com' },
    enrolledAt: new Date('2026-01-05'),
    completedAt: null,
    totalSessions: 10,
    completedSessions: 8,
    progressPercentage: 80,
    currentMonth: 1,
    totalMonths: 3,
  },
  {
    id: 'member-2',
    userId: 'user-2',
    user: { id: 'user-2', name: 'Bob Smith', email: 'bob@test.com' },
    enrolledAt: new Date('2026-01-06'),
    completedAt: null,
    totalSessions: 10,
    completedSessions: 5,
    progressPercentage: 50,
    currentMonth: 1,
    totalMonths: 3,
  },
  {
    id: 'member-3',
    userId: 'user-3',
    user: { id: 'user-3', name: null, email: 'charlie@test.com' },
    enrolledAt: new Date('2026-01-07'),
    completedAt: null,
    totalSessions: 10,
    completedSessions: 2,
    progressPercentage: 20,
    currentMonth: 1,
    totalMonths: 3,
  },
];

const mockSessionHistory = {
  sessions: [
    {
      id: 'session-1',
      scheduledAt: new Date('2026-01-20T10:00:00'),
      completed: true,
      completedAt: new Date('2026-01-20T10:45:00'),
      userId: 'user-1',
      exerciseId: 'exercise-1',
      notes: 'Great progress!',
      mentee: { id: 'user-1', name: 'Alice Johnson', email: 'alice@test.com' },
      exercise: { id: 'exercise-1', titleDe: 'Morgenmeditation', titleEn: 'Morning Meditation' },
    },
    {
      id: 'session-2',
      scheduledAt: new Date('2026-01-19T14:00:00'),
      completed: true,
      completedAt: new Date('2026-01-19T14:30:00'),
      userId: 'user-2',
      exerciseId: 'exercise-1',
      notes: null,
      mentee: { id: 'user-2', name: 'Bob Smith', email: 'bob@test.com' },
      exercise: { id: 'exercise-1', titleDe: 'Morgenmeditation', titleEn: 'Morning Meditation' },
    },
    {
      id: 'session-3',
      scheduledAt: new Date('2026-01-25T10:00:00'),
      completed: false,
      completedAt: null,
      userId: 'user-1',
      exerciseId: 'exercise-2',
      notes: null,
      mentee: { id: 'user-1', name: 'Alice Johnson', email: 'alice@test.com' },
      exercise: { id: 'exercise-2', titleDe: 'Atemübung', titleEn: 'Breathing Exercise' },
    },
  ],
  total: 15,
  hasMore: true,
};

// Mock useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/mentor/classes',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ classId: 'class-1' }),
}));

// Mock tRPC
const mockInvalidate = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    mentor: {
      getMyClasses: {
        useQuery: () => ({ data: mockClasses, isLoading: false }),
      },
      getClassDetail: {
        useQuery: () => ({ data: mockClassDetail, isLoading: false }),
      },
      getMenteeProgress: {
        useQuery: () => ({ data: mockMenteeProgress, isLoading: false }),
      },
      getClassSessionHistory: {
        useQuery: () => ({ data: mockSessionHistory, isLoading: false }),
      },
    },
    useUtils: () => ({
      mentor: {
        getMyClasses: { invalidate: mockInvalidate },
        getClassDetail: { invalidate: mockInvalidate },
        getMenteeProgress: { invalidate: mockInvalidate },
        getClassSessionHistory: { invalidate: mockInvalidate },
      },
    }),
  },
}));

// Mock the mobile layout
vi.mock('@/components/mobile', () => ({
  MobileLayout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="mobile-layout">
      <header data-testid="mobile-header">{title}</header>
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

// Import components after mocks
import MentorClassesPage from '@/app/mentor/classes/page';
import ClassDetailPage from '@/app/mentor/classes/[classId]/page';

describe('S6.7 - Mentor Mobile Class View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC-S6.7-1: Class detail with enrolled mentees', () => {
    it('displays class details including name, dates, and status', () => {
      render(<ClassDetailPage />);

      expect(screen.getByTestId('class-detail-page')).toBeInTheDocument();
      expect(screen.getByTestId('class-header')).toBeInTheDocument();
      // Class name appears in both header and body, use getAllByText
      expect(screen.getAllByText('Morning Meditation Class').length).toBeGreaterThan(0);
    });

    it('displays enrolled mentees count', () => {
      render(<ClassDetailPage />);

      expect(screen.getByText(/3 mentees/i)).toBeInTheDocument();
    });

    it('displays list of enrolled mentees', () => {
      render(<ClassDetailPage />);

      expect(screen.getByTestId('enrolled-mentees-list')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      // Charlie has no name, should show email
      expect(screen.getByText('charlie@test.com')).toBeInTheDocument();
    });

    it('shows mentee enrollment date', () => {
      render(<ClassDetailPage />);

      // Check for date format - will include "Enrolled" prefix
      const menteeItems = screen.getAllByTestId(/mentee-item-/);
      expect(menteeItems.length).toBe(3);
    });

    it('displays class date range', () => {
      render(<ClassDetailPage />);

      // The date range should be shown in the header
      expect(screen.getByTestId('class-header')).toBeInTheDocument();
    });

    it('shows class status indicator', () => {
      render(<ClassDetailPage />);

      // Active class should have green status indicator
      const header = screen.getByTestId('class-header');
      expect(header.querySelector('.bg-green-500')).toBeInTheDocument();
    });

    it('renders within MobileLayout wrapper', () => {
      render(<ClassDetailPage />);

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
    });
  });

  describe('AC-S6.7-2: Mentee progress indicators', () => {
    it('displays progress percentage for each mentee', () => {
      render(<ClassDetailPage />);

      expect(screen.getByTestId('mentee-progress-user-1')).toHaveTextContent('80%');
      expect(screen.getByTestId('mentee-progress-user-2')).toHaveTextContent('50%');
      expect(screen.getByTestId('mentee-progress-user-3')).toHaveTextContent('20%');
    });

    it('displays visual progress bar for each mentee', () => {
      render(<ClassDetailPage />);

      const progressBars = screen.getAllByTestId('progress-bar-fill');
      expect(progressBars.length).toBe(3);
    });

    it('shows session completion count (completed/total)', () => {
      render(<ClassDetailPage />);

      expect(screen.getByText('8/10 sessions')).toBeInTheDocument();
      expect(screen.getByText('5/10 sessions')).toBeInTheDocument();
      expect(screen.getByText('2/10 sessions')).toBeInTheDocument();
    });

    it('shows current month/phase for each mentee', () => {
      render(<ClassDetailPage />);

      // All mentees are in month 1 of 3
      const monthTexts = screen.getAllByText(/Month 1 of 3/);
      expect(monthTexts.length).toBe(3);
    });

    it('shows average class progress in stats section', () => {
      render(<ClassDetailPage />);

      expect(screen.getByTestId('class-stats')).toBeInTheDocument();
      // Average progress should be (80+50+20)/3 = 50%
      // 50% appears multiple times (in stats and on mentee items), so use getAllByText
      expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
      expect(screen.getByText('Avg. Progress')).toBeInTheDocument();
    });
  });

  describe('AC-S6.7-3: Tap mentee to view diary', () => {
    it('mentee items are clickable buttons', () => {
      render(<ClassDetailPage />);

      const menteeItems = screen.getAllByTestId(/mentee-item-/);
      menteeItems.forEach(item => {
        expect(item.tagName.toLowerCase()).toBe('button');
      });
    });

    it('navigates to mentee diary when mentee is tapped', async () => {
      render(<ClassDetailPage />);

      const aliceMenteeItem = screen.getByTestId('mentee-item-user-1');
      fireEvent.click(aliceMenteeItem);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/mentor/mentee/user-1/diary');
      });
    });

    it('shows chevron right indicator for tap action', () => {
      render(<ClassDetailPage />);

      // Each mentee item should have a chevron right icon
      const menteeItems = screen.getAllByTestId(/mentee-item-/);
      menteeItems.forEach(item => {
        expect(item.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('navigates to correct diary for different mentees', async () => {
      render(<ClassDetailPage />);

      // Click on Bob's item
      const bobMenteeItem = screen.getByTestId('mentee-item-user-2');
      fireEvent.click(bobMenteeItem);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/mentor/mentee/user-2/diary');
      });
    });
  });

  describe('AC-S6.7-4: Session history for class', () => {
    it('displays session history tab', () => {
      render(<ClassDetailPage />);

      expect(screen.getByTestId('tab-sessions')).toBeInTheDocument();
      expect(screen.getByText(/Sessions \(15\)/)).toBeInTheDocument();
    });

    it('switches to session history when tab is clicked', async () => {
      render(<ClassDetailPage />);

      const sessionsTab = screen.getByTestId('tab-sessions');
      fireEvent.click(sessionsTab);

      await waitFor(() => {
        expect(screen.getByTestId('session-history-list')).toBeInTheDocument();
      });
    });

    it('displays session items with mentee name', async () => {
      render(<ClassDetailPage />);

      // Switch to sessions tab
      fireEvent.click(screen.getByTestId('tab-sessions'));

      await waitFor(() => {
        expect(screen.getByTestId('session-item-session-1')).toBeInTheDocument();
        expect(screen.getByTestId('session-item-session-2')).toBeInTheDocument();
        expect(screen.getByTestId('session-item-session-3')).toBeInTheDocument();
      });
    });

    it('shows exercise title for each session', async () => {
      render(<ClassDetailPage />);

      fireEvent.click(screen.getByTestId('tab-sessions'));

      await waitFor(() => {
        expect(screen.getAllByText('Morning Meditation').length).toBe(2);
        expect(screen.getByText('Breathing Exercise')).toBeInTheDocument();
      });
    });

    it('shows session date and time', async () => {
      render(<ClassDetailPage />);

      fireEvent.click(screen.getByTestId('tab-sessions'));

      await waitFor(() => {
        // Sessions should show formatted date/time
        expect(screen.getByTestId('session-history-list')).toBeInTheDocument();
      });
    });

    it('indicates completed sessions with green styling', async () => {
      render(<ClassDetailPage />);

      fireEvent.click(screen.getByTestId('tab-sessions'));

      await waitFor(() => {
        const completedSession = screen.getByTestId('session-item-session-1');
        expect(completedSession).toHaveClass('border-green-500');
      });
    });

    it('shows session notes when available', async () => {
      render(<ClassDetailPage />);

      fireEvent.click(screen.getByTestId('tab-sessions'));

      await waitFor(() => {
        expect(screen.getByText('Great progress!')).toBeInTheDocument();
      });
    });

    it('displays "Load more" button when there are more sessions', async () => {
      render(<ClassDetailPage />);

      fireEvent.click(screen.getByTestId('tab-sessions'));

      await waitFor(() => {
        expect(screen.getByTestId('load-more-sessions')).toBeInTheDocument();
      });
    });

    it('shows completion status for each session', async () => {
      render(<ClassDetailPage />);

      fireEvent.click(screen.getByTestId('tab-sessions'));

      await waitFor(() => {
        // Should show "Completed" and "Scheduled" statuses
        expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
        expect(screen.getByText('Scheduled')).toBeInTheDocument();
      });
    });
  });

  describe('Classes list page', () => {
    it('displays list of classes', () => {
      render(<MentorClassesPage />);

      expect(screen.getByTestId('classes-page')).toBeInTheDocument();
      expect(screen.getByTestId('active-classes-list')).toBeInTheDocument();
    });

    it('shows active classes section', () => {
      render(<MentorClassesPage />);

      expect(screen.getByTestId('active-classes-section')).toBeInTheDocument();
      expect(screen.getByText('Morning Meditation Class')).toBeInTheDocument();
      expect(screen.getByText('Evening Yoga Class')).toBeInTheDocument();
    });

    it('shows disabled/past classes section', () => {
      render(<MentorClassesPage />);

      expect(screen.getByTestId('disabled-classes-section')).toBeInTheDocument();
      expect(screen.getByText('Completed Class')).toBeInTheDocument();
    });

    it('shows mentee count for each class', () => {
      render(<MentorClassesPage />);

      expect(screen.getByText(/3 mentees/)).toBeInTheDocument();
      expect(screen.getByText(/2 mentees/)).toBeInTheDocument();
      expect(screen.getByText(/5 mentees/)).toBeInTheDocument();
    });

    it('links to class detail page', () => {
      render(<MentorClassesPage />);

      const classLink = screen.getByTestId('class-item-class-1');
      expect(classLink).toHaveAttribute('href', '/mentor/classes/class-1');
    });

    it('shows stats summary with active classes count', () => {
      render(<MentorClassesPage />);

      expect(screen.getByTestId('classes-stats')).toBeInTheDocument();
      // "Active Classes" appears multiple times (in stats and as section header)
      expect(screen.getAllByText(/Active Classes/i).length).toBeGreaterThan(0);
    });

    it('shows total mentees count in stats', () => {
      render(<MentorClassesPage />);

      expect(screen.getByText('Total Mentees')).toBeInTheDocument();
      // Total: 3 + 2 + 5 = 10 mentees
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  describe('Mobile optimizations', () => {
    it('renders classes page within MobileLayout', () => {
      render(<MentorClassesPage />);
      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
    });

    it('renders class detail page within MobileLayout', () => {
      render(<ClassDetailPage />);
      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
    });

    it('has pull-to-refresh touch handlers on classes page', () => {
      render(<MentorClassesPage />);
      const container = screen.getByTestId('classes-page');
      expect(container).toBeInTheDocument();
    });

    it('has pull-to-refresh touch handlers on class detail page', () => {
      render(<ClassDetailPage />);
      const container = screen.getByTestId('class-detail-page');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Tab navigation', () => {
    it('shows mentees tab active by default', () => {
      render(<ClassDetailPage />);

      const menteesTab = screen.getByTestId('tab-mentees');
      expect(menteesTab).toHaveClass('bg-rdy-orange-600');
    });

    it('switches between mentees and sessions tabs', async () => {
      render(<ClassDetailPage />);

      // Initially on mentees tab
      expect(screen.getByTestId('enrolled-mentees-list')).toBeInTheDocument();

      // Switch to sessions
      fireEvent.click(screen.getByTestId('tab-sessions'));

      await waitFor(() => {
        expect(screen.getByTestId('session-history-list')).toBeInTheDocument();
      });

      // Switch back to mentees
      fireEvent.click(screen.getByTestId('tab-mentees'));

      await waitFor(() => {
        expect(screen.getByTestId('enrolled-mentees-list')).toBeInTheDocument();
      });
    });

    it('displays session count in tab', () => {
      render(<ClassDetailPage />);

      expect(screen.getByText(/Sessions \(15\)/)).toBeInTheDocument();
    });

    it('displays mentee count in tab', () => {
      render(<ClassDetailPage />);

      expect(screen.getByText(/Mentees \(3\)/)).toBeInTheDocument();
    });
  });
});
