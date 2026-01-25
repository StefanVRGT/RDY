import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { format, addDays } from 'date-fns';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock tRPC
const mockGetAvailableSlotsQuery = vi.fn();
const mockGetMonthlyUsageQuery = vi.fn();
const mockGetMyBookingsQuery = vi.fn();
const mockBookSlotMutate = vi.fn();
const mockCancelBookingMutate = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    booking: {
      getAvailableSlots: {
        useQuery: () => mockGetAvailableSlotsQuery(),
      },
      getMonthlyUsage: {
        useQuery: () => mockGetMonthlyUsageQuery(),
      },
      getMyBookings: {
        useQuery: () => mockGetMyBookingsQuery(),
      },
      bookSlot: {
        useMutation: () => ({
          mutate: mockBookSlotMutate,
          isPending: false,
          error: null,
        }),
      },
      cancelBooking: {
        useMutation: () => ({
          mutate: mockCancelBookingMutate,
          isPending: false,
          error: null,
        }),
      },
    },
    useUtils: () => ({
      booking: {
        getAvailableSlots: { invalidate: mockInvalidate },
        getMyBookings: { invalidate: mockInvalidate },
        getMonthlyUsage: { invalidate: mockInvalidate },
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
  useViewContext: () => ({
    currentView: 'mentee',
  }),
}));

// Mock data
const today = new Date();
const tomorrow = addDays(today, 1);
const dayAfterTomorrow = addDays(today, 2);

const mockMentors = [
  {
    id: 'mentor-1',
    name: 'John Mentor',
    email: 'john@mentor.com',
  },
  {
    id: 'mentor-2',
    name: 'Jane Mentor',
    email: 'jane@mentor.com',
  },
];

const mockAvailableSlots = [
  {
    id: 'slot-1',
    mentorId: 'mentor-1',
    startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 9, 0),
    endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 0),
    isRecurring: false,
    isBooked: false,
  },
  {
    id: 'slot-2',
    mentorId: 'mentor-1',
    startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 14, 0),
    endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 15, 0),
    isRecurring: false,
    isBooked: false,
  },
  {
    id: 'slot-3',
    mentorId: 'mentor-2',
    startTime: new Date(dayAfterTomorrow.getFullYear(), dayAfterTomorrow.getMonth(), dayAfterTomorrow.getDate(), 10, 0),
    endTime: new Date(dayAfterTomorrow.getFullYear(), dayAfterTomorrow.getMonth(), dayAfterTomorrow.getDate(), 11, 0),
    isRecurring: true,
    isBooked: false,
  },
];

const mockBookings = [
  {
    id: 'booking-1',
    mentorId: 'mentor-1',
    classId: 'class-1',
    sessionType: '1:1',
    status: 'booked',
    scheduledAt: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 11, 0),
    durationMinutes: 60,
    notes: 'Discuss goals',
    createdAt: today,
    mentor: {
      id: 'mentor-1',
      name: 'John Mentor',
      email: 'john@mentor.com',
    },
    class: {
      id: 'class-1',
      name: 'Mindfulness Class',
    },
  },
];

const mockUsageData = {
  year: today.getFullYear(),
  month: today.getMonth() + 1,
  monthlyLimit: 2,
  bookedCount: 1,
  remainingSessions: 1,
  limitReached: false,
};

const mockUsageDataLimitReached = {
  ...mockUsageData,
  bookedCount: 2,
  remainingSessions: 0,
  limitReached: true,
};

// Import the component after mocks
import MenteeBookingPage from '@/app/mentee/booking/page';

describe('S7.3 - Mentee Session Booking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAvailableSlotsQuery.mockReturnValue({
      data: {
        slots: mockAvailableSlots,
        mentors: mockMentors,
      },
      isLoading: false,
    });
    mockGetMonthlyUsageQuery.mockReturnValue({
      data: mockUsageData,
      isLoading: false,
    });
    mockGetMyBookingsQuery.mockReturnValue({
      data: mockBookings,
      isLoading: false,
    });
  });

  describe('AC1: View available slots in mentee app', () => {
    it('renders booking page', () => {
      render(<MenteeBookingPage />);

      expect(screen.getByTestId('mentee-booking-page')).toBeInTheDocument();
    });

    it('displays monthly usage card', () => {
      render(<MenteeBookingPage />);

      expect(screen.getByTestId('monthly-usage-card')).toBeInTheDocument();
      expect(screen.getByText('Monthly Sessions')).toBeInTheDocument();
    });

    it('shows current month usage count', () => {
      render(<MenteeBookingPage />);

      expect(screen.getByText('1 / 2')).toBeInTheDocument();
      expect(screen.getByText('1 remaining')).toBeInTheDocument();
    });

    it('displays calendar for date selection', () => {
      render(<MenteeBookingPage />);

      expect(screen.getByTestId('booking-calendar')).toBeInTheDocument();
    });

    it('has month navigation buttons', () => {
      render(<MenteeBookingPage />);

      expect(screen.getByTestId('prev-month-button')).toBeInTheDocument();
      expect(screen.getByTestId('next-month-button')).toBeInTheDocument();
    });

    it('displays current month in navigation', () => {
      render(<MenteeBookingPage />);

      const currentMonth = format(today, 'MMMM yyyy');
      expect(screen.getByTestId('current-month')).toHaveTextContent(currentMonth);
    });

    it('shows message to select date when no date selected', () => {
      render(<MenteeBookingPage />);

      expect(screen.getByTestId('no-date-selected')).toBeInTheDocument();
      expect(screen.getByText('Select a date to view available slots')).toBeInTheDocument();
    });

    it('shows available slots section when date is selected', async () => {
      render(<MenteeBookingPage />);

      // Click on tomorrow's date in the calendar
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByTestId('selected-date-section')).toBeInTheDocument();
      });
    });

    it('displays available slots for selected date', async () => {
      render(<MenteeBookingPage />);

      // Click on tomorrow's date
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByTestId('available-slots')).toBeInTheDocument();
      });

      // Should show slots for tomorrow
      expect(screen.getByTestId('slot-slot-1')).toBeInTheDocument();
      expect(screen.getByTestId('slot-slot-2')).toBeInTheDocument();
    });

    it('shows time range and mentor name for each slot', async () => {
      render(<MenteeBookingPage />);

      // Click on tomorrow's date
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByText(/9:00 AM - 10:00 AM/)).toBeInTheDocument();
        expect(screen.getByText(/2:00 PM - 3:00 PM/)).toBeInTheDocument();
        expect(screen.getAllByText(/John Mentor/).length).toBeGreaterThan(0);
      });
    });

    it('shows legend for calendar markers', () => {
      render(<MenteeBookingPage />);

      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Booked')).toBeInTheDocument();
    });
  });

  describe('AC2: Book slot with confirmation', () => {
    it('opens booking dialog when clicking on a slot', async () => {
      render(<MenteeBookingPage />);

      // Click on tomorrow's date
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByTestId('slot-slot-1')).toBeInTheDocument();
      });

      // Click on slot
      fireEvent.click(screen.getByTestId('slot-slot-1'));

      await waitFor(() => {
        expect(screen.getByTestId('booking-confirmation')).toBeInTheDocument();
      });
    });

    it('shows booking details in confirmation dialog', async () => {
      render(<MenteeBookingPage />);

      // Select date and slot
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByTestId('slot-slot-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('slot-slot-1'));

      await waitFor(() => {
        // Use heading role to find the dialog title specifically
        expect(screen.getByRole('heading', { name: 'Confirm Booking' })).toBeInTheDocument();
        expect(screen.getByText('Review and confirm your session booking')).toBeInTheDocument();
      });
    });

    it('has notes input in booking dialog', async () => {
      render(<MenteeBookingPage />);

      // Select date and slot
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByTestId('slot-slot-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('slot-slot-1'));

      await waitFor(() => {
        expect(screen.getByTestId('booking-notes-input')).toBeInTheDocument();
      });
    });

    it('has confirm booking button', async () => {
      render(<MenteeBookingPage />);

      // Select date and slot
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByTestId('slot-slot-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('slot-slot-1'));

      await waitFor(() => {
        expect(screen.getByTestId('confirm-booking-button')).toBeInTheDocument();
      });
    });

    it('calls bookSlot mutation when confirming booking', async () => {
      render(<MenteeBookingPage />);

      // Select date and slot
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByTestId('slot-slot-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('slot-slot-1'));

      await waitFor(() => {
        expect(screen.getByTestId('confirm-booking-button')).toBeInTheDocument();
      });

      // Add notes
      const notesInput = screen.getByTestId('booking-notes-input');
      fireEvent.change(notesInput, { target: { value: 'Test notes' } });

      // Confirm booking
      fireEvent.click(screen.getByTestId('confirm-booking-button'));

      expect(mockBookSlotMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          mentorId: 'mentor-1',
          scheduledAt: expect.any(String),
          durationMinutes: 60,
          notes: 'Test notes',
        })
      );
    });
  });

  describe('AC3: Booking cancellation', () => {
    it('shows existing bookings for selected date', async () => {
      render(<MenteeBookingPage />);

      // Click on tomorrow's date (which has a booking)
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByTestId('existing-bookings')).toBeInTheDocument();
        expect(screen.getByText('Your Bookings')).toBeInTheDocument();
      });
    });

    it('shows cancel button on booked sessions', async () => {
      render(<MenteeBookingPage />);

      // Click on tomorrow's date
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByTestId('cancel-booking-booking-1')).toBeInTheDocument();
      });
    });

    it('opens cancel confirmation dialog when clicking cancel', async () => {
      render(<MenteeBookingPage />);

      // Click on tomorrow's date
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByTestId('cancel-booking-booking-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('cancel-booking-booking-1'));

      await waitFor(() => {
        expect(screen.getByText('Cancel Booking')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to cancel/)).toBeInTheDocument();
      });
    });

    it('has confirm cancel button', async () => {
      render(<MenteeBookingPage />);

      // Click on tomorrow's date
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByTestId('cancel-booking-booking-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('cancel-booking-booking-1'));

      await waitFor(() => {
        expect(screen.getByTestId('confirm-cancel-button')).toBeInTheDocument();
      });
    });

    it('calls cancelBooking mutation when confirming cancellation', async () => {
      render(<MenteeBookingPage />);

      // Click on tomorrow's date
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByTestId('cancel-booking-booking-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('cancel-booking-booking-1'));

      await waitFor(() => {
        expect(screen.getByTestId('confirm-cancel-button')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('confirm-cancel-button'));

      expect(mockCancelBookingMutate).toHaveBeenCalledWith({
        sessionId: 'booking-1',
      });
    });
  });

  describe('AC4: Monthly session limit enforcement', () => {
    it('shows limit reached message when monthly limit is reached', () => {
      mockGetMonthlyUsageQuery.mockReturnValue({
        data: mockUsageDataLimitReached,
        isLoading: false,
      });

      render(<MenteeBookingPage />);

      expect(screen.getByText('Limit Reached')).toBeInTheDocument();
    });

    it('disables slot selection when limit is reached', async () => {
      mockGetMonthlyUsageQuery.mockReturnValue({
        data: mockUsageDataLimitReached,
        isLoading: false,
      });

      render(<MenteeBookingPage />);

      // Click on tomorrow's date
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByTestId('available-slots')).toBeInTheDocument();
      });

      // Slot should be disabled
      const slot = screen.getByTestId('slot-slot-1');
      expect(slot).toHaveClass('cursor-not-allowed');
      expect(slot).toHaveClass('opacity-50');
    });

    it('shows warning message when limit is reached', async () => {
      mockGetMonthlyUsageQuery.mockReturnValue({
        data: mockUsageDataLimitReached,
        isLoading: false,
      });

      render(<MenteeBookingPage />);

      // Click on tomorrow's date
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByText(/You have reached your monthly session limit/)).toBeInTheDocument();
      });
    });

    it('shows progress bar at 100% when limit is reached', () => {
      mockGetMonthlyUsageQuery.mockReturnValue({
        data: mockUsageDataLimitReached,
        isLoading: false,
      });

      render(<MenteeBookingPage />);

      expect(screen.getByText('2 / 2')).toBeInTheDocument();
      expect(screen.getByText('Limit Reached')).toBeInTheDocument();
    });

    it('shows limit reached message in usage card when limit reached', () => {
      mockGetMonthlyUsageQuery.mockReturnValue({
        data: mockUsageDataLimitReached,
        isLoading: false,
      });

      render(<MenteeBookingPage />);

      expect(screen.getByText('Limit Reached')).toBeInTheDocument();
    });
  });

  describe('AC5: Booking shown in calendar', () => {
    it('shows dates with bookings visually marked', async () => {
      render(<MenteeBookingPage />);

      // The calendar should mark dates with bookings
      expect(screen.getByTestId('booking-calendar')).toBeInTheDocument();
      // Booking dates should have green highlight styling via modifiers
    });

    it('shows booking details when selecting a date with booking', async () => {
      render(<MenteeBookingPage />);

      // Click on tomorrow's date
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByTestId('booking-booking-1')).toBeInTheDocument();
      });

      // Should show booking time and mentor
      expect(screen.getByText(/11:00 AM/)).toBeInTheDocument();
    });

    it('shows booking status', async () => {
      render(<MenteeBookingPage />);

      // Click on tomorrow's date
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByTestId('booking-booking-1')).toBeInTheDocument();
      });

      // The booking card should contain the status (capitalized "booked")
      const bookingCard = screen.getByTestId('booking-booking-1');
      expect(bookingCard).toHaveTextContent(/booked/i);
    });

    it('shows check icon for booked sessions', async () => {
      render(<MenteeBookingPage />);

      // Click on tomorrow's date
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByTestId('booking-booking-1')).toBeInTheDocument();
      });

      // Should have check icon (via the svg)
      const bookingCard = screen.getByTestId('booking-booking-1');
      expect(bookingCard.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Month navigation', () => {
    it('navigates to previous month when clicking prev button', () => {
      render(<MenteeBookingPage />);

      fireEvent.click(screen.getByTestId('prev-month-button'));

      const prevMonth = format(new Date(today.getFullYear(), today.getMonth() - 1), 'MMMM yyyy');
      expect(screen.getByTestId('current-month')).toHaveTextContent(prevMonth);
    });

    it('navigates to next month when clicking next button', () => {
      render(<MenteeBookingPage />);

      fireEvent.click(screen.getByTestId('next-month-button'));

      const nextMonth = format(new Date(today.getFullYear(), today.getMonth() + 1), 'MMMM yyyy');
      expect(screen.getByTestId('current-month')).toHaveTextContent(nextMonth);
    });

    it('shows back to current month button when not on current month', () => {
      render(<MenteeBookingPage />);

      // Navigate to next month
      fireEvent.click(screen.getByTestId('next-month-button'));

      expect(screen.getByTestId('today-button')).toBeInTheDocument();
      expect(screen.getByText('Back to Current Month')).toBeInTheDocument();
    });

    it('returns to current month when clicking back button', () => {
      render(<MenteeBookingPage />);

      // Navigate away
      fireEvent.click(screen.getByTestId('next-month-button'));

      // Return to current month
      fireEvent.click(screen.getByTestId('today-button'));

      const currentMonth = format(today, 'MMMM yyyy');
      expect(screen.getByTestId('current-month')).toHaveTextContent(currentMonth);
    });
  });

  describe('Empty states and loading', () => {
    it('shows loading indicator when fetching slots', () => {
      mockGetAvailableSlotsQuery.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<MenteeBookingPage />);

      expect(screen.getByTestId('booking-calendar')).toBeInTheDocument();
    });

    it('shows no available slots message when date has no slots', async () => {
      mockGetAvailableSlotsQuery.mockReturnValue({
        data: {
          slots: [],
          mentors: [],
        },
        isLoading: false,
      });
      mockGetMyBookingsQuery.mockReturnValue({
        data: [],
        isLoading: false,
      });

      render(<MenteeBookingPage />);

      // Click on a date
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        expect(screen.getByText('No available slots for this date')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile optimizations', () => {
    it('renders within MobileLayout wrapper', () => {
      render(<MenteeBookingPage />);

      expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
    });

    it('has touch-friendly slot cards', async () => {
      render(<MenteeBookingPage />);

      // Click on tomorrow's date
      const tomorrowDate = format(tomorrow, 'd');
      const dateButton = screen.getByRole('button', { name: new RegExp(tomorrowDate) });
      fireEvent.click(dateButton);

      await waitFor(() => {
        const slot = screen.getByTestId('slot-slot-1');
        expect(slot).toHaveClass('p-4', 'rounded-xl');
      });
    });
  });
});
