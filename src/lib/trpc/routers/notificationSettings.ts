import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { notificationSettings, users, pushSubscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { sendPushNotification } from '@/lib/web-push/send';

// Valid notification tone values
const notificationToneValues = ['default', 'gentle', 'chime', 'alert', 'silent'] as const;

// Time format regex for HH:MM
const timeFormatRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

// Schema for updating notification settings
const updateSettingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  exerciseRemindersEnabled: z.boolean().optional(),
  sessionRemindersEnabled: z.boolean().optional(),
  groupSessionRemindersEnabled: z.boolean().optional(),
  dailySummaryEnabled: z.boolean().optional(),
  exerciseReminderMinutes: z.number().int().min(5).max(120).optional(),
  sessionReminderMinutes: z.number().int().min(5).max(120).optional(),
  groupSessionReminderMinutes: z.number().int().min(5).max(120).optional(),
  notificationTone: z.enum(notificationToneValues).optional(),
  pushOptedIn: z.boolean().optional(),
  // Quiet hours settings
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(timeFormatRegex, 'Invalid time format (HH:MM)').nullable().optional(),
  quietHoursEnd: z.string().regex(timeFormatRegex, 'Invalid time format (HH:MM)').nullable().optional(),
});

/**
 * Notification Settings Router
 * Handles user notification preferences management
 */
export const notificationSettingsRouter = router({
  /**
   * Get current user's notification settings
   * Creates default settings if none exist
   */
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    // Get user ID from session email
    const [user] = await ctx.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, ctx.session.user.email))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // Try to get existing settings
    const [existingSettings] = await ctx.db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, user.id))
      .limit(1);

    if (existingSettings) {
      return existingSettings;
    }

    // Create default settings if none exist
    const [newSettings] = await ctx.db
      .insert(notificationSettings)
      .values({
        userId: user.id,
      })
      .returning();

    return newSettings;
  }),

  /**
   * Update notification settings
   */
  updateSettings: protectedProcedure
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      // Get user ID from session email
      const [user] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, ctx.session.user.email))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Check if settings exist
      const [existingSettings] = await ctx.db
        .select({ id: notificationSettings.id })
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, user.id))
        .limit(1);

      if (existingSettings) {
        // Update existing settings
        const [updated] = await ctx.db
          .update(notificationSettings)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(notificationSettings.userId, user.id))
          .returning();

        return updated;
      } else {
        // Create new settings with provided values
        const [newSettings] = await ctx.db
          .insert(notificationSettings)
          .values({
            userId: user.id,
            ...input,
          })
          .returning();

        return newSettings;
      }
    }),

  /**
   * Send a test notification to the user
   */
  sendTestNotification: protectedProcedure.mutation(async ({ ctx }) => {
    // Get user ID from session email
    const [user] = await ctx.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, ctx.session.user.email))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // Get user's push subscriptions
    const subscriptions = await ctx.db
      .select({
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
      })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, user.id));

    if (subscriptions.length === 0) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'No push subscriptions found. Please enable push notifications first.',
      });
    }

    // Send test notification to all subscriptions
    const results = await Promise.all(
      subscriptions.map((sub) =>
        sendPushNotification(sub, {
          title: 'Test Notification',
          body: 'This is a test notification from RDY. Your notifications are working correctly!',
          icon: '/icons/icon-192x192.png',
          tag: 'test-notification',
          data: {
            type: 'test',
            timestamp: new Date().toISOString(),
          },
        })
      )
    );

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return {
      success: successCount > 0,
      successCount,
      failedCount,
      message:
        successCount > 0
          ? `Test notification sent successfully to ${successCount} device(s).`
          : 'Failed to send test notification. Please try re-enabling push notifications.',
    };
  }),

  /**
   * Update push opt-in status
   */
  updatePushOptIn: protectedProcedure
    .input(z.object({ optedIn: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      // Get user ID from session email
      const [user] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, ctx.session.user.email))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Check if settings exist
      const [existingSettings] = await ctx.db
        .select({ id: notificationSettings.id })
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, user.id))
        .limit(1);

      if (existingSettings) {
        const [updated] = await ctx.db
          .update(notificationSettings)
          .set({
            pushOptedIn: input.optedIn,
            updatedAt: new Date(),
          })
          .where(eq(notificationSettings.userId, user.id))
          .returning();

        return updated;
      } else {
        const [newSettings] = await ctx.db
          .insert(notificationSettings)
          .values({
            userId: user.id,
            pushOptedIn: input.optedIn,
          })
          .returning();

        return newSettings;
      }
    }),
});
