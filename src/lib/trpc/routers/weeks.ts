import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { weeks, schwerpunktebenen, users } from '@/lib/db/schema';
import { eq, and, count, asc, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// Input validation schemas
const createWeekSchema = z.object({
  schwerpunktebeneId: z.string().uuid(),
  weekNumber: z.string().min(1).max(2),
  titleDe: z.string().min(1, 'German title is required').max(255),
  titleEn: z.string().max(255).optional().nullable(),
  descriptionDe: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  herkunftDe: z.string().optional().nullable(),
  herkunftEn: z.string().optional().nullable(),
  zielDe: z.string().optional().nullable(),
  zielEn: z.string().optional().nullable(),
  measurementType: z
    .enum(['scale_1_10', 'yes_no', 'frequency', 'percentage', 'custom'])
    .optional()
    .default('scale_1_10'),
  measurementQuestionDe: z.string().optional().nullable(),
  measurementQuestionEn: z.string().optional().nullable(),
});

const updateWeekSchema = z.object({
  id: z.string().uuid(),
  weekNumber: z.string().min(1).max(2).optional(),
  titleDe: z.string().min(1).max(255).optional(),
  titleEn: z.string().max(255).optional().nullable(),
  descriptionDe: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  herkunftDe: z.string().optional().nullable(),
  herkunftEn: z.string().optional().nullable(),
  zielDe: z.string().optional().nullable(),
  zielEn: z.string().optional().nullable(),
  measurementType: z
    .enum(['scale_1_10', 'yes_no', 'frequency', 'percentage', 'custom'])
    .optional(),
  measurementQuestionDe: z.string().optional().nullable(),
  measurementQuestionEn: z.string().optional().nullable(),
});

const listWeeksSchema = z.object({
  schwerpunktebeneId: z.string().uuid(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

const weekIdSchema = z.object({
  id: z.string().uuid(),
});

const reorderWeeksSchema = z.object({
  schwerpunktebeneId: z.string().uuid(),
  weekIds: z.array(z.string().uuid()).min(1),
});

/**
 * Admin middleware - ensures user has admin role and extracts tenantId
 */
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const userRoles = ctx.session.user.roles || [];

  if (userRoles.includes('superadmin') && !userRoles.includes('admin')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Superadmins must use the superadmin interface',
    });
  }

  if (!userRoles.includes('admin') && !userRoles.includes('superadmin')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }

  const [adminUser] = await ctx.db
    .select({ id: users.id, tenantId: users.tenantId })
    .from(users)
    .where(eq(users.email, ctx.session.user.email))
    .limit(1);

  if (!adminUser?.tenantId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin user must be associated with a tenant',
    });
  }

  return next({
    ctx: {
      ...ctx,
      tenantId: adminUser.tenantId,
      adminUserId: adminUser.id,
    },
  });
});

export const weeksRouter = router({
  /**
   * List weeks for a schwerpunktebene with pagination
   */
  list: adminProcedure.input(listWeeksSchema).query(async ({ ctx, input }) => {
    const { schwerpunktebeneId, page, limit } = input;
    const offset = (page - 1) * limit;

    // Verify schwerpunktebene belongs to tenant
    const [parentSchwerpunktebene] = await ctx.db
      .select()
      .from(schwerpunktebenen)
      .where(
        and(
          eq(schwerpunktebenen.id, schwerpunktebeneId),
          eq(schwerpunktebenen.tenantId, ctx.tenantId)
        )
      )
      .limit(1);

    if (!parentSchwerpunktebene) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Focus area not found' });
    }

    const [weeksList, totalCount] = await Promise.all([
      ctx.db
        .select()
        .from(weeks)
        .where(eq(weeks.schwerpunktebeneId, schwerpunktebeneId))
        .orderBy(asc(weeks.orderIndex), asc(weeks.weekNumber))
        .limit(limit)
        .offset(offset),
      ctx.db
        .select({ count: count() })
        .from(weeks)
        .where(eq(weeks.schwerpunktebeneId, schwerpunktebeneId))
        .then((result) => result[0]?.count ?? 0),
    ]);

    return {
      weeks: weeksList,
      schwerpunktebene: parentSchwerpunktebene,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
      },
    };
  }),

  /**
   * Get a week by ID
   */
  getById: adminProcedure.input(weekIdSchema).query(async ({ ctx, input }) => {
    const [week] = await ctx.db
      .select({
        week: weeks,
        schwerpunktebene: schwerpunktebenen,
      })
      .from(weeks)
      .innerJoin(schwerpunktebenen, eq(weeks.schwerpunktebeneId, schwerpunktebenen.id))
      .where(and(eq(weeks.id, input.id), eq(schwerpunktebenen.tenantId, ctx.tenantId)))
      .limit(1);

    if (!week) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Week not found' });
    }

    return week;
  }),

  /**
   * Create a new week
   */
  create: adminProcedure.input(createWeekSchema).mutation(async ({ ctx, input }) => {
    // Verify schwerpunktebene belongs to tenant
    const [parentSchwerpunktebene] = await ctx.db
      .select()
      .from(schwerpunktebenen)
      .where(
        and(
          eq(schwerpunktebenen.id, input.schwerpunktebeneId),
          eq(schwerpunktebenen.tenantId, ctx.tenantId)
        )
      )
      .limit(1);

    if (!parentSchwerpunktebene) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Focus area not found' });
    }

    // Get the current max order index
    const existingWeeks = await ctx.db
      .select({ orderIndex: weeks.orderIndex })
      .from(weeks)
      .where(eq(weeks.schwerpunktebeneId, input.schwerpunktebeneId))
      .orderBy(asc(weeks.orderIndex));

    const maxOrderIndex = existingWeeks.length > 0
      ? Math.max(...existingWeeks.map(w => parseInt(w.orderIndex, 10)))
      : -1;

    const [newWeek] = await ctx.db
      .insert(weeks)
      .values({
        schwerpunktebeneId: input.schwerpunktebeneId,
        weekNumber: input.weekNumber,
        orderIndex: String(maxOrderIndex + 1),
        titleDe: input.titleDe,
        titleEn: input.titleEn,
        descriptionDe: input.descriptionDe,
        descriptionEn: input.descriptionEn,
        herkunftDe: input.herkunftDe,
        herkunftEn: input.herkunftEn,
        zielDe: input.zielDe,
        zielEn: input.zielEn,
        measurementType: input.measurementType,
        measurementQuestionDe: input.measurementQuestionDe,
        measurementQuestionEn: input.measurementQuestionEn,
      })
      .returning();

    return newWeek;
  }),

  /**
   * Update a week
   */
  update: adminProcedure.input(updateWeekSchema).mutation(async ({ ctx, input }) => {
    const { id, ...updateData } = input;

    // Check if week exists and belongs to tenant's schwerpunktebene
    const [existing] = await ctx.db
      .select({
        week: weeks,
        schwerpunktebene: schwerpunktebenen,
      })
      .from(weeks)
      .innerJoin(schwerpunktebenen, eq(weeks.schwerpunktebeneId, schwerpunktebenen.id))
      .where(and(eq(weeks.id, id), eq(schwerpunktebenen.tenantId, ctx.tenantId)))
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Week not found' });
    }

    const [updatedWeek] = await ctx.db
      .update(weeks)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(weeks.id, id))
      .returning();

    return updatedWeek;
  }),

  /**
   * Delete a week
   */
  delete: adminProcedure.input(weekIdSchema).mutation(async ({ ctx, input }) => {
    const { id } = input;

    // Check if week exists and belongs to tenant's schwerpunktebene
    const [existing] = await ctx.db
      .select({
        week: weeks,
        schwerpunktebene: schwerpunktebenen,
      })
      .from(weeks)
      .innerJoin(schwerpunktebenen, eq(weeks.schwerpunktebeneId, schwerpunktebenen.id))
      .where(and(eq(weeks.id, id), eq(schwerpunktebenen.tenantId, ctx.tenantId)))
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Week not found' });
    }

    await ctx.db.delete(weeks).where(eq(weeks.id, id));

    return { success: true, id };
  }),

  /**
   * Reorder weeks within a schwerpunktebene
   */
  reorder: adminProcedure.input(reorderWeeksSchema).mutation(async ({ ctx, input }) => {
    const { schwerpunktebeneId, weekIds } = input;

    // Verify schwerpunktebene belongs to tenant
    const [parentSchwerpunktebene] = await ctx.db
      .select()
      .from(schwerpunktebenen)
      .where(
        and(
          eq(schwerpunktebenen.id, schwerpunktebeneId),
          eq(schwerpunktebenen.tenantId, ctx.tenantId)
        )
      )
      .limit(1);

    if (!parentSchwerpunktebene) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Focus area not found' });
    }

    // Verify all week IDs belong to this schwerpunktebene
    const existingWeeks = await ctx.db
      .select()
      .from(weeks)
      .where(
        and(eq(weeks.schwerpunktebeneId, schwerpunktebeneId), inArray(weeks.id, weekIds))
      );

    if (existingWeeks.length !== weekIds.length) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Some week IDs do not belong to this focus area',
      });
    }

    // Update order indices
    await Promise.all(
      weekIds.map((weekId, index) =>
        ctx.db
          .update(weeks)
          .set({ orderIndex: String(index), updatedAt: new Date() })
          .where(eq(weeks.id, weekId))
      )
    );

    // Return the updated list
    const updatedWeeks = await ctx.db
      .select()
      .from(weeks)
      .where(eq(weeks.schwerpunktebeneId, schwerpunktebeneId))
      .orderBy(asc(weeks.orderIndex), asc(weeks.weekNumber));

    return { success: true, weeks: updatedWeeks };
  }),
});
