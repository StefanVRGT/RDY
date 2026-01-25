import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationSettingsPage from '@/app/mentee/settings/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
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

// Mock tRPC queries and mutations
const mockGetSettingsQuery = vi.fn();
const mockUpdateSettingsMutate = vi.fn();
const mockSendTestMutate = vi.fn();
const mockUpdatePushOptInMutate = vi.fn();
const mockInvalidate = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    notificationSettings: {
      getSettings: {
        useQuery: () => mockGetSettingsQuery(),
      },
      updateSettings: {
        useMutation: () => ({
          mutate: mockUpdateSettingsMutate,
          isPending: false,
        }),
      },
      sendTestNotification: {
        useMutation: () => ({
          mutate: mockSendTestMutate,
          isPending: false,
        }),
      },
      updatePushOptIn: {
        useMutation: () => ({
          mutate: mockUpdatePushOptInMutate,
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      notificationSettings: {
        getSettings: {
          invalidate: mockInvalidate,
        },
      },
    }),
  },
}));

// Mock push subscription hook
const mockSubscribe = vi.fn().mockResolvedValue(true);
const mockUnsubscribe = vi.fn().mockResolvedValue(true);
const mockPushSubscription = vi.fn(() => ({
  isSupported: true,
  permission: 'default' as NotificationPermission | 'unsupported',
  isSubscribed: false,
  isLoading: false,
  error: null,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
}));

vi.mock('@/lib/push/use-push-subscription', () => ({
  usePushSubscription: () => mockPushSubscription(),
}));

const mockSettings = {
  id: 'test-id',
  userId: 'test-user-id',
  notificationsEnabled: true,
  exerciseRemindersEnabled: true,
  sessionRemindersEnabled: true,
  groupSessionRemindersEnabled: true,
  dailySummaryEnabled: false,
  exerciseReminderMinutes: 15,
  sessionReminderMinutes: 30,
  groupSessionReminderMinutes: 60,
  notificationTone: 'default' as const,
  pushOptedIn: false,
  quietHoursEnabled: false,
  quietHoursStart: null as string | null,
  quietHoursEnd: null as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('Notification Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockGetSettingsQuery.mockReturnValue({
      data: mockSettings,
      isLoading: false,
    });

    mockPushSubscription.mockReturnValue({
      isSupported: true,
      permission: 'default' as NotificationPermission | 'unsupported',
      isSubscribed: false,
      isLoading: false,
      error: null,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
    });
  });

  describe('Toggle switches for each reminder type', () => {
    it('should render toggle switches for all reminder types', () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('master-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('exercise-reminders-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('session-reminders-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('group-session-reminders-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('daily-summary-toggle')).toBeInTheDocument();
    });

    it('should reflect the correct state of each toggle', () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const exerciseToggle = screen.getByTestId('exercise-reminders-toggle');
      const sessionToggle = screen.getByTestId('session-reminders-toggle');
      const groupSessionToggle = screen.getByTestId('group-session-reminders-toggle');
      const dailySummaryToggle = screen.getByTestId('daily-summary-toggle');

      // Check that toggles reflect the mock settings
      expect(exerciseToggle).toHaveAttribute('data-state', 'checked');
      expect(sessionToggle).toHaveAttribute('data-state', 'checked');
      expect(groupSessionToggle).toHaveAttribute('data-state', 'checked');
      expect(dailySummaryToggle).toHaveAttribute('data-state', 'unchecked');
    });

    it('should call updateSettings when a toggle is changed', async () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const exerciseToggle = screen.getByTestId('exercise-reminders-toggle');
      fireEvent.click(exerciseToggle);

      await waitFor(() => {
        expect(mockUpdateSettingsMutate).toHaveBeenCalledWith({ exerciseRemindersEnabled: false });
      });
    });

    it('should disable reminder toggles when master toggle is off', () => {
      mockGetSettingsQuery.mockReturnValue({
        data: { ...mockSettings, notificationsEnabled: false },
        isLoading: false,
      });

      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const exerciseToggle = screen.getByTestId('exercise-reminders-toggle');
      const sessionToggle = screen.getByTestId('session-reminders-toggle');
      const groupSessionToggle = screen.getByTestId('group-session-reminders-toggle');
      const dailySummaryToggle = screen.getByTestId('daily-summary-toggle');

      expect(exerciseToggle).toBeDisabled();
      expect(sessionToggle).toBeDisabled();
      expect(groupSessionToggle).toBeDisabled();
      expect(dailySummaryToggle).toBeDisabled();
    });
  });

  describe('Minutes-before configuration', () => {
    it('should render minutes select for exercise reminders', () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const exerciseMinutesSelect = screen.getByTestId('exercise-minutes-select');
      expect(exerciseMinutesSelect).toBeInTheDocument();
    });

    it('should render minutes select for session reminders', () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const sessionMinutesSelect = screen.getByTestId('session-minutes-select');
      expect(sessionMinutesSelect).toBeInTheDocument();
    });

    it('should render minutes select for group session reminders', () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const groupSessionMinutesSelect = screen.getByTestId('group-session-minutes-select');
      expect(groupSessionMinutesSelect).toBeInTheDocument();
    });

    it('should display correct minutes values', () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      // The select trigger should show the current value
      const exerciseMinutesSelect = screen.getByTestId('exercise-minutes-select');
      expect(exerciseMinutesSelect).toHaveTextContent('15');

      const sessionMinutesSelect = screen.getByTestId('session-minutes-select');
      expect(sessionMinutesSelect).toHaveTextContent('30');

      const groupSessionMinutesSelect = screen.getByTestId('group-session-minutes-select');
      expect(groupSessionMinutesSelect).toHaveTextContent('60');
    });

    it('should hide minutes configuration when reminder is disabled', () => {
      mockGetSettingsQuery.mockReturnValue({
        data: { ...mockSettings, exerciseRemindersEnabled: false },
        isLoading: false,
      });

      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      // Minutes select should not be visible when the corresponding reminder is disabled
      expect(screen.queryByTestId('exercise-minutes-select')).not.toBeInTheDocument();
    });
  });

  describe('Tone selection dropdown', () => {
    it('should render tone selection dropdown', () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const toneSelect = screen.getByTestId('tone-select');
      expect(toneSelect).toBeInTheDocument();
    });

    it('should display the tone selection section', () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const toneSection = screen.getByTestId('tone-selection-section');
      expect(toneSection).toBeInTheDocument();
      expect(screen.getByText('Notification Tone')).toBeInTheDocument();
    });

    it('should display current tone value', () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const toneSelect = screen.getByTestId('tone-select');
      expect(toneSelect).toHaveTextContent('Default');
    });

    it('should be disabled when notifications are disabled', () => {
      mockGetSettingsQuery.mockReturnValue({
        data: { ...mockSettings, notificationsEnabled: false },
        isLoading: false,
      });

      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const toneSelect = screen.getByTestId('tone-select');
      expect(toneSelect).toBeDisabled();
    });
  });

  describe('Test notification button', () => {
    it('should render test notification button', () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const testButton = screen.getByTestId('test-notification-button');
      expect(testButton).toBeInTheDocument();
      expect(testButton).toHaveTextContent('Send Test Notification');
    });

    it('should render test notification section', () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const testSection = screen.getByTestId('test-notification-section');
      expect(testSection).toBeInTheDocument();
      expect(screen.getByText('Test Notification')).toBeInTheDocument();
    });

    it('should be disabled when push notifications are not subscribed', () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const testButton = screen.getByTestId('test-notification-button');
      expect(testButton).toBeDisabled();
    });

    it('should be enabled when push notifications are subscribed', () => {
      mockPushSubscription.mockReturnValue({
        isSupported: true,
        permission: 'granted' as NotificationPermission | 'unsupported',
        isSubscribed: true,
        isLoading: false,
        error: null,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      });

      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const testButton = screen.getByTestId('test-notification-button');
      expect(testButton).not.toBeDisabled();
    });

    it('should call sendTestNotification when clicked', async () => {
      mockPushSubscription.mockReturnValue({
        isSupported: true,
        permission: 'granted' as NotificationPermission | 'unsupported',
        isSubscribed: true,
        isLoading: false,
        error: null,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      });

      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const testButton = screen.getByTestId('test-notification-button');
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(mockSendTestMutate).toHaveBeenCalled();
      });
    });
  });

  describe('Push opt-in flow', () => {
    it('should render push opt-in section', () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const pushSection = screen.getByTestId('push-optin-section');
      expect(pushSection).toBeInTheDocument();
      expect(screen.getByText('Push Notifications')).toBeInTheDocument();
    });

    it('should render push opt-in button', () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const pushButton = screen.getByTestId('push-optin-button');
      expect(pushButton).toBeInTheDocument();
      expect(pushButton).toHaveTextContent('Enable');
    });

    it('should show Disable when already subscribed', () => {
      mockPushSubscription.mockReturnValue({
        isSupported: true,
        permission: 'granted' as NotificationPermission | 'unsupported',
        isSubscribed: true,
        isLoading: false,
        error: null,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      });

      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const pushButton = screen.getByTestId('push-optin-button');
      expect(pushButton).toHaveTextContent('Disable');
    });

    it('should disable button when push is not supported', () => {
      mockPushSubscription.mockReturnValue({
        isSupported: false,
        permission: 'unsupported' as NotificationPermission | 'unsupported',
        isSubscribed: false,
        isLoading: false,
        error: null,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      });

      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const pushButton = screen.getByTestId('push-optin-button');
      expect(pushButton).toBeDisabled();
    });

    it('should disable button when permission is denied', () => {
      mockPushSubscription.mockReturnValue({
        isSupported: true,
        permission: 'denied' as NotificationPermission | 'unsupported',
        isSubscribed: false,
        isLoading: false,
        error: null,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      });

      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const pushButton = screen.getByTestId('push-optin-button');
      expect(pushButton).toBeDisabled();
    });

    it('should call subscribe when Enable is clicked', async () => {
      mockPushSubscription.mockReturnValue({
        isSupported: true,
        permission: 'default' as NotificationPermission | 'unsupported',
        isSubscribed: false,
        isLoading: false,
        error: null,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      });

      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const pushButton = screen.getByTestId('push-optin-button');
      fireEvent.click(pushButton);

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });
    });

    it('should call unsubscribe when Disable is clicked', async () => {
      mockPushSubscription.mockReturnValue({
        isSupported: true,
        permission: 'granted' as NotificationPermission | 'unsupported',
        isSubscribed: true,
        isLoading: false,
        error: null,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      });

      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const pushButton = screen.getByTestId('push-optin-button');
      fireEvent.click(pushButton);

      await waitFor(() => {
        expect(mockUnsubscribe).toHaveBeenCalled();
      });
    });

    it('should show warning when permission is denied', () => {
      mockPushSubscription.mockReturnValue({
        isSupported: true,
        permission: 'denied' as NotificationPermission | 'unsupported',
        isSubscribed: false,
        isLoading: false,
        error: null,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      });

      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      expect(
        screen.getByText('Notifications are blocked. Please enable them in your browser settings.')
      ).toBeInTheDocument();
    });

    it('should show loading state when processing', () => {
      mockPushSubscription.mockReturnValue({
        isSupported: true,
        permission: 'default' as NotificationPermission | 'unsupported',
        isSubscribed: false,
        isLoading: true,
        error: null,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      });

      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const pushButton = screen.getByTestId('push-optin-button');
      expect(pushButton).toBeDisabled();
    });
  });

  describe('Loading state', () => {
    it('should show loading spinner when settings are loading', () => {
      mockGetSettingsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      // Check for loading indicator (master toggle should not be present)
      expect(screen.queryByTestId('master-toggle')).not.toBeInTheDocument();
    });
  });

  describe('Database schema', () => {
    it('should have notificationSettings table defined in schema', async () => {
      const schema = await import('@/lib/db/schema');
      expect(schema.notificationSettings).toBeDefined();
    });

    it('should have notificationToneEnum defined in schema', async () => {
      const schema = await import('@/lib/db/schema');
      expect(schema.notificationToneEnum).toBeDefined();
    });
  });

  describe('tRPC router', () => {
    it('should have notificationSettings router defined', async () => {
      const router = await import('@/lib/trpc/routers/notificationSettings');
      expect(router.notificationSettingsRouter).toBeDefined();
    });
  });

  describe('Quiet Hours Section', () => {
    it('should render quiet hours section', () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const quietHoursSection = screen.getByTestId('quiet-hours-section');
      expect(quietHoursSection).toBeInTheDocument();
      expect(screen.getByText('Quiet Hours')).toBeInTheDocument();
    });

    it('should render quiet hours toggle', () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const quietHoursToggle = screen.getByTestId('quiet-hours-toggle');
      expect(quietHoursToggle).toBeInTheDocument();
    });

    it('should not show time inputs when quiet hours are disabled', () => {
      mockGetSettingsQuery.mockReturnValue({
        data: { ...mockSettings, quietHoursEnabled: false },
        isLoading: false,
      });

      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      expect(screen.queryByTestId('quiet-hours-start')).not.toBeInTheDocument();
      expect(screen.queryByTestId('quiet-hours-end')).not.toBeInTheDocument();
    });

    it('should show time inputs when quiet hours are enabled', () => {
      mockGetSettingsQuery.mockReturnValue({
        data: { ...mockSettings, quietHoursEnabled: true, quietHoursStart: '22:00', quietHoursEnd: '07:00' },
        isLoading: false,
      });

      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const startInput = screen.getByTestId('quiet-hours-start');
      const endInput = screen.getByTestId('quiet-hours-end');

      expect(startInput).toBeInTheDocument();
      expect(endInput).toBeInTheDocument();
    });

    it('should call updateSettings when quiet hours toggle is changed', async () => {
      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const quietHoursToggle = screen.getByTestId('quiet-hours-toggle');
      fireEvent.click(quietHoursToggle);

      await waitFor(() => {
        expect(mockUpdateSettingsMutate).toHaveBeenCalledWith({ quietHoursEnabled: true });
      });
    });

    it('should be disabled when notifications are disabled', () => {
      mockGetSettingsQuery.mockReturnValue({
        data: { ...mockSettings, notificationsEnabled: false },
        isLoading: false,
      });

      render(<NotificationSettingsPage />, { wrapper: createWrapper() });

      const quietHoursToggle = screen.getByTestId('quiet-hours-toggle');
      expect(quietHoursToggle).toBeDisabled();
    });
  });
});
