import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { exercises, users } from '@/lib/db/schema';
import { eq, and, count, desc, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// Accepts absolute URLs (https://...) and relative upload paths (/uploads/...)
const urlField = z
  .string()
  .refine((v) => v.startsWith('/') || z.string().url().safeParse(v).success, {
    message: 'Invalid URL',
  })
  .optional()
  .nullable();

// Input validation schemas
const exerciseTypeSchema = z.enum(['video', 'audio', 'text']);

const createExerciseSchema = z.object({
  type: exerciseTypeSchema,
  groupName: z.string().max(100).optional().nullable(),
  titleDe: z.string().min(1, 'German title is required').max(255),
  titleEn: z.string().max(255).optional().nullable(),
  descriptionDe: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  durationMinutes: z.number().int().positive().optional().nullable(),
  videoUrl: urlField,
  videoUrlDe: urlField,
  videoUrlEn: urlField,
  audioUrl: urlField,
  contentDe: z.string().optional().nullable(),
  contentEn: z.string().optional().nullable(),
  imageUrl: z.string().nullable().optional(),
  orderIndex: z.string().max(10).optional(),
});

const updateExerciseSchema = z.object({
  id: z.string().uuid(),
  type: exerciseTypeSchema.optional(),
  groupName: z.string().max(100).optional().nullable(),
  titleDe: z.string().min(1).max(255).optional(),
  titleEn: z.string().max(255).optional().nullable(),
  descriptionDe: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  durationMinutes: z.number().int().positive().optional().nullable(),
  videoUrl: urlField,
  videoUrlDe: urlField,
  videoUrlEn: urlField,
  audioUrl: urlField,
  contentDe: z.string().optional().nullable(),
  contentEn: z.string().optional().nullable(),
  imageUrl: z.string().nullable().optional(),
  orderIndex: z.string().max(10).optional(),
});

const listExercisesSchema = z.object({
  type: z.enum(['video', 'audio', 'text', 'all']).optional().default('all'),
  sortBy: z.enum(['titleDe', 'type', 'durationMinutes', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(500).optional().default(20),
});

const exerciseIdSchema = z.object({
  id: z.string().uuid(),
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

export const exercisesRouter = router({
  /**
   * List exercises with filter and pagination
   */
  list: adminProcedure.input(listExercisesSchema).query(async ({ ctx, input }) => {
    const { type, sortBy, sortOrder, page, limit } = input;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(exercises.tenantId, ctx.tenantId)];

    if (type !== 'all') {
      conditions.push(eq(exercises.type, type));
    }

    // Build sort order
    const orderColumn =
      sortBy === 'titleDe'
        ? exercises.titleDe
        : sortBy === 'type'
          ? exercises.type
          : sortBy === 'durationMinutes'
            ? exercises.durationMinutes
            : exercises.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const whereClause = and(...conditions);

    const [exercisesList, totalCount] = await Promise.all([
      ctx.db
        .select()
        .from(exercises)
        .where(whereClause)
        .orderBy(orderDirection(orderColumn))
        .limit(limit)
        .offset(offset),
      ctx.db
        .select({ count: count() })
        .from(exercises)
        .where(whereClause)
        .then((result) => result[0]?.count ?? 0),
    ]);

    return {
      exercises: exercisesList,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
      },
    };
  }),

  /**
   * Get an exercise by ID
   */
  getById: adminProcedure.input(exerciseIdSchema).query(async ({ ctx, input }) => {
    const [exercise] = await ctx.db
      .select()
      .from(exercises)
      .where(and(eq(exercises.id, input.id), eq(exercises.tenantId, ctx.tenantId)))
      .limit(1);

    if (!exercise) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Exercise not found' });
    }

    return exercise;
  }),

  /**
   * Create a new exercise
   */
  create: adminProcedure.input(createExerciseSchema).mutation(async ({ ctx, input }) => {
    const [newExercise] = await ctx.db
      .insert(exercises)
      .values({
        tenantId: ctx.tenantId,
        type: input.type,
        groupName: input.groupName,
        titleDe: input.titleDe,
        titleEn: input.titleEn,
        descriptionDe: input.descriptionDe,
        descriptionEn: input.descriptionEn,
        durationMinutes: input.durationMinutes,
        videoUrl: input.videoUrl,
        videoUrlDe: input.videoUrlDe,
        videoUrlEn: input.videoUrlEn,
        audioUrl: input.audioUrl,
        contentDe: input.contentDe,
        contentEn: input.contentEn,
        imageUrl: input.imageUrl,
        orderIndex: input.orderIndex ?? '0',
      })
      .returning();

    return newExercise;
  }),

  /**
   * Update an exercise
   */
  update: adminProcedure.input(updateExerciseSchema).mutation(async ({ ctx, input }) => {
    const { id, ...updateData } = input;

    // Check if exercise exists and belongs to tenant
    const [existing] = await ctx.db
      .select()
      .from(exercises)
      .where(and(eq(exercises.id, id), eq(exercises.tenantId, ctx.tenantId)))
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Exercise not found' });
    }

    const [updatedExercise] = await ctx.db
      .update(exercises)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(exercises.id, id))
      .returning();

    return updatedExercise;
  }),

  /**
   * Delete an exercise
   */
  delete: adminProcedure.input(exerciseIdSchema).mutation(async ({ ctx, input }) => {
    const { id } = input;

    // Check if exercise exists and belongs to tenant
    const [existing] = await ctx.db
      .select()
      .from(exercises)
      .where(and(eq(exercises.id, id), eq(exercises.tenantId, ctx.tenantId)))
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Exercise not found' });
    }

    await ctx.db.delete(exercises).where(eq(exercises.id, id));

    return { success: true, id };
  }),
});
