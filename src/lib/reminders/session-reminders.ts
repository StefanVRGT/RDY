import { db } from '@/lib/db';
import {
  mentoringSessions,
  groupSessions,
  groupSessionRsvps,
  users,
  classes,
  notificationSettings,
  pushSubscriptions,
  sentReminders,
} from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { sendPushNotification } from '@/lib/web-push/send';
import { isWithinQuietHours } from './exercise-reminders';

/**
 * Format time as HH:MM string
 */
function formatTimeHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Interface for 1:1 session reminder data
 */
export interface SessionReminderData {
  sessionId: string;
  userId: string;
  mentorId: string;
  mentorName: string | null;
  className: string | null;
  scheduledAt: Date;
  durationMinutes: number;
  meetingLink: string | null;
  notes: string | null;
  reminderTime: Date;
  notificationTone: string;
}

/**
 * Interface for group session reminder data
 */
export interface GroupSessionReminderData {
  sessionId: string;
  userId: string;
  mentorId: string;
  mentorName: string | null;
  title: string;
  description: string | null;
  agenda: string | null;
  scheduledAt: Date;
  durationMinutes: number;
  location: string | null;
  reminderTime: Date;
  notificationTone: string;
}

/**
 * Get all 1:1 sessions that need reminders sent
 * Finds booked mentoring sessions where:
 * - The reminder time has passed (scheduledAt - reminderMinutes <= now)
 * - The session hasn't started yet (scheduledAt > now)
 * - No reminder has been sent yet
 * - User has session reminders enabled
 * - User has notifications enabled
 * - User is not in quiet hours
 */
export async function getSessionsNeedingReminders(): Promise<SessionReminderData[]> {
  const now = new Date();
  const currentTimeHHMM = formatTimeHHMM(now);

  // Query booked 1:1 mentoring sessions
  const result = await db
    .select({
      sessionId: mentoringSessions.id,
      userId: mentoringSessions.menteeId,
      mentorId: mentoringSessions.mentorId,
      scheduledAt: mentoringSessions.scheduledAt,
      durationMinutes: mentoringSessions.durationMinutes,
      notes: mentoringSessions.notes,
      classId: mentoringSessions.classId,
      notificationsEnabled: notificationSettings.notificationsEnabled,
      sessionRemindersEnabled: notificationSettings.sessionRemindersEnabled,
      sessionReminderMinutes: notificationSettings.sessionReminderMinutes,
      notificationTone: notificationSettings.notificationTone,
      quietHoursEnabled: notificationSettings.quietHoursEnabled,
      quietHoursStart: notificationSettings.quietHoursStart,
      quietHoursEnd: notificationSettings.quietHoursEnd,
      pushOptedIn: notificationSettings.pushOptedIn,
    })
    .from(mentoringSessions)
    .innerJoin(notificationSettings, eq(mentoringSessions.menteeId, notificationSettings.userId))
    .where(
      and(
        // Only booked 1:1 sessions
        eq(mentoringSessions.sessionType, '1:1'),
        eq(mentoringSessions.status, 'booked'),
        // Has a mentee assigned
        // menteeId is not null - we filter this in application
        // Notifications enabled
        eq(notificationSettings.notificationsEnabled, true),
        // Session reminders enabled
        eq(notificationSettings.sessionRemindersEnabled, true),
        // Push opted in
        eq(notificationSettings.pushOptedIn, true),
        // Scheduled time is in the future
        gte(mentoringSessions.scheduledAt, now)
      )
    );

  // Get mentor names and class names for all sessions
  const sessionsNeedingReminders: SessionReminderData[] = [];

  for (const row of result) {
    // Skip if no mentee assigned
    if (!row.userId) {
      continue;
    }

    const scheduledAt = new Date(row.scheduledAt);
    const reminderMinutes = row.sessionReminderMinutes;
    const reminderTime = new Date(scheduledAt.getTime() - reminderMinutes * 60 * 1000);

    // Check if reminder time has passed
    if (reminderTime > now) {
      continue;
    }

    // Check quiet hours
    if (
      row.quietHoursEnabled &&
      isWithinQuietHours(currentTimeHHMM, row.quietHoursStart, row.quietHoursEnd)
    ) {
      continue;
    }

    // Check if reminder was already sent
    const existingReminder = await db
      .select({ id: sentReminders.id })
      .from(sentReminders)
      .where(
        and(
          eq(sentReminders.userId, row.userId),
          eq(sentReminders.reminderType, 'session'),
          eq(sentReminders.referenceId, row.sessionId)
        )
      )
      .limit(1);

    if (existingReminder.length > 0) {
      continue;
    }

    // Get mentor name
    const mentorResult = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, row.mentorId))
      .limit(1);

    const mentorName = mentorResult[0]?.name || null;

    // Get class name if session is associated with a class
    let className: string | null = null;
    if (row.classId) {
      const classResult = await db
        .select({ name: classes.name })
        .from(classes)
        .where(eq(classes.id, row.classId))
        .limit(1);
      className = classResult[0]?.name || null;
    }

    // Extract meeting link from notes if present (commonly formatted as URL)
    const meetingLink = extractMeetingLink(row.notes);

    sessionsNeedingReminders.push({
      sessionId: row.sessionId,
      userId: row.userId,
      mentorId: row.mentorId,
      mentorName,
      className,
      scheduledAt,
      durationMinutes: row.durationMinutes,
      meetingLink,
      notes: row.notes,
      reminderTime,
      notificationTone: row.notificationTone,
    });
  }

  return sessionsNeedingReminders;
}

/**
 * Get all group sessions that need reminders sent
 * Finds group sessions where:
 * - User has accepted the RSVP
 * - The reminder time has passed (scheduledAt - reminderMinutes <= now)
 * - The session hasn't started yet (scheduledAt > now)
 * - No reminder has been sent yet
 * - User has group session reminders enabled
 * - User has notifications enabled
 * - User is not in quiet hours
 */
export async function getGroupSessionsNeedingReminders(): Promise<GroupSessionReminderData[]> {
  const now = new Date();
  const currentTimeHHMM = formatTimeHHMM(now);

  // Query scheduled group sessions with accepted RSVPs
  const result = await db
    .select({
      sessionId: groupSessions.id,
      userId: groupSessionRsvps.userId,
      mentorId: groupSessions.mentorId,
      title: groupSessions.title,
      description: groupSessions.description,
      agenda: groupSessions.agenda,
      scheduledAt: groupSessions.scheduledAt,
      durationMinutes: groupSessions.durationMinutes,
      location: groupSessions.location,
      notificationsEnabled: notificationSettings.notificationsEnabled,
      groupSessionRemindersEnabled: notificationSettings.groupSessionRemindersEnabled,
      groupSessionReminderMinutes: notificationSettings.groupSessionReminderMinutes,
      notificationTone: notificationSettings.notificationTone,
      quietHoursEnabled: notificationSettings.quietHoursEnabled,
      quietHoursStart: notificationSettings.quietHoursStart,
      quietHoursEnd: notificationSettings.quietHoursEnd,
      pushOptedIn: notificationSettings.pushOptedIn,
    })
    .from(groupSessions)
    .innerJoin(groupSessionRsvps, eq(groupSessions.id, groupSessionRsvps.groupSessionId))
    .innerJoin(notificationSettings, eq(groupSessionRsvps.userId, notificationSettings.userId))
    .where(
      and(
        // Session is scheduled (not cancelled)
        eq(groupSessions.status, 'scheduled'),
        // User has accepted the invitation
        eq(groupSessionRsvps.status, 'accepted'),
        // Notifications enabled
        eq(notificationSettings.notificationsEnabled, true),
        // Group session reminders enabled
        eq(notificationSettings.groupSessionRemindersEnabled, true),
        // Push opted in
        eq(notificationSettings.pushOptedIn, true),
        // Scheduled time is in the future
        gte(groupSessions.scheduledAt, now)
      )
    );

  const sessionsNeedingReminders: GroupSessionReminderData[] = [];

  for (const row of result) {
    const scheduledAt = new Date(row.scheduledAt);
    const reminderMinutes = row.groupSessionReminderMinutes;
    const reminderTime = new Date(scheduledAt.getTime() - reminderMinutes * 60 * 1000);

    // Check if reminder time has passed
    if (reminderTime > now) {
      continue;
    }

    // Check quiet hours
    if (
      row.quietHoursEnabled &&
      isWithinQuietHours(currentTimeHHMM, row.quietHoursStart, row.quietHoursEnd)
    ) {
      continue;
    }

    // Check if reminder was already sent
    const existingReminder = await db
      .select({ id: sentReminders.id })
      .from(sentReminders)
      .where(
        and(
          eq(sentReminders.userId, row.userId),
          eq(sentReminders.reminderType, 'group_session'),
          eq(sentReminders.referenceId, row.sessionId)
        )
      )
      .limit(1);

    if (existingReminder.length > 0) {
      continue;
    }

    // Get mentor name
    const mentorResult = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, row.mentorId))
      .limit(1);

    const mentorName = mentorResult[0]?.name || null;

    sessionsNeedingReminders.push({
      sessionId: row.sessionId,
      userId: row.userId,
      mentorId: row.mentorId,
      mentorName,
      title: row.title,
      description: row.description,
      agenda: row.agenda,
      scheduledAt,
      durationMinutes: row.durationMinutes,
      location: row.location,
      reminderTime,
      notificationTone: row.notificationTone,
    });
  }

  return sessionsNeedingReminders;
}

/**
 * Extract meeting link from text (notes or location)
 * Looks for common meeting URL patterns
 */
function extractMeetingLink(text: string | null): string | null {
  if (!text) return null;

  // Common meeting URL patterns
  const patterns = [
    /https?:\/\/[^\s]*zoom[^\s]*/i,
    /https?:\/\/[^\s]*teams[^\s]*/i,
    /https?:\/\/[^\s]*meet\.google[^\s]*/i,
    /https?:\/\/[^\s]*webex[^\s]*/i,
    /https?:\/\/[^\s]*whereby[^\s]*/i,
    /https?:\/\/[^\s]*jit\.?si[^\s]*/i, // Jitsi (meet.jit.si)
    /https?:\/\/[^\s]+/i, // Fallback: any URL
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return null;
}

/**
 * Send a reminder notification for a 1:1 session
 */
export async function sendSessionReminder(
  reminder: SessionReminderData
): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
  // Get user's push subscriptions
  const subscriptions = await db
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, reminder.userId));

  if (subscriptions.length === 0) {
    return { success: false, sentCount: 0, failedCount: 0 };
  }

  // Format the session time
  const sessionTime = reminder.scheduledAt.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const sessionDate = reminder.scheduledAt.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  // Build notification body with session details
  const mentorInfo = reminder.mentorName ? `with ${reminder.mentorName}` : '';
  const classInfo = reminder.className ? ` (${reminder.className})` : '';
  const durationInfo = `${reminder.durationMinutes} min`;

  let body = `1:1 Session ${mentorInfo}${classInfo}\n${sessionDate} at ${sessionTime} (${durationInfo})`;

  if (reminder.meetingLink) {
    body += `\nJoin: ${reminder.meetingLink}`;
  }

  // Create notification payload
  const notificationPayload = {
    title: 'Session Reminder',
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: `session-reminder-${reminder.sessionId}`,
    data: {
      type: 'session_reminder',
      sessionId: reminder.sessionId,
      sessionType: '1:1',
      meetingLink: reminder.meetingLink,
      url: `/mentee/sessions/${reminder.sessionId}`,
      tone: reminder.notificationTone,
    },
    actions: [
      {
        action: 'join',
        title: reminder.meetingLink ? 'Join Session' : 'View Details',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  };

  // Send to all subscriptions
  const results = await Promise.all(
    subscriptions.map((sub) => sendPushNotification(sub, notificationPayload))
  );

  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;

  // If at least one notification was sent successfully, record it
  if (successCount > 0) {
    await db.insert(sentReminders).values({
      userId: reminder.userId,
      reminderType: 'session',
      referenceId: reminder.sessionId,
      tonePlayed: reminder.notificationTone as 'default' | 'gentle' | 'chime' | 'alert' | 'silent',
    });
  }

  return { success: successCount > 0, sentCount: successCount, failedCount };
}

/**
 * Send a reminder notification for a group session
 */
export async function sendGroupSessionReminder(
  reminder: GroupSessionReminderData
): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
  // Get user's push subscriptions
  const subscriptions = await db
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, reminder.userId));

  if (subscriptions.length === 0) {
    return { success: false, sentCount: 0, failedCount: 0 };
  }

  // Format the session time
  const sessionTime = reminder.scheduledAt.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const sessionDate = reminder.scheduledAt.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  // Build notification body with session details
  const mentorInfo = reminder.mentorName ? `with ${reminder.mentorName}` : '';
  const durationInfo = `${reminder.durationMinutes} min`;

  let body = `${reminder.title} ${mentorInfo}\n${sessionDate} at ${sessionTime} (${durationInfo})`;

  // Add meeting link from location if present
  const meetingLink = extractMeetingLink(reminder.location);
  if (meetingLink) {
    body += `\nJoin: ${meetingLink}`;
  } else if (reminder.location) {
    body += `\nLocation: ${reminder.location}`;
  }

  // Create notification payload
  const notificationPayload = {
    title: 'Group Session Reminder',
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: `group-session-reminder-${reminder.sessionId}`,
    data: {
      type: 'group_session_reminder',
      sessionId: reminder.sessionId,
      sessionType: 'group',
      meetingLink,
      url: `/mentee/group-sessions/${reminder.sessionId}`,
      tone: reminder.notificationTone,
    },
    actions: [
      {
        action: 'join',
        title: meetingLink ? 'Join Session' : 'View Details',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  };

  // Send to all subscriptions
  const results = await Promise.all(
    subscriptions.map((sub) => sendPushNotification(sub, notificationPayload))
  );

  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;

  // If at least one notification was sent successfully, record it
  if (successCount > 0) {
    await db.insert(sentReminders).values({
      userId: reminder.userId,
      reminderType: 'group_session',
      referenceId: reminder.sessionId,
      tonePlayed: reminder.notificationTone as 'default' | 'gentle' | 'chime' | 'alert' | 'silent',
    });
  }

  return { success: successCount > 0, sentCount: successCount, failedCount };
}

/**
 * Process all pending 1:1 session reminders
 */
export async function processSessionReminders(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const reminders = await getSessionsNeedingReminders();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of reminders) {
    const result = await sendSessionReminder(reminder);
    if (result.success) {
      sent++;
    } else if (result.sentCount === 0 && result.failedCount === 0) {
      skipped++;
    } else {
      failed++;
    }
  }

  return {
    processed: reminders.length,
    sent,
    failed,
    skipped,
  };
}

/**
 * Process all pending group session reminders
 */
export async function processGroupSessionReminders(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const reminders = await getGroupSessionsNeedingReminders();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of reminders) {
    const result = await sendGroupSessionReminder(reminder);
    if (result.success) {
      sent++;
    } else if (result.sentCount === 0 && result.failedCount === 0) {
      skipped++;
    } else {
      failed++;
    }
  }

  return {
    processed: reminders.length,
    sent,
    failed,
    skipped,
  };
}

/**
 * Process all session reminders (both 1:1 and group)
 * This is the main function to be called by the scheduler
 */
export async function processAllSessionReminders(): Promise<{
  sessions: { processed: number; sent: number; failed: number; skipped: number };
  groupSessions: { processed: number; sent: number; failed: number; skipped: number };
}> {
  const [sessionResults, groupSessionResults] = await Promise.all([
    processSessionReminders(),
    processGroupSessionReminders(),
  ]);

  return {
    sessions: sessionResults,
    groupSessions: groupSessionResults,
  };
}
