import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { schwerpunktebenen, users } from '@/lib/db/schema';
import { eq, and, count, desc, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// Input validation schemas
const createSchwerpunktebeneSchema = z.object({
  monthNumber: z.enum(['1', '2', '3'], {
    message: 'Month number must be 1, 2, or 3',
  }),
  titleDe: z.string().min(1, 'German title is required').max(255),
  titleEn: z.string().max(255).optional().nullable(),
  descriptionDe: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  herkunftDe: z.string().optional().nullable(),
  herkunftEn: z.string().optional().nullable(),
  zielDe: z.string().optional().nullable(),
  zielEn: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

const updateSchwerpunktebeneSchema = z.object({
  id: z.string().uuid(),
  monthNumber: z.enum(['1', '2', '3']).optional(),
  titleDe: z.string().min(1).max(255).optional(),
  titleEn: z.string().max(255).optional().nullable(),
  descriptionDe: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  herkunftDe: z.string().optional().nullable(),
  herkunftEn: z.string().optional().nullable(),
  zielDe: z.string().optional().nullable(),
  zielEn: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

const listSchwerpunktebenenSchema = z.object({
  monthNumber: z.enum(['1', '2', '3', 'all']).optional().default('all'),
  sortBy: z.enum(['monthNumber', 'titleDe', 'createdAt']).optional().default('monthNumber'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

const schwerpunktebeneIdSchema = z.object({
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

export const schwerpunktebenenRouter = router({
  /**
   * List schwerpunktebenen with filter and pagination
   */
  list: adminProcedure.input(listSchwerpunktebenenSchema).query(async ({ ctx, input }) => {
    const { monthNumber, sortBy, sortOrder, page, limit } = input;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(schwerpunktebenen.tenantId, ctx.tenantId)];

    if (monthNumber !== 'all') {
      conditions.push(eq(schwerpunktebenen.monthNumber, monthNumber));
    }

    // Build sort order
    const orderColumn =
      sortBy === 'titleDe'
        ? schwerpunktebenen.titleDe
        : sortBy === 'createdAt'
          ? schwerpunktebenen.createdAt
          : schwerpunktebenen.monthNumber;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const whereClause = and(...conditions);

    const [schwerpunktebenenList, totalCount] = await Promise.all([
      ctx.db
        .select()
        .from(schwerpunktebenen)
        .where(whereClause)
        .orderBy(orderDirection(orderColumn))
        .limit(limit)
        .offset(offset),
      ctx.db
        .select({ count: count() })
        .from(schwerpunktebenen)
        .where(whereClause)
        .then((result) => result[0]?.count ?? 0),
    ]);

    return {
      schwerpunktebenen: schwerpunktebenenList,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
      },
    };
  }),

  /**
   * Get a schwerpunktebene by ID
   */
  getById: adminProcedure.input(schwerpunktebeneIdSchema).query(async ({ ctx, input }) => {
    const [schwerpunktebene] = await ctx.db
      .select()
      .from(schwerpunktebenen)
      .where(and(eq(schwerpunktebenen.id, input.id), eq(schwerpunktebenen.tenantId, ctx.tenantId)))
      .limit(1);

    if (!schwerpunktebene) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Schwerpunktebene not found' });
    }

    return schwerpunktebene;
  }),

  /**
   * Create a new schwerpunktebene
   */
  create: adminProcedure.input(createSchwerpunktebeneSchema).mutation(async ({ ctx, input }) => {
    const [newSchwerpunktebene] = await ctx.db
      .insert(schwerpunktebenen)
      .values({
        tenantId: ctx.tenantId,
        monthNumber: input.monthNumber,
        titleDe: input.titleDe,
        titleEn: input.titleEn,
        descriptionDe: input.descriptionDe,
        descriptionEn: input.descriptionEn,
        herkunftDe: input.herkunftDe,
        herkunftEn: input.herkunftEn,
        zielDe: input.zielDe,
        zielEn: input.zielEn,
        imageUrl: input.imageUrl,
      })
      .returning();

    return newSchwerpunktebene;
  }),

  /**
   * Update a schwerpunktebene
   */
  update: adminProcedure.input(updateSchwerpunktebeneSchema).mutation(async ({ ctx, input }) => {
    const { id, ...updateData } = input;

    // Check if schwerpunktebene exists and belongs to tenant
    const [existing] = await ctx.db
      .select()
      .from(schwerpunktebenen)
      .where(and(eq(schwerpunktebenen.id, id), eq(schwerpunktebenen.tenantId, ctx.tenantId)))
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Schwerpunktebene not found' });
    }

    const [updatedSchwerpunktebene] = await ctx.db
      .update(schwerpunktebenen)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(schwerpunktebenen.id, id))
      .returning();

    return updatedSchwerpunktebene;
  }),

  /**
   * Delete a schwerpunktebene
   */
  delete: adminProcedure.input(schwerpunktebeneIdSchema).mutation(async ({ ctx, input }) => {
    const { id } = input;

    // Check if schwerpunktebene exists and belongs to tenant
    const [existing] = await ctx.db
      .select()
      .from(schwerpunktebenen)
      .where(and(eq(schwerpunktebenen.id, id), eq(schwerpunktebenen.tenantId, ctx.tenantId)))
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Schwerpunktebene not found' });
    }

    await ctx.db.delete(schwerpunktebenen).where(eq(schwerpunktebenen.id, id));

    return { success: true, id };
  }),
});
