import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { weekExercises, weeks, exercises, schwerpunktebenen, users } from '@/lib/db/schema';
import { eq, and, count, asc, inArray, max } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// Input validation schemas
const frequencySchema = z.enum(['daily', 'weekly', 'custom']);

const addExerciseToWeekSchema = z.object({
  weekId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  orderIndex: z.number().int().min(0).optional(),
  isObligatory: z.boolean().optional().default(true),
  frequency: frequencySchema.optional().default('daily'),
  customFrequency: z.string().max(255).optional().nullable(),
});

const updateWeekExerciseSchema = z.object({
  id: z.string().uuid(),
  orderIndex: z.number().int().min(0).optional(),
  isObligatory: z.boolean().optional(),
  frequency: frequencySchema.optional(),
  customFrequency: z.string().max(255).optional().nullable(),
});

const listWeekExercisesSchema = z.object({
  weekId: z.string().uuid(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(50),
});

const weekExerciseIdSchema = z.object({
  id: z.string().uuid(),
});

const removeExerciseFromWeekSchema = z.object({
  weekId: z.string().uuid(),
  exerciseId: z.string().uuid(),
});

const reorderWeekExercisesSchema = z.object({
  weekId: z.string().uuid(),
  weekExerciseIds: z.array(z.string().uuid()).min(1),
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

/**
 * Helper to verify week belongs to tenant
 */
async function verifyWeekAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  weekId: string,
  tenantId: string
) {
  const [weekWithParent] = await db
    .select({
      week: weeks,
      schwerpunktebene: schwerpunktebenen,
    })
    .from(weeks)
    .innerJoin(schwerpunktebenen, eq(weeks.schwerpunktebeneId, schwerpunktebenen.id))
    .where(and(eq(weeks.id, weekId), eq(schwerpunktebenen.tenantId, tenantId)))
    .limit(1);

  return weekWithParent;
}

export const weekExercisesRouter = router({
  /**
   * List exercises for a week with pagination
   */
  list: adminProcedure.input(listWeekExercisesSchema).query(async ({ ctx, input }) => {
    const { weekId, page, limit } = input;
    const offset = (page - 1) * limit;

    // Verify week belongs to tenant
    const weekWithParent = await verifyWeekAccess(ctx.db, weekId, ctx.tenantId);

    if (!weekWithParent) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Week not found' });
    }

    const [weekExercisesList, totalCount] = await Promise.all([
      ctx.db
        .select({
          weekExercise: weekExercises,
          exercise: exercises,
        })
        .from(weekExercises)
        .innerJoin(exercises, eq(weekExercises.exerciseId, exercises.id))
        .where(eq(weekExercises.weekId, weekId))
        .orderBy(asc(weekExercises.orderIndex))
        .limit(limit)
        .offset(offset),
      ctx.db
        .select({ count: count() })
        .from(weekExercises)
        .where(eq(weekExercises.weekId, weekId))
        .then((result) => result[0]?.count ?? 0),
    ]);

    return {
      weekExercises: weekExercisesList,
      week: weekWithParent.week,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
      },
    };
  }),

  /**
   * Get a week-exercise relationship by ID
   */
  getById: adminProcedure.input(weekExerciseIdSchema).query(async ({ ctx, input }) => {
    const [result] = await ctx.db
      .select({
        weekExercise: weekExercises,
        exercise: exercises,
        week: weeks,
        schwerpunktebene: schwerpunktebenen,
      })
      .from(weekExercises)
      .innerJoin(exercises, eq(weekExercises.exerciseId, exercises.id))
      .innerJoin(weeks, eq(weekExercises.weekId, weeks.id))
      .innerJoin(schwerpunktebenen, eq(weeks.schwerpunktebeneId, schwerpunktebenen.id))
      .where(
        and(eq(weekExercises.id, input.id), eq(schwerpunktebenen.tenantId, ctx.tenantId))
      )
      .limit(1);

    if (!result) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Week-exercise relationship not found' });
    }

    return result;
  }),

  /**
   * Add an exercise to a week
   */
  add: adminProcedure.input(addExerciseToWeekSchema).mutation(async ({ ctx, input }) => {
    // Verify week belongs to tenant
    const weekWithParent = await verifyWeekAccess(ctx.db, input.weekId, ctx.tenantId);

    if (!weekWithParent) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Week not found' });
    }

    // Verify exercise belongs to tenant
    const [exercise] = await ctx.db
      .select()
      .from(exercises)
      .where(and(eq(exercises.id, input.exerciseId), eq(exercises.tenantId, ctx.tenantId)))
      .limit(1);

    if (!exercise) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Exercise not found' });
    }

    // Check if relationship already exists
    const [existingRelation] = await ctx.db
      .select()
      .from(weekExercises)
      .where(
        and(
          eq(weekExercises.weekId, input.weekId),
          eq(weekExercises.exerciseId, input.exerciseId)
        )
      )
      .limit(1);

    if (existingRelation) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Exercise is already added to this week',
      });
    }

    // Determine order index
    let orderIndex = input.orderIndex;
    if (orderIndex === undefined) {
      // Get the current max order index
      const [maxResult] = await ctx.db
        .select({ maxOrder: max(weekExercises.orderIndex) })
        .from(weekExercises)
        .where(eq(weekExercises.weekId, input.weekId));

      orderIndex = (maxResult?.maxOrder ?? -1) + 1;
    }

    const [newWeekExercise] = await ctx.db
      .insert(weekExercises)
      .values({
        weekId: input.weekId,
        exerciseId: input.exerciseId,
        orderIndex,
        isObligatory: input.isObligatory,
        frequency: input.frequency,
        customFrequency: input.customFrequency,
      })
      .returning();

    return { weekExercise: newWeekExercise, exercise };
  }),

  /**
   * Update a week-exercise relationship
   */
  update: adminProcedure.input(updateWeekExerciseSchema).mutation(async ({ ctx, input }) => {
    const { id, ...updateData } = input;

    // Check if relationship exists and belongs to tenant
    const [existing] = await ctx.db
      .select({
        weekExercise: weekExercises,
        schwerpunktebene: schwerpunktebenen,
      })
      .from(weekExercises)
      .innerJoin(weeks, eq(weekExercises.weekId, weeks.id))
      .innerJoin(schwerpunktebenen, eq(weeks.schwerpunktebeneId, schwerpunktebenen.id))
      .where(and(eq(weekExercises.id, id), eq(schwerpunktebenen.tenantId, ctx.tenantId)))
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Week-exercise relationship not found' });
    }

    const [updatedWeekExercise] = await ctx.db
      .update(weekExercises)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(weekExercises.id, id))
      .returning();

    return updatedWeekExercise;
  }),

  /**
   * Remove an exercise from a week by ID
   */
  delete: adminProcedure.input(weekExerciseIdSchema).mutation(async ({ ctx, input }) => {
    const { id } = input;

    // Check if relationship exists and belongs to tenant
    const [existing] = await ctx.db
      .select({
        weekExercise: weekExercises,
        schwerpunktebene: schwerpunktebenen,
      })
      .from(weekExercises)
      .innerJoin(weeks, eq(weekExercises.weekId, weeks.id))
      .innerJoin(schwerpunktebenen, eq(weeks.schwerpunktebeneId, schwerpunktebenen.id))
      .where(and(eq(weekExercises.id, id), eq(schwerpunktebenen.tenantId, ctx.tenantId)))
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Week-exercise relationship not found' });
    }

    await ctx.db.delete(weekExercises).where(eq(weekExercises.id, id));

    return { success: true, id };
  }),

  /**
   * Remove an exercise from a week by weekId and exerciseId
   */
  remove: adminProcedure.input(removeExerciseFromWeekSchema).mutation(async ({ ctx, input }) => {
    const { weekId, exerciseId } = input;

    // Verify week belongs to tenant
    const weekWithParent = await verifyWeekAccess(ctx.db, weekId, ctx.tenantId);

    if (!weekWithParent) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Week not found' });
    }

    // Find and delete the relationship
    const [existing] = await ctx.db
      .select()
      .from(weekExercises)
      .where(
        and(eq(weekExercises.weekId, weekId), eq(weekExercises.exerciseId, exerciseId))
      )
      .limit(1);

    if (!existing) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Exercise is not associated with this week',
      });
    }

    await ctx.db
      .delete(weekExercises)
      .where(
        and(eq(weekExercises.weekId, weekId), eq(weekExercises.exerciseId, exerciseId))
      );

    return { success: true, weekId, exerciseId };
  }),

  /**
   * Reorder exercises within a week
   */
  reorder: adminProcedure.input(reorderWeekExercisesSchema).mutation(async ({ ctx, input }) => {
    const { weekId, weekExerciseIds } = input;

    // Verify week belongs to tenant
    const weekWithParent = await verifyWeekAccess(ctx.db, weekId, ctx.tenantId);

    if (!weekWithParent) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Week not found' });
    }

    // Verify all weekExercise IDs belong to this week
    const existingRelations = await ctx.db
      .select()
      .from(weekExercises)
      .where(
        and(eq(weekExercises.weekId, weekId), inArray(weekExercises.id, weekExerciseIds))
      );

    if (existingRelations.length !== weekExerciseIds.length) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Some week-exercise IDs do not belong to this week',
      });
    }

    // Update order indices
    await Promise.all(
      weekExerciseIds.map((weekExerciseId, index) =>
        ctx.db
          .update(weekExercises)
          .set({ orderIndex: index, updatedAt: new Date() })
          .where(eq(weekExercises.id, weekExerciseId))
      )
    );

    // Return the updated list
    const updatedList = await ctx.db
      .select({
        weekExercise: weekExercises,
        exercise: exercises,
      })
      .from(weekExercises)
      .innerJoin(exercises, eq(weekExercises.exerciseId, exercises.id))
      .where(eq(weekExercises.weekId, weekId))
      .orderBy(asc(weekExercises.orderIndex));

    return { success: true, weekExercises: updatedList };
  }),
});
