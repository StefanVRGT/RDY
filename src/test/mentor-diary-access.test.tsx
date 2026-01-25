import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { format } from 'date-fns';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
  }),
  useParams: () => ({
    menteeId: 'test-mentee-id',
  }),
}));

// Mock tRPC queries
const mockGetMenteeInfoQuery = vi.fn();
const mockGetMyMenteesQuery = vi.fn();
const mockGetMenteeDiaryEntriesQuery = vi.fn();
const mockGetMenteeDiaryEntriesCountQuery = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    mentor: {
      getMenteeInfo: {
        useQuery: (params: { menteeId: string }, options: { enabled: boolean }) =>
          mockGetMenteeInfoQuery(params, options),
      },
      getMyMentees: {
        useQuery: () => mockGetMyMenteesQuery(),
      },
      getMenteeDiaryEntries: {
        useQuery: (params: unknown, options: { enabled: boolean }) =>
          mockGetMenteeDiaryEntriesQuery(params, options),
      },
      getMenteeDiaryEntriesCount: {
        useQuery: (params: unknown, options: { enabled: boolean }) =>
          mockGetMenteeDiaryEntriesCountQuery(params, options),
      },
    },
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

// Mock Calendar component
vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect, selected }: { onSelect: (date: Date) => void; selected?: Date }) => (
    <div data-testid="mock-calendar">
      <button data-testid="select-today" onClick={() => onSelect(new Date())}>
        Select Today
      </button>
      {selected && <span data-testid="selected-date">{format(selected, 'yyyy-MM-dd')}</span>}
    </div>
  ),
}));

// Mock data
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

const mockMenteeInfo = {
  id: 'test-mentee-id',
  name: 'Jane Doe',
  email: 'jane@example.com',
  classes: [
    {
      classId: 'class-1',
      className: 'Meditation Basics',
      enrolledAt: yesterday,
    },
  ],
};

const mockAllMentees = [
  {
    classId: 'class-1',
    userId: 'test-mentee-id',
    enrolledAt: yesterday,
    className: 'Meditation Basics',
    user: {
      id: 'test-mentee-id',
      name: 'Jane Doe',
      email: 'jane@example.com',
    },
  },
  {
    classId: 'class-1',
    userId: 'mentee-2',
    enrolledAt: yesterday,
    className: 'Meditation Basics',
    user: {
      id: 'mentee-2',
      name: 'John Smith',
      email: 'john@example.com',
    },
  },
  {
    classId: 'class-2',
    userId: 'mentee-3',
    enrolledAt: yesterday,
    className: 'Advanced Yoga',
    user: {
      id: 'mentee-3',
      name: 'Alice Brown',
      email: 'alice@example.com',
    },
  },
];

const mockDiaryEntries = [
  {
    id: 'entry-1',
    entryType: 'text' as const,
    content: 'Today was a productive day. I completed my morning meditation.',
    voiceRecordingUrl: null,
    voiceRecordingDuration: null,
    entryDate: today,
    createdAt: today,
    updatedAt: today,
  },
  {
    id: 'entry-2',
    entryType: 'voice' as const,
    content: null,
    voiceRecordingUrl: 'https://example.com/voice-note.webm',
    voiceRecordingDuration: 60,
    entryDate: yesterday,
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: 'entry-3',
    entryType: 'mixed' as const,
    content: 'A note about my progress with text and audio.',
    voiceRecordingUrl: 'https://example.com/mixed-note.webm',
    voiceRecordingDuration: 30,
    entryDate: yesterday,
    createdAt: yesterday,
    updatedAt: yesterday,
  },
];

const mockEntryCounts = {
  [format(today, 'yyyy-MM-dd')]: 1,
  [format(yesterday, 'yyyy-MM-dd')]: 2,
};

// Import the component after mocks
import MentorMenteeDiaryPage from '@/app/mentor/mentee/[menteeId]/diary/page';

describe('S8.4 - Mentor Diary Access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMenteeInfoQuery.mockReturnValue({
      data: mockMenteeInfo,
      isLoading: false,
      error: null,
    });
    mockGetMyMenteesQuery.mockReturnValue({
      data: mockAllMentees,
      isLoading: false,
    });
    mockGetMenteeDiaryEntriesQuery.mockReturnValue({
      data: mockDiaryEntries,
      isLoading: false,
    });
    mockGetMenteeDiaryEntriesCountQuery.mockReturnValue({
      data: mockEntryCounts,
      isLoading: false,
    });
  });

  describe('AC1: Mentor can view class diary entries', () => {
    it('renders the mentor diary access page', () => {
      render(<MentorMenteeDiaryPage />);

      expect(screen.getByTestId('mentor-mentee-diary')).toBeInTheDocument();
    });

    it('displays mentee info header with name and email', () => {
      render(<MentorMenteeDiaryPage />);

      expect(screen.getByTestId('mentee-info-header')).toBeInTheDocument();
      expect(screen.getByTestId('mentee-name')).toHaveTextContent('Jane Doe');
      expect(screen.getByTestId('mentee-email')).toHaveTextContent('jane@example.com');
    });

    it('displays mentee class information', () => {
      render(<MentorMenteeDiaryPage />);

      expect(screen.getByTestId('mentee-class')).toHaveTextContent('Meditation Basics');
    });

    it('displays diary entries list', () => {
      render(<MentorMenteeDiaryPage />);

      expect(screen.getByTestId('diary-entries-list')).toBeInTheDocument();
      expect(screen.getByTestId('diary-entry-entry-1')).toBeInTheDocument();
      expect(screen.getByTestId('diary-entry-entry-2')).toBeInTheDocument();
      expect(screen.getByTestId('diary-entry-entry-3')).toBeInTheDocument();
    });

    it('displays text content of entries', () => {
      render(<MentorMenteeDiaryPage />);

      expect(screen.getByTestId('entry-content-entry-1')).toHaveTextContent(
        'Today was a productive day. I completed my morning meditation.'
      );
    });

    it('displays entry dates correctly', () => {
      render(<MentorMenteeDiaryPage />);

      expect(screen.getByTestId('entry-date-entry-1')).toBeInTheDocument();
      expect(screen.getByTestId('entry-date-entry-2')).toBeInTheDocument();
    });

    it('shows empty state when mentee has no entries', () => {
      mockGetMenteeDiaryEntriesQuery.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<MentorMenteeDiaryPage />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No diary entries')).toBeInTheDocument();
      expect(
        screen.getByText('This mentee has not created any diary entries yet')
      ).toBeInTheDocument();
    });

    it('shows loading state while fetching mentee info', () => {
      mockGetMenteeInfoQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<MentorMenteeDiaryPage />);

      // Should show loading spinner
      expect(screen.queryByTestId('mentor-mentee-diary')).not.toBeInTheDocument();
    });

    it('shows error state when mentor lacks access', () => {
      mockGetMenteeInfoQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('You do not have access to this mentee'),
      });

      render(<MentorMenteeDiaryPage />);

      expect(screen.getByTestId('diary-error')).toBeInTheDocument();
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('renders within MobileLayout wrapper', () => {
      render(<MentorMenteeDiaryPage />);

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
    });

    it('shows mentee name in page title', () => {
      render(<MentorMenteeDiaryPage />);

      const header = screen.getByTestId('mobile-header');
      expect(header).toHaveTextContent("Jane Doe's Diary");
    });
  });

  describe('AC2: Filter by mentee', () => {
    it('displays mentee filter button', () => {
      render(<MentorMenteeDiaryPage />);

      expect(screen.getByTestId('mentee-filter-button')).toBeInTheDocument();
      expect(screen.getByText('Change Mentee')).toBeInTheDocument();
    });

    it('opens mentee filter dialog when clicking filter button', async () => {
      render(<MentorMenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('mentee-filter-button'));

      await waitFor(() => {
        expect(screen.getByText('Select Mentee')).toBeInTheDocument();
        expect(screen.getByTestId('mentee-filter-list')).toBeInTheDocument();
      });
    });

    it('displays all mentees in the filter dialog', async () => {
      render(<MentorMenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('mentee-filter-button'));

      await waitFor(() => {
        expect(screen.getByTestId('mentee-option-test-mentee-id')).toBeInTheDocument();
        expect(screen.getByTestId('mentee-option-mentee-2')).toBeInTheDocument();
        expect(screen.getByTestId('mentee-option-mentee-3')).toBeInTheDocument();
      });
    });

    it('shows mentee names and class info in filter list', async () => {
      render(<MentorMenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('mentee-filter-button'));

      await waitFor(() => {
        // Jane Doe appears in both header and filter list, so use getAllByText
        const janeDoeElements = screen.getAllByText('Jane Doe');
        expect(janeDoeElements.length).toBeGreaterThan(1); // In header and in filter list
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('Alice Brown')).toBeInTheDocument();
        expect(screen.getByText('Advanced Yoga')).toBeInTheDocument();
      });
    });

    it('highlights currently selected mentee in filter list', async () => {
      render(<MentorMenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('mentee-filter-button'));

      await waitFor(() => {
        const currentMenteeOption = screen.getByTestId('mentee-option-test-mentee-id');
        expect(currentMenteeOption).toHaveClass('ring-twilight-500');
      });
    });

    it('navigates to new mentee diary when selecting from filter', async () => {
      render(<MentorMenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('mentee-filter-button'));

      await waitFor(() => {
        expect(screen.getByTestId('mentee-option-mentee-2')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('mentee-option-mentee-2'));

      expect(mockPush).toHaveBeenCalledWith('/mentor/mentee/mentee-2/diary');
    });

    it('shows empty message when no mentees available', async () => {
      mockGetMyMenteesQuery.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<MentorMenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('mentee-filter-button'));

      await waitFor(() => {
        expect(screen.getByText('No mentees found')).toBeInTheDocument();
      });
    });

    it('displays date filter button alongside mentee filter', () => {
      render(<MentorMenteeDiaryPage />);

      expect(screen.getByTestId('diary-filters')).toBeInTheDocument();
      expect(screen.getByTestId('mentee-filter-button')).toBeInTheDocument();
      expect(screen.getByTestId('date-filter-button')).toBeInTheDocument();
    });

    it('opens date filter dialog when clicking date filter button', async () => {
      render(<MentorMenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('date-filter-button'));

      await waitFor(() => {
        expect(screen.getByText('Filter by Date')).toBeInTheDocument();
        expect(screen.getByTestId('date-filter-calendar')).toBeInTheDocument();
      });
    });

    it('updates date filter button text when date is selected', async () => {
      render(<MentorMenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('date-filter-button'));

      await waitFor(() => {
        expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-today'));

      await waitFor(() => {
        const filterButton = screen.getByTestId('date-filter-button');
        expect(filterButton).toHaveTextContent(format(new Date(), 'MMM d'));
      });
    });

    it('shows clear date filter button when date is selected', async () => {
      render(<MentorMenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('date-filter-button'));

      await waitFor(() => {
        expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-today'));

      await waitFor(() => {
        expect(screen.getByTestId('clear-date-filter')).toBeInTheDocument();
      });
    });

    it('clears date filter when clicking clear button', async () => {
      render(<MentorMenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('date-filter-button'));

      await waitFor(() => {
        expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-today'));

      await waitFor(() => {
        expect(screen.getByTestId('clear-date-filter')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('clear-date-filter'));

      await waitFor(() => {
        expect(screen.getByText('All dates')).toBeInTheDocument();
      });
    });
  });

  describe('AC3: Read-only access', () => {
    it('displays read-only notice', () => {
      render(<MentorMenteeDiaryPage />);

      expect(screen.getByTestId('readonly-notice')).toBeInTheDocument();
      expect(screen.getByText('Read-only access')).toBeInTheDocument();
      expect(
        screen.getByText(/You can view diary entries but cannot modify them/)
      ).toBeInTheDocument();
    });

    it('does not display edit buttons on entries', () => {
      render(<MentorMenteeDiaryPage />);

      expect(screen.queryByTestId('edit-entry-entry-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('edit-entry-entry-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('edit-entry-entry-3')).not.toBeInTheDocument();
    });

    it('does not display delete buttons on entries', () => {
      render(<MentorMenteeDiaryPage />);

      expect(screen.queryByTestId('delete-entry-entry-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('delete-entry-entry-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('delete-entry-entry-3')).not.toBeInTheDocument();
    });

    it('does not display new entry button', () => {
      render(<MentorMenteeDiaryPage />);

      expect(screen.queryByTestId('new-entry-button')).not.toBeInTheDocument();
      expect(screen.queryByText('New Entry')).not.toBeInTheDocument();
    });

    it('displays entry content as read-only text', () => {
      render(<MentorMenteeDiaryPage />);

      // Content should be displayed as plain text, not in a textarea
      const textContent = screen.getByTestId('entry-content-entry-1');
      expect(textContent.tagName.toLowerCase()).toBe('p');
    });
  });

  describe('AC4: Voice playback support', () => {
    it('displays voice recording section for voice entries', () => {
      render(<MentorMenteeDiaryPage />);

      expect(screen.getByTestId('entry-voice-entry-2')).toBeInTheDocument();
      expect(screen.getByTestId('entry-voice-entry-3')).toBeInTheDocument();
    });

    it('displays play button for voice entries', () => {
      render(<MentorMenteeDiaryPage />);

      expect(screen.getByTestId('play-voice-entry-2')).toBeInTheDocument();
      expect(screen.getByTestId('play-voice-entry-3')).toBeInTheDocument();
    });

    it('displays voice note label', () => {
      render(<MentorMenteeDiaryPage />);

      const voiceLabels = screen.getAllByText('Voice Note');
      expect(voiceLabels).toHaveLength(2); // entry-2 and entry-3
    });

    it('displays voice recording duration', () => {
      render(<MentorMenteeDiaryPage />);

      // entry-2 has 60 seconds duration (1:00)
      expect(screen.getByText('1:00')).toBeInTheDocument();
      // entry-3 has 30 seconds duration (0:30)
      expect(screen.getByText('0:30')).toBeInTheDocument();
    });

    it('displays entry type indicator for voice entries', () => {
      render(<MentorMenteeDiaryPage />);

      const voiceEntry = screen.getByTestId('diary-entry-entry-2');
      expect(voiceEntry).toHaveAttribute('data-entry-type', 'voice');
    });

    it('displays entry type indicator for mixed entries', () => {
      render(<MentorMenteeDiaryPage />);

      const mixedEntry = screen.getByTestId('diary-entry-entry-3');
      expect(mixedEntry).toHaveAttribute('data-entry-type', 'mixed');
    });

    it('does not display voice section for text-only entries', () => {
      render(<MentorMenteeDiaryPage />);

      expect(screen.queryByTestId('entry-voice-entry-1')).not.toBeInTheDocument();
    });

    it('displays both text and voice for mixed entries', () => {
      render(<MentorMenteeDiaryPage />);

      // Mixed entry should have both content and voice
      expect(screen.getByTestId('entry-content-entry-3')).toBeInTheDocument();
      expect(screen.getByTestId('entry-voice-entry-3')).toBeInTheDocument();
    });
  });

  describe('Entry display', () => {
    it('displays text entry type indicator', () => {
      render(<MentorMenteeDiaryPage />);

      const textEntry = screen.getByTestId('diary-entry-entry-1');
      expect(textEntry).toHaveAttribute('data-entry-type', 'text');
    });

    it('shows loading state while fetching entries', () => {
      mockGetMenteeDiaryEntriesQuery.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<MentorMenteeDiaryPage />);

      expect(screen.getByTestId('diary-entries-list')).toBeInTheDocument();
    });

    it('displays entries in chronological order', () => {
      render(<MentorMenteeDiaryPage />);

      const entriesList = screen.getByTestId('diary-entries-list');
      const entries = entriesList.querySelectorAll('[data-testid^="diary-entry-"]');

      // First entry should be from today (entry-1 in mock data is newest)
      expect(entries[0]).toHaveAttribute('data-testid', 'diary-entry-entry-1');
    });
  });
});
