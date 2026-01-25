import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { format, addDays, startOfWeek } from 'date-fns';

// Mock tRPC
vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    mentee: {
      updateExerciseTime: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      rescheduleExerciseSeries: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      mentee: {
        getExercisesForWeek: {
          invalidate: vi.fn(),
        },
        getExercisesForDate: {
          invalidate: vi.fn(),
        },
      },
    }),
  },
}));

// Get current Monday
const today = new Date();
const currentMonday = startOfWeek(today, { weekStartsOn: 1 });

// Mock exercise data
const mockExercise = {
  id: 'scheduled-exercise-1',
  scheduledAt: new Date(
    currentMonday.getFullYear(),
    currentMonday.getMonth(),
    currentMonday.getDate(),
    9,
    0
  ),
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
  },
  isObligatory: true,
};

// Import components
import { RescheduleConfirmDialog } from '@/components/drag-drop/reschedule-confirm-dialog';
import { DraggableExerciseCard, ExerciseCardOverlay } from '@/components/drag-drop/draggable-exercise-card';
import { DroppableDay } from '@/components/drag-drop/droppable-day';

describe('S6.11 - Appointment Shifting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC1: Drag-and-drop to move exercise to different day', () => {
    it('renders draggable exercise card with drag handle', () => {
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');

      render(
        <DraggableExerciseCard
          exercise={mockExercise}
          sourceDate={mondayStr}
        />
      );

      expect(screen.getByTestId(`draggable-exercise-${mockExercise.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`drag-handle-${mockExercise.id}`)).toBeInTheDocument();
    });

    it('shows exercise title in draggable card', () => {
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');

      render(
        <DraggableExerciseCard
          exercise={mockExercise}
          sourceDate={mondayStr}
        />
      );

      expect(screen.getByText('Morgen Meditation')).toBeInTheDocument();
    });

    it('shows exercise time in draggable card', () => {
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');

      render(
        <DraggableExerciseCard
          exercise={mockExercise}
          sourceDate={mondayStr}
        />
      );

      // Time should be displayed (9:00 AM)
      expect(screen.getByText('9:00 AM')).toBeInTheDocument();
    });

    it('renders droppable day zone', () => {
      const tuesdayStr = format(addDays(currentMonday, 1), 'yyyy-MM-dd');
      const tuesday = addDays(currentMonday, 1);

      render(
        <DroppableDay
          date={tuesday}
          dateKey={tuesdayStr}
          exerciseCount={0}
          completedCount={0}
        />
      );

      expect(screen.getByTestId(`droppable-day-${tuesdayStr}`)).toBeInTheDocument();
    });

    it('shows day number in droppable day', () => {
      const tuesdayStr = format(addDays(currentMonday, 1), 'yyyy-MM-dd');
      const tuesday = addDays(currentMonday, 1);

      render(
        <DroppableDay
          date={tuesday}
          dateKey={tuesdayStr}
          exerciseCount={0}
          completedCount={0}
        />
      );

      expect(screen.getByText(format(tuesday, 'd'))).toBeInTheDocument();
    });

    it('shows "No exercises" for empty days', () => {
      const tuesdayStr = format(addDays(currentMonday, 1), 'yyyy-MM-dd');
      const tuesday = addDays(currentMonday, 1);

      render(
        <DroppableDay
          date={tuesday}
          dateKey={tuesdayStr}
          exerciseCount={0}
          completedCount={0}
        />
      );

      expect(screen.getByText('No exercises')).toBeInTheDocument();
    });

    it('shows exercise count for days with exercises', () => {
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');

      render(
        <DroppableDay
          date={currentMonday}
          dateKey={mondayStr}
          exerciseCount={2}
          completedCount={1}
        />
      );

      expect(screen.getByTestId(`exercise-count-${mondayStr}`)).toHaveTextContent('2 ex');
    });
  });

  describe('AC2: Visual feedback during drag', () => {
    it('applies dragging styles when isDragging is true', () => {
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');

      render(
        <DraggableExerciseCard
          exercise={mockExercise}
          sourceDate={mondayStr}
          isDragging={true}
        />
      );

      const card = screen.getByTestId(`draggable-exercise-${mockExercise.id}`);
      expect(card).toHaveAttribute('data-dragging', 'true');
      expect(card).toHaveClass('scale-105', 'shadow-xl', 'ring-2', 'ring-twilight-400');
    });

    it('does not apply dragging styles when not dragging', () => {
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');

      render(
        <DraggableExerciseCard
          exercise={mockExercise}
          sourceDate={mondayStr}
          isDragging={false}
        />
      );

      const card = screen.getByTestId(`draggable-exercise-${mockExercise.id}`);
      expect(card).toHaveAttribute('data-dragging', 'false');
      expect(card).not.toHaveClass('scale-105');
    });

    it('renders drag overlay component', () => {
      render(<ExerciseCardOverlay exercise={mockExercise} />);

      expect(screen.getByTestId('exercise-drag-overlay')).toBeInTheDocument();
      expect(screen.getByText('Morgen Meditation')).toBeInTheDocument();
    });

    it('drag overlay has elevated styling', () => {
      render(<ExerciseCardOverlay exercise={mockExercise} />);

      const overlay = screen.getByTestId('exercise-drag-overlay');
      expect(overlay).toHaveClass('shadow-2xl', 'ring-2', 'ring-twilight-400');
    });

    it('shows obligatory indicator on draggable card', () => {
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');

      render(
        <DraggableExerciseCard
          exercise={mockExercise}
          sourceDate={mondayStr}
        />
      );

      // Obligatory exercises have amber border
      const card = screen.getByTestId(`draggable-exercise-${mockExercise.id}`);
      expect(card).toHaveClass('border-amber-500');
    });
  });

  describe('AC3: Automatic save on drop', () => {
    it('shows reschedule confirmation dialog', () => {
      const fromDate = currentMonday;
      const toDate = addDays(currentMonday, 2); // Wednesday

      render(
        <RescheduleConfirmDialog
          open={true}
          onOpenChange={() => {}}
          exerciseTitle="Morgen Meditation"
          fromDate={fromDate}
          toDate={toDate}
          onConfirmSingle={() => {}}
          onConfirmSeries={() => {}}
        />
      );

      expect(screen.getByTestId('reschedule-confirm-dialog')).toBeInTheDocument();
    });

    it('shows from and to dates in dialog', () => {
      const fromDate = currentMonday;
      const toDate = addDays(currentMonday, 2); // Wednesday

      render(
        <RescheduleConfirmDialog
          open={true}
          onOpenChange={() => {}}
          exerciseTitle="Morgen Meditation"
          fromDate={fromDate}
          toDate={toDate}
          onConfirmSingle={() => {}}
          onConfirmSeries={() => {}}
        />
      );

      // Should show day abbreviations
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
    });

    it('calls onConfirmSingle when single occurrence is selected', () => {
      const onConfirmSingle = vi.fn();
      const fromDate = currentMonday;
      const toDate = addDays(currentMonday, 2);

      render(
        <RescheduleConfirmDialog
          open={true}
          onOpenChange={() => {}}
          exerciseTitle="Morgen Meditation"
          fromDate={fromDate}
          toDate={toDate}
          onConfirmSingle={onConfirmSingle}
          onConfirmSeries={() => {}}
        />
      );

      fireEvent.click(screen.getByTestId('confirm-single-button'));

      expect(onConfirmSingle).toHaveBeenCalled();
    });

    it('calls onConfirmSeries when series is selected', () => {
      const onConfirmSeries = vi.fn();
      const fromDate = currentMonday;
      const toDate = addDays(currentMonday, 2);

      render(
        <RescheduleConfirmDialog
          open={true}
          onOpenChange={() => {}}
          exerciseTitle="Morgen Meditation"
          fromDate={fromDate}
          toDate={toDate}
          onConfirmSingle={() => {}}
          onConfirmSeries={onConfirmSeries}
        />
      );

      fireEvent.click(screen.getByTestId('confirm-series-button'));

      expect(onConfirmSeries).toHaveBeenCalled();
    });

    it('disables buttons when loading', () => {
      const fromDate = currentMonday;
      const toDate = addDays(currentMonday, 2);

      render(
        <RescheduleConfirmDialog
          open={true}
          onOpenChange={() => {}}
          exerciseTitle="Morgen Meditation"
          fromDate={fromDate}
          toDate={toDate}
          onConfirmSingle={() => {}}
          onConfirmSeries={() => {}}
          isLoading={true}
        />
      );

      expect(screen.getByTestId('confirm-single-button')).toBeDisabled();
      expect(screen.getByTestId('confirm-series-button')).toBeDisabled();
    });

    it('shows cancel button that closes dialog', () => {
      const onOpenChange = vi.fn();
      const fromDate = currentMonday;
      const toDate = addDays(currentMonday, 2);

      render(
        <RescheduleConfirmDialog
          open={true}
          onOpenChange={onOpenChange}
          exerciseTitle="Morgen Meditation"
          fromDate={fromDate}
          toDate={toDate}
          onConfirmSingle={() => {}}
          onConfirmSeries={() => {}}
        />
      );

      fireEvent.click(screen.getByTestId('cancel-reschedule-button'));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('AC4: Option to update single occurrence or series', () => {
    it('shows both single and series options', () => {
      const fromDate = currentMonday;
      const toDate = addDays(currentMonday, 2);

      render(
        <RescheduleConfirmDialog
          open={true}
          onOpenChange={() => {}}
          exerciseTitle="Morgen Meditation"
          fromDate={fromDate}
          toDate={toDate}
          onConfirmSingle={() => {}}
          onConfirmSeries={() => {}}
        />
      );

      expect(screen.getByText('This occurrence only')).toBeInTheDocument();
      expect(screen.getByText('All future occurrences')).toBeInTheDocument();
    });

    it('shows description for single occurrence option', () => {
      const fromDate = currentMonday;
      const toDate = addDays(currentMonday, 2);

      render(
        <RescheduleConfirmDialog
          open={true}
          onOpenChange={() => {}}
          exerciseTitle="Morgen Meditation"
          fromDate={fromDate}
          toDate={toDate}
          onConfirmSingle={() => {}}
          onConfirmSeries={() => {}}
        />
      );

      expect(screen.getByText('Move only this exercise')).toBeInTheDocument();
    });

    it('shows description for series option', () => {
      const fromDate = currentMonday;
      const toDate = addDays(currentMonday, 2);

      render(
        <RescheduleConfirmDialog
          open={true}
          onOpenChange={() => {}}
          exerciseTitle="Morgen Meditation"
          fromDate={fromDate}
          toDate={toDate}
          onConfirmSingle={() => {}}
          onConfirmSeries={() => {}}
        />
      );

      expect(screen.getByText('Shift this and all upcoming exercises')).toBeInTheDocument();
    });

    it('shows exercise title in dialog', () => {
      const fromDate = currentMonday;
      const toDate = addDays(currentMonday, 2);

      render(
        <RescheduleConfirmDialog
          open={true}
          onOpenChange={() => {}}
          exerciseTitle="Morgen Meditation"
          fromDate={fromDate}
          toDate={toDate}
          onConfirmSingle={() => {}}
          onConfirmSeries={() => {}}
        />
      );

      expect(screen.getByText('Morgen Meditation')).toBeInTheDocument();
    });
  });

  describe('Completed exercises', () => {
    it('shows checkmark icon for completed exercise', () => {
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');
      const completedExercise = { ...mockExercise, completed: true };

      render(
        <DraggableExerciseCard
          exercise={completedExercise}
          sourceDate={mondayStr}
        />
      );

      // CheckCircle2 should be rendered for completed exercises
      const card = screen.getByTestId(`draggable-exercise-${mockExercise.id}`);
      expect(card.querySelector('svg')).toBeInTheDocument();
    });

    it('shows strikethrough text for completed exercise', () => {
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');
      const completedExercise = { ...mockExercise, completed: true };

      render(
        <DraggableExerciseCard
          exercise={completedExercise}
          sourceDate={mondayStr}
        />
      );

      const title = screen.getByText('Morgen Meditation');
      expect(title).toHaveClass('line-through');
    });
  });

  describe('Exercise type icons', () => {
    it('shows video icon for video exercises', () => {
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');

      render(
        <DraggableExerciseCard
          exercise={mockExercise}
          sourceDate={mondayStr}
        />
      );

      // Video exercises should have video icon
      const card = screen.getByTestId(`draggable-exercise-${mockExercise.id}`);
      expect(card.querySelector('svg')).toBeInTheDocument();
    });

    it('shows audio icon for audio exercises', () => {
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');
      const audioExercise = {
        ...mockExercise,
        exercise: { ...mockExercise.exercise!, type: 'audio' as const },
      };

      render(
        <DraggableExerciseCard
          exercise={audioExercise}
          sourceDate={mondayStr}
        />
      );

      const card = screen.getByTestId(`draggable-exercise-${mockExercise.id}`);
      expect(card.querySelector('svg')).toBeInTheDocument();
    });

    it('shows text icon for text exercises', () => {
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');
      const textExercise = {
        ...mockExercise,
        exercise: { ...mockExercise.exercise!, type: 'text' as const },
      };

      render(
        <DraggableExerciseCard
          exercise={textExercise}
          sourceDate={mondayStr}
        />
      );

      const card = screen.getByTestId(`draggable-exercise-${mockExercise.id}`);
      expect(card.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Droppable day states', () => {
    it('highlights today differently', () => {
      const todayStr = format(today, 'yyyy-MM-dd');

      render(
        <DroppableDay
          date={today}
          dateKey={todayStr}
          exerciseCount={0}
          completedCount={0}
        />
      );

      const dayCell = screen.getByTestId(`droppable-day-${todayStr}`);
      expect(dayCell).toHaveAttribute('data-is-today', 'true');
    });

    it('shows completed indicator when all exercises done', () => {
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');

      render(
        <DroppableDay
          date={currentMonday}
          dateKey={mondayStr}
          exerciseCount={2}
          completedCount={2}
        />
      );

      expect(screen.getByTestId(`completed-indicator-${mondayStr}`)).toBeInTheDocument();
    });

    it('shows progress indicator when partially completed', () => {
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');

      render(
        <DroppableDay
          date={currentMonday}
          dateKey={mondayStr}
          exerciseCount={3}
          completedCount={1}
        />
      );

      const progressIndicator = screen.getByTestId(`progress-indicator-${mondayStr}`);
      expect(progressIndicator).toHaveTextContent('1/3');
    });

    it('calls onClick when day is clicked', () => {
      const onClick = vi.fn();
      const mondayStr = format(currentMonday, 'yyyy-MM-dd');

      render(
        <DroppableDay
          date={currentMonday}
          dateKey={mondayStr}
          exerciseCount={1}
          completedCount={0}
          onClick={onClick}
        />
      );

      fireEvent.click(screen.getByTestId(`droppable-day-${mondayStr}`));

      expect(onClick).toHaveBeenCalled();
    });
  });
});
