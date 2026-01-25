import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { classCurriculum, schwerpunktebenen, classes, users } from '@/lib/db/schema';
import { eq, and, count, desc, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// Input validation schemas
const createClassCurriculumSchema = z.object({
  classId: z.string().uuid(),
  schwerpunktebeneId: z.string().uuid(),
  monthNumber: z.number().int().positive().max(12, 'Month number must be between 1 and 12'),
  customTitleDe: z.string().max(255).optional().nullable(),
  customTitleEn: z.string().max(255).optional().nullable(),
  customDescriptionDe: z.string().optional().nullable(),
  customDescriptionEn: z.string().optional().nullable(),
  mentorNotes: z.string().optional().nullable(),
});

const updateClassCurriculumSchema = z.object({
  id: z.string().uuid(),
  schwerpunktebeneId: z.string().uuid().optional(),
  monthNumber: z.number().int().positive().max(12).optional(),
  customTitleDe: z.string().max(255).optional().nullable(),
  customTitleEn: z.string().max(255).optional().nullable(),
  customDescriptionDe: z.string().optional().nullable(),
  customDescriptionEn: z.string().optional().nullable(),
  mentorNotes: z.string().optional().nullable(),
});

const listClassCurriculumSchema = z.object({
  classId: z.string().uuid(),
  sortBy: z.enum(['monthNumber', 'createdAt']).optional().default('monthNumber'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

const classCurriculumIdSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Mentor middleware - ensures user has mentor or admin role and extracts tenantId
 */
const mentorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const userRoles = ctx.session.user.roles || [];

  if (
    !userRoles.includes('mentor') &&
    !userRoles.includes('admin') &&
    !userRoles.includes('superadmin')
  ) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Mentor, Admin, or Superadmin access required',
    });
  }

  const [currentUser] = await ctx.db
    .select({ id: users.id, tenantId: users.tenantId })
    .from(users)
    .where(eq(users.email, ctx.session.user.email))
    .limit(1);

  if (!currentUser?.tenantId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'User must be associated with a tenant',
    });
  }

  return next({
    ctx: {
      ...ctx,
      tenantId: currentUser.tenantId,
      userId: currentUser.id,
      userRoles,
    },
  });
});

/**
 * Helper to verify class belongs to tenant and user has access
 */
async function verifyClassAccess(
  ctx: { db: typeof import('@/lib/db').db; tenantId: string; userId: string; userRoles: string[] },
  classId: string
) {
  const [targetClass] = await ctx.db
    .select()
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.tenantId, ctx.tenantId)))
    .limit(1);

  if (!targetClass) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Class not found' });
  }

  // Mentors can only access their own classes
  if (
    ctx.userRoles.includes('mentor') &&
    !ctx.userRoles.includes('admin') &&
    !ctx.userRoles.includes('superadmin')
  ) {
    if (targetClass.mentorId !== ctx.userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only manage curriculum for your own classes',
      });
    }
  }

  return targetClass;
}

export const classCurriculumRouter = router({
  /**
   * List curriculum assignments for a class
   */
  list: mentorProcedure.input(listClassCurriculumSchema).query(async ({ ctx, input }) => {
    const { classId, sortBy, sortOrder, page, limit } = input;
    const offset = (page - 1) * limit;

    // Verify class access
    await verifyClassAccess(ctx, classId);

    // Build sort order
    const orderColumn =
      sortBy === 'createdAt' ? classCurriculum.createdAt : classCurriculum.monthNumber;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const whereClause = eq(classCurriculum.classId, classId);

    const [curriculumList, totalCount] = await Promise.all([
      ctx.db
        .select({
          curriculum: classCurriculum,
          schwerpunktebene: schwerpunktebenen,
        })
        .from(classCurriculum)
        .leftJoin(schwerpunktebenen, eq(classCurriculum.schwerpunktebeneId, schwerpunktebenen.id))
        .where(whereClause)
        .orderBy(orderDirection(orderColumn))
        .limit(limit)
        .offset(offset),
      ctx.db
        .select({ count: count() })
        .from(classCurriculum)
        .where(whereClause)
        .then((result) => result[0]?.count ?? 0),
    ]);

    return {
      curriculum: curriculumList,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
      },
    };
  }),

  /**
   * Get a curriculum assignment by ID
   */
  getById: mentorProcedure.input(classCurriculumIdSchema).query(async ({ ctx, input }) => {
    const [curriculumEntry] = await ctx.db
      .select({
        curriculum: classCurriculum,
        schwerpunktebene: schwerpunktebenen,
      })
      .from(classCurriculum)
      .leftJoin(schwerpunktebenen, eq(classCurriculum.schwerpunktebeneId, schwerpunktebenen.id))
      .where(eq(classCurriculum.id, input.id))
      .limit(1);

    if (!curriculumEntry) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Curriculum assignment not found' });
    }

    // Verify class access
    await verifyClassAccess(ctx, curriculumEntry.curriculum.classId);

    return curriculumEntry;
  }),

  /**
   * Create a new curriculum assignment
   */
  create: mentorProcedure.input(createClassCurriculumSchema).mutation(async ({ ctx, input }) => {
    // Verify class access
    await verifyClassAccess(ctx, input.classId);

    // Verify schwerpunktebene exists and belongs to tenant
    const [schwerpunktebene] = await ctx.db
      .select()
      .from(schwerpunktebenen)
      .where(
        and(eq(schwerpunktebenen.id, input.schwerpunktebeneId), eq(schwerpunktebenen.tenantId, ctx.tenantId))
      )
      .limit(1);

    if (!schwerpunktebene) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Schwerpunktebene not found' });
    }

    const [newCurriculum] = await ctx.db
      .insert(classCurriculum)
      .values({
        classId: input.classId,
        schwerpunktebeneId: input.schwerpunktebeneId,
        monthNumber: input.monthNumber,
        customTitleDe: input.customTitleDe,
        customTitleEn: input.customTitleEn,
        customDescriptionDe: input.customDescriptionDe,
        customDescriptionEn: input.customDescriptionEn,
        mentorNotes: input.mentorNotes,
      })
      .returning();

    return newCurriculum;
  }),

  /**
   * Update a curriculum assignment (allows mentor customization)
   */
  update: mentorProcedure.input(updateClassCurriculumSchema).mutation(async ({ ctx, input }) => {
    const { id, ...updateData } = input;

    // Check if curriculum entry exists
    const [existing] = await ctx.db
      .select()
      .from(classCurriculum)
      .where(eq(classCurriculum.id, id))
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Curriculum assignment not found' });
    }

    // Verify class access
    await verifyClassAccess(ctx, existing.classId);

    // If changing schwerpunktebene, verify it exists and belongs to tenant
    if (updateData.schwerpunktebeneId) {
      const [schwerpunktebene] = await ctx.db
        .select()
        .from(schwerpunktebenen)
        .where(
          and(
            eq(schwerpunktebenen.id, updateData.schwerpunktebeneId),
            eq(schwerpunktebenen.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!schwerpunktebene) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Schwerpunktebene not found' });
      }
    }

    const [updatedCurriculum] = await ctx.db
      .update(classCurriculum)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(classCurriculum.id, id))
      .returning();

    return updatedCurriculum;
  }),

  /**
   * Delete a curriculum assignment
   */
  delete: mentorProcedure.input(classCurriculumIdSchema).mutation(async ({ ctx, input }) => {
    const { id } = input;

    // Check if curriculum entry exists
    const [existing] = await ctx.db
      .select()
      .from(classCurriculum)
      .where(eq(classCurriculum.id, id))
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Curriculum assignment not found' });
    }

    // Verify class access
    await verifyClassAccess(ctx, existing.classId);

    await ctx.db.delete(classCurriculum).where(eq(classCurriculum.id, id));

    return { success: true, id };
  }),

  /**
   * Bulk assign curriculum to a class (convenience method for setting up all months)
   */
  bulkAssign: mentorProcedure
    .input(
      z.object({
        classId: z.string().uuid(),
        assignments: z.array(
          z.object({
            schwerpunktebeneId: z.string().uuid(),
            monthNumber: z.number().int().positive().max(12),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { classId, assignments } = input;

      // Verify class access
      const targetClass = await verifyClassAccess(ctx, classId);

      // Validate all schwerpunktebenen exist and belong to tenant
      const schwerpunktebeneIds = assignments.map((a) => a.schwerpunktebeneId);
      const validSchwerpunktebenen = await ctx.db
        .select({ id: schwerpunktebenen.id })
        .from(schwerpunktebenen)
        .where(eq(schwerpunktebenen.tenantId, ctx.tenantId));

      const validIds = new Set(validSchwerpunktebenen.map((s) => s.id));
      const invalidIds = schwerpunktebeneIds.filter((id) => !validIds.has(id));

      if (invalidIds.length > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid schwerpunktebene IDs: ${invalidIds.join(', ')}`,
        });
      }

      // Validate month numbers don't exceed class duration
      const maxMonth = Math.max(...assignments.map((a) => a.monthNumber));
      if (maxMonth > targetClass.durationMonths) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Month number ${maxMonth} exceeds class duration of ${targetClass.durationMonths} months`,
        });
      }

      // Delete existing curriculum for this class
      await ctx.db.delete(classCurriculum).where(eq(classCurriculum.classId, classId));

      // Insert new curriculum assignments
      const newCurriculum = await ctx.db
        .insert(classCurriculum)
        .values(
          assignments.map((a) => ({
            classId,
            schwerpunktebeneId: a.schwerpunktebeneId,
            monthNumber: a.monthNumber,
          }))
        )
        .returning();

      return newCurriculum;
    }),
});
