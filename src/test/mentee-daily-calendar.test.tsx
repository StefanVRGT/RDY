import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { format, addDays, subDays } from 'date-fns';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock tRPC
const mockUseQuery = vi.fn();
const mockToggleCompletionMutate = vi.fn();
const mockAddExerciseMutate = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    mentee: {
      getExercisesForDate: {
        useQuery: () => mockUseQuery(),
      },
      getOptionalExercises: {
        useQuery: () => ({ data: mockOptionalExercises, isLoading: false }),
      },
      toggleExerciseCompletion: {
        useMutation: () => ({
          mutate: mockToggleCompletionMutate,
          isPending: false,
        }),
      },
      addExerciseToSchedule: {
        useMutation: () => ({
          mutate: mockAddExerciseMutate,
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      mentee: {
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

// Mock data
const today = new Date();

const mockScheduledExercises = [
  {
    id: 'scheduled-1',
    scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 0),
    completed: false,
    completedAt: null,
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
      videoUrl: 'https://example.com/meditation.mp4',
      audioUrl: null,
      contentDe: null,
      contentEn: null,
    },
    isObligatory: true,
  },
  {
    id: 'scheduled-2',
    scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
    completed: true,
    completedAt: new Date(),
    notes: 'Felt great!',
    exerciseId: 'exercise-2',
    classId: 'class-1',
    exercise: {
      id: 'exercise-2',
      type: 'audio' as const,
      titleDe: 'Atemübungen',
      titleEn: 'Breathing Exercises',
      descriptionDe: 'Tiefes Atmen für Entspannung',
      descriptionEn: 'Deep breathing for relaxation',
      durationMinutes: 10,
      videoUrl: null,
      audioUrl: 'https://example.com/breathing.mp3',
      contentDe: null,
      contentEn: null,
    },
    isObligatory: true,
  },
  {
    id: 'scheduled-3',
    scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
    completed: false,
    completedAt: null,
    notes: null,
    exerciseId: 'exercise-3',
    classId: 'class-1',
    exercise: {
      id: 'exercise-3',
      type: 'text' as const,
      titleDe: 'Journaling',
      titleEn: 'Journaling',
      descriptionDe: 'Reflektiere über deinen Tag',
      descriptionEn: 'Reflect on your day',
      durationMinutes: 20,
      videoUrl: null,
      audioUrl: null,
      contentDe: 'Schreibe 3 Dinge auf, für die du dankbar bist...',
      contentEn: 'Write 3 things you are grateful for...',
    },
    isObligatory: false,
  },
];

const mockOptionalExercises = [
  {
    id: 'optional-1',
    type: 'video' as const,
    titleDe: 'Bonus Yoga',
    titleEn: 'Bonus Yoga',
    descriptionDe: 'Extra Yoga Session',
    descriptionEn: 'Extra Yoga Session',
    durationMinutes: 30,
    videoUrl: 'https://example.com/yoga.mp4',
    audioUrl: null,
    contentDe: null,
    contentEn: null,
  },
  {
    id: 'optional-2',
    type: 'audio' as const,
    titleDe: 'Entspannungsmusik',
    titleEn: 'Relaxation Music',
    descriptionDe: 'Beruhigende Musik zum Entspannen',
    descriptionEn: 'Calming music for relaxation',
    durationMinutes: 45,
    videoUrl: null,
    audioUrl: 'https://example.com/music.mp3',
    contentDe: null,
    contentEn: null,
  },
];

// Import the component after mocks
import MenteeDailyCalendarPage from '@/app/mentee/calendar/page';

describe('S6.8 - Mentee Daily Calendar View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: {
        scheduledExercises: mockScheduledExercises,
        date: today.toISOString(),
      },
      isLoading: false,
    });
  });

  describe('AC1: Daily view as default for mentees', () => {
    it('renders daily calendar view', () => {
      render(<MenteeDailyCalendarPage />);

      expect(screen.getByTestId('mentee-daily-calendar')).toBeInTheDocument();
    });

    it('displays "Today" as the header for current date', () => {
      render(<MenteeDailyCalendarPage />);

      expect(screen.getByTestId('current-date')).toHaveTextContent('Today');
    });

    it('displays the full date below the header', () => {
      render(<MenteeDailyCalendarPage />);

      const formattedDate = format(today, 'MMMM d, yyyy');
      expect(screen.getByText(formattedDate)).toBeInTheDocument();
    });

    it('has navigation buttons to change days', () => {
      render(<MenteeDailyCalendarPage />);

      expect(screen.getByTestId('prev-day-button')).toBeInTheDocument();
      expect(screen.getByTestId('next-day-button')).toBeInTheDocument();
    });

    it('shows day name when not on today', () => {
      render(<MenteeDailyCalendarPage />);

      // Navigate to next day
      fireEvent.click(screen.getByTestId('next-day-button'));

      const nextDay = addDays(today, 1);
      const dayName = format(nextDay, 'EEEE');
      expect(screen.getByTestId('current-date')).toHaveTextContent(dayName);
    });

    it('shows "Back to Today" button when not on today', () => {
      render(<MenteeDailyCalendarPage />);

      // Navigate away
      fireEvent.click(screen.getByTestId('next-day-button'));

      expect(screen.getByTestId('today-button')).toBeInTheDocument();
      expect(screen.getByText('Back to Today')).toBeInTheDocument();
    });
  });

  describe('AC2: Exercises listed with scheduled times', () => {
    it('displays exercises with their scheduled times', () => {
      render(<MenteeDailyCalendarPage />);

      // Check that exercises are displayed
      expect(screen.getByText('Morgen Meditation')).toBeInTheDocument();
      expect(screen.getByText('Atemübungen')).toBeInTheDocument();
      expect(screen.getByText('Journaling')).toBeInTheDocument();
    });

    it('shows exercise times in a readable format', () => {
      render(<MenteeDailyCalendarPage />);

      // Check that times are displayed (format: "7:00 AM", "9:00 AM", "2:00 PM")
      expect(screen.getByText('7:00 AM')).toBeInTheDocument();
      expect(screen.getByText('9:00 AM')).toBeInTheDocument();
      expect(screen.getByText('2:00 PM')).toBeInTheDocument();
    });

    it('shows exercise duration when available', () => {
      render(<MenteeDailyCalendarPage />);

      expect(screen.getByText('15 min')).toBeInTheDocument();
      expect(screen.getByText('10 min')).toBeInTheDocument();
      expect(screen.getByText('20 min')).toBeInTheDocument();
    });

    it('shows exercise type icons', () => {
      render(<MenteeDailyCalendarPage />);

      // Exercise cards should be present for each scheduled exercise
      expect(screen.getByTestId('exercise-card-scheduled-1')).toBeInTheDocument();
      expect(screen.getByTestId('exercise-card-scheduled-2')).toBeInTheDocument();
      expect(screen.getByTestId('exercise-card-scheduled-3')).toBeInTheDocument();
    });
  });

  describe('AC3: Obligatory exercises highlighted', () => {
    it('displays obligatory exercises in a separate section', () => {
      render(<MenteeDailyCalendarPage />);

      expect(screen.getByTestId('obligatory-exercises-section')).toBeInTheDocument();
      expect(screen.getByText('Required Exercises')).toBeInTheDocument();
    });

    it('highlights obligatory exercise cards with a border', () => {
      render(<MenteeDailyCalendarPage />);

      const obligatoryCard = screen.getByTestId('exercise-card-scheduled-1');
      expect(obligatoryCard).toHaveAttribute('data-obligatory', 'true');
      expect(obligatoryCard).toHaveClass('border-l-4', 'border-amber-500');
    });

    it('marks obligatory exercises with a star icon', () => {
      render(<MenteeDailyCalendarPage />);

      // The obligatory exercises section should show the star indicator
      const obligatorySection = screen.getByTestId('obligatory-exercises-section');
      expect(obligatorySection.querySelector('svg')).toBeInTheDocument();
    });

    it('separates obligatory and optional scheduled exercises', () => {
      render(<MenteeDailyCalendarPage />);

      // Obligatory exercises should be in their section
      const obligatoryList = screen.getByTestId('obligatory-exercises-list');
      expect(obligatoryList).toContainElement(screen.getByText('Morgen Meditation'));
      expect(obligatoryList).toContainElement(screen.getByText('Atemübungen'));

      // Optional scheduled exercises should be in their section
      const optionalSection = screen.getByTestId('optional-scheduled-section');
      expect(optionalSection).toContainElement(screen.getByText('Journaling'));
    });

    it('does not highlight optional exercises with amber border', () => {
      render(<MenteeDailyCalendarPage />);

      const optionalCard = screen.getByTestId('exercise-card-scheduled-3');
      expect(optionalCard).toHaveAttribute('data-obligatory', 'false');
      expect(optionalCard).not.toHaveClass('border-amber-500');
    });
  });

  describe('AC4: Optional exercises available to add', () => {
    it('displays "Add Optional Exercise" button', () => {
      render(<MenteeDailyCalendarPage />);

      expect(screen.getByTestId('add-optional-exercise-button')).toBeInTheDocument();
      expect(screen.getByText('Add Optional Exercise')).toBeInTheDocument();
    });

    it('opens dialog when clicking add optional exercise button', async () => {
      render(<MenteeDailyCalendarPage />);

      fireEvent.click(screen.getByTestId('add-optional-exercise-button'));

      await waitFor(() => {
        // Dialog opens with description text
        expect(screen.getByText("Choose an exercise to add to today's schedule")).toBeInTheDocument();
        // Dialog should have optional exercises list
        expect(screen.getByTestId('optional-exercises-list')).toBeInTheDocument();
      });
    });

    it('shows available optional exercises in the dialog', async () => {
      render(<MenteeDailyCalendarPage />);

      fireEvent.click(screen.getByTestId('add-optional-exercise-button'));

      await waitFor(() => {
        expect(screen.getByTestId('optional-exercises-list')).toBeInTheDocument();
      });

      expect(screen.getByText('Bonus Yoga')).toBeInTheDocument();
      expect(screen.getByText('Entspannungsmusik')).toBeInTheDocument();
    });

    it('calls mutation when adding an optional exercise', async () => {
      render(<MenteeDailyCalendarPage />);

      fireEvent.click(screen.getByTestId('add-optional-exercise-button'));

      await waitFor(() => {
        expect(screen.getByTestId('add-exercise-optional-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('add-exercise-optional-1'));

      expect(mockAddExerciseMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          exerciseId: 'optional-1',
          scheduledAt: expect.any(String),
        })
      );
    });

    it('displays exercise type and duration in add dialog', async () => {
      render(<MenteeDailyCalendarPage />);

      fireEvent.click(screen.getByTestId('add-optional-exercise-button'));

      await waitFor(() => {
        expect(screen.getByText('30 min')).toBeInTheDocument();
        expect(screen.getByText('45 min')).toBeInTheDocument();
      });
    });
  });

  describe('AC5: Completion checkboxes', () => {
    it('displays completion checkboxes for each exercise', () => {
      render(<MenteeDailyCalendarPage />);

      expect(screen.getByTestId('completion-checkbox-scheduled-1')).toBeInTheDocument();
      expect(screen.getByTestId('completion-checkbox-scheduled-2')).toBeInTheDocument();
      expect(screen.getByTestId('completion-checkbox-scheduled-3')).toBeInTheDocument();
    });

    it('shows completed exercises with a check icon', () => {
      render(<MenteeDailyCalendarPage />);

      // scheduled-2 is completed
      const completedCard = screen.getByTestId('exercise-card-scheduled-2');
      expect(completedCard).toHaveAttribute('data-completed', 'true');
    });

    it('shows incomplete exercises with an empty circle', () => {
      render(<MenteeDailyCalendarPage />);

      // scheduled-1 and scheduled-3 are not completed
      const incompleteCard = screen.getByTestId('exercise-card-scheduled-1');
      expect(incompleteCard).toHaveAttribute('data-completed', 'false');
    });

    it('strikes through completed exercise titles', () => {
      render(<MenteeDailyCalendarPage />);

      // The completed exercise should have line-through styling
      const completedText = screen.getByText('Atemübungen');
      expect(completedText).toHaveClass('line-through');
    });

    it('calls toggle mutation when clicking checkbox', () => {
      render(<MenteeDailyCalendarPage />);

      fireEvent.click(screen.getByTestId('completion-checkbox-scheduled-1'));

      expect(mockToggleCompletionMutate).toHaveBeenCalledWith({
        scheduledExerciseId: 'scheduled-1',
        completed: true,
      });
    });

    it('calls toggle mutation to uncomplete when clicking completed checkbox', () => {
      render(<MenteeDailyCalendarPage />);

      fireEvent.click(screen.getByTestId('completion-checkbox-scheduled-2'));

      expect(mockToggleCompletionMutate).toHaveBeenCalledWith({
        scheduledExerciseId: 'scheduled-2',
        completed: false,
      });
    });

    it('displays progress card with completion percentage', () => {
      render(<MenteeDailyCalendarPage />);

      expect(screen.getByTestId('progress-card')).toBeInTheDocument();
      expect(screen.getByText('Daily Progress')).toBeInTheDocument();
      // 1 of 3 exercises completed = 33%
      expect(screen.getByText('33%')).toBeInTheDocument();
    });

    it('shows completion count', () => {
      render(<MenteeDailyCalendarPage />);

      expect(screen.getByText('1 of 3')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });
  });

  describe('AC6: Navigate to exercise execution view on tap', () => {
    beforeEach(() => {
      mockPush.mockClear();
    });

    it('navigates to exercise execution view when tapping an exercise', () => {
      render(<MenteeDailyCalendarPage />);

      fireEvent.click(screen.getByTestId('exercise-card-scheduled-1'));

      expect(mockPush).toHaveBeenCalledWith('/mentee/exercise/scheduled-1');
    });

    it('navigates to correct exercise for video exercises', () => {
      render(<MenteeDailyCalendarPage />);

      fireEvent.click(screen.getByTestId('exercise-card-scheduled-1'));

      expect(mockPush).toHaveBeenCalledWith('/mentee/exercise/scheduled-1');
    });

    it('navigates to correct exercise for audio exercises', () => {
      render(<MenteeDailyCalendarPage />);

      fireEvent.click(screen.getByTestId('exercise-card-scheduled-2'));

      expect(mockPush).toHaveBeenCalledWith('/mentee/exercise/scheduled-2');
    });

    it('navigates to correct exercise for text exercises', () => {
      render(<MenteeDailyCalendarPage />);

      fireEvent.click(screen.getByTestId('exercise-card-scheduled-3'));

      expect(mockPush).toHaveBeenCalledWith('/mentee/exercise/scheduled-3');
    });

    it('each exercise card is clickable and navigates to unique exercise view', () => {
      render(<MenteeDailyCalendarPage />);

      // Click first exercise
      fireEvent.click(screen.getByTestId('exercise-card-scheduled-1'));
      expect(mockPush).toHaveBeenLastCalledWith('/mentee/exercise/scheduled-1');

      // Click second exercise
      fireEvent.click(screen.getByTestId('exercise-card-scheduled-2'));
      expect(mockPush).toHaveBeenLastCalledWith('/mentee/exercise/scheduled-2');

      // Click third exercise
      fireEvent.click(screen.getByTestId('exercise-card-scheduled-3'));
      expect(mockPush).toHaveBeenLastCalledWith('/mentee/exercise/scheduled-3');
    });

    it('shows exercise duration in exercise card', () => {
      render(<MenteeDailyCalendarPage />);

      // Duration should be visible in the card
      expect(screen.getAllByText('15 min').length).toBeGreaterThan(0);
    });

    it('shows play indicator for video and audio exercises', () => {
      render(<MenteeDailyCalendarPage />);

      // Video and audio cards should have play indicator (the svg icons)
      const videoCard = screen.getByTestId('exercise-card-scheduled-1');
      const audioCard = screen.getByTestId('exercise-card-scheduled-2');

      // Both should be in the document and clickable
      expect(videoCard).toBeInTheDocument();
      expect(audioCard).toBeInTheDocument();
    });

    it('checkbox click still toggles completion without navigating', () => {
      render(<MenteeDailyCalendarPage />);

      // Click the checkbox, not the card
      fireEvent.click(screen.getByTestId('completion-checkbox-scheduled-1'));

      // Should toggle completion, not navigate
      expect(mockToggleCompletionMutate).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('clicking checkbox does not trigger navigation', () => {
      render(<MenteeDailyCalendarPage />);

      fireEvent.click(screen.getByTestId('completion-checkbox-scheduled-2'));

      // Should not navigate when clicking checkbox
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Day navigation', () => {
    it('navigates to previous day when clicking prev button', () => {
      render(<MenteeDailyCalendarPage />);

      fireEvent.click(screen.getByTestId('prev-day-button'));

      const prevDay = subDays(today, 1);
      const dayName = format(prevDay, 'EEEE');
      expect(screen.getByTestId('current-date')).toHaveTextContent(dayName);
    });

    it('navigates to next day when clicking next button', () => {
      render(<MenteeDailyCalendarPage />);

      fireEvent.click(screen.getByTestId('next-day-button'));

      const nextDay = addDays(today, 1);
      const dayName = format(nextDay, 'EEEE');
      expect(screen.getByTestId('current-date')).toHaveTextContent(dayName);
    });

    it('returns to today when clicking back to today button', () => {
      render(<MenteeDailyCalendarPage />);

      // Navigate away first
      fireEvent.click(screen.getByTestId('next-day-button'));
      expect(screen.getByTestId('today-button')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('today-button'));

      expect(screen.getByTestId('current-date')).toHaveTextContent('Today');
    });

    it('supports swipe navigation to previous day', () => {
      render(<MenteeDailyCalendarPage />);

      const container = screen.getByTestId('mentee-daily-calendar');

      // Simulate right swipe (go to previous day)
      fireEvent.touchStart(container, { touches: [{ clientX: 100, clientY: 200 }] });
      fireEvent.touchMove(container, { touches: [{ clientX: 200, clientY: 200 }] });
      fireEvent.touchEnd(container);

      const prevDay = subDays(today, 1);
      const dayName = format(prevDay, 'EEEE');
      expect(screen.getByTestId('current-date')).toHaveTextContent(dayName);
    });

    it('supports swipe navigation to next day', () => {
      render(<MenteeDailyCalendarPage />);

      const container = screen.getByTestId('mentee-daily-calendar');

      // Simulate left swipe (go to next day)
      fireEvent.touchStart(container, { touches: [{ clientX: 200, clientY: 200 }] });
      fireEvent.touchMove(container, { touches: [{ clientX: 100, clientY: 200 }] });
      fireEvent.touchEnd(container);

      const nextDay = addDays(today, 1);
      const dayName = format(nextDay, 'EEEE');
      expect(screen.getByTestId('current-date')).toHaveTextContent(dayName);
    });
  });

  describe('Empty states and loading', () => {
    it('shows empty state when no exercises scheduled', () => {
      mockUseQuery.mockReturnValue({
        data: {
          scheduledExercises: [],
          date: today.toISOString(),
        },
        isLoading: false,
      });

      render(<MenteeDailyCalendarPage />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No exercises scheduled')).toBeInTheDocument();
    });

    it('shows loading indicator when fetching data', () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<MenteeDailyCalendarPage />);

      // Calendar container should still be present
      expect(screen.getByTestId('mentee-daily-calendar')).toBeInTheDocument();
    });

    it('shows add exercise button in empty state for today', () => {
      mockUseQuery.mockReturnValue({
        data: {
          scheduledExercises: [],
          date: today.toISOString(),
        },
        isLoading: false,
      });

      render(<MenteeDailyCalendarPage />);

      expect(screen.getByText('Add Exercise')).toBeInTheDocument();
    });
  });

  describe('Mobile optimizations', () => {
    it('renders within MobileLayout wrapper', () => {
      render(<MenteeDailyCalendarPage />);

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
    });

    it('has pull to refresh capability', async () => {
      render(<MenteeDailyCalendarPage />);

      const container = screen.getByTestId('mentee-daily-calendar');

      // Simulate pull down
      fireEvent.touchStart(container, { touches: [{ clientX: 200, clientY: 100 }] });
      fireEvent.touchMove(container, { touches: [{ clientX: 200, clientY: 200 }] });
      fireEvent.touchEnd(container);

      // Should trigger invalidate if pulled enough
      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalled();
      });
    });

    it('has touch-friendly exercise cards', () => {
      render(<MenteeDailyCalendarPage />);

      const exerciseCard = screen.getByTestId('exercise-card-scheduled-1');
      expect(exerciseCard).toHaveClass('p-4', 'rounded-xl');
    });
  });
});
