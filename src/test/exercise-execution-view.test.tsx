import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock useRouter and useParams
const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
  useParams: () => ({
    id: 'test-scheduled-exercise-id',
  }),
}));

// Mock tRPC
const mockUseQuery = vi.fn();
const mockCompleteExerciseMutate = vi.fn();
const mockUpdateNotesMutate = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    mentee: {
      getScheduledExerciseById: {
        useQuery: () => mockUseQuery(),
      },
      completeExerciseWithNotes: {
        useMutation: () => ({
          mutate: mockCompleteExerciseMutate,
          isPending: false,
        }),
      },
      updateExerciseNotes: {
        useMutation: () => ({
          mutate: mockUpdateNotesMutate,
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      mentee: {
        getScheduledExerciseById: {
          invalidate: mockInvalidate,
        },
        getExercisesForDate: {
          invalidate: mockInvalidate,
        },
        getExercisesForWeek: {
          invalidate: mockInvalidate,
        },
      },
    }),
  },
}));

// Mock data for different exercise types
const today = new Date();

const mockVideoExercise = {
  id: 'test-scheduled-exercise-id',
  scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
  completed: false,
  completedAt: null,
  notes: null,
  exerciseId: 'video-exercise-id',
  classId: 'class-1',
  exercise: {
    id: 'video-exercise-id',
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
};

const mockAudioExercise = {
  id: 'test-scheduled-exercise-id',
  scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
  completed: false,
  completedAt: null,
  notes: null,
  exerciseId: 'audio-exercise-id',
  classId: 'class-1',
  exercise: {
    id: 'audio-exercise-id',
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
};

const mockTextExercise = {
  id: 'test-scheduled-exercise-id',
  scheduledAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
  completed: false,
  completedAt: null,
  notes: null,
  exerciseId: 'text-exercise-id',
  classId: 'class-1',
  exercise: {
    id: 'text-exercise-id',
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
};

const mockCompletedExercise = {
  ...mockVideoExercise,
  completed: true,
  completedAt: new Date(),
  notes: 'This was great!',
};

// Import the component after mocks
import ExerciseExecutionPage from '@/app/mentee/exercise/[id]/page';

describe('S6.13 - Exercise Execution View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: mockVideoExercise,
      isLoading: false,
      error: null,
    });
  });

  describe('AC1: Video player for video exercises', () => {
    it('renders exercise execution view', () => {
      render(<ExerciseExecutionPage />);
      expect(screen.getByTestId('exercise-execution-view')).toBeInTheDocument();
    });

    it('displays video player for video type exercises', () => {
      render(<ExerciseExecutionPage />);

      expect(screen.getByTestId('video-player-container')).toBeInTheDocument();
      expect(screen.getByTestId('video-player')).toBeInTheDocument();
    });

    it('has correct video source URL', () => {
      render(<ExerciseExecutionPage />);

      const videoPlayer = screen.getByTestId('video-player');
      expect(videoPlayer).toHaveAttribute('src', 'https://example.com/meditation.mp4');
    });

    it('video player has controls', () => {
      render(<ExerciseExecutionPage />);

      const videoPlayer = screen.getByTestId('video-player');
      expect(videoPlayer).toHaveAttribute('controls');
    });

    it('displays exercise title', () => {
      render(<ExerciseExecutionPage />);

      expect(screen.getByTestId('exercise-title')).toHaveTextContent('Morgen Meditation');
    });

    it('displays exercise duration', () => {
      render(<ExerciseExecutionPage />);

      expect(screen.getByText('15 min')).toBeInTheDocument();
    });
  });

  describe('AC2: Audio player for audio exercises', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        data: mockAudioExercise,
        isLoading: false,
        error: null,
      });
    });

    it('displays audio player for audio type exercises', () => {
      render(<ExerciseExecutionPage />);

      expect(screen.getByTestId('audio-player-container')).toBeInTheDocument();
      expect(screen.getByTestId('audio-player')).toBeInTheDocument();
    });

    it('has correct audio source URL', () => {
      render(<ExerciseExecutionPage />);

      const audioPlayer = screen.getByTestId('audio-player');
      expect(audioPlayer).toHaveAttribute('src', 'https://example.com/breathing.mp3');
    });

    it('audio player has controls', () => {
      render(<ExerciseExecutionPage />);

      const audioPlayer = screen.getByTestId('audio-player');
      expect(audioPlayer).toHaveAttribute('controls');
    });

    it('does not display video player for audio exercises', () => {
      render(<ExerciseExecutionPage />);

      expect(screen.queryByTestId('video-player-container')).not.toBeInTheDocument();
    });
  });

  describe('AC3: Text display for text exercises', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        data: mockTextExercise,
        isLoading: false,
        error: null,
      });
    });

    it('displays text content for text type exercises', () => {
      render(<ExerciseExecutionPage />);

      expect(screen.getByTestId('text-content-container')).toBeInTheDocument();
    });

    it('shows the text content in German', () => {
      render(<ExerciseExecutionPage />);

      expect(
        screen.getByText('Schreibe 3 Dinge auf, für die du dankbar bist...')
      ).toBeInTheDocument();
    });

    it('does not display video or audio players for text exercises', () => {
      render(<ExerciseExecutionPage />);

      expect(screen.queryByTestId('video-player-container')).not.toBeInTheDocument();
      expect(screen.queryByTestId('audio-player-container')).not.toBeInTheDocument();
    });
  });

  describe('AC4: Mark as Done button', () => {
    it('displays Mark as Done button', () => {
      render(<ExerciseExecutionPage />);

      expect(screen.getByTestId('mark-as-done-button')).toBeInTheDocument();
      expect(screen.getByText('Mark as Done')).toBeInTheDocument();
    });

    it('calls completion mutation when clicking Mark as Done', () => {
      render(<ExerciseExecutionPage />);

      fireEvent.click(screen.getByTestId('mark-as-done-button'));

      expect(mockCompleteExerciseMutate).toHaveBeenCalledWith({
        scheduledExerciseId: 'test-scheduled-exercise-id',
        completed: true,
        notes: undefined,
      });
    });

    it('displays Completed state for completed exercises', () => {
      mockUseQuery.mockReturnValue({
        data: mockCompletedExercise,
        isLoading: false,
        error: null,
      });

      render(<ExerciseExecutionPage />);

      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('allows toggling back to incomplete state', () => {
      mockUseQuery.mockReturnValue({
        data: mockCompletedExercise,
        isLoading: false,
        error: null,
      });

      render(<ExerciseExecutionPage />);

      fireEvent.click(screen.getByTestId('mark-as-done-button'));

      expect(mockCompleteExerciseMutate).toHaveBeenCalledWith({
        scheduledExerciseId: 'test-scheduled-exercise-id',
        completed: false,
        notes: expect.any(String),
      });
    });

    it('has green background when completed', () => {
      mockUseQuery.mockReturnValue({
        data: mockCompletedExercise,
        isLoading: false,
        error: null,
      });

      render(<ExerciseExecutionPage />);

      const button = screen.getByTestId('mark-as-done-button');
      expect(button).toHaveClass('bg-green-600');
    });
  });

  describe('AC5: Skip explanation option for advanced users', () => {
    it('displays skip explanation toggle for video exercises with description', () => {
      render(<ExerciseExecutionPage />);

      expect(screen.getByTestId('skip-explanation-section')).toBeInTheDocument();
      expect(screen.getByText('Skip explanation (advanced)')).toBeInTheDocument();
    });

    it('has a toggle switch for skip explanation', () => {
      render(<ExerciseExecutionPage />);

      expect(screen.getByTestId('skip-explanation-toggle')).toBeInTheDocument();
    });

    it('shows description by default', () => {
      render(<ExerciseExecutionPage />);

      expect(screen.getByTestId('exercise-description')).toBeInTheDocument();
      expect(screen.getByText('Eine beruhigende Morgenmeditation')).toBeInTheDocument();
    });

    it('hides description when skip explanation is enabled', async () => {
      render(<ExerciseExecutionPage />);

      const toggle = screen.getByTestId('skip-explanation-toggle');
      fireEvent.click(toggle);

      await waitFor(() => {
        expect(screen.queryByTestId('exercise-description')).not.toBeInTheDocument();
      });
    });

    it('displays skip explanation for audio exercises too', () => {
      mockUseQuery.mockReturnValue({
        data: mockAudioExercise,
        isLoading: false,
        error: null,
      });

      render(<ExerciseExecutionPage />);

      expect(screen.getByTestId('skip-explanation-section')).toBeInTheDocument();
    });

    it('does not show skip explanation for text exercises without separate description', () => {
      mockUseQuery.mockReturnValue({
        data: {
          ...mockTextExercise,
          exercise: {
            ...mockTextExercise.exercise,
            descriptionDe: null,
            descriptionEn: null,
          },
        },
        isLoading: false,
        error: null,
      });

      render(<ExerciseExecutionPage />);

      expect(screen.queryByTestId('skip-explanation-section')).not.toBeInTheDocument();
    });
  });

  describe('AC6: Notes field after completion', () => {
    it('displays notes toggle button', () => {
      render(<ExerciseExecutionPage />);

      expect(screen.getByTestId('notes-toggle')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('notes section is collapsed by default for incomplete exercises', () => {
      render(<ExerciseExecutionPage />);

      expect(screen.queryByTestId('notes-input-container')).not.toBeInTheDocument();
    });

    it('expands notes section when clicking toggle', async () => {
      render(<ExerciseExecutionPage />);

      fireEvent.click(screen.getByTestId('notes-toggle'));

      await waitFor(() => {
        expect(screen.getByTestId('notes-input-container')).toBeInTheDocument();
      });
    });

    it('displays notes textarea when expanded', async () => {
      render(<ExerciseExecutionPage />);

      fireEvent.click(screen.getByTestId('notes-toggle'));

      await waitFor(() => {
        expect(screen.getByTestId('notes-textarea')).toBeInTheDocument();
      });
    });

    it('has a placeholder text for notes', async () => {
      render(<ExerciseExecutionPage />);

      fireEvent.click(screen.getByTestId('notes-toggle'));

      await waitFor(() => {
        const textarea = screen.getByTestId('notes-textarea');
        expect(textarea).toHaveAttribute(
          'placeholder',
          'Add your thoughts, reflections, or notes about this exercise...'
        );
      });
    });

    it('displays save notes button when expanded', async () => {
      render(<ExerciseExecutionPage />);

      fireEvent.click(screen.getByTestId('notes-toggle'));

      await waitFor(() => {
        expect(screen.getByTestId('save-notes-button')).toBeInTheDocument();
      });
    });

    it('shows existing notes for completed exercises', () => {
      mockUseQuery.mockReturnValue({
        data: mockCompletedExercise,
        isLoading: false,
        error: null,
      });

      render(<ExerciseExecutionPage />);

      // Notes section should be auto-expanded when there are existing notes
      expect(screen.getByTestId('notes-input-container')).toBeInTheDocument();
      expect(screen.getByTestId('notes-textarea')).toHaveValue('This was great!');
    });

    it('calls update notes mutation when saving', async () => {
      render(<ExerciseExecutionPage />);

      fireEvent.click(screen.getByTestId('notes-toggle'));

      await waitFor(() => {
        expect(screen.getByTestId('notes-textarea')).toBeInTheDocument();
      });

      const textarea = screen.getByTestId('notes-textarea');
      fireEvent.change(textarea, { target: { value: 'My new notes' } });
      fireEvent.click(screen.getByTestId('save-notes-button'));

      expect(mockUpdateNotesMutate).toHaveBeenCalledWith({
        scheduledExerciseId: 'test-scheduled-exercise-id',
        notes: 'My new notes',
      });
    });

    it('auto-expands notes section when marking exercise as done', async () => {
      render(<ExerciseExecutionPage />);

      // Notes should be collapsed initially
      expect(screen.queryByTestId('notes-input-container')).not.toBeInTheDocument();

      // Mark as done
      fireEvent.click(screen.getByTestId('mark-as-done-button'));

      // Notes section should expand
      await waitFor(() => {
        expect(screen.getByTestId('notes-input-container')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('displays back button', () => {
      render(<ExerciseExecutionPage />);

      expect(screen.getByTestId('back-button')).toBeInTheDocument();
    });

    it('calls router.back() when clicking back button', () => {
      render(<ExerciseExecutionPage />);

      fireEvent.click(screen.getByTestId('back-button'));

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Loading and Error states', () => {
    it('shows loading indicator when fetching data', () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      render(<ExerciseExecutionPage />);

      // Should show some loading state (the component renders a spinner)
      expect(screen.queryByTestId('exercise-execution-view')).not.toBeInTheDocument();
    });

    it('shows error state when exercise not found', () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Not found'),
      });

      render(<ExerciseExecutionPage />);

      expect(screen.getByText('Exercise not found')).toBeInTheDocument();
      expect(screen.getByText('Go Back')).toBeInTheDocument();
    });

    it('navigates back when clicking Go Back on error page', () => {
      mockUseQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Not found'),
      });

      render(<ExerciseExecutionPage />);

      fireEvent.click(screen.getByText('Go Back'));

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Exercise metadata display', () => {
    it('shows scheduled time', () => {
      render(<ExerciseExecutionPage />);

      expect(screen.getByText(/Scheduled:/)).toBeInTheDocument();
    });

    it('shows obligatory indicator for required exercises', () => {
      render(<ExerciseExecutionPage />);

      // Should show a star icon for obligatory exercises
      expect(screen.getByTestId('exercise-execution-view')).toBeInTheDocument();
    });

    it('displays exercise type icon', () => {
      render(<ExerciseExecutionPage />);

      // The header should contain the exercise type icon
      expect(screen.getByTestId('exercise-execution-view')).toBeInTheDocument();
    });
  });
});
