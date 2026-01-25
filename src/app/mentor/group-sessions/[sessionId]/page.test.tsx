import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GroupSessionDetailPage from './page';

// Mock session data with full RSVP tracking
const mockSession = {
  id: 'session-1',
  tenantId: 'tenant-1',
  mentorId: 'mentor-1',
  classId: 'class-1',
  title: 'Weekly Q&A Session',
  description: 'Open discussion for class questions',
  agenda: '1. Review homework\n2. Q&A\n3. Next week preview',
  scheduledAt: new Date('2025-02-01T10:00:00'),
  durationMinutes: 60,
  maxParticipants: 20,
  status: 'scheduled' as const,
  location: 'Zoom Meeting',
  className: 'Morning Class',
  createdAt: new Date(),
  updatedAt: new Date(),
  rsvps: [
    {
      id: 'rsvp-1',
      userId: 'user-1',
      status: 'accepted' as const,
      notes: 'Looking forward to it!',
      respondedAt: new Date('2025-01-20T14:00:00'),
      user: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
    },
    {
      id: 'rsvp-2',
      userId: 'user-2',
      status: 'accepted' as const,
      notes: null,
      respondedAt: new Date('2025-01-21T09:00:00'),
      user: { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com' },
    },
    {
      id: 'rsvp-3',
      userId: 'user-3',
      status: 'pending' as const,
      notes: null,
      respondedAt: null,
      user: { id: 'user-3', name: 'Bob Wilson', email: 'bob@example.com' },
    },
    {
      id: 'rsvp-4',
      userId: 'user-4',
      status: 'declined' as const,
      notes: 'Schedule conflict',
      respondedAt: new Date('2025-01-22T11:00:00'),
      user: { id: 'user-4', name: 'Alice Brown', email: 'alice@example.com' },
    },
  ],
  rsvpCounts: { pending: 1, accepted: 2, declined: 1 },
};

const mockClassMembers = [
  { id: 'member-1', userId: 'user-1', user: { id: 'user-1', name: 'John Doe', email: 'john@example.com' } },
  { id: 'member-2', userId: 'user-2', user: { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com' } },
  { id: 'member-3', userId: 'user-3', user: { id: 'user-3', name: 'Bob Wilson', email: 'bob@example.com' } },
  { id: 'member-4', userId: 'user-4', user: { id: 'user-4', name: 'Alice Brown', email: 'alice@example.com' } },
  { id: 'member-5', userId: 'user-5', user: { id: 'user-5', name: 'Charlie Davis', email: 'charlie@example.com' } },
];

// Mock functions
const mockInvalidate = vi.fn().mockResolvedValue(undefined);
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();
const mockInviteMutate = vi.fn();
const mockPush = vi.fn();

let sessionLoading = false;

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    useUtils: () => ({
      groupSessions: {
        getGroupSessionDetail: { invalidate: mockInvalidate },
        getMyGroupSessions: { invalidate: mockInvalidate },
      },
    }),
    groupSessions: {
      getGroupSessionDetail: {
        useQuery: () => ({
          data: sessionLoading ? undefined : mockSession,
          isLoading: sessionLoading,
        }),
      },
      getClassMembers: {
        useQuery: () => ({
          data: mockClassMembers,
          isLoading: false,
        }),
      },
      update: {
        useMutation: ({ onSuccess }: { onSuccess?: () => void }) => ({
          mutate: mockUpdateMutate.mockImplementation(() => {
            if (onSuccess) onSuccess();
          }),
          isPending: false,
        }),
      },
      delete: {
        useMutation: ({ onSuccess }: { onSuccess?: () => void }) => ({
          mutate: mockDeleteMutate.mockImplementation(() => {
            if (onSuccess) onSuccess();
          }),
          isPending: false,
        }),
      },
      inviteMentees: {
        useMutation: ({ onSuccess }: { onSuccess?: () => void }) => ({
          mutate: mockInviteMutate.mockImplementation(() => {
            if (onSuccess) onSuccess();
          }),
          isPending: false,
        }),
      },
    },
  },
}));

// Mock MobileLayout
vi.mock('@/components/mobile', () => ({
  MobileLayout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="mobile-layout" data-title={title}>
      {children}
    </div>
  ),
}));

// Mock Dialog components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}));

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => ({
    sessionId: 'session-1',
  }),
}));

describe('GroupSessionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionLoading = false;
  });

  describe('Session header display', () => {
    it('should display the session title', () => {
      render(<GroupSessionDetailPage />);
      expect(screen.getByText('Weekly Q&A Session')).toBeInTheDocument();
    });

    it('should display associated class name', () => {
      render(<GroupSessionDetailPage />);
      expect(screen.getByText('Morning Class')).toBeInTheDocument();
    });

    it('should display session date and time', () => {
      render(<GroupSessionDetailPage />);

      const header = screen.getByTestId('session-header');
      expect(header).toHaveTextContent('Saturday, February 1, 2025');
      expect(header).toHaveTextContent('(60m)');
    });

    it('should display location when set', () => {
      render(<GroupSessionDetailPage />);

      expect(screen.getByText('Zoom Meeting')).toBeInTheDocument();
    });

    it('should display max participants when set', () => {
      render(<GroupSessionDetailPage />);

      const header = screen.getByTestId('session-header');
      expect(header).toHaveTextContent('Max: 20');
    });
  });

  describe('AC: RSVP tracking (pending, accepted, declined)', () => {
    it('should display RSVP summary cards with correct counts', () => {
      render(<GroupSessionDetailPage />);

      const summary = screen.getByTestId('rsvp-summary');
      expect(summary).toHaveTextContent('2'); // accepted
      expect(summary).toHaveTextContent('1'); // pending
      expect(summary).toHaveTextContent('1'); // declined
    });

    it('should display RSVP list with all participants', () => {
      render(<GroupSessionDetailPage />);

      expect(screen.getByTestId('rsvp-item-rsvp-1')).toBeInTheDocument();
      expect(screen.getByTestId('rsvp-item-rsvp-2')).toBeInTheDocument();
      expect(screen.getByTestId('rsvp-item-rsvp-3')).toBeInTheDocument();
      expect(screen.getByTestId('rsvp-item-rsvp-4')).toBeInTheDocument();
    });

    it('should display participant names', () => {
      render(<GroupSessionDetailPage />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      expect(screen.getByText('Alice Brown')).toBeInTheDocument();
    });

    it('should display RSVP status badges', () => {
      render(<GroupSessionDetailPage />);

      // Check for status badges - using getAllBy since there are multiple matches
      // (text appears in both summary cards and RSVP badges)
      const acceptedBadges = screen.getAllByText('Accepted');
      expect(acceptedBadges.length).toBeGreaterThanOrEqual(1);
      const pendingElements = screen.getAllByText('Pending');
      expect(pendingElements.length).toBeGreaterThanOrEqual(1);
      const declinedElements = screen.getAllByText('Declined');
      expect(declinedElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should display RSVP notes when provided', () => {
      render(<GroupSessionDetailPage />);

      expect(screen.getByText('"Looking forward to it!"')).toBeInTheDocument();
      expect(screen.getByText('"Schedule conflict"')).toBeInTheDocument();
    });

    it('should display responded at timestamp for responded RSVPs', () => {
      render(<GroupSessionDetailPage />);

      // Check that responded timestamps are displayed
      const rsvp1 = screen.getByTestId('rsvp-item-rsvp-1');
      expect(rsvp1).toHaveTextContent('Jan 20');
    });

    it('should display "Not responded" for pending RSVPs', () => {
      render(<GroupSessionDetailPage />);

      const rsvp3 = screen.getByTestId('rsvp-item-rsvp-3');
      expect(rsvp3).toHaveTextContent('Not responded');
    });
  });

  describe('AC: Session agenda field', () => {
    it('should display agenda section in details tab', () => {
      render(<GroupSessionDetailPage />);

      // Switch to details tab
      fireEvent.click(screen.getByTestId('tab-details'));

      expect(screen.getByTestId('agenda-section')).toBeInTheDocument();
    });

    it('should display agenda content', () => {
      render(<GroupSessionDetailPage />);

      fireEvent.click(screen.getByTestId('tab-details'));

      // The agenda section should contain the agenda text
      const agendaSection = screen.getByTestId('agenda-section');
      expect(agendaSection).toHaveTextContent('Review homework');
    });

    it('should have agenda field in edit form', () => {
      render(<GroupSessionDetailPage />);

      fireEvent.click(screen.getByTestId('edit-button'));

      expect(screen.getByTestId('edit-input-agenda')).toBeInTheDocument();
    });
  });

  describe('AC: Max participants setting', () => {
    it('should display max participants in session header', () => {
      render(<GroupSessionDetailPage />);

      expect(screen.getByText('Max: 20')).toBeInTheDocument();
    });

    it('should display max participants in session info', () => {
      render(<GroupSessionDetailPage />);

      fireEvent.click(screen.getByTestId('tab-details'));

      const detailsSection = screen.getByTestId('session-details');
      expect(detailsSection).toHaveTextContent('Max Participants');
      expect(detailsSection).toHaveTextContent('20');
    });

    it('should have max participants field in edit form', () => {
      render(<GroupSessionDetailPage />);

      fireEvent.click(screen.getByTestId('edit-button'));

      expect(screen.getByTestId('edit-input-max-participants')).toBeInTheDocument();
    });
  });

  describe('Edit functionality', () => {
    it('should open edit dialog when clicking edit button', () => {
      render(<GroupSessionDetailPage />);

      fireEvent.click(screen.getByTestId('edit-button'));

      expect(screen.getByTestId('edit-session-form')).toBeInTheDocument();
    });

    it('should pre-populate edit form with session data', () => {
      render(<GroupSessionDetailPage />);

      fireEvent.click(screen.getByTestId('edit-button'));

      const titleInput = screen.getByTestId('edit-input-title') as HTMLInputElement;
      expect(titleInput.value).toBe('Weekly Q&A Session');
    });

    it('should submit edit form with updated data', async () => {
      render(<GroupSessionDetailPage />);

      fireEvent.click(screen.getByTestId('edit-button'));

      // Change title
      fireEvent.change(screen.getByTestId('edit-input-title'), {
        target: { value: 'Updated Session Title' },
      });

      // Submit
      fireEvent.submit(screen.getByTestId('edit-session-form'));

      await waitFor(() => {
        expect(mockUpdateMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            sessionId: 'session-1',
            title: 'Updated Session Title',
          })
        );
      });
    });
  });

  describe('Delete functionality', () => {
    it('should open delete confirmation dialog', () => {
      render(<GroupSessionDetailPage />);

      fireEvent.click(screen.getByTestId('delete-button'));

      expect(screen.getByText('Delete Group Session')).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to delete this group session/)
      ).toBeInTheDocument();
    });

    it('should delete session when confirmed', async () => {
      render(<GroupSessionDetailPage />);

      fireEvent.click(screen.getByTestId('delete-button'));
      fireEvent.click(screen.getByTestId('confirm-delete-button'));

      await waitFor(() => {
        expect(mockDeleteMutate).toHaveBeenCalledWith({ sessionId: 'session-1' });
      });
    });
  });

  describe('Invite functionality', () => {
    it('should show invite more button when there are uninvited class members', () => {
      render(<GroupSessionDetailPage />);

      expect(screen.getByTestId('invite-more-button')).toBeInTheDocument();
      expect(screen.getByText(/Invite more mentees/)).toBeInTheDocument();
    });

    it('should open invite dialog when clicking invite button', () => {
      render(<GroupSessionDetailPage />);

      fireEvent.click(screen.getByTestId('invite-more-button'));

      expect(screen.getByTestId('invite-mentees-list')).toBeInTheDocument();
    });

    it('should only show uninvited mentees in invite dialog', () => {
      render(<GroupSessionDetailPage />);

      fireEvent.click(screen.getByTestId('invite-more-button'));

      // Charlie Davis (user-5) is not invited yet
      expect(screen.getByTestId('invite-mentee-user-5')).toBeInTheDocument();

      // Other users are already invited, should not appear in invite list
      expect(screen.queryByTestId('invite-mentee-user-1')).not.toBeInTheDocument();
    });

    it('should allow selecting mentees to invite', () => {
      render(<GroupSessionDetailPage />);

      fireEvent.click(screen.getByTestId('invite-more-button'));

      const menteeButton = screen.getByTestId('invite-mentee-user-5');
      fireEvent.click(menteeButton);

      // Button should have selected styling
      expect(menteeButton).toHaveClass('bg-twilight-600/20');
    });

    it('should submit invite with selected mentees', async () => {
      render(<GroupSessionDetailPage />);

      fireEvent.click(screen.getByTestId('invite-more-button'));
      fireEvent.click(screen.getByTestId('invite-mentee-user-5'));
      fireEvent.click(screen.getByTestId('confirm-invite-button'));

      await waitFor(() => {
        expect(mockInviteMutate).toHaveBeenCalledWith({
          sessionId: 'session-1',
          userIds: ['user-5'],
        });
      });
    });
  });

  describe('Tab navigation', () => {
    it('should display tab navigation', () => {
      render(<GroupSessionDetailPage />);

      expect(screen.getByTestId('tab-navigation')).toBeInTheDocument();
      expect(screen.getByTestId('tab-rsvps')).toBeInTheDocument();
      expect(screen.getByTestId('tab-details')).toBeInTheDocument();
    });

    it('should show RSVPs tab by default', () => {
      render(<GroupSessionDetailPage />);

      const rsvpsTab = screen.getByTestId('tab-rsvps');
      expect(rsvpsTab).toHaveClass('bg-twilight-600');
    });

    it('should switch to details tab when clicked', () => {
      render(<GroupSessionDetailPage />);

      fireEvent.click(screen.getByTestId('tab-details'));

      const detailsTab = screen.getByTestId('tab-details');
      expect(detailsTab).toHaveClass('bg-twilight-600');
    });

    it('should show session details when details tab is active', () => {
      render(<GroupSessionDetailPage />);

      fireEvent.click(screen.getByTestId('tab-details'));

      expect(screen.getByTestId('session-details')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Session Info')).toBeInTheDocument();
    });
  });

  describe('Loading and error states', () => {
    it('should show loading spinner when loading', () => {
      sessionLoading = true;
      render(<GroupSessionDetailPage />);

      // Should show loading state
      expect(screen.queryByTestId('session-detail-page')).not.toBeInTheDocument();
    });
  });

  describe('Pull to refresh', () => {
    it('should refresh data when pulled', async () => {
      render(<GroupSessionDetailPage />);

      const page = screen.getByTestId('session-detail-page');

      fireEvent.touchStart(page, { touches: [{ clientY: 0 }] });
      fireEvent.touchMove(page, { touches: [{ clientY: 80 }] });
      fireEvent.touchEnd(page);

      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalled();
      });
    });
  });
});
