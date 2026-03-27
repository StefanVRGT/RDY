import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  scheduledExercises,
  exercises,
  pushSubscriptions,
  notificationSettings,
  sentReminders,
} from '@/lib/db/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { sendPushNotification } from '@/lib/web-push/send';

/**
 * Cron endpoint: sends push notifications for exercises scheduled in the next 15 minutes.
 * Call every 5 minutes via an external cron job.
 * Protected by CRON_SECRET env var.
 */
export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  const apiKey =
    request.headers.get('x-cron-secret') ||
    request.headers.get('x-api-key') ||
    request.nextUrl.searchParams.get('secret');

  if (cronSecret && apiKey !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

    // Find all incomplete exercises scheduled in the next 15 minutes
    const upcomingExercises = await db
      .select({
        id: scheduledExercises.id,
        userId: scheduledExercises.userId,
        exerciseId: scheduledExercises.exerciseId,
        scheduledAt: scheduledExercises.scheduledAt,
      })
      .from(scheduledExercises)
      .where(
        and(
          eq(scheduledExercises.completed, false),
          gte(scheduledExercises.scheduledAt, now),
          lte(scheduledExercises.scheduledAt, fifteenMinutesFromNow)
        )
      );

    if (upcomingExercises.length === 0) {
      return NextResponse.json({
        success: true,
        timestamp: now.toISOString(),
        notificationsSent: 0,
      });
    }

    // Get exercise details
    const exerciseIds = Array.from(new Set(upcomingExercises.map((e) => e.exerciseId)));
    const exercisesData = await db
      .select({ id: exercises.id, titleDe: exercises.titleDe })
      .from(exercises)
      .where(inArray(exercises.id, exerciseIds));
    const exercisesMap = Object.fromEntries(exercisesData.map((e) => [e.id, e]));

    // Get unique user IDs
    const userIds = Array.from(new Set(upcomingExercises.map((e) => e.userId)));

    // Get push subscriptions for all affected users
    const subscriptions = await db
      .select({
        userId: pushSubscriptions.userId,
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
      })
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, userIds));

    // Group subscriptions by userId
    const subsByUser: Record<string, typeof subscriptions> = {};
    for (const sub of subscriptions) {
      if (!subsByUser[sub.userId]) subsByUser[sub.userId] = [];
      subsByUser[sub.userId].push(sub);
    }

    // Get notification settings for users (to check if reminders enabled)
    const settings = await db
      .select({
        userId: notificationSettings.userId,
        exerciseRemindersEnabled: notificationSettings.exerciseRemindersEnabled,
        notificationsEnabled: notificationSettings.notificationsEnabled,
        notificationTone: notificationSettings.notificationTone,
      })
      .from(notificationSettings)
      .where(inArray(notificationSettings.userId, userIds));

    const settingsByUser = Object.fromEntries(settings.map((s) => [s.userId, s]));

    // Check already sent reminders to avoid duplicates
    const schedExIds = upcomingExercises.map((e) => e.id);
    const alreadySent = await db
      .select({ referenceId: sentReminders.referenceId, userId: sentReminders.userId })
      .from(sentReminders)
      .where(
        and(
          eq(sentReminders.reminderType, 'exercise'),
          inArray(sentReminders.referenceId, schedExIds)
        )
      );
    const sentSet = new Set(alreadySent.map((s) => `${s.userId}:${s.referenceId}`));

    let notificationsSent = 0;

    for (const se of upcomingExercises) {
      const key = `${se.userId}:${se.id}`;
      if (sentSet.has(key)) continue; // Already sent

      const userSettings = settingsByUser[se.userId];
      // Skip if user disabled notifications or exercise reminders
      if (userSettings?.notificationsEnabled === false) continue;
      if (userSettings?.exerciseRemindersEnabled === false) continue;

      const userSubs = subsByUser[se.userId];
      if (!userSubs || userSubs.length === 0) continue;

      const exerciseTitle = exercisesMap[se.exerciseId]?.titleDe || 'Exercise';
      const tone = userSettings?.notificationTone || 'default';

      // Send to all of the user's subscriptions
      for (const sub of userSubs) {
        await sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          {
            title: 'RDY',
            body: `Zeit f\u00fcr deine Exercise: ${exerciseTitle}`,
            icon: '/icons/icon.svg',
            tag: `exercise-reminder-${se.id}`,
            data: {
              url: `/mentee/exercise/${se.id}`,
              tone,
            },
          }
        );
      }

      // Record that we sent this reminder
      await db.insert(sentReminders).values({
        userId: se.userId,
        reminderType: 'exercise',
        referenceId: se.id,
        tonePlayed: tone as 'default' | 'gentle' | 'chime' | 'alert' | 'silent',
      });

      notificationsSent++;
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      notificationsSent,
      exercisesChecked: upcomingExercises.length,
    });
  } catch (error) {
    console.error('Error processing exercise reminder cron:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST
export async function POST(request: NextRequest) {
  return GET(request);
}
