import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { addDays } from 'date-fns';
import {
  ExerciseTimeSettingDialog,
  BulkTimeSettingDialog,
  type TimeSlot,
} from '@/components/exercise-time-setting';
import {
  ScrollWheelTimePicker,
  ScrollWheelDurationPicker,
} from '@/components/ui/scroll-wheel-time-picker';

// Mock scrollTo for wheel columns
Element.prototype.scrollTo = vi.fn();

describe('S6.10 - Exercise Time Setting UI', () => {
  describe('AC1: Scroll wheel time picker (not drag-and-drop)', () => {
    it('renders the scroll wheel time picker', () => {
      const handleChange = vi.fn();
      render(<ScrollWheelTimePicker value="09:00" onChange={handleChange} />);

      expect(screen.getByTestId('scroll-wheel-time-picker')).toBeInTheDocument();
    });

    it('displays hour wheel', () => {
      const handleChange = vi.fn();
      render(<ScrollWheelTimePicker value="09:00" onChange={handleChange} />);

      expect(screen.getByTestId('hour-wheel')).toBeInTheDocument();
    });

    it('displays minute wheel', () => {
      const handleChange = vi.fn();
      render(<ScrollWheelTimePicker value="09:00" onChange={handleChange} />);

      expect(screen.getByTestId('minute-wheel')).toBeInTheDocument();
    });

    it('displays period wheel in 12-hour mode', () => {
      const handleChange = vi.fn();
      render(<ScrollWheelTimePicker value="09:00" onChange={handleChange} use24Hour={false} />);

      expect(screen.getByTestId('period-wheel')).toBeInTheDocument();
    });

    it('hides period wheel in 24-hour mode', () => {
      const handleChange = vi.fn();
      render(<ScrollWheelTimePicker value="09:00" onChange={handleChange} use24Hour={true} />);

      expect(screen.queryByTestId('period-wheel')).not.toBeInTheDocument();
    });

    it('shows hour options as clickable items', () => {
      const handleChange = vi.fn();
      render(<ScrollWheelTimePicker value="09:00" onChange={handleChange} />);

      // In 12-hour mode, should have 12 hour options
      const hourOptions = screen.getAllByTestId(/^hour-wheel-option-/);
      expect(hourOptions.length).toBe(12);
    });

    it('shows minute options from 00 to 59', () => {
      const handleChange = vi.fn();
      render(<ScrollWheelTimePicker value="09:00" onChange={handleChange} />);

      // Should have options 00 through 59
      expect(screen.getByTestId('minute-wheel-option-0')).toBeInTheDocument();
      expect(screen.getByTestId('minute-wheel-option-30')).toBeInTheDocument();
      expect(screen.getByTestId('minute-wheel-option-59')).toBeInTheDocument();
    });

    it('calls onChange when hour is selected', async () => {
      const handleChange = vi.fn();
      render(<ScrollWheelTimePicker value="09:00" onChange={handleChange} />);

      // Click on hour 10
      fireEvent.click(screen.getByTestId('hour-wheel-option-10'));

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith('10:00');
      });
    });

    it('calls onChange when minute is selected', async () => {
      const handleChange = vi.fn();
      render(<ScrollWheelTimePicker value="09:00" onChange={handleChange} />);

      // Click on minute 30
      fireEvent.click(screen.getByTestId('minute-wheel-option-30'));

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith('09:30');
      });
    });

    it('calls onChange when period is changed in 12-hour mode', async () => {
      const handleChange = vi.fn();
      render(<ScrollWheelTimePicker value="09:00" onChange={handleChange} use24Hour={false} />);

      // Click on PM
      fireEvent.click(screen.getByTestId('period-wheel-option-PM'));

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith('21:00');
      });
    });

    it('correctly converts 12 AM to 00 hours', async () => {
      const handleChange = vi.fn();
      render(<ScrollWheelTimePicker value="12:00" onChange={handleChange} use24Hour={false} />);

      // Click on AM (12 PM -> 12 AM = 00:00)
      fireEvent.click(screen.getByTestId('period-wheel-option-AM'));

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith('00:00');
      });
    });

    it('correctly displays PM times', () => {
      const handleChange = vi.fn();
      render(<ScrollWheelTimePicker value="15:30" onChange={handleChange} use24Hour={false} />);

      // 15:30 should display as 3:30 PM
      expect(screen.getByTestId('period-wheel-option-PM')).toBeInTheDocument();
    });
  });

  describe('AC2: Set time for individual exercise', () => {
    const mockExerciseTime = new Date(2024, 0, 15, 9, 0); // Jan 15, 2024 at 9:00 AM

    it('renders the exercise time setting dialog', () => {
      const handleSave = vi.fn();
      render(
        <ExerciseTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          exerciseId="ex-1"
          exerciseTitle="Morning Meditation"
          currentTime={mockExerciseTime}
          currentDuration={15}
          onSave={handleSave}
        />
      );

      expect(screen.getByTestId('exercise-time-setting-dialog')).toBeInTheDocument();
    });

    it('displays the exercise title', () => {
      const handleSave = vi.fn();
      render(
        <ExerciseTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          exerciseId="ex-1"
          exerciseTitle="Morning Meditation"
          currentTime={mockExerciseTime}
          currentDuration={15}
          onSave={handleSave}
        />
      );

      expect(screen.getByText('Morning Meditation')).toBeInTheDocument();
    });

    it('displays the selected date', () => {
      const handleSave = vi.fn();
      render(
        <ExerciseTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          exerciseId="ex-1"
          exerciseTitle="Morning Meditation"
          currentTime={mockExerciseTime}
          currentDuration={15}
          onSave={handleSave}
        />
      );

      expect(screen.getByTestId('selected-date')).toHaveTextContent('Monday, January 15, 2024');
    });

    it('shows the time picker section', () => {
      const handleSave = vi.fn();
      render(
        <ExerciseTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          exerciseId="ex-1"
          exerciseTitle="Morning Meditation"
          currentTime={mockExerciseTime}
          currentDuration={15}
          onSave={handleSave}
        />
      );

      expect(screen.getByTestId('time-picker-section')).toBeInTheDocument();
    });

    it('displays time summary with current time', () => {
      const handleSave = vi.fn();
      render(
        <ExerciseTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          exerciseId="ex-1"
          exerciseTitle="Morning Meditation"
          currentTime={mockExerciseTime}
          currentDuration={15}
          onSave={handleSave}
        />
      );

      expect(screen.getByTestId('time-summary')).toHaveTextContent('9:00 AM');
    });

    it('calls onSave with updated time when save is clicked', async () => {
      const handleSave = vi.fn();
      render(
        <ExerciseTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          exerciseId="ex-1"
          exerciseTitle="Morning Meditation"
          currentTime={mockExerciseTime}
          currentDuration={15}
          onSave={handleSave}
        />
      );

      fireEvent.click(screen.getByTestId('save-button'));

      await waitFor(() => {
        expect(handleSave).toHaveBeenCalledWith(
          expect.any(Date),
          15
        );
      });
    });

    it('closes dialog when cancel is clicked', async () => {
      const handleOpenChange = vi.fn();
      render(
        <ExerciseTimeSettingDialog
          open={true}
          onOpenChange={handleOpenChange}
          exerciseId="ex-1"
          exerciseTitle="Morning Meditation"
          currentTime={mockExerciseTime}
          currentDuration={15}
          onSave={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('cancel-button'));

      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('AC3: Bulk set time for whole week', () => {
    const mockWeekStart = new Date(2024, 0, 15); // Monday, Jan 15, 2024
    const mockExercises = [
      { id: 'se-1', exerciseId: 'ex-1', title: 'Morning Meditation', date: mockWeekStart, currentTime: new Date(2024, 0, 15, 9, 0) },
      { id: 'se-2', exerciseId: 'ex-1', title: 'Morning Meditation', date: addDays(mockWeekStart, 1), currentTime: new Date(2024, 0, 16, 9, 0) },
      { id: 'se-3', exerciseId: 'ex-1', title: 'Morning Meditation', date: addDays(mockWeekStart, 2), currentTime: new Date(2024, 0, 17, 9, 0) },
    ];

    it('renders the bulk time setting dialog', () => {
      const handleSave = vi.fn();
      render(
        <BulkTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          weekStartDate={mockWeekStart}
          exercises={mockExercises}
          onSave={handleSave}
        />
      );

      expect(screen.getByTestId('bulk-time-setting-dialog')).toBeInTheDocument();
    });

    it('displays day selection toggles', () => {
      const handleSave = vi.fn();
      render(
        <BulkTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          weekStartDate={mockWeekStart}
          exercises={mockExercises}
          onSave={handleSave}
        />
      );

      expect(screen.getByTestId('day-selection')).toBeInTheDocument();
      expect(screen.getByTestId('day-toggle-0')).toBeInTheDocument(); // Monday
      expect(screen.getByTestId('day-toggle-6')).toBeInTheDocument(); // Sunday
    });

    it('has first 5 days selected by default', () => {
      const handleSave = vi.fn();
      render(
        <BulkTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          weekStartDate={mockWeekStart}
          exercises={mockExercises}
          onSave={handleSave}
        />
      );

      // First 5 days (indices 0-4) should be selected (have twilight background)
      for (let i = 0; i < 5; i++) {
        const dayToggle = screen.getByTestId(`day-toggle-${i}`);
        expect(dayToggle.className).toContain('bg-rdy-orange-600');
      }
      // Last 2 days should not be selected
      expect(screen.getByTestId('day-toggle-5').className).toContain('bg-rdy-gray-200');
      expect(screen.getByTestId('day-toggle-6').className).toContain('bg-rdy-gray-200');
    });

    it('allows toggling days on and off', () => {
      const handleSave = vi.fn();
      render(
        <BulkTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          weekStartDate={mockWeekStart}
          exercises={mockExercises}
          onSave={handleSave}
        />
      );

      // Click on first day to deselect
      fireEvent.click(screen.getByTestId('day-toggle-0'));

      const firstDayToggle = screen.getByTestId('day-toggle-0');
      expect(firstDayToggle.className).toContain('bg-rdy-gray-200');
    });

    it('displays the bulk time picker', () => {
      const handleSave = vi.fn();
      render(
        <BulkTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          weekStartDate={mockWeekStart}
          exercises={mockExercises}
          onSave={handleSave}
        />
      );

      expect(screen.getByTestId('bulk-time-picker')).toBeInTheDocument();
    });

    it('shows time summary', () => {
      const handleSave = vi.fn();
      render(
        <BulkTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          weekStartDate={mockWeekStart}
          exercises={mockExercises}
          onSave={handleSave}
        />
      );

      expect(screen.getByTestId('bulk-time-summary')).toBeInTheDocument();
    });

    it('calls onSave with updates for all selected days', async () => {
      const handleSave = vi.fn();
      render(
        <BulkTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          weekStartDate={mockWeekStart}
          exercises={mockExercises}
          onSave={handleSave}
        />
      );

      fireEvent.click(screen.getByTestId('bulk-save-button'));

      await waitFor(() => {
        expect(handleSave).toHaveBeenCalled();
        const updates = handleSave.mock.calls[0][0];
        // Should update exercises on Monday, Tuesday, Wednesday (the ones in mockExercises)
        expect(updates.length).toBe(3);
      });
    });

    it('disables save button when no days are selected', async () => {
      const handleSave = vi.fn();
      render(
        <BulkTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          weekStartDate={mockWeekStart}
          exercises={mockExercises}
          onSave={handleSave}
        />
      );

      // Deselect all the default selected days (0-4)
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByTestId(`day-toggle-${i}`));
      }

      await waitFor(() => {
        expect(screen.getByTestId('bulk-save-button')).toBeDisabled();
      });
    });
  });

  describe('AC4: Duration adjustment', () => {
    it('renders the duration picker', () => {
      const handleChange = vi.fn();
      render(
        <ScrollWheelDurationPicker
          value={30}
          onChange={handleChange}
        />
      );

      expect(screen.getByTestId('scroll-wheel-duration-picker')).toBeInTheDocument();
    });

    it('displays duration wheel', () => {
      const handleChange = vi.fn();
      render(
        <ScrollWheelDurationPicker
          value={30}
          onChange={handleChange}
        />
      );

      expect(screen.getByTestId('duration-wheel')).toBeInTheDocument();
    });

    it('shows duration options based on min/max/step', () => {
      const handleChange = vi.fn();
      render(
        <ScrollWheelDurationPicker
          value={30}
          onChange={handleChange}
          minDuration={5}
          maxDuration={120}
          step={5}
        />
      );

      // Should have 5m option
      expect(screen.getByTestId('duration-wheel-option-5')).toBeInTheDocument();
      // Should have 120m option
      expect(screen.getByTestId('duration-wheel-option-120')).toBeInTheDocument();
    });

    it('formats duration correctly for minutes under 60', () => {
      const handleChange = vi.fn();
      render(
        <ScrollWheelDurationPicker
          value={30}
          onChange={handleChange}
        />
      );

      expect(screen.getByTestId('duration-wheel-option-30')).toHaveTextContent('30m');
    });

    it('formats duration correctly for hours', () => {
      const handleChange = vi.fn();
      render(
        <ScrollWheelDurationPicker
          value={60}
          onChange={handleChange}
        />
      );

      expect(screen.getByTestId('duration-wheel-option-60')).toHaveTextContent('1h');
    });

    it('formats duration correctly for hours and minutes', () => {
      const handleChange = vi.fn();
      render(
        <ScrollWheelDurationPicker
          value={90}
          onChange={handleChange}
          maxDuration={120}
        />
      );

      expect(screen.getByTestId('duration-wheel-option-90')).toHaveTextContent('1h 30m');
    });

    it('calls onChange when duration is selected', async () => {
      const handleChange = vi.fn();
      render(
        <ScrollWheelDurationPicker
          value={30}
          onChange={handleChange}
        />
      );

      fireEvent.click(screen.getByTestId('duration-wheel-option-45'));

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(45);
      });
    });

    it('shows duration picker section in exercise time dialog', () => {
      const mockExerciseTime = new Date(2024, 0, 15, 9, 0);
      render(
        <ExerciseTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          exerciseId="ex-1"
          exerciseTitle="Morning Meditation"
          currentTime={mockExerciseTime}
          currentDuration={15}
          onSave={vi.fn()}
        />
      );

      expect(screen.getByTestId('duration-picker-section')).toBeInTheDocument();
    });

    it('displays current duration summary', () => {
      const mockExerciseTime = new Date(2024, 0, 15, 9, 0);
      render(
        <ExerciseTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          exerciseId="ex-1"
          exerciseTitle="Morning Meditation"
          currentTime={mockExerciseTime}
          currentDuration={15}
          onSave={vi.fn()}
        />
      );

      expect(screen.getByTestId('duration-summary')).toHaveTextContent('15 minutes');
    });
  });

  describe('AC5: Conflict detection/warning', () => {
    const mockExerciseTime = new Date(2024, 0, 15, 9, 0);
    const conflictingSlot: TimeSlot = {
      id: 'slot-1',
      startTime: new Date(2024, 0, 15, 9, 0),
      endTime: new Date(2024, 0, 15, 9, 30),
      type: 'exercise',
      label: 'Another Exercise',
    };

    it('shows conflict warning when time overlaps with existing exercise', () => {
      render(
        <ExerciseTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          exerciseId="ex-2"
          exerciseTitle="Morning Meditation"
          currentTime={mockExerciseTime}
          currentDuration={15}
          onSave={vi.fn()}
          existingSlots={[conflictingSlot]}
        />
      );

      expect(screen.getByTestId('conflict-warning')).toBeInTheDocument();
    });

    it('displays conflicting exercise details', () => {
      render(
        <ExerciseTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          exerciseId="ex-2"
          exerciseTitle="Morning Meditation"
          currentTime={mockExerciseTime}
          currentDuration={15}
          onSave={vi.fn()}
          existingSlots={[conflictingSlot]}
        />
      );

      expect(screen.getByText(/Another Exercise/)).toBeInTheDocument();
    });

    it('shows warning for time outside mentor availability', () => {
      const mentorAvailability: TimeSlot[] = [
        {
          id: 'avail-1',
          startTime: new Date(2024, 0, 15, 10, 0),
          endTime: new Date(2024, 0, 15, 18, 0),
          type: 'mentor_availability',
          label: 'Available',
        },
      ];

      render(
        <ExerciseTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          exerciseId="ex-1"
          exerciseTitle="Morning Meditation"
          currentTime={mockExerciseTime}
          currentDuration={15}
          onSave={vi.fn()}
          mentorAvailability={mentorAvailability}
        />
      );

      expect(screen.getByTestId('conflict-warning')).toBeInTheDocument();
      expect(screen.getByText(/outside your mentor's available hours/i)).toBeInTheDocument();
    });

    it('changes save button text when conflicts exist', () => {
      render(
        <ExerciseTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          exerciseId="ex-2"
          exerciseTitle="Morning Meditation"
          currentTime={mockExerciseTime}
          currentDuration={15}
          onSave={vi.fn()}
          existingSlots={[conflictingSlot]}
        />
      );

      expect(screen.getByTestId('save-button')).toHaveTextContent('Save Anyway');
    });

    it('does not show warning when no conflicts', () => {
      const nonConflictingSlot: TimeSlot = {
        id: 'slot-1',
        startTime: new Date(2024, 0, 15, 14, 0),
        endTime: new Date(2024, 0, 15, 14, 30),
        type: 'exercise',
        label: 'Afternoon Exercise',
      };

      render(
        <ExerciseTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          exerciseId="ex-1"
          exerciseTitle="Morning Meditation"
          currentTime={mockExerciseTime}
          currentDuration={15}
          onSave={vi.fn()}
          existingSlots={[nonConflictingSlot]}
        />
      );

      expect(screen.queryByTestId('conflict-warning')).not.toBeInTheDocument();
    });

    it('excludes current exercise from conflict detection', () => {
      // Same exercise should not conflict with itself
      const sameExerciseSlot: TimeSlot = {
        id: 'ex-1',
        startTime: new Date(2024, 0, 15, 9, 0),
        endTime: new Date(2024, 0, 15, 9, 15),
        type: 'exercise',
        label: 'Same Exercise',
      };

      render(
        <ExerciseTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          exerciseId="ex-1"
          exerciseTitle="Morning Meditation"
          currentTime={mockExerciseTime}
          currentDuration={15}
          onSave={vi.fn()}
          existingSlots={[sameExerciseSlot]}
        />
      );

      expect(screen.queryByTestId('conflict-warning')).not.toBeInTheDocument();
    });

    it('shows conflict warning in bulk dialog for affected days', () => {
      const mockWeekStart = new Date(2024, 0, 15); // Monday
      const mockExercises = [
        { id: 'se-1', exerciseId: 'ex-1', title: 'Morning Meditation', date: mockWeekStart, currentTime: new Date(2024, 0, 15, 9, 0) },
      ];
      // Create a conflict at 8:00 AM on the same day - this conflicts with the default 08:00 time
      const existingSlots: TimeSlot[] = [
        {
          id: 'slot-1',
          startTime: new Date(2024, 0, 15, 8, 0),
          endTime: new Date(2024, 0, 15, 8, 30),
          type: 'exercise',
          label: 'Existing Exercise',
        },
      ];

      render(
        <BulkTimeSettingDialog
          open={true}
          onOpenChange={vi.fn()}
          weekStartDate={mockWeekStart}
          exercises={mockExercises}
          onSave={vi.fn()}
          existingSlots={existingSlots}
        />
      );

      // The bulk dialog shows conflict warning when there are conflicts
      expect(screen.getByTestId('bulk-conflict-warning')).toBeInTheDocument();
    });
  });
});
