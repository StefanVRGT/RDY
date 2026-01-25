import { z } from 'zod';
import { router, superadminProcedure } from '../trpc';
import { tenants, users } from '@/lib/db/schema';
import { eq, ilike, or, count, desc, asc, sql } from 'drizzle-orm';

// Input validation schemas
const tenantIdSchema = z.object({ id: z.string().uuid() });

const createTenantSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional()
    .nullable(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional()
    .nullable(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

const updateTenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

const listTenantsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'disabled', 'all']).optional().default('all'),
  sortBy: z.enum(['name', 'createdAt', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

export const tenantsRouter = router({
  /**
   * List all tenants with search, filter, and pagination
   * Superadmin only
   */
  list: superadminProcedure.input(listTenantsSchema).query(async ({ ctx, input }) => {
    const { search, status, sortBy, sortOrder, page, limit } = input;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(or(ilike(tenants.name, `%${search}%`), ilike(tenants.slug, `%${search}%`)));
    }

    if (status !== 'all') {
      conditions.push(eq(tenants.status, status));
    }

    // Build sort order
    const orderColumn =
      sortBy === 'name' ? tenants.name : sortBy === 'status' ? tenants.status : tenants.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    // Execute query with conditions
    const whereClause =
      conditions.length > 0
        ? sql`${conditions.reduce((acc, cond, i) => (i === 0 ? cond : sql`${acc} AND ${cond}`), sql`TRUE`)}`
        : undefined;

    const [tenantList, totalCount] = await Promise.all([
      ctx.db
        .select()
        .from(tenants)
        .where(whereClause)
        .orderBy(orderDirection(orderColumn))
        .limit(limit)
        .offset(offset),
      ctx.db
        .select({ count: count() })
        .from(tenants)
        .where(whereClause)
        .then((result) => result[0]?.count ?? 0),
    ]);

    return {
      tenants: tenantList,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
      },
    };
  }),

  /**
   * Get a tenant by ID with usage statistics
   * Superadmin only
   */
  getById: superadminProcedure.input(tenantIdSchema).query(async ({ ctx, input }) => {
    const [tenant] = await ctx.db.select().from(tenants).where(eq(tenants.id, input.id)).limit(1);

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Get user counts by role
    const userCounts = await ctx.db
      .select({
        role: users.role,
        count: count(),
      })
      .from(users)
      .where(eq(users.tenantId, input.id))
      .groupBy(users.role);

    const stats = {
      totalUsers: userCounts.reduce((sum, r) => sum + Number(r.count), 0),
      adminCount: Number(userCounts.find((r) => r.role === 'admin')?.count ?? 0),
      mentorCount: Number(userCounts.find((r) => r.role === 'mentor')?.count ?? 0),
      menteeCount: Number(userCounts.find((r) => r.role === 'mentee')?.count ?? 0),
    };

    return {
      ...tenant,
      stats,
    };
  }),

  /**
   * Get tenant usage statistics
   * Superadmin only
   */
  getStats: superadminProcedure.input(tenantIdSchema).query(async ({ ctx, input }) => {
    const [tenant] = await ctx.db.select().from(tenants).where(eq(tenants.id, input.id)).limit(1);

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Get detailed user statistics
    const userCounts = await ctx.db
      .select({
        role: users.role,
        count: count(),
      })
      .from(users)
      .where(eq(users.tenantId, input.id))
      .groupBy(users.role);

    // Get recent user registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsers = await ctx.db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.tenantId} = ${input.id} AND ${users.createdAt} >= ${thirtyDaysAgo}`)
      .then((result) => Number(result[0]?.count ?? 0));

    return {
      tenantId: input.id,
      tenantName: tenant.name,
      tenantStatus: tenant.status,
      users: {
        total: userCounts.reduce((sum, r) => sum + Number(r.count), 0),
        byRole: {
          admin: Number(userCounts.find((r) => r.role === 'admin')?.count ?? 0),
          mentor: Number(userCounts.find((r) => r.role === 'mentor')?.count ?? 0),
          mentee: Number(userCounts.find((r) => r.role === 'mentee')?.count ?? 0),
        },
        recentRegistrations: recentUsers,
      },
      createdAt: tenant.createdAt,
    };
  }),

  /**
   * Create a new tenant
   * Superadmin only
   */
  create: superadminProcedure.input(createTenantSchema).mutation(async ({ ctx, input }) => {
    // Check if slug already exists
    const existingTenant = await ctx.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, input.slug))
      .limit(1);

    if (existingTenant.length > 0) {
      throw new Error('A tenant with this slug already exists');
    }

    const [newTenant] = await ctx.db
      .insert(tenants)
      .values({
        name: input.name,
        slug: input.slug,
        logoUrl: input.logoUrl,
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor,
        settings: input.settings ?? {},
        status: 'active',
      })
      .returning();

    return newTenant;
  }),

  /**
   * Update a tenant
   * Superadmin only
   */
  update: superadminProcedure.input(updateTenantSchema).mutation(async ({ ctx, input }) => {
    const { id, ...updateData } = input;

    // Check if tenant exists
    const [existingTenant] = await ctx.db.select().from(tenants).where(eq(tenants.id, id)).limit(1);

    if (!existingTenant) {
      throw new Error('Tenant not found');
    }

    // If updating slug, check for uniqueness
    if (updateData.slug && updateData.slug !== existingTenant.slug) {
      const slugExists = await ctx.db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.slug, updateData.slug))
        .limit(1);

      if (slugExists.length > 0) {
        throw new Error('A tenant with this slug already exists');
      }
    }

    const [updatedTenant] = await ctx.db
      .update(tenants)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();

    return updatedTenant;
  }),

  /**
   * Enable a tenant
   * Superadmin only
   */
  enable: superadminProcedure.input(tenantIdSchema).mutation(async ({ ctx, input }) => {
    const [tenant] = await ctx.db.select().from(tenants).where(eq(tenants.id, input.id)).limit(1);

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const [updatedTenant] = await ctx.db
      .update(tenants)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, input.id))
      .returning();

    return updatedTenant;
  }),

  /**
   * Disable a tenant
   * Superadmin only
   */
  disable: superadminProcedure.input(tenantIdSchema).mutation(async ({ ctx, input }) => {
    const [tenant] = await ctx.db.select().from(tenants).where(eq(tenants.id, input.id)).limit(1);

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const [updatedTenant] = await ctx.db
      .update(tenants)
      .set({
        status: 'disabled',
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, input.id))
      .returning();

    return updatedTenant;
  }),

  /**
   * Delete a tenant (soft delete by disabling, or hard delete if needed)
   * Superadmin only
   */
  delete: superadminProcedure.input(tenantIdSchema).mutation(async ({ ctx, input }) => {
    const [tenant] = await ctx.db.select().from(tenants).where(eq(tenants.id, input.id)).limit(1);

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Check if tenant has any users
    const userCount = await ctx.db
      .select({ count: count() })
      .from(users)
      .where(eq(users.tenantId, input.id))
      .then((result) => Number(result[0]?.count ?? 0));

    if (userCount > 0) {
      throw new Error(
        'Cannot delete tenant with existing users. Please remove all users first or disable the tenant instead.'
      );
    }

    await ctx.db.delete(tenants).where(eq(tenants.id, input.id));

    return { success: true, id: input.id };
  }),
});
