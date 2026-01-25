import { db } from '@/lib/db';
import {
  scheduledExercises,
  exercises,
  notificationSettings,
  pushSubscriptions,
  sentReminders,
} from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { sendPushNotification } from '@/lib/web-push/send';

/**
 * Check if a time is within quiet hours
 * @param currentTime - Current time as HH:MM string
 * @param quietStart - Quiet hours start time as HH:MM string
 * @param quietEnd - Quiet hours end time as HH:MM string
 * @returns true if currently in quiet hours
 */
export function isWithinQuietHours(
  currentTime: string,
  quietStart: string | null,
  quietEnd: string | null
): boolean {
  if (!quietStart || !quietEnd) {
    return false;
  }

  const current = timeToMinutes(currentTime);
  const start = timeToMinutes(quietStart);
  const end = timeToMinutes(quietEnd);

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (start > end) {
    // Quiet hours span midnight
    return current >= start || current < end;
  } else {
    // Normal range (e.g., 13:00 - 15:00)
    return current >= start && current < end;
  }
}

/**
 * Convert HH:MM time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format time as HH:MM string
 */
function formatTimeHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Interface for exercise reminder data
 */
export interface ExerciseReminderData {
  scheduledExerciseId: string;
  userId: string;
  exerciseId: string;
  exerciseTitleDe: string;
  exerciseTitleEn: string | null;
  scheduledAt: Date;
  reminderTime: Date;
  notificationTone: string;
}

/**
 * Get all exercises that need reminders sent
 * Finds scheduled exercises where:
 * - The reminder time has passed (scheduledAt - reminderMinutes <= now)
 * - The exercise hasn't started yet (scheduledAt > now)
 * - No reminder has been sent yet
 * - User has exercise reminders enabled
 * - User has notifications enabled
 * - User is not in quiet hours
 */
export async function getExercisesNeedingReminders(): Promise<ExerciseReminderData[]> {
  const now = new Date();
  const currentTimeHHMM = formatTimeHHMM(now);

  // Query scheduled exercises that need reminders
  // We'll filter for exercises where:
  // scheduledAt - reminderMinutes <= now AND scheduledAt > now
  const result = await db
    .select({
      scheduledExerciseId: scheduledExercises.id,
      userId: scheduledExercises.userId,
      exerciseId: scheduledExercises.exerciseId,
      exerciseTitleDe: exercises.titleDe,
      exerciseTitleEn: exercises.titleEn,
      scheduledAt: scheduledExercises.scheduledAt,
      completed: scheduledExercises.completed,
      notificationsEnabled: notificationSettings.notificationsEnabled,
      exerciseRemindersEnabled: notificationSettings.exerciseRemindersEnabled,
      exerciseReminderMinutes: notificationSettings.exerciseReminderMinutes,
      notificationTone: notificationSettings.notificationTone,
      quietHoursEnabled: notificationSettings.quietHoursEnabled,
      quietHoursStart: notificationSettings.quietHoursStart,
      quietHoursEnd: notificationSettings.quietHoursEnd,
      pushOptedIn: notificationSettings.pushOptedIn,
    })
    .from(scheduledExercises)
    .innerJoin(exercises, eq(scheduledExercises.exerciseId, exercises.id))
    .innerJoin(notificationSettings, eq(scheduledExercises.userId, notificationSettings.userId))
    .where(
      and(
        // Exercise not completed
        eq(scheduledExercises.completed, false),
        // Notifications enabled
        eq(notificationSettings.notificationsEnabled, true),
        // Exercise reminders enabled
        eq(notificationSettings.exerciseRemindersEnabled, true),
        // Push opted in
        eq(notificationSettings.pushOptedIn, true),
        // Scheduled time is in the future
        gte(scheduledExercises.scheduledAt, now)
      )
    );

  // Filter by reminder time and quiet hours in application logic
  const exercisesNeedingReminders: ExerciseReminderData[] = [];

  for (const row of result) {
    const scheduledAt = new Date(row.scheduledAt);
    const reminderMinutes = row.exerciseReminderMinutes;
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
          eq(sentReminders.reminderType, 'exercise'),
          eq(sentReminders.referenceId, row.scheduledExerciseId)
        )
      )
      .limit(1);

    if (existingReminder.length > 0) {
      continue;
    }

    exercisesNeedingReminders.push({
      scheduledExerciseId: row.scheduledExerciseId,
      userId: row.userId,
      exerciseId: row.exerciseId,
      exerciseTitleDe: row.exerciseTitleDe,
      exerciseTitleEn: row.exerciseTitleEn,
      scheduledAt: scheduledAt,
      reminderTime: reminderTime,
      notificationTone: row.notificationTone,
    });
  }

  return exercisesNeedingReminders;
}

/**
 * Send a reminder notification for an exercise
 */
export async function sendExerciseReminder(
  reminder: ExerciseReminderData
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

  // Format the exercise time
  const exerciseTime = reminder.scheduledAt.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Use German title as default (with English fallback)
  const exerciseTitle = reminder.exerciseTitleDe || reminder.exerciseTitleEn || 'Exercise';

  // Create notification payload
  const notificationPayload = {
    title: 'Exercise Reminder',
    body: `${exerciseTitle} scheduled for ${exerciseTime}`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: `exercise-reminder-${reminder.scheduledExerciseId}`,
    data: {
      type: 'exercise_reminder',
      exerciseId: reminder.exerciseId,
      scheduledExerciseId: reminder.scheduledExerciseId,
      // Deep link to the exercise
      url: `/mentee/exercise/${reminder.exerciseId}`,
      tone: reminder.notificationTone,
    },
    actions: [
      {
        action: 'view',
        title: 'View Exercise',
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
      reminderType: 'exercise',
      referenceId: reminder.scheduledExerciseId,
      tonePlayed: reminder.notificationTone as 'default' | 'gentle' | 'chime' | 'alert' | 'silent',
    });
  }

  return { success: successCount > 0, sentCount: successCount, failedCount };
}

/**
 * Process all pending exercise reminders
 * This is the main function to be called by the scheduler
 */
export async function processExerciseReminders(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const reminders = await getExercisesNeedingReminders();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of reminders) {
    const result = await sendExerciseReminder(reminder);
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
