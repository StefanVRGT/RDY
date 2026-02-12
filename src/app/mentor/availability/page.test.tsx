import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MentorAvailabilityPage from './page';

// Mock trpc
const mockInvalidate = vi.fn().mockResolvedValue(undefined);
const mockDeleteMutate = vi.fn();
const mockAddMutate = vi.fn();
const mockBulkAddMutate = vi.fn();

const mockUseUtils = vi.fn(() => ({
  mentor: {
    getAvailabilitySlots: { invalidate: mockInvalidate },
  },
}));

// Mock data
const mockOneTimeSlots = [
  {
    id: 'slot-1',
    mentorId: 'mentor-1',
    tenantId: 'tenant-1',
    startTime: new Date('2024-02-15T09:00:00'),
    endTime: new Date('2024-02-15T12:00:00'),
    isRecurring: false,
    dayOfWeek: null,
    recurringStartTime: null,
    recurringEndTime: null,
    validFrom: null,
    validUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'slot-2',
    mentorId: 'mentor-1',
    tenantId: 'tenant-1',
    startTime: new Date('2024-02-16T14:00:00'),
    endTime: new Date('2024-02-16T17:00:00'),
    isRecurring: false,
    dayOfWeek: null,
    recurringStartTime: null,
    recurringEndTime: null,
    validFrom: null,
    validUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockRecurringSlots = [
  {
    id: 'recurring-1',
    mentorId: 'mentor-1',
    tenantId: 'tenant-1',
    startTime: new Date('2024-02-01T09:00:00'),
    endTime: new Date('2024-02-01T12:00:00'),
    isRecurring: true,
    dayOfWeek: 1, // Monday
    recurringStartTime: '09:00',
    recurringEndTime: '12:00',
    validFrom: new Date('2024-02-01'),
    validUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'recurring-2',
    mentorId: 'mentor-1',
    tenantId: 'tenant-1',
    startTime: new Date('2024-02-01T14:00:00'),
    endTime: new Date('2024-02-01T17:00:00'),
    isRecurring: true,
    dayOfWeek: 3, // Wednesday
    recurringStartTime: '14:00',
    recurringEndTime: '17:00',
    validFrom: new Date('2024-02-01'),
    validUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Track query states
let slotsLoading = false;
let deleteIsPending = false;
let addIsPending = false;
let bulkAddIsPending = false;

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    useUtils: () => mockUseUtils(),
    mentor: {
      getAvailabilitySlots: {
        useQuery: () => ({
          data: slotsLoading ? undefined : {
            slots: mockOneTimeSlots,
            recurringSlots: mockRecurringSlots,
          },
          isLoading: slotsLoading,
        }),
      },
      deleteAvailabilitySlot: {
        useMutation: (opts: { onSuccess?: () => void; onError?: () => void }) => ({
          mutate: (args: { slotId: string }) => {
            mockDeleteMutate(args);
            if (opts.onSuccess) opts.onSuccess();
          },
          isPending: deleteIsPending,
        }),
      },
      addAvailabilitySlot: {
        useMutation: (opts: { onSuccess?: () => void; onError?: (err: Error) => void }) => ({
          mutate: (args: unknown) => {
            mockAddMutate(args);
            if (opts.onSuccess) opts.onSuccess();
          },
          isPending: addIsPending,
        }),
      },
      bulkAddRecurringSlots: {
        useMutation: (opts: { onSuccess?: () => void; onError?: (err: Error) => void }) => ({
          mutate: (args: unknown) => {
            mockBulkAddMutate(args);
            if (opts.onSuccess) opts.onSuccess();
          },
          isPending: bulkAddIsPending,
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

// Mock Dialog components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-title">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-description">{children}</div>
  ),
}));

describe('MentorAvailabilityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    slotsLoading = false;
    deleteIsPending = false;
    addIsPending = false;
    bulkAddIsPending = false;
  });

  describe('AC: View existing availability slots', () => {
    it('should display the availability page', () => {
      render(<MentorAvailabilityPage />);

      expect(screen.getByTestId('availability-page')).toBeInTheDocument();
    });

    it('should display stats showing slot counts', () => {
      render(<MentorAvailabilityPage />);

      expect(screen.getByTestId('availability-stats')).toBeInTheDocument();
      // Both one-time and recurring have 2 slots each
      const statsSection = screen.getByTestId('availability-stats');
      expect(statsSection).toHaveTextContent('2');
      expect(screen.getByText('One-time slots')).toBeInTheDocument();
      expect(screen.getByText('Recurring slots')).toBeInTheDocument();
    });

    it('should display one-time slots section when slots exist', () => {
      render(<MentorAvailabilityPage />);

      expect(screen.getByTestId('one-time-slots-section')).toBeInTheDocument();
      expect(screen.getByText('Upcoming Slots')).toBeInTheDocument();
    });

    it('should display recurring slots section when recurring slots exist', () => {
      render(<MentorAvailabilityPage />);

      expect(screen.getByTestId('recurring-slots-section')).toBeInTheDocument();
      expect(screen.getByText('Recurring Weekly')).toBeInTheDocument();
    });

    it('should display slot items with correct data', () => {
      render(<MentorAvailabilityPage />);

      expect(screen.getByTestId('slot-item-slot-1')).toBeInTheDocument();
      expect(screen.getByTestId('slot-item-slot-2')).toBeInTheDocument();
      expect(screen.getByTestId('slot-item-recurring-1')).toBeInTheDocument();
      expect(screen.getByTestId('slot-item-recurring-2')).toBeInTheDocument();
    });

    it('should display day names for recurring slots', () => {
      render(<MentorAvailabilityPage />);

      expect(screen.getByText('Monday')).toBeInTheDocument();
      expect(screen.getByText('Wednesday')).toBeInTheDocument();
    });

    it('should display recurring time range for recurring slots', () => {
      render(<MentorAvailabilityPage />);

      expect(screen.getByText('09:00 - 12:00')).toBeInTheDocument();
      expect(screen.getByText('14:00 - 17:00')).toBeInTheDocument();
    });

    it('should show loading indicator while loading', () => {
      slotsLoading = true;
      render(<MentorAvailabilityPage />);

      expect(screen.queryByTestId('one-time-slots-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    });

    it('should show empty state when no slots exist', () => {
      // Temporarily clear mock slots
      const originalOneTimeSlots = [...mockOneTimeSlots];
      const originalRecurringSlots = [...mockRecurringSlots];
      mockOneTimeSlots.length = 0;
      mockRecurringSlots.length = 0;

      render(<MentorAvailabilityPage />);

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No availability slots')).toBeInTheDocument();

      // Restore
      mockOneTimeSlots.push(...originalOneTimeSlots);
      mockRecurringSlots.push(...originalRecurringSlots);
    });
  });

  describe('AC: Add new availability slot', () => {
    it('should display add slot button', () => {
      render(<MentorAvailabilityPage />);

      expect(screen.getByTestId('add-slot-button')).toBeInTheDocument();
      expect(screen.getByText('Add Slot')).toBeInTheDocument();
    });

    it('should open add slot dialog when button is clicked', () => {
      render(<MentorAvailabilityPage />);

      const addButton = screen.getByTestId('add-slot-button');
      fireEvent.click(addButton);

      expect(screen.getByTestId('add-slot-form')).toBeInTheDocument();
    });

    it('should display date input in add slot form', () => {
      render(<MentorAvailabilityPage />);

      const addButton = screen.getByTestId('add-slot-button');
      fireEvent.click(addButton);

      expect(screen.getByTestId('slot-date-input')).toBeInTheDocument();
    });

    it('should display start and end time inputs in add slot form', () => {
      render(<MentorAvailabilityPage />);

      const addButton = screen.getByTestId('add-slot-button');
      fireEvent.click(addButton);

      expect(screen.getByTestId('start-time-input')).toBeInTheDocument();
      expect(screen.getByTestId('end-time-input')).toBeInTheDocument();
    });

    it('should display submit button in add slot form', () => {
      render(<MentorAvailabilityPage />);

      const addButton = screen.getByTestId('add-slot-button');
      fireEvent.click(addButton);

      expect(screen.getByTestId('submit-slot-button')).toBeInTheDocument();
      // Multiple "Add Slot" texts exist - one in the form button
      expect(screen.getAllByText('Add Slot').length).toBeGreaterThan(1);
    });

    it('should call add mutation when form is submitted', async () => {
      render(<MentorAvailabilityPage />);

      const addButton = screen.getByTestId('add-slot-button');
      fireEvent.click(addButton);

      // Fill out form - use a future date
      const dateInput = screen.getByTestId('slot-date-input');
      const startInput = screen.getByTestId('start-time-input');
      const endInput = screen.getByTestId('end-time-input');

      fireEvent.change(dateInput, { target: { value: '2030-03-01' } });
      fireEvent.change(startInput, { target: { value: '10:00' } });
      fireEvent.change(endInput, { target: { value: '11:00' } });

      const submitButton = screen.getByTestId('submit-slot-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAddMutate).toHaveBeenCalled();
      });
    });
  });

  describe('AC: Delete slot with swipe', () => {
    it('should display swipeable slots', () => {
      render(<MentorAvailabilityPage />);

      const swipeableSlots = screen.getAllByTestId('swipeable-slot');
      expect(swipeableSlots.length).toBe(4); // 2 one-time + 2 recurring
    });

    it('should show swipe hint message', () => {
      render(<MentorAvailabilityPage />);

      expect(screen.getByText('Swipe left on a slot to delete it')).toBeInTheDocument();
    });

    it('should trigger delete when swiped far enough', async () => {
      render(<MentorAvailabilityPage />);

      const slotItem = screen.getByTestId('slot-item-slot-1');
      const swipeableSlot = slotItem.querySelector('[data-testid="swipeable-slot"]');

      if (swipeableSlot) {
        // Simulate swipe left
        fireEvent.touchStart(swipeableSlot, {
          touches: [{ clientX: 200, clientY: 0 }],
        });

        fireEvent.touchMove(swipeableSlot, {
          touches: [{ clientX: 50, clientY: 0 }],
        });

        fireEvent.touchEnd(swipeableSlot);

        await waitFor(() => {
          expect(mockDeleteMutate).toHaveBeenCalledWith({ slotId: 'slot-1' });
        });
      }
    });

    it('should not trigger delete when not swiped far enough', async () => {
      render(<MentorAvailabilityPage />);

      const slotItem = screen.getByTestId('slot-item-slot-1');
      const swipeableSlot = slotItem.querySelector('[data-testid="swipeable-slot"]');

      if (swipeableSlot) {
        // Simulate small swipe
        fireEvent.touchStart(swipeableSlot, {
          touches: [{ clientX: 200, clientY: 0 }],
        });

        fireEvent.touchMove(swipeableSlot, {
          touches: [{ clientX: 180, clientY: 0 }],
        });

        fireEvent.touchEnd(swipeableSlot);

        // Wait a bit to ensure no delete happens
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockDeleteMutate).not.toHaveBeenCalled();
      }
    });

    it('should invalidate slots after successful delete', async () => {
      render(<MentorAvailabilityPage />);

      const slotItem = screen.getByTestId('slot-item-slot-1');
      const swipeableSlot = slotItem.querySelector('[data-testid="swipeable-slot"]');

      if (swipeableSlot) {
        fireEvent.touchStart(swipeableSlot, {
          touches: [{ clientX: 200, clientY: 0 }],
        });

        fireEvent.touchMove(swipeableSlot, {
          touches: [{ clientX: 50, clientY: 0 }],
        });

        fireEvent.touchEnd(swipeableSlot);

        await waitFor(() => {
          expect(mockInvalidate).toHaveBeenCalled();
        });
      }
    });
  });

  describe('AC: Bulk add slots for recurring times', () => {
    it('should display bulk add button', () => {
      render(<MentorAvailabilityPage />);

      expect(screen.getByTestId('bulk-add-button')).toBeInTheDocument();
      expect(screen.getByText('Bulk Add')).toBeInTheDocument();
    });

    it('should open bulk add dialog when button is clicked', () => {
      render(<MentorAvailabilityPage />);

      const bulkButton = screen.getByTestId('bulk-add-button');
      fireEvent.click(bulkButton);

      expect(screen.getByTestId('bulk-add-form')).toBeInTheDocument();
    });

    it('should display day selector in bulk add form', () => {
      render(<MentorAvailabilityPage />);

      const bulkButton = screen.getByTestId('bulk-add-button');
      fireEvent.click(bulkButton);

      expect(screen.getByTestId('day-selector')).toBeInTheDocument();
    });

    it('should display all days of week as toggles', () => {
      render(<MentorAvailabilityPage />);

      const bulkButton = screen.getByTestId('bulk-add-button');
      fireEvent.click(bulkButton);

      expect(screen.getByTestId('day-sun')).toBeInTheDocument();
      expect(screen.getByTestId('day-mon')).toBeInTheDocument();
      expect(screen.getByTestId('day-tue')).toBeInTheDocument();
      expect(screen.getByTestId('day-wed')).toBeInTheDocument();
      expect(screen.getByTestId('day-thu')).toBeInTheDocument();
      expect(screen.getByTestId('day-fri')).toBeInTheDocument();
      expect(screen.getByTestId('day-sat')).toBeInTheDocument();
    });

    it('should toggle days when clicked', () => {
      render(<MentorAvailabilityPage />);

      const bulkButton = screen.getByTestId('bulk-add-button');
      fireEvent.click(bulkButton);

      const sunButton = screen.getByTestId('day-sun');

      // Sunday is not selected by default (Mon-Fri are)
      expect(sunButton).toHaveClass('bg-rdy-gray-100');

      // Click to select
      fireEvent.click(sunButton);

      expect(sunButton).toHaveClass('bg-rdy-orange-600');
    });

    it('should display time slot inputs', () => {
      render(<MentorAvailabilityPage />);

      const bulkButton = screen.getByTestId('bulk-add-button');
      fireEvent.click(bulkButton);

      expect(screen.getByTestId('time-slot-0')).toBeInTheDocument();
    });

    it('should allow adding additional time slots', () => {
      render(<MentorAvailabilityPage />);

      const bulkButton = screen.getByTestId('bulk-add-button');
      fireEvent.click(bulkButton);

      const addTimeSlotButton = screen.getByTestId('add-time-slot-button');
      fireEvent.click(addTimeSlotButton);

      expect(screen.getByTestId('time-slot-0')).toBeInTheDocument();
      expect(screen.getByTestId('time-slot-1')).toBeInTheDocument();
    });

    it('should display valid from date input', () => {
      render(<MentorAvailabilityPage />);

      const bulkButton = screen.getByTestId('bulk-add-button');
      fireEvent.click(bulkButton);

      expect(screen.getByTestId('valid-from-input')).toBeInTheDocument();
    });

    it('should display valid until date input', () => {
      render(<MentorAvailabilityPage />);

      const bulkButton = screen.getByTestId('bulk-add-button');
      fireEvent.click(bulkButton);

      expect(screen.getByTestId('valid-until-input')).toBeInTheDocument();
    });

    it('should display submit button for bulk add', () => {
      render(<MentorAvailabilityPage />);

      const bulkButton = screen.getByTestId('bulk-add-button');
      fireEvent.click(bulkButton);

      expect(screen.getByTestId('submit-bulk-button')).toBeInTheDocument();
    });

    it('should call bulk add mutation when form is submitted', async () => {
      render(<MentorAvailabilityPage />);

      const bulkButton = screen.getByTestId('bulk-add-button');
      fireEvent.click(bulkButton);

      const submitButton = screen.getByTestId('submit-bulk-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockBulkAddMutate).toHaveBeenCalled();
      });
    });

    it('should display summary of slots to be created', () => {
      render(<MentorAvailabilityPage />);

      const bulkButton = screen.getByTestId('bulk-add-button');
      fireEvent.click(bulkButton);

      // Default: 5 days (Mon-Fri) * 1 time slot = 5 slots
      const bulkForm = screen.getByTestId('bulk-add-form');
      expect(bulkForm).toHaveTextContent('5');
      expect(bulkForm).toHaveTextContent(/recurring/i);
    });

    it('should update summary when days are toggled', () => {
      render(<MentorAvailabilityPage />);

      const bulkButton = screen.getByTestId('bulk-add-button');
      fireEvent.click(bulkButton);

      // Deselect Monday (index 1)
      const monButton = screen.getByTestId('day-mon');
      fireEvent.click(monButton);

      // Now should be 4 days * 1 slot = 4 slots
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('Pull to refresh', () => {
    it('should display pull to refresh indicator when pulling down', () => {
      render(<MentorAvailabilityPage />);

      const page = screen.getByTestId('availability-page');

      fireEvent.touchStart(page, {
        touches: [{ clientY: 0 }],
      });

      fireEvent.touchMove(page, {
        touches: [{ clientY: 70 }],
      });

      expect(screen.getByTestId('pull-to-refresh-indicator')).toBeInTheDocument();
    });

    it('should trigger refresh when pulled far enough', async () => {
      render(<MentorAvailabilityPage />);

      const page = screen.getByTestId('availability-page');

      fireEvent.touchStart(page, {
        touches: [{ clientY: 0 }],
      });

      fireEvent.touchMove(page, {
        touches: [{ clientY: 80 }],
      });

      fireEvent.touchEnd(page);

      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalled();
      });
    });
  });
});
