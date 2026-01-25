import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { patternEntries, users } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * Mentee middleware - ensures user has mentee role and extracts mentee user info
 */
const menteeProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const userRoles = ctx.session.user.roles || [];

  // Allow mentee, mentor, admin, and superadmin to access mentee views
  if (
    !userRoles.includes('mentee') &&
    !userRoles.includes('mentor') &&
    !userRoles.includes('admin') &&
    !userRoles.includes('superadmin')
  ) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
  }

  const [menteeUser] = await ctx.db
    .select({ id: users.id, tenantId: users.tenantId })
    .from(users)
    .where(eq(users.email, ctx.session.user.email))
    .limit(1);

  if (!menteeUser) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'User not found',
    });
  }

  return next({
    ctx: {
      ...ctx,
      tenantId: menteeUser.tenantId,
      userId: menteeUser.id,
    },
  });
});

// Pattern types available for tracking
const patternTypes = ['stress', 'energy', 'mood', 'focus', 'anxiety', 'motivation'] as const;
const intensityLevels = ['strong', 'weak', 'none'] as const;

export const patternsRouter = router({
  /**
   * Get pattern entries for a specific date
   * Returns all patterns for each hour of the day
   */
  getEntriesForDate: menteeProcedure
    .input(
      z.object({
        date: z.string().datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      const targetDate = new Date(input.date);
      const startOfDay = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate()
      );
      const endOfDay = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        23,
        59,
        59,
        999
      );

      const entries = await ctx.db
        .select({
          id: patternEntries.id,
          entryDate: patternEntries.entryDate,
          hour: patternEntries.hour,
          patternType: patternEntries.patternType,
          intensity: patternEntries.intensity,
          notes: patternEntries.notes,
          createdAt: patternEntries.createdAt,
          updatedAt: patternEntries.updatedAt,
        })
        .from(patternEntries)
        .where(
          and(
            eq(patternEntries.userId, ctx.userId),
            gte(patternEntries.entryDate, startOfDay),
            lte(patternEntries.entryDate, endOfDay)
          )
        )
        .orderBy(asc(patternEntries.hour), asc(patternEntries.patternType));

      return {
        entries,
        date: input.date,
      };
    }),

  /**
   * Get pattern entries for a date range
   * Useful for weekly/monthly views
   */
  getEntriesForRange: menteeProcedure
    .input(
      z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
        patternType: z.enum(patternTypes).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);

      const conditions = [
        eq(patternEntries.userId, ctx.userId),
        gte(patternEntries.entryDate, start),
        lte(patternEntries.entryDate, end),
      ];

      if (input.patternType) {
        conditions.push(eq(patternEntries.patternType, input.patternType));
      }

      const entries = await ctx.db
        .select({
          id: patternEntries.id,
          entryDate: patternEntries.entryDate,
          hour: patternEntries.hour,
          patternType: patternEntries.patternType,
          intensity: patternEntries.intensity,
          notes: patternEntries.notes,
          createdAt: patternEntries.createdAt,
          updatedAt: patternEntries.updatedAt,
        })
        .from(patternEntries)
        .where(and(...conditions))
        .orderBy(desc(patternEntries.entryDate), asc(patternEntries.hour));

      return entries;
    }),

  /**
   * Create or update a pattern entry for a specific hour
   * Uses upsert logic based on unique constraint
   */
  upsertEntry: menteeProcedure
    .input(
      z.object({
        date: z.string().datetime(),
        hour: z.number().int().min(0).max(23),
        patternType: z.enum(patternTypes),
        intensity: z.enum(intensityLevels),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entryDate = new Date(input.date);
      // Normalize to start of day for consistent storage
      const normalizedDate = new Date(
        entryDate.getFullYear(),
        entryDate.getMonth(),
        entryDate.getDate()
      );

      // Check if entry already exists
      const [existing] = await ctx.db
        .select({ id: patternEntries.id })
        .from(patternEntries)
        .where(
          and(
            eq(patternEntries.userId, ctx.userId),
            eq(patternEntries.entryDate, normalizedDate),
            eq(patternEntries.hour, input.hour),
            eq(patternEntries.patternType, input.patternType)
          )
        )
        .limit(1);

      if (existing) {
        // Update existing entry
        const [updated] = await ctx.db
          .update(patternEntries)
          .set({
            intensity: input.intensity,
            notes: input.notes,
            updatedAt: new Date(),
          })
          .where(eq(patternEntries.id, existing.id))
          .returning();

        return updated;
      } else {
        // Create new entry
        const [created] = await ctx.db
          .insert(patternEntries)
          .values({
            userId: ctx.userId,
            entryDate: normalizedDate,
            hour: input.hour,
            patternType: input.patternType,
            intensity: input.intensity,
            notes: input.notes,
          })
          .returning();

        return created;
      }
    }),

  /**
   * Bulk update pattern entries for multiple hours
   * Useful for quick entry via the time grid
   */
  bulkUpsertEntries: menteeProcedure
    .input(
      z.object({
        date: z.string().datetime(),
        patternType: z.enum(patternTypes),
        entries: z.array(
          z.object({
            hour: z.number().int().min(0).max(23),
            intensity: z.enum(intensityLevels),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entryDate = new Date(input.date);
      const normalizedDate = new Date(
        entryDate.getFullYear(),
        entryDate.getMonth(),
        entryDate.getDate()
      );

      const results = [];

      for (const entry of input.entries) {
        // Check if entry already exists
        const [existing] = await ctx.db
          .select({ id: patternEntries.id })
          .from(patternEntries)
          .where(
            and(
              eq(patternEntries.userId, ctx.userId),
              eq(patternEntries.entryDate, normalizedDate),
              eq(patternEntries.hour, entry.hour),
              eq(patternEntries.patternType, input.patternType)
            )
          )
          .limit(1);

        if (existing) {
          const [updated] = await ctx.db
            .update(patternEntries)
            .set({
              intensity: entry.intensity,
              notes: entry.notes,
              updatedAt: new Date(),
            })
            .where(eq(patternEntries.id, existing.id))
            .returning();
          results.push(updated);
        } else {
          const [created] = await ctx.db
            .insert(patternEntries)
            .values({
              userId: ctx.userId,
              entryDate: normalizedDate,
              hour: entry.hour,
              patternType: input.patternType,
              intensity: entry.intensity,
              notes: entry.notes,
            })
            .returning();
          results.push(created);
        }
      }

      return results;
    }),

  /**
   * Delete a pattern entry
   */
  deleteEntry: menteeProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const [existing] = await ctx.db
        .select({ id: patternEntries.id })
        .from(patternEntries)
        .where(
          and(
            eq(patternEntries.id, input.id),
            eq(patternEntries.userId, ctx.userId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Pattern entry not found',
        });
      }

      await ctx.db
        .delete(patternEntries)
        .where(eq(patternEntries.id, input.id));

      return { success: true };
    }),

  /**
   * Get daily summary for a date
   * Returns aggregated data about patterns for that day
   */
  getDailySummary: menteeProcedure
    .input(
      z.object({
        date: z.string().datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      const targetDate = new Date(input.date);
      const startOfDay = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate()
      );
      const endOfDay = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        23,
        59,
        59,
        999
      );

      const entries = await ctx.db
        .select({
          patternType: patternEntries.patternType,
          intensity: patternEntries.intensity,
          hour: patternEntries.hour,
        })
        .from(patternEntries)
        .where(
          and(
            eq(patternEntries.userId, ctx.userId),
            gte(patternEntries.entryDate, startOfDay),
            lte(patternEntries.entryDate, endOfDay)
          )
        );

      // Aggregate by pattern type
      const summary: Record<
        string,
        { total: number; strong: number; weak: number; none: number; hours: number[] }
      > = {};

      for (const type of patternTypes) {
        summary[type] = { total: 0, strong: 0, weak: 0, none: 0, hours: [] };
      }

      for (const entry of entries) {
        const s = summary[entry.patternType];
        if (s) {
          s.total++;
          s[entry.intensity]++;
          s.hours.push(entry.hour);
        }
      }

      return {
        date: input.date,
        summary,
        totalEntries: entries.length,
      };
    }),

  /**
   * Get available pattern types
   */
  getPatternTypes: menteeProcedure.query(() => {
    return patternTypes.map(type => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
    }));
  }),

  /**
   * Get intensity levels
   */
  getIntensityLevels: menteeProcedure.query(() => {
    return intensityLevels.map(level => ({
      value: level,
      label: level.charAt(0).toUpperCase() + level.slice(1),
    }));
  }),
});
