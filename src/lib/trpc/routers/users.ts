import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { users } from '@/lib/db/schema';
import { eq, ilike, or, count, desc, asc, sql, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// Input validation schemas
const userIdSchema = z.object({ id: z.string().uuid() });

const listUsersSchema = z.object({
  search: z.string().optional(),
  role: z.enum(['mentor', 'mentee', 'all']).optional().default('all'),
  sortBy: z.enum(['name', 'email', 'role', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

const updateUserRoleSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['mentor', 'mentee']),
});

const assignMentorSchema = z.object({
  menteeId: z.string().uuid(),
  mentorId: z.string().uuid().nullable(),
});

/**
 * Admin middleware - ensures user has admin role and extracts tenantId
 * Admins can only manage users within their tenant
 */
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const userRoles = ctx.session.user.roles || [];

  // Superadmins cannot use this router - they don't have a tenantId
  if (userRoles.includes('superadmin') && !userRoles.includes('admin')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Superadmins must use the superadmin interface',
    });
  }

  if (!userRoles.includes('admin') && !userRoles.includes('superadmin')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }

  // Get the admin user's tenantId from the database
  const [adminUser] = await ctx.db
    .select({ tenantId: users.tenantId })
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
    },
  });
});

export const usersRouter = router({
  /**
   * List users in the admin's tenant with search, filter, and pagination
   * Admin only - scoped to their tenant
   */
  list: adminProcedure.input(listUsersSchema).query(async ({ ctx, input }) => {
    const { search, role, sortBy, sortOrder, page, limit } = input;
    const offset = (page - 1) * limit;
    const tenantId = ctx.tenantId;

    // Build where conditions - always filter by tenant
    const conditions = [eq(users.tenantId, tenantId)];

    // Exclude admin and superadmin users - admins only manage mentors and mentees
    conditions.push(or(eq(users.role, 'mentor'), eq(users.role, 'mentee'))!);

    if (search) {
      conditions.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))!);
    }

    if (role !== 'all') {
      conditions.push(eq(users.role, role));
    }

    // Build sort order
    const orderColumn =
      sortBy === 'name'
        ? users.name
        : sortBy === 'email'
          ? users.email
          : sortBy === 'role'
            ? users.role
            : users.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    // Execute query with conditions
    const whereClause = and(...conditions);

    const [userList, totalCount] = await Promise.all([
      ctx.db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          mentorId: users.mentorId,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(orderDirection(orderColumn))
        .limit(limit)
        .offset(offset),
      ctx.db
        .select({ count: count() })
        .from(users)
        .where(whereClause)
        .then((result) => result[0]?.count ?? 0),
    ]);

    // Get mentor information for mentees
    const mentorIds = userList.filter((u) => u.mentorId).map((u) => u.mentorId!);

    let mentorsMap: Record<string, { id: string; name: string | null; email: string }> = {};
    if (mentorIds.length > 0) {
      const mentors = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(
          sql`${users.id} IN (${sql.join(
            mentorIds.map((id) => sql`${id}`),
            sql`, `
          )})`
        );

      mentorsMap = mentors.reduce(
        (acc, m) => {
          acc[m.id] = m;
          return acc;
        },
        {} as typeof mentorsMap
      );
    }

    // Enrich user list with mentor information
    const enrichedUsers = userList.map((user) => ({
      ...user,
      mentor: user.mentorId ? mentorsMap[user.mentorId] || null : null,
    }));

    return {
      users: enrichedUsers,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
      },
    };
  }),

  /**
   * Get a user by ID
   * Admin only - scoped to their tenant
   */
  getById: adminProcedure.input(userIdSchema).query(async ({ ctx, input }) => {
    const [user] = await ctx.db
      .select()
      .from(users)
      .where(and(eq(users.id, input.id), eq(users.tenantId, ctx.tenantId)))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }

    // Get mentor info if assigned
    let mentor = null;
    if (user.mentorId) {
      const [mentorUser] = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, user.mentorId))
        .limit(1);
      mentor = mentorUser || null;
    }

    return {
      ...user,
      mentor,
    };
  }),

  /**
   * Get all mentors in the tenant (for mentor assignment dropdown)
   * Admin only - scoped to their tenant
   */
  getMentors: adminProcedure.query(async ({ ctx }) => {
    const mentors = await ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(and(eq(users.tenantId, ctx.tenantId), eq(users.role, 'mentor')))
      .orderBy(asc(users.name));

    return mentors;
  }),

  /**
   * Update user role (mentor or mentee only)
   * Admin only - scoped to their tenant
   */
  updateRole: adminProcedure.input(updateUserRoleSchema).mutation(async ({ ctx, input }) => {
    const { id, role } = input;

    // Verify user exists and is in admin's tenant
    const [existingUser] = await ctx.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, ctx.tenantId)))
      .limit(1);

    if (!existingUser) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }

    // Cannot change role of admins or superadmins
    if (existingUser.role === 'admin' || existingUser.role === 'superadmin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Cannot change role of admin users',
      });
    }

    // If changing from mentor to mentee, clear any mentees assigned to this mentor
    if (existingUser.role === 'mentor' && role === 'mentee') {
      await ctx.db
        .update(users)
        .set({ mentorId: null, updatedAt: new Date() })
        .where(eq(users.mentorId, id));
    }

    // If changing to mentor, clear their own mentorId
    if (role === 'mentor') {
      const [updatedUser] = await ctx.db
        .update(users)
        .set({
          role,
          mentorId: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();
      return updatedUser;
    }

    const [updatedUser] = await ctx.db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    return updatedUser;
  }),

  /**
   * Assign a mentor to a mentee
   * Admin only - scoped to their tenant
   */
  assignMentor: adminProcedure.input(assignMentorSchema).mutation(async ({ ctx, input }) => {
    const { menteeId, mentorId } = input;

    // Verify mentee exists and is in admin's tenant
    const [mentee] = await ctx.db
      .select()
      .from(users)
      .where(and(eq(users.id, menteeId), eq(users.tenantId, ctx.tenantId)))
      .limit(1);

    if (!mentee) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Mentee not found' });
    }

    if (mentee.role !== 'mentee') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Can only assign mentors to mentees',
      });
    }

    // If mentorId is provided, verify mentor exists and is in same tenant
    if (mentorId) {
      const [mentor] = await ctx.db
        .select()
        .from(users)
        .where(
          and(eq(users.id, mentorId), eq(users.tenantId, ctx.tenantId), eq(users.role, 'mentor'))
        )
        .limit(1);

      if (!mentor) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Mentor not found or is not a mentor',
        });
      }
    }

    const [updatedMentee] = await ctx.db
      .update(users)
      .set({
        mentorId: mentorId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, menteeId))
      .returning();

    return updatedMentee;
  }),

  /**
   * Get current user profile
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.email, ctx.session.user.email))
      .limit(1);

    return user || null;
  }),
});
