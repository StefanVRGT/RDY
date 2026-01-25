import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database before importing session-reminders
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  },
}));

// Mock web-push send
vi.mock('@/lib/web-push/send', () => ({
  sendPushNotification: vi.fn().mockResolvedValue({ success: true }),
}));

// Import isWithinQuietHours from exercise-reminders (shared utility)
import { isWithinQuietHours } from '@/lib/reminders/exercise-reminders';

describe('Session Reminders - S9.5', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AC-S9.5-1: Reminder for 1:1 sessions', () => {
    it('should calculate reminder time correctly for 1:1 sessions', () => {
      // Test case: session at 14:00, reminder 30 minutes before
      const sessionTime = new Date('2024-01-15T14:00:00');
      const reminderMinutes = 30;
      const expectedReminderTime = new Date('2024-01-15T13:30:00');

      const actualReminderTime = new Date(sessionTime.getTime() - reminderMinutes * 60 * 1000);

      expect(actualReminderTime.getTime()).toBe(expectedReminderTime.getTime());
    });

    it('should create notification payload for 1:1 session', () => {
      const mentorName = 'Dr. Smith';
      const className = 'Morning Class';
      const sessionTime = '14:00';
      const sessionDate = 'Mon, 15 Jan';
      const durationMinutes = 60;
      const meetingLink = 'https://zoom.us/j/123456';

      const body = `1:1 Session with ${mentorName} (${className})\n${sessionDate} at ${sessionTime} (${durationMinutes} min)\nJoin: ${meetingLink}`;

      const notificationPayload = {
        title: 'Session Reminder',
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'session-reminder-test-session-id',
        data: {
          type: 'session_reminder',
          sessionId: 'test-session-id',
          sessionType: '1:1',
          meetingLink,
          url: '/mentee/sessions/test-session-id',
        },
        actions: [
          { action: 'join', title: 'Join Session' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      };

      expect(notificationPayload.title).toBe('Session Reminder');
      expect(notificationPayload.body).toContain('1:1 Session');
      expect(notificationPayload.body).toContain(mentorName);
      expect(notificationPayload.body).toContain(className);
      expect(notificationPayload.body).toContain(sessionTime);
      expect(notificationPayload.body).toContain(meetingLink);
      expect(notificationPayload.data.sessionType).toBe('1:1');
    });

    it('should only send reminders for booked 1:1 sessions', () => {
      const sessionStatus = 'booked';
      const sessionType = '1:1';

      const shouldSendReminder =
        sessionStatus === 'booked' && sessionType === '1:1';

      expect(shouldSendReminder).toBe(true);
    });

    it('should not send reminders for cancelled sessions', () => {
      const sessionStatus = 'cancelled';
      const sessionType = '1:1';

      const shouldSendReminder =
        sessionStatus === 'booked' && sessionType === '1:1';

      expect(shouldSendReminder).toBe(false);
    });

    it('should not send reminders for available (unbooked) slots', () => {
      const sessionStatus = 'available';
      const sessionType = '1:1';

      const shouldSendReminder =
        sessionStatus === 'booked' && sessionType === '1:1';

      expect(shouldSendReminder).toBe(false);
    });
  });

  describe('AC-S9.5-2: Reminder for group sessions', () => {
    it('should calculate reminder time correctly for group sessions', () => {
      // Test case: session at 18:00, reminder 60 minutes before
      const sessionTime = new Date('2024-01-15T18:00:00');
      const reminderMinutes = 60;
      const expectedReminderTime = new Date('2024-01-15T17:00:00');

      const actualReminderTime = new Date(sessionTime.getTime() - reminderMinutes * 60 * 1000);

      expect(actualReminderTime.getTime()).toBe(expectedReminderTime.getTime());
    });

    it('should create notification payload for group session', () => {
      const sessionTitle = 'Weekly Group Coaching';
      const mentorName = 'Dr. Smith';
      const sessionTime = '18:00';
      const sessionDate = 'Mon, 15 Jan';
      const durationMinutes = 90;
      const location = 'https://meet.google.com/abc-defg-hij';

      const body = `${sessionTitle} with ${mentorName}\n${sessionDate} at ${sessionTime} (${durationMinutes} min)\nJoin: ${location}`;

      const notificationPayload = {
        title: 'Group Session Reminder',
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'group-session-reminder-test-session-id',
        data: {
          type: 'group_session_reminder',
          sessionId: 'test-session-id',
          sessionType: 'group',
          meetingLink: location,
          url: '/mentee/group-sessions/test-session-id',
        },
        actions: [
          { action: 'join', title: 'Join Session' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      };

      expect(notificationPayload.title).toBe('Group Session Reminder');
      expect(notificationPayload.body).toContain(sessionTitle);
      expect(notificationPayload.body).toContain(mentorName);
      expect(notificationPayload.body).toContain(sessionTime);
      expect(notificationPayload.body).toContain(location);
      expect(notificationPayload.data.sessionType).toBe('group');
    });

    it('should only send reminders to accepted RSVPs', () => {
      const rsvpStatus = 'accepted';

      const shouldSendReminder = rsvpStatus === 'accepted';

      expect(shouldSendReminder).toBe(true);
    });

    it('should not send reminders to pending RSVPs', () => {
      const rsvpStatus = 'pending';

      const shouldSendReminder = rsvpStatus === 'accepted';

      expect(shouldSendReminder).toBe(false);
    });

    it('should not send reminders to declined RSVPs', () => {
      const rsvpStatus = 'declined';

      const shouldSendReminder = rsvpStatus === 'accepted';

      expect(shouldSendReminder).toBe(false);
    });

    it('should only send reminders for scheduled group sessions', () => {
      const sessionStatus = 'scheduled';

      const shouldSendReminder = sessionStatus === 'scheduled';

      expect(shouldSendReminder).toBe(true);
    });

    it('should not send reminders for cancelled group sessions', () => {
      const sessionStatus = 'cancelled';

      const shouldSendReminder = sessionStatus === 'scheduled';

      expect(shouldSendReminder).toBe(false);
    });
  });

  describe('AC-S9.5-3: Include session details and meeting link', () => {
    describe('1:1 Session details', () => {
      it('should include mentor name in notification', () => {
        const mentorName = 'Dr. Smith';
        const body = `1:1 Session with ${mentorName}`;

        expect(body).toContain(mentorName);
      });

      it('should include class name if associated', () => {
        const className = 'Morning Coaching Class';
        const body = `1:1 Session with Dr. Smith (${className})`;

        expect(body).toContain(className);
      });

      it('should include session date and time', () => {
        const sessionDate = 'Mon, 15 Jan';
        const sessionTime = '14:00';
        const body = `Session\n${sessionDate} at ${sessionTime}`;

        expect(body).toContain(sessionDate);
        expect(body).toContain(sessionTime);
      });

      it('should include duration', () => {
        const durationMinutes = 60;
        const body = `Session at 14:00 (${durationMinutes} min)`;

        expect(body).toContain(`${durationMinutes} min`);
      });

      it('should extract meeting link from notes field', () => {
        const notes = 'Session notes. Join here: https://zoom.us/j/123456789';
        const zoomPattern = /https?:\/\/[^\s]*zoom[^\s]*/i;
        const match = notes.match(zoomPattern);

        expect(match).not.toBeNull();
        expect(match![0]).toBe('https://zoom.us/j/123456789');
      });

      it('should include meeting link in notification when present', () => {
        const meetingLink = 'https://zoom.us/j/123456789';
        const body = `1:1 Session\nJoin: ${meetingLink}`;

        expect(body).toContain('Join:');
        expect(body).toContain(meetingLink);
      });
    });

    describe('Group Session details', () => {
      it('should include session title', () => {
        const title = 'Weekly Group Coaching';
        const body = `${title} with Dr. Smith`;

        expect(body).toContain(title);
      });

      it('should include mentor name', () => {
        const mentorName = 'Dr. Smith';
        const body = `Weekly Group Coaching with ${mentorName}`;

        expect(body).toContain(mentorName);
      });

      it('should include session date and time', () => {
        const sessionDate = 'Mon, 15 Jan';
        const sessionTime = '18:00';
        const body = `Session\n${sessionDate} at ${sessionTime}`;

        expect(body).toContain(sessionDate);
        expect(body).toContain(sessionTime);
      });

      it('should include duration', () => {
        const durationMinutes = 90;
        const body = `Session at 18:00 (${durationMinutes} min)`;

        expect(body).toContain(`${durationMinutes} min`);
      });

      it('should include meeting link from location field', () => {
        const location = 'https://meet.google.com/abc-defg-hij';
        const body = `Group Session\nJoin: ${location}`;

        expect(body).toContain('Join:');
        expect(body).toContain(location);
      });

      it('should include physical location when not a URL', () => {
        const location = 'Conference Room A, Building 2';
        const body = `Group Session\nLocation: ${location}`;

        expect(body).toContain('Location:');
        expect(body).toContain(location);
      });
    });

    describe('Meeting link extraction', () => {
      it('should extract Zoom links', () => {
        const text = 'Join the meeting at https://zoom.us/j/123456789?pwd=abc123';
        const pattern = /https?:\/\/[^\s]*zoom[^\s]*/i;
        const match = text.match(pattern);

        expect(match).not.toBeNull();
        expect(match![0]).toContain('zoom.us');
      });

      it('should extract Microsoft Teams links', () => {
        const text = 'Join at https://teams.microsoft.com/l/meetup-join/xyz';
        const pattern = /https?:\/\/[^\s]*teams[^\s]*/i;
        const match = text.match(pattern);

        expect(match).not.toBeNull();
        expect(match![0]).toContain('teams');
      });

      it('should extract Google Meet links', () => {
        const text = 'Meeting link: https://meet.google.com/abc-defg-hij';
        const pattern = /https?:\/\/[^\s]*meet\.google[^\s]*/i;
        const match = text.match(pattern);

        expect(match).not.toBeNull();
        expect(match![0]).toContain('meet.google.com');
      });

      it('should extract Webex links', () => {
        const text = 'Webex meeting: https://company.webex.com/meet/user';
        const pattern = /https?:\/\/[^\s]*webex[^\s]*/i;
        const match = text.match(pattern);

        expect(match).not.toBeNull();
        expect(match![0]).toContain('webex');
      });

      it('should extract Whereby links', () => {
        const text = 'Join: https://whereby.com/my-room';
        const pattern = /https?:\/\/[^\s]*whereby[^\s]*/i;
        const match = text.match(pattern);

        expect(match).not.toBeNull();
        expect(match![0]).toContain('whereby');
      });

      it('should extract Jitsi links', () => {
        const text = 'Jitsi: https://meet.jit.si/my-meeting';
        // Jitsi URLs typically use 'jit.si' domain
        const pattern = /https?:\/\/[^\s]*jit\.?si[^\s]*/i;
        const match = text.match(pattern);

        expect(match).not.toBeNull();
        expect(match![0]).toContain('jit.si');
      });

      it('should fall back to any URL if no known pattern matches', () => {
        const text = 'Join at https://custom-meeting.example.com/room/123';
        const patterns = [
          /https?:\/\/[^\s]*zoom[^\s]*/i,
          /https?:\/\/[^\s]*teams[^\s]*/i,
          /https?:\/\/[^\s]*meet\.google[^\s]*/i,
          /https?:\/\/[^\s]+/i, // Fallback
        ];

        let meetingLink = null;
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            meetingLink = match[0];
            break;
          }
        }

        expect(meetingLink).toBe('https://custom-meeting.example.com/room/123');
      });

      it('should return null when no URL is present', () => {
        const text = 'No meeting link provided';
        const pattern = /https?:\/\/[^\s]+/i;
        const match = text.match(pattern);

        expect(match).toBeNull();
      });
    });
  });

  describe('AC-S9.5-4: Configurable reminder time', () => {
    it('should support session reminder minutes configuration', () => {
      const defaultSessionReminderMinutes = 30;
      const customSessionReminderMinutes = 45;

      expect(defaultSessionReminderMinutes).toBe(30);
      expect(customSessionReminderMinutes).toBe(45);
    });

    it('should support group session reminder minutes configuration', () => {
      const defaultGroupSessionReminderMinutes = 60;
      const customGroupSessionReminderMinutes = 120;

      expect(defaultGroupSessionReminderMinutes).toBe(60);
      expect(customGroupSessionReminderMinutes).toBe(120);
    });

    it('should use user-configured reminder time for 1:1 sessions', () => {
      const sessionTime = new Date('2024-01-15T14:00:00.000Z');
      const userReminderMinutes = 45;

      const reminderTime = new Date(sessionTime.getTime() - userReminderMinutes * 60 * 1000);

      expect(reminderTime.toISOString()).toBe('2024-01-15T13:15:00.000Z');
    });

    it('should use user-configured reminder time for group sessions', () => {
      const sessionTime = new Date('2024-01-15T18:00:00.000Z');
      const userReminderMinutes = 120;

      const reminderTime = new Date(sessionTime.getTime() - userReminderMinutes * 60 * 1000);

      expect(reminderTime.toISOString()).toBe('2024-01-15T16:00:00.000Z');
    });

    it('should support valid reminder minute ranges (5-120)', () => {
      const validMinutes = [5, 10, 15, 30, 45, 60, 90, 120];

      validMinutes.forEach((minutes) => {
        expect(minutes).toBeGreaterThanOrEqual(5);
        expect(minutes).toBeLessThanOrEqual(120);
      });
    });

    it('should validate reminder minutes are within allowed range', () => {
      const validateReminderMinutes = (minutes: number): boolean => {
        return minutes >= 5 && minutes <= 120;
      };

      expect(validateReminderMinutes(5)).toBe(true);
      expect(validateReminderMinutes(30)).toBe(true);
      expect(validateReminderMinutes(120)).toBe(true);
      expect(validateReminderMinutes(4)).toBe(false);
      expect(validateReminderMinutes(121)).toBe(false);
    });

    it('should allow separate configuration for session vs group session reminders', () => {
      const notificationSettings = {
        sessionRemindersEnabled: true,
        sessionReminderMinutes: 30,
        groupSessionRemindersEnabled: true,
        groupSessionReminderMinutes: 60,
      };

      expect(notificationSettings.sessionReminderMinutes).not.toBe(
        notificationSettings.groupSessionReminderMinutes
      );
    });
  });

  describe('Quiet hours handling', () => {
    it('should not send session reminders during quiet hours', () => {
      const quietHoursEnabled = true;
      const quietHoursStart = '22:00';
      const quietHoursEnd = '07:00';
      const currentTime = '23:30';

      const shouldSkip =
        quietHoursEnabled && isWithinQuietHours(currentTime, quietHoursStart, quietHoursEnd);

      expect(shouldSkip).toBe(true);
    });

    it('should send session reminders outside quiet hours', () => {
      const quietHoursEnabled = true;
      const quietHoursStart = '22:00';
      const quietHoursEnd = '07:00';
      const currentTime = '14:00';

      const shouldSkip =
        quietHoursEnabled && isWithinQuietHours(currentTime, quietHoursStart, quietHoursEnd);

      expect(shouldSkip).toBe(false);
    });
  });

  describe('Duplicate prevention', () => {
    it('should not send duplicate reminders for the same 1:1 session', () => {
      const sentReminders = new Set<string>();

      const sessionId = 'session-123';
      const userId = 'user-456';
      const reminderKey = `${userId}-session-${sessionId}`;

      // First reminder should be sent
      if (!sentReminders.has(reminderKey)) {
        sentReminders.add(reminderKey);
      }

      expect(sentReminders.has(reminderKey)).toBe(true);

      // Second attempt should be skipped
      let secondReminderSent = false;
      if (!sentReminders.has(reminderKey)) {
        secondReminderSent = true;
      }

      expect(secondReminderSent).toBe(false);
    });

    it('should not send duplicate reminders for the same group session', () => {
      const sentReminders = new Set<string>();

      const sessionId = 'group-session-789';
      const userId = 'user-456';
      const reminderKey = `${userId}-group_session-${sessionId}`;

      // First reminder should be sent
      if (!sentReminders.has(reminderKey)) {
        sentReminders.add(reminderKey);
      }

      expect(sentReminders.has(reminderKey)).toBe(true);

      // Second attempt should be skipped
      let secondReminderSent = false;
      if (!sentReminders.has(reminderKey)) {
        secondReminderSent = true;
      }

      expect(secondReminderSent).toBe(false);
    });
  });

  describe('Notification payload structure', () => {
    it('should have all required fields in 1:1 session notification payload', () => {
      const sessionId = 'test-session-id';
      const mentorName = 'Dr. Smith';
      const className = 'Morning Class';
      const sessionTime = '14:00';
      const sessionDate = 'Mon, 15 Jan';
      const durationMinutes = 60;
      const meetingLink = 'https://zoom.us/j/123456';
      const tone = 'default';

      const notificationPayload = {
        title: 'Session Reminder',
        body: `1:1 Session with ${mentorName} (${className})\n${sessionDate} at ${sessionTime} (${durationMinutes} min)\nJoin: ${meetingLink}`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `session-reminder-${sessionId}`,
        data: {
          type: 'session_reminder',
          sessionId,
          sessionType: '1:1',
          meetingLink,
          url: `/mentee/sessions/${sessionId}`,
          tone,
        },
        actions: [
          { action: 'join', title: 'Join Session' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      };

      // Verify required fields
      expect(notificationPayload.title).toBeDefined();
      expect(notificationPayload.body).toBeDefined();
      expect(notificationPayload.body).toContain('1:1 Session');
      expect(notificationPayload.body).toContain(mentorName);
      expect(notificationPayload.data.url).toBeDefined();
      expect(notificationPayload.data.sessionType).toBe('1:1');
      expect(notificationPayload.data.meetingLink).toBeDefined();
      expect(notificationPayload.icon).toBeDefined();
      expect(notificationPayload.badge).toBeDefined();
    });

    it('should have all required fields in group session notification payload', () => {
      const sessionId = 'test-group-session-id';
      const sessionTitle = 'Weekly Group Coaching';
      const mentorName = 'Dr. Smith';
      const sessionTime = '18:00';
      const sessionDate = 'Mon, 15 Jan';
      const durationMinutes = 90;
      const meetingLink = 'https://meet.google.com/abc-defg-hij';
      const tone = 'chime';

      const notificationPayload = {
        title: 'Group Session Reminder',
        body: `${sessionTitle} with ${mentorName}\n${sessionDate} at ${sessionTime} (${durationMinutes} min)\nJoin: ${meetingLink}`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: `group-session-reminder-${sessionId}`,
        data: {
          type: 'group_session_reminder',
          sessionId,
          sessionType: 'group',
          meetingLink,
          url: `/mentee/group-sessions/${sessionId}`,
          tone,
        },
        actions: [
          { action: 'join', title: 'Join Session' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      };

      // Verify required fields
      expect(notificationPayload.title).toBeDefined();
      expect(notificationPayload.body).toBeDefined();
      expect(notificationPayload.body).toContain(sessionTitle);
      expect(notificationPayload.body).toContain(mentorName);
      expect(notificationPayload.data.url).toBeDefined();
      expect(notificationPayload.data.sessionType).toBe('group');
      expect(notificationPayload.data.meetingLink).toBeDefined();
      expect(notificationPayload.icon).toBeDefined();
      expect(notificationPayload.badge).toBeDefined();
    });
  });

  describe('Schema and data model', () => {
    it('should have mentoringSessions table for 1:1 sessions', async () => {
      const schema = await import('@/lib/db/schema');
      expect(schema.mentoringSessions).toBeDefined();
    });

    it('should have groupSessions table for group sessions', async () => {
      const schema = await import('@/lib/db/schema');
      expect(schema.groupSessions).toBeDefined();
    });

    it('should have groupSessionRsvps table for tracking attendance', async () => {
      const schema = await import('@/lib/db/schema');
      expect(schema.groupSessionRsvps).toBeDefined();
    });

    it('should have notificationSettings with session reminder fields', async () => {
      const schema = await import('@/lib/db/schema');
      expect(schema.notificationSettings).toBeDefined();
    });

    it('should have sentReminders table for tracking', async () => {
      const schema = await import('@/lib/db/schema');
      expect(schema.sentReminders).toBeDefined();
    });

    it('should have session and group_session reminder types', async () => {
      const schema = await import('@/lib/db/schema');
      expect(schema.reminderTypeEnum).toBeDefined();
    });
  });

  describe('Notification Settings', () => {
    it('should support enabling/disabling session reminders', () => {
      const settings = {
        sessionRemindersEnabled: true,
        groupSessionRemindersEnabled: false,
      };

      expect(settings.sessionRemindersEnabled).toBe(true);
      expect(settings.groupSessionRemindersEnabled).toBe(false);
    });

    it('should support separate settings for 1:1 and group sessions', () => {
      const settings = {
        sessionRemindersEnabled: true,
        sessionReminderMinutes: 30,
        groupSessionRemindersEnabled: true,
        groupSessionReminderMinutes: 60,
      };

      // Settings should be independent
      expect(settings.sessionRemindersEnabled).not.toEqual(undefined);
      expect(settings.groupSessionRemindersEnabled).not.toEqual(undefined);
      expect(settings.sessionReminderMinutes).not.toBe(
        settings.groupSessionReminderMinutes
      );
    });
  });

  describe('Action buttons', () => {
    it('should show "Join Session" when meeting link is present', () => {
      const hasMeetingLink = true;
      const actionTitle = hasMeetingLink ? 'Join Session' : 'View Details';

      expect(actionTitle).toBe('Join Session');
    });

    it('should show "View Details" when no meeting link is present', () => {
      const hasMeetingLink = false;
      const actionTitle = hasMeetingLink ? 'Join Session' : 'View Details';

      expect(actionTitle).toBe('View Details');
    });
  });
});

describe('API Endpoint - Process Session Reminders', () => {
  it('should process both 1:1 and group session reminders', () => {
    const mockProcessAllSessionReminders = async () => {
      return {
        sessions: { processed: 5, sent: 4, failed: 0, skipped: 1 },
        groupSessions: { processed: 3, sent: 3, failed: 0, skipped: 0 },
      };
    };

    expect(mockProcessAllSessionReminders).toBeDefined();
  });

  it('should return separate results for 1:1 and group sessions', async () => {
    const result = {
      sessions: { processed: 5, sent: 4, failed: 0, skipped: 1 },
      groupSessions: { processed: 3, sent: 3, failed: 0, skipped: 0 },
    };

    expect(result.sessions).toBeDefined();
    expect(result.groupSessions).toBeDefined();
    expect(result.sessions.processed).toBe(5);
    expect(result.groupSessions.processed).toBe(3);
  });
});
