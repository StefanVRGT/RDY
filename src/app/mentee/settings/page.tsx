'use client';

import { useState, useCallback, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc/client';
import { usePushSubscription } from '@/lib/push/use-push-subscription';
import {
  Bell,
  BellOff,
  Clock,
  Volume2,
  Send,
  Smartphone,
  Loader2,
  CheckCircle,
  AlertCircle,
  Dumbbell,
  Calendar,
  Users,
  Sun,
  Moon,
  BookOpen,
  BarChart2,
} from 'lucide-react';

type NotificationTone = 'default' | 'gentle' | 'chime' | 'alert' | 'silent';

const TONE_OPTIONS: { value: NotificationTone; label: string; description: string }[] = [
  { value: 'default', label: 'Tingsha Bell', description: 'Tibetan meditation bell' },
  { value: 'gentle', label: 'Tingsha Bell (soft)', description: 'Same bell, quieter' },
  { value: 'chime', label: 'Tingsha Bell (chime)', description: 'Same bell, chime style' },
  { value: 'alert', label: 'Tingsha Bell (alert)', description: 'Same bell, alert style' },
  { value: 'silent', label: 'Silent', description: 'No sound, visual only' },
];

const MINUTES_OPTIONS = [5, 10, 15, 30, 45, 60, 90, 120];

export default function NotificationSettingsPage() {
  const [testNotificationStatus, setTestNotificationStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const utils = trpc.useUtils();

  // Fetch current settings
  const { data: settings, isLoading: settingsLoading } =
    trpc.notificationSettings.getSettings.useQuery();

  // Privacy settings
  const { data: privacySettings } = trpc.mentee.getPrivacySettings.useQuery();
  const updatePrivacyMutation = trpc.mentee.updatePrivacySettings.useMutation({
    onSuccess: () => {
      utils.mentee.getPrivacySettings.invalidate();
    },
  });

  // Mutations
  const updateSettingsMutation = trpc.notificationSettings.updateSettings.useMutation({
    onSuccess: () => {
      utils.notificationSettings.getSettings.invalidate();
    },
  });

  const sendTestMutation = trpc.notificationSettings.sendTestNotification.useMutation({
    onSuccess: (data) => {
      setTestNotificationStatus({
        type: data.success ? 'success' : 'error',
        message: data.message,
      });
      setTimeout(() => setTestNotificationStatus({ type: null, message: '' }), 5000);
    },
    onError: (error) => {
      setTestNotificationStatus({
        type: 'error',
        message: error.message,
      });
      setTimeout(() => setTestNotificationStatus({ type: null, message: '' }), 5000);
    },
  });

  const updatePushOptInMutation = trpc.notificationSettings.updatePushOptIn.useMutation({
    onSuccess: () => {
      utils.notificationSettings.getSettings.invalidate();
    },
  });

  // Push subscription hook
  const {
    isSupported: isPushSupported,
    permission: pushPermission,
    isSubscribed: isPushSubscribed,
    isLoading: pushLoading,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
  } = usePushSubscription();

  // Update setting helper
  const updateSetting = useCallback(
    (key: string, value: boolean | number | string) => {
      updateSettingsMutation.mutate({ [key]: value });
    },
    [updateSettingsMutation]
  );

  // Handle push opt-in flow
  const handlePushOptIn = useCallback(async () => {
    if (!isPushSupported) {
      setTestNotificationStatus({
        type: 'error',
        message: 'Push notifications are not supported on this device/browser.',
      });
      setTimeout(() => setTestNotificationStatus({ type: null, message: '' }), 5000);
      return;
    }

    if (isPushSubscribed) {
      // Unsubscribe
      const success = await unsubscribeFromPush();
      if (success) {
        updatePushOptInMutation.mutate({ optedIn: false });
      }
    } else {
      // Subscribe
      const success = await subscribeToPush();
      if (success) {
        updatePushOptInMutation.mutate({ optedIn: true });
      } else if (pushPermission === 'denied') {
        setTestNotificationStatus({
          type: 'error',
          message:
            'Notification permission was denied. Please enable notifications in your browser settings.',
        });
        setTimeout(() => setTestNotificationStatus({ type: null, message: '' }), 5000);
      }
    }
  }, [
    isPushSupported,
    isPushSubscribed,
    pushPermission,
    subscribeToPush,
    unsubscribeFromPush,
    updatePushOptInMutation,
  ]);

  // Handle test notification
  const handleTestNotification = useCallback(() => {
    if (!isPushSubscribed) {
      setTestNotificationStatus({
        type: 'error',
        message: 'Please enable push notifications first.',
      });
      setTimeout(() => setTestNotificationStatus({ type: null, message: '' }), 5000);
      return;
    }
    sendTestMutation.mutate();
  }, [isPushSubscribed, sendTestMutation]);

  // Sync push opt-in status with actual subscription state
  useEffect(() => {
    if (settings && !pushLoading) {
      const actualOptedIn = isPushSubscribed;
      if (settings.pushOptedIn !== actualOptedIn) {
        updatePushOptInMutation.mutate({ optedIn: actualOptedIn });
      }
    }
  }, [settings, isPushSubscribed, pushLoading, updatePushOptInMutation]);

  if (settingsLoading) {
    return (
      <MobileLayout title="Notification Settings" showBack>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-rdy-orange-500" />
        </div>
      </MobileLayout>
    );
  }

  const isUpdating = updateSettingsMutation.isPending;

  return (
    <MobileLayout title="Notification Settings" showBack>
      <div className="px-4 py-6 space-y-6">
        {/* Status Messages */}
        {testNotificationStatus.type && (
          <div
            className={`flex items-center gap-3 rounded-xl p-4 ${
              testNotificationStatus.type === 'success'
                ? 'bg-green-500/10 text-green-400'
                : 'bg-red-500/10 text-red-400'
            }`}
            role="alert"
            data-testid="notification-status"
          >
            {testNotificationStatus.type === 'success' ? (
              <CheckCircle className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <p className="text-sm">{testNotificationStatus.message}</p>
          </div>
        )}

        {/* Push Notifications Opt-in Section */}
        <section className="space-y-4" data-testid="push-optin-section">
          <h2 className="text-lg font-semibold text-rdy-black">Push Notifications</h2>
          <div className="rounded-xl bg-rdy-gray-100 p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rdy-orange-500/10">
                <Smartphone className="h-5 w-5 text-rdy-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-rdy-black">Enable Push Notifications</h3>
                <p className="mt-1 text-sm text-rdy-gray-400">
                  {!isPushSupported
                    ? 'Push notifications are not supported on this device.'
                    : isPushSubscribed
                      ? 'You will receive notifications on this device.'
                      : 'Allow RDY to send you notifications about your exercises and sessions.'}
                </p>
                {pushPermission === 'denied' && (
                  <p className="mt-2 text-sm text-rdy-orange-500">
                    Notifications are blocked. Please enable them in your browser settings.
                  </p>
                )}
              </div>
              <Button
                variant={isPushSubscribed ? 'outline' : 'default'}
                size="sm"
                onClick={handlePushOptIn}
                disabled={!isPushSupported || pushLoading || pushPermission === 'denied'}
                data-testid="push-optin-button"
              >
                {pushLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPushSubscribed ? (
                  'Disable'
                ) : (
                  'Enable'
                )}
              </Button>
            </div>
          </div>
        </section>

        {/* Master Toggle */}
        <section className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-rdy-gray-100 p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rdy-orange-500/10">
                {settings?.notificationsEnabled ? (
                  <Bell className="h-5 w-5 text-rdy-orange-500" />
                ) : (
                  <BellOff className="h-5 w-5 text-rdy-gray-400" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-rdy-black">All Notifications</h3>
                <p className="text-sm text-rdy-gray-400">Master toggle for all reminders</p>
              </div>
            </div>
            <Switch
              checked={settings?.notificationsEnabled ?? true}
              onCheckedChange={(checked) => updateSetting('notificationsEnabled', checked)}
              disabled={isUpdating}
              data-testid="master-toggle"
            />
          </div>
        </section>

        {/* Reminder Types */}
        <section className="space-y-4" data-testid="reminder-types-section">
          <h2 className="text-lg font-semibold text-rdy-black">Reminder Types</h2>
          <div className="space-y-3">
            {/* Exercise Reminders */}
            <div
              className={`rounded-xl bg-rdy-gray-100 p-4 transition-opacity ${
                !settings?.notificationsEnabled ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20">
                    <Dumbbell className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-rdy-black">Exercise Reminders</h3>
                    <p className="text-sm text-rdy-gray-400">Daily exercise notifications</p>
                  </div>
                </div>
                <Switch
                  checked={settings?.exerciseRemindersEnabled ?? true}
                  onCheckedChange={(checked) => updateSetting('exerciseRemindersEnabled', checked)}
                  disabled={isUpdating || !settings?.notificationsEnabled}
                  data-testid="exercise-reminders-toggle"
                />
              </div>
              {settings?.exerciseRemindersEnabled && settings?.notificationsEnabled && (
                <div className="mt-4 flex items-center gap-3 border-t border-rdy-gray-200 pt-4">
                  <Clock className="h-4 w-4 text-rdy-gray-400" />
                  <span className="text-sm text-rdy-gray-400">Remind me</span>
                  <Select
                    value={String(settings?.exerciseReminderMinutes ?? 15)}
                    onValueChange={(value) =>
                      updateSetting('exerciseReminderMinutes', parseInt(value))
                    }
                    disabled={isUpdating}
                  >
                    <SelectTrigger
                      className="w-24 bg-rdy-gray-100 border-rdy-gray-200"
                      data-testid="exercise-minutes-select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MINUTES_OPTIONS.map((min) => (
                        <SelectItem key={min} value={String(min)}>
                          {min} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-rdy-gray-400">before</span>
                </div>
              )}
            </div>

            {/* Session Reminders */}
            <div
              className={`rounded-xl bg-rdy-gray-100 p-4 transition-opacity ${
                !settings?.notificationsEnabled ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rdy-orange-500/10">
                    <Calendar className="h-5 w-5 text-rdy-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-rdy-black">Session Reminders</h3>
                    <p className="text-sm text-rdy-gray-400">1:1 mentoring sessions</p>
                  </div>
                </div>
                <Switch
                  checked={settings?.sessionRemindersEnabled ?? true}
                  onCheckedChange={(checked) => updateSetting('sessionRemindersEnabled', checked)}
                  disabled={isUpdating || !settings?.notificationsEnabled}
                  data-testid="session-reminders-toggle"
                />
              </div>
              {settings?.sessionRemindersEnabled && settings?.notificationsEnabled && (
                <div className="mt-4 flex items-center gap-3 border-t border-rdy-gray-200 pt-4">
                  <Clock className="h-4 w-4 text-rdy-gray-400" />
                  <span className="text-sm text-rdy-gray-400">Remind me</span>
                  <Select
                    value={String(settings?.sessionReminderMinutes ?? 30)}
                    onValueChange={(value) =>
                      updateSetting('sessionReminderMinutes', parseInt(value))
                    }
                    disabled={isUpdating}
                  >
                    <SelectTrigger
                      className="w-24 bg-rdy-gray-100 border-rdy-gray-200"
                      data-testid="session-minutes-select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MINUTES_OPTIONS.map((min) => (
                        <SelectItem key={min} value={String(min)}>
                          {min} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-rdy-gray-400">before</span>
                </div>
              )}
            </div>

            {/* Group Session Reminders */}
            <div
              className={`rounded-xl bg-rdy-gray-100 p-4 transition-opacity ${
                !settings?.notificationsEnabled ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rdy-orange-500/10">
                    <Users className="h-5 w-5 text-rdy-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-rdy-black">Group Session Reminders</h3>
                    <p className="text-sm text-rdy-gray-400">Group mentoring sessions</p>
                  </div>
                </div>
                <Switch
                  checked={settings?.groupSessionRemindersEnabled ?? true}
                  onCheckedChange={(checked) =>
                    updateSetting('groupSessionRemindersEnabled', checked)
                  }
                  disabled={isUpdating || !settings?.notificationsEnabled}
                  data-testid="group-session-reminders-toggle"
                />
              </div>
              {settings?.groupSessionRemindersEnabled && settings?.notificationsEnabled && (
                <div className="mt-4 flex items-center gap-3 border-t border-rdy-gray-200 pt-4">
                  <Clock className="h-4 w-4 text-rdy-gray-400" />
                  <span className="text-sm text-rdy-gray-400">Remind me</span>
                  <Select
                    value={String(settings?.groupSessionReminderMinutes ?? 60)}
                    onValueChange={(value) =>
                      updateSetting('groupSessionReminderMinutes', parseInt(value))
                    }
                    disabled={isUpdating}
                  >
                    <SelectTrigger
                      className="w-24 bg-rdy-gray-100 border-rdy-gray-200"
                      data-testid="group-session-minutes-select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MINUTES_OPTIONS.map((min) => (
                        <SelectItem key={min} value={String(min)}>
                          {min} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-rdy-gray-400">before</span>
                </div>
              )}
            </div>

            {/* Daily Summary */}
            <div
              className={`rounded-xl bg-rdy-gray-100 p-4 transition-opacity ${
                !settings?.notificationsEnabled ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                    <Sun className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-rdy-black">Daily Summary</h3>
                    <p className="text-sm text-rdy-gray-400">Morning overview of your day</p>
                  </div>
                </div>
                <Switch
                  checked={settings?.dailySummaryEnabled ?? false}
                  onCheckedChange={(checked) => updateSetting('dailySummaryEnabled', checked)}
                  disabled={isUpdating || !settings?.notificationsEnabled}
                  data-testid="daily-summary-toggle"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Notification Tone */}
        <section className="space-y-4" data-testid="tone-selection-section">
          <h2 className="text-lg font-semibold text-rdy-black">Notification Tone</h2>
          <div
            className={`rounded-xl bg-rdy-gray-100 p-4 transition-opacity ${
              !settings?.notificationsEnabled ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rdy-orange-500/10">
                <Volume2 className="h-5 w-5 text-rdy-orange-500" />
              </div>
              <div>
                <h3 className="font-medium text-rdy-black">Sound</h3>
                <p className="text-sm text-rdy-gray-400">Choose your notification sound</p>
              </div>
            </div>
            <Select
              value={settings?.notificationTone ?? 'default'}
              onValueChange={(value) => updateSetting('notificationTone', value)}
              disabled={isUpdating || !settings?.notificationsEnabled}
            >
              <SelectTrigger
                className="w-full bg-rdy-gray-100 border-rdy-gray-200"
                data-testid="tone-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((tone) => (
                  <SelectItem key={tone.value} value={tone.value}>
                    <div className="flex flex-col">
                      <span>{tone.label}</span>
                      <span className="text-xs text-rdy-gray-400">{tone.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Quiet Hours */}
        <section className="space-y-4" data-testid="quiet-hours-section">
          <h2 className="text-lg font-semibold text-rdy-black">Quiet Hours</h2>
          <div
            className={`rounded-xl bg-rdy-gray-100 p-4 transition-opacity ${
              !settings?.notificationsEnabled ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20">
                  <Moon className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-medium text-rdy-black">Enable Quiet Hours</h3>
                  <p className="text-sm text-rdy-gray-400">Pause notifications during set times</p>
                </div>
              </div>
              <Switch
                checked={settings?.quietHoursEnabled ?? false}
                onCheckedChange={(checked) => updateSetting('quietHoursEnabled', checked)}
                disabled={isUpdating || !settings?.notificationsEnabled}
                data-testid="quiet-hours-toggle"
              />
            </div>
            {settings?.quietHoursEnabled && settings?.notificationsEnabled && (
              <div className="mt-4 space-y-3 border-t border-rdy-gray-200 pt-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-rdy-gray-400 w-16">From</span>
                  <input
                    type="time"
                    value={settings?.quietHoursStart ?? '22:00'}
                    onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
                    disabled={isUpdating}
                    className="flex-1 rounded-lg bg-rdy-gray-100 border border-rdy-gray-200 px-3 py-2 text-rdy-black text-sm focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
                    data-testid="quiet-hours-start"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-rdy-gray-400 w-16">To</span>
                  <input
                    type="time"
                    value={settings?.quietHoursEnd ?? '07:00'}
                    onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
                    disabled={isUpdating}
                    className="flex-1 rounded-lg bg-rdy-gray-100 border border-rdy-gray-200 px-3 py-2 text-rdy-black text-sm focus:outline-none focus:ring-2 focus:ring-rdy-orange-500"
                    data-testid="quiet-hours-end"
                  />
                </div>
                <p className="text-xs text-rdy-gray-500">
                  Notifications will be paused during these hours.
                  {settings?.quietHoursStart && settings?.quietHoursEnd && (
                    <span className="block mt-1">
                      Currently set: {settings.quietHoursStart} - {settings.quietHoursEnd}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Privacy Settings */}
        <section className="space-y-4" data-testid="privacy-settings-section">
          <h2 className="text-lg font-semibold text-rdy-black">Privacy</h2>
          <p className="text-sm text-rdy-gray-400 -mt-2">
            Control what your mentor can see
          </p>
          <div className="space-y-3">
            {/* Share Diary */}
            <div className="rounded-xl bg-rdy-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rdy-orange-500/10">
                    <BookOpen className="h-5 w-5 text-rdy-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-rdy-black">Share Diary</h3>
                    <p className="text-sm text-rdy-gray-400">
                      Allow your mentor to read your diary entries
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings?.shareDiaryWithMentor ?? false}
                  onCheckedChange={(checked) =>
                    updatePrivacyMutation.mutate({ shareDiaryWithMentor: checked })
                  }
                  disabled={updatePrivacyMutation.isPending}
                  data-testid="share-diary-toggle"
                />
              </div>
            </div>

            {/* Share Weekly Summary */}
            <div className="rounded-xl bg-rdy-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rdy-orange-500/10">
                    <BarChart2 className="h-5 w-5 text-rdy-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-rdy-black">Share Weekly Summary</h3>
                    <p className="text-sm text-rdy-gray-400">
                      Allow your mentor to view your weekly progress report
                    </p>
                  </div>
                </div>
                <Switch
                  checked={privacySettings?.shareWeeklySummaryWithMentor ?? false}
                  onCheckedChange={(checked) =>
                    updatePrivacyMutation.mutate({ shareWeeklySummaryWithMentor: checked })
                  }
                  disabled={updatePrivacyMutation.isPending}
                  data-testid="share-weekly-summary-toggle"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Test Notification */}
        <section className="space-y-4" data-testid="test-notification-section">
          <h2 className="text-lg font-semibold text-rdy-black">Test Notification</h2>
          <div className="rounded-xl bg-rdy-gray-100 p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rdy-orange-500/10">
                <Send className="h-5 w-5 text-rdy-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-rdy-black">Send Test Notification</h3>
                <p className="mt-1 text-sm text-rdy-gray-400">
                  Verify that notifications are working correctly on your device.
                </p>
              </div>
            </div>
            <Button
              className="mt-4 w-full"
              onClick={handleTestNotification}
              disabled={
                !isPushSubscribed ||
                sendTestMutation.isPending ||
                !settings?.notificationsEnabled
              }
              data-testid="test-notification-button"
            >
              {sendTestMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test Notification
                </>
              )}
            </Button>
            {!isPushSubscribed && (
              <p className="mt-2 text-sm text-rdy-orange-500 text-center">
                Enable push notifications above to test.
              </p>
            )}
          </div>
        </section>
      </div>
    </MobileLayout>
  );
}
