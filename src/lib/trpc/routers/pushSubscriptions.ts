import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { pushSubscriptions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * Push subscription input schema
 */
const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  userAgent: z.string().optional(),
});

/**
 * Push subscriptions router for managing Web Push API subscriptions
 */
export const pushSubscriptionsRouter = router({
  /**
   * Subscribe - save a push subscription for the current user
   */
  subscribe: protectedProcedure
    .input(subscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if subscription already exists for this endpoint
      const existingSubscription = await ctx.db.query.pushSubscriptions.findFirst({
        where: eq(pushSubscriptions.endpoint, input.endpoint),
      });

      if (existingSubscription) {
        // Update existing subscription (might be from same user or different)
        if (existingSubscription.userId === userId) {
          // Same user, just update keys in case they changed
          await ctx.db
            .update(pushSubscriptions)
            .set({
              p256dh: input.keys.p256dh,
              auth: input.keys.auth,
              expirationTime: input.expirationTime
                ? new Date(input.expirationTime)
                : null,
              userAgent: input.userAgent,
              updatedAt: new Date(),
            })
            .where(eq(pushSubscriptions.id, existingSubscription.id));

          return { id: existingSubscription.id, status: 'updated' };
        } else {
          // Different user - reassign subscription to new user
          await ctx.db
            .update(pushSubscriptions)
            .set({
              userId,
              p256dh: input.keys.p256dh,
              auth: input.keys.auth,
              expirationTime: input.expirationTime
                ? new Date(input.expirationTime)
                : null,
              userAgent: input.userAgent,
              updatedAt: new Date(),
            })
            .where(eq(pushSubscriptions.id, existingSubscription.id));

          return { id: existingSubscription.id, status: 'reassigned' };
        }
      }

      // Create new subscription
      const [subscription] = await ctx.db
        .insert(pushSubscriptions)
        .values({
          userId,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          expirationTime: input.expirationTime
            ? new Date(input.expirationTime)
            : null,
          userAgent: input.userAgent,
        })
        .returning({ id: pushSubscriptions.id });

      return { id: subscription.id, status: 'created' };
    }),

  /**
   * Unsubscribe - remove a push subscription
   */
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const result = await ctx.db
        .delete(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.endpoint, input.endpoint),
            eq(pushSubscriptions.userId, userId)
          )
        )
        .returning({ id: pushSubscriptions.id });

      if (result.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Subscription not found',
        });
      }

      return { success: true };
    }),

  /**
   * Get current user's subscriptions
   */
  getMySubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const subscriptions = await ctx.db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userId, userId),
      columns: {
        id: true,
        endpoint: true,
        expirationTime: true,
        userAgent: true,
        createdAt: true,
      },
    });

    return subscriptions;
  }),

  /**
   * Check if a specific endpoint is subscribed
   */
  isSubscribed: protectedProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const subscription = await ctx.db.query.pushSubscriptions.findFirst({
        where: and(
          eq(pushSubscriptions.endpoint, input.endpoint),
          eq(pushSubscriptions.userId, userId)
        ),
      });

      return { subscribed: !!subscription };
    }),
});
