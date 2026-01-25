import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { format } from 'date-fns';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock tRPC queries and mutations
const mockGetEntriesQuery = vi.fn();
const mockGetEntriesCountQuery = vi.fn();
const mockCreateEntryMutate = vi.fn();
const mockUpdateEntryMutate = vi.fn();
const mockDeleteEntryMutate = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    diary: {
      getEntries: {
        useQuery: () => mockGetEntriesQuery(),
      },
      getEntriesCount: {
        useQuery: () => mockGetEntriesCountQuery(),
      },
      createEntry: {
        useMutation: () => ({
          mutate: mockCreateEntryMutate,
          isPending: false,
        }),
      },
      updateEntry: {
        useMutation: () => ({
          mutate: mockUpdateEntryMutate,
          isPending: false,
        }),
      },
      deleteEntry: {
        useMutation: () => ({
          mutate: mockDeleteEntryMutate,
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      diary: {
        getEntries: {
          invalidate: mockInvalidate,
        },
        getEntriesCount: {
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
      {selected && <span data-testid="selected-date">{format(selected, 'yyyy-MM-dd')}</span>}
    </div>
  ),
}));

// Mock MediaRecorder
class MockMediaRecorder {
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  state = 'inactive';

  constructor() {
    // Bind methods
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['test'], { type: 'audio/webm' }) });
    }
    if (this.onstop) {
      this.onstop();
    }
  }
}

Object.defineProperty(global, 'MediaRecorder', {
  writable: true,
  value: MockMediaRecorder,
});

const mockGetUserMedia = vi.fn().mockResolvedValue({
  getTracks: () => [{ stop: vi.fn() }],
});

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
  },
});

// Mock data
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

const mockDiaryEntries = [
  {
    id: 'entry-1',
    entryType: 'text' as const,
    content: 'Today was a great day! I practiced my meditation exercises.',
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
    voiceRecordingUrl: 'https://example.com/recording.webm',
    voiceRecordingDuration: 45,
    entryDate: yesterday,
    createdAt: yesterday,
    updatedAt: yesterday,
  },
  {
    id: 'entry-3',
    entryType: 'mixed' as const,
    content: 'A note with both text and voice.',
    voiceRecordingUrl: 'https://example.com/mixed-recording.webm',
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
import MenteeDiaryPage from '@/app/mentee/diary/page';

describe('S8.2 - Mentee Diary Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEntriesQuery.mockReturnValue({
      data: mockDiaryEntries,
      isLoading: false,
    });
    mockGetEntriesCountQuery.mockReturnValue({
      data: mockEntryCounts,
      isLoading: false,
    });
  });

  describe('AC1: Text entry with simple editor', () => {
    it('renders the diary page with a new entry button', () => {
      render(<MenteeDiaryPage />);

      expect(screen.getByTestId('mentee-diary')).toBeInTheDocument();
      expect(screen.getByTestId('new-entry-button')).toBeInTheDocument();
      expect(screen.getByText('New Entry')).toBeInTheDocument();
    });

    it('opens new entry dialog when clicking new entry button', async () => {
      render(<MenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('new-entry-button'));

      await waitFor(() => {
        expect(screen.getByTestId('new-entry-dialog-title')).toBeInTheDocument();
        expect(screen.getByText('New Diary Entry')).toBeInTheDocument();
      });
    });

    it('displays a text editor in the new entry dialog', async () => {
      render(<MenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('new-entry-button'));

      await waitFor(() => {
        expect(screen.getByTestId('diary-text-editor')).toBeInTheDocument();
        expect(screen.getByPlaceholderText("What's on your mind today?")).toBeInTheDocument();
      });
    });

    it('allows typing in the text editor', async () => {
      render(<MenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('new-entry-button'));

      await waitFor(() => {
        const textarea = screen.getByTestId('diary-text-editor') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: 'My new diary entry' } });
        expect(textarea.value).toBe('My new diary entry');
      });
    });

    it('calls create mutation when saving a text entry', async () => {
      render(<MenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('new-entry-button'));

      await waitFor(() => {
        expect(screen.getByTestId('diary-text-editor')).toBeInTheDocument();
      });

      const textarea = screen.getByTestId('diary-text-editor');
      fireEvent.change(textarea, { target: { value: 'My new diary entry' } });

      fireEvent.click(screen.getByTestId('save-entry-button'));

      expect(mockCreateEntryMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'My new diary entry',
        })
      );
    });

    it('displays text content in diary entry cards', () => {
      render(<MenteeDiaryPage />);

      expect(screen.getByTestId('entry-content-entry-1')).toBeInTheDocument();
      expect(
        screen.getByText('Today was a great day! I practiced my meditation exercises.')
      ).toBeInTheDocument();
    });

    it('disables save button when text is empty', async () => {
      render(<MenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('new-entry-button'));

      await waitFor(() => {
        const saveButton = screen.getByTestId('save-entry-button');
        expect(saveButton).toBeDisabled();
      });
    });
  });

  describe('AC2: Voice recording button', () => {
    it('displays a voice recording button in the new entry dialog', async () => {
      render(<MenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('new-entry-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-record-button')).toBeInTheDocument();
        expect(screen.getByText('Start Recording')).toBeInTheDocument();
      });
    });

    it('starts recording when clicking the record button', async () => {
      render(<MenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('new-entry-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-record-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      });
    });

    it('shows stop button while recording', async () => {
      render(<MenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('new-entry-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-record-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-stop-button')).toBeInTheDocument();
        expect(screen.getByText('Stop')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('displays recording duration while recording', async () => {
      render(<MenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('new-entry-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-record-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('voice-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('recording-duration')).toBeInTheDocument();
        expect(screen.getByText('0:00')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('displays voice recording in entry cards', () => {
      render(<MenteeDiaryPage />);

      expect(screen.getByTestId('entry-voice-entry-2')).toBeInTheDocument();
      expect(screen.getByTestId('play-voice-entry-2')).toBeInTheDocument();
    });

    it('shows voice entry type indicator', () => {
      render(<MenteeDiaryPage />);

      const voiceEntry = screen.getByTestId('diary-entry-entry-2');
      expect(voiceEntry).toHaveAttribute('data-entry-type', 'voice');
    });
  });

  describe('AC3: Entry list chronologically', () => {
    it('displays entries in a list', () => {
      render(<MenteeDiaryPage />);

      expect(screen.getByTestId('diary-entries-list')).toBeInTheDocument();
      expect(screen.getByTestId('diary-entry-entry-1')).toBeInTheDocument();
      expect(screen.getByTestId('diary-entry-entry-2')).toBeInTheDocument();
      expect(screen.getByTestId('diary-entry-entry-3')).toBeInTheDocument();
    });

    it('displays entry dates', () => {
      render(<MenteeDiaryPage />);

      // Check that dates are displayed for each entry
      expect(screen.getByTestId('entry-date-entry-1')).toBeInTheDocument();
      expect(screen.getByTestId('entry-date-entry-2')).toBeInTheDocument();
    });

    it('shows entries ordered by date (newest first by default)', () => {
      render(<MenteeDiaryPage />);

      const entriesList = screen.getByTestId('diary-entries-list');
      const entries = entriesList.querySelectorAll('[data-testid^="diary-entry-"]');

      // First entry should be from today (entry-1 in mock data is newest)
      expect(entries[0]).toHaveAttribute('data-testid', 'diary-entry-entry-1');
    });

    it('shows empty state when no entries exist', () => {
      mockGetEntriesQuery.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<MenteeDiaryPage />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No diary entries')).toBeInTheDocument();
    });

    it('shows loading state while fetching entries', () => {
      mockGetEntriesQuery.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<MenteeDiaryPage />);

      expect(screen.getByTestId('diary-entries-list')).toBeInTheDocument();
    });
  });

  describe('AC4: Filter by date', () => {
    it('displays a date filter button', () => {
      render(<MenteeDiaryPage />);

      expect(screen.getByTestId('date-filter-button')).toBeInTheDocument();
      expect(screen.getByText('All dates')).toBeInTheDocument();
    });

    it('opens calendar filter dialog when clicking date filter button', async () => {
      render(<MenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('date-filter-button'));

      await waitFor(() => {
        expect(screen.getByText('Filter by Date')).toBeInTheDocument();
        expect(screen.getByTestId('date-filter-calendar')).toBeInTheDocument();
      });
    });

    it('shows calendar component in filter dialog', async () => {
      render(<MenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('date-filter-button'));

      await waitFor(() => {
        expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
      });
    });

    it('updates filter button text when date is selected', async () => {
      render(<MenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('date-filter-button'));

      await waitFor(() => {
        expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
      });

      // Select today in the mock calendar
      fireEvent.click(screen.getByTestId('select-today'));

      await waitFor(() => {
        // Check that the filter button shows the selected date
        const filterButton = screen.getByTestId('date-filter-button');
        expect(filterButton).toHaveTextContent(format(new Date(), 'MMM d'));
      });
    });

    it('shows clear filter button when date is selected', async () => {
      render(<MenteeDiaryPage />);

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
      render(<MenteeDiaryPage />);

      // Select a date first
      fireEvent.click(screen.getByTestId('date-filter-button'));

      await waitFor(() => {
        expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('select-today'));

      await waitFor(() => {
        expect(screen.getByTestId('clear-date-filter')).toBeInTheDocument();
      });

      // Clear the filter
      fireEvent.click(screen.getByTestId('clear-date-filter'));

      await waitFor(() => {
        expect(screen.getByText('All dates')).toBeInTheDocument();
      });
    });
  });

  describe('AC5: Edit/delete entries', () => {
    it('displays edit button for text entries', () => {
      render(<MenteeDiaryPage />);

      expect(screen.getByTestId('edit-entry-entry-1')).toBeInTheDocument();
    });

    it('displays delete button for all entries', () => {
      render(<MenteeDiaryPage />);

      expect(screen.getByTestId('delete-entry-entry-1')).toBeInTheDocument();
      expect(screen.getByTestId('delete-entry-entry-2')).toBeInTheDocument();
      expect(screen.getByTestId('delete-entry-entry-3')).toBeInTheDocument();
    });

    it('opens edit dialog when clicking edit button', async () => {
      render(<MenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('edit-entry-entry-1'));

      await waitFor(() => {
        expect(screen.getByTestId('edit-entry-dialog-title')).toBeInTheDocument();
        expect(screen.getByText('Edit Entry')).toBeInTheDocument();
      });
    });

    it('pre-fills edit dialog with existing content', async () => {
      render(<MenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('edit-entry-entry-1'));

      await waitFor(() => {
        const textarea = screen.getByTestId('edit-text-editor') as HTMLTextAreaElement;
        expect(textarea.value).toBe(
          'Today was a great day! I practiced my meditation exercises.'
        );
      });
    });

    it('calls update mutation when saving edited entry', async () => {
      render(<MenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('edit-entry-entry-1'));

      await waitFor(() => {
        expect(screen.getByTestId('edit-text-editor')).toBeInTheDocument();
      });

      const textarea = screen.getByTestId('edit-text-editor');
      fireEvent.change(textarea, { target: { value: 'Updated content' } });

      fireEvent.click(screen.getByTestId('update-entry-button'));

      expect(mockUpdateEntryMutate).toHaveBeenCalledWith({
        id: 'entry-1',
        content: 'Updated content',
      });
    });

    it('opens delete confirmation dialog when clicking delete button', async () => {
      render(<MenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('delete-entry-entry-1'));

      await waitFor(() => {
        expect(screen.getByText('Delete Entry')).toBeInTheDocument();
        expect(
          screen.getByText('Are you sure you want to delete this entry? This action cannot be undone.')
        ).toBeInTheDocument();
      });
    });

    it('calls delete mutation when confirming delete', async () => {
      render(<MenteeDiaryPage />);

      fireEvent.click(screen.getByTestId('delete-entry-entry-1'));

      await waitFor(() => {
        expect(screen.getByTestId('confirm-delete-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('confirm-delete-button'));

      expect(mockDeleteEntryMutate).toHaveBeenCalledWith({ id: 'entry-1' });
    });

    it('does not show edit button for voice-only entries', () => {
      render(<MenteeDiaryPage />);

      // Voice-only entry (entry-2) should not have edit button
      expect(screen.queryByTestId('edit-entry-entry-2')).not.toBeInTheDocument();
    });

    it('shows edit button for mixed entries (text + voice)', () => {
      render(<MenteeDiaryPage />);

      // Mixed entry (entry-3) should have edit button for text portion
      expect(screen.getByTestId('edit-entry-entry-3')).toBeInTheDocument();
    });
  });

  describe('Entry types and display', () => {
    it('displays text entry type indicator', () => {
      render(<MenteeDiaryPage />);

      const textEntry = screen.getByTestId('diary-entry-entry-1');
      expect(textEntry).toHaveAttribute('data-entry-type', 'text');
    });

    it('displays voice entry type indicator', () => {
      render(<MenteeDiaryPage />);

      const voiceEntry = screen.getByTestId('diary-entry-entry-2');
      expect(voiceEntry).toHaveAttribute('data-entry-type', 'voice');
    });

    it('displays mixed entry type indicator', () => {
      render(<MenteeDiaryPage />);

      const mixedEntry = screen.getByTestId('diary-entry-entry-3');
      expect(mixedEntry).toHaveAttribute('data-entry-type', 'mixed');
    });

    it('displays both text content and voice recording for mixed entries', () => {
      render(<MenteeDiaryPage />);

      expect(screen.getByTestId('entry-content-entry-3')).toBeInTheDocument();
      expect(screen.getByTestId('entry-voice-entry-3')).toBeInTheDocument();
    });
  });

  describe('Mobile optimizations', () => {
    it('renders within MobileLayout wrapper', () => {
      render(<MenteeDiaryPage />);

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
    });

    it('has proper diary header', () => {
      render(<MenteeDiaryPage />);

      expect(screen.getByTestId('diary-header')).toBeInTheDocument();
    });

    it('shows create entry button in empty state', () => {
      mockGetEntriesQuery.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<MenteeDiaryPage />);

      // Should have two "Create Entry" buttons - one in header, one in empty state
      expect(screen.getByText('Create Entry')).toBeInTheDocument();
    });
  });
});
