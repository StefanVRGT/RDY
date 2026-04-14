import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { invitations, users, tenants } from '@/lib/db/schema';
import { eq, and, count, desc, asc, or, ilike, lt, gt } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import crypto from 'crypto';
import { INVITATION_DEFAULT_EXPIRY_DAYS, INVITATION_MAX_EXPIRY_DAYS } from '@/lib/constants';

// Input validation schemas
const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['mentor', 'mentee']),
  expiresInDays: z.number().int().min(1).max(INVITATION_MAX_EXPIRY_DAYS).optional().default(INVITATION_DEFAULT_EXPIRY_DAYS),
});

const listInvitationsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['pending', 'accepted', 'expired', 'revoked', 'all']).optional().default('all'),
  sortBy: z
    .enum(['email', 'role', 'status', 'createdAt', 'expiresAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

const invitationIdSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Generate a secure random token for invitation links
 */
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

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

export const invitationsRouter = router({
  /**
   * List invitations with search, filter, and pagination
   */
  list: adminProcedure.input(listInvitationsSchema).query(async ({ ctx, input }) => {
    const { search, status, sortBy, sortOrder, page, limit } = input;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(invitations.tenantId, ctx.tenantId)];

    if (search) {
      conditions.push(ilike(invitations.email, `%${search}%`));
    }

    if (status !== 'all') {
      conditions.push(eq(invitations.status, status));
    }

    // Build sort order
    const orderColumn =
      sortBy === 'email'
        ? invitations.email
        : sortBy === 'role'
          ? invitations.role
          : sortBy === 'status'
            ? invitations.status
            : sortBy === 'expiresAt'
              ? invitations.expiresAt
              : invitations.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc : desc;

    const whereClause = and(...conditions);

    const [invitationList, totalCount] = await Promise.all([
      ctx.db
        .select({
          id: invitations.id,
          email: invitations.email,
          role: invitations.role,
          status: invitations.status,
          token: invitations.token,
          expiresAt: invitations.expiresAt,
          createdAt: invitations.createdAt,
          invitedBy: invitations.invitedBy,
        })
        .from(invitations)
        .where(whereClause)
        .orderBy(orderDirection(orderColumn))
        .limit(limit)
        .offset(offset),
      ctx.db
        .select({ count: count() })
        .from(invitations)
        .where(whereClause)
        .then((result) => result[0]?.count ?? 0),
    ]);

    // Get inviter information
    const inviterIds = Array.from(new Set(invitationList.map((inv) => inv.invitedBy)));
    let invitersMap: Record<string, { id: string; name: string | null; email: string }> = {};

    if (inviterIds.length > 0) {
      const inviters = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(or(...inviterIds.map((id) => eq(users.id, id))));

      invitersMap = inviters.reduce(
        (acc, inv) => {
          acc[inv.id] = inv;
          return acc;
        },
        {} as typeof invitersMap
      );
    }

    // Enrich invitation list with inviter info and check if expired
    const now = new Date();
    const enrichedInvitations = invitationList.map((invitation) => ({
      ...invitation,
      inviter: invitersMap[invitation.invitedBy] || null,
      isExpired: invitation.status === 'pending' && invitation.expiresAt < now,
    }));

    return {
      invitations: enrichedInvitations,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
      },
    };
  }),

  /**
   * Create a new invitation
   */
  create: adminProcedure.input(createInvitationSchema).mutation(async ({ ctx, input }) => {
    const { email, role, expiresInDays } = input;

    // Check if there's already a pending invitation for this email
    const [existingInvitation] = await ctx.db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.tenantId, ctx.tenantId),
          eq(invitations.email, email.toLowerCase()),
          eq(invitations.status, 'pending')
        )
      )
      .limit(1);

    if (existingInvitation) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A pending invitation already exists for this email',
      });
    }

    // Check if user already exists in this tenant
    const [existingUser] = await ctx.db
      .select()
      .from(users)
      .where(and(eq(users.email, email.toLowerCase()), eq(users.tenantId, ctx.tenantId)))
      .limit(1);

    if (existingUser) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A user with this email already exists in your organization',
      });
    }

    // Generate token and expiry
    const token = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const [newInvitation] = await ctx.db
      .insert(invitations)
      .values({
        tenantId: ctx.tenantId,
        email: email.toLowerCase(),
        role,
        token,
        expiresAt,
        invitedBy: ctx.adminUserId,
      })
      .returning();

    return newInvitation;
  }),

  /**
   * Resend an invitation (generates new token and extends expiry)
   */
  resend: adminProcedure.input(invitationIdSchema).mutation(async ({ ctx, input }) => {
    const { id } = input;

    // Get the invitation
    const [invitation] = await ctx.db
      .select()
      .from(invitations)
      .where(and(eq(invitations.id, id), eq(invitations.tenantId, ctx.tenantId)))
      .limit(1);

    if (!invitation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
    }

    // Only pending or expired invitations can be resent
    if (invitation.status !== 'pending' && invitation.status !== 'expired') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot resend ${invitation.status} invitation`,
      });
    }

    // Generate new token and extend expiry by 7 days
    const token = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [updatedInvitation] = await ctx.db
      .update(invitations)
      .set({
        token,
        expiresAt,
        status: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, id))
      .returning();

    return updatedInvitation;
  }),

  /**
   * Revoke an invitation
   */
  revoke: adminProcedure.input(invitationIdSchema).mutation(async ({ ctx, input }) => {
    const { id } = input;

    // Get the invitation
    const [invitation] = await ctx.db
      .select()
      .from(invitations)
      .where(and(eq(invitations.id, id), eq(invitations.tenantId, ctx.tenantId)))
      .limit(1);

    if (!invitation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
    }

    // Only pending invitations can be revoked
    if (invitation.status !== 'pending') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot revoke ${invitation.status} invitation`,
      });
    }

    const [updatedInvitation] = await ctx.db
      .update(invitations)
      .set({
        status: 'revoked',
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, id))
      .returning();

    return updatedInvitation;
  }),

  /**
   * Get invitation by ID
   */
  getById: adminProcedure.input(invitationIdSchema).query(async ({ ctx, input }) => {
    const [invitation] = await ctx.db
      .select()
      .from(invitations)
      .where(and(eq(invitations.id, input.id), eq(invitations.tenantId, ctx.tenantId)))
      .limit(1);

    if (!invitation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
    }

    // Get inviter info
    const [inviter] = await ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, invitation.invitedBy))
      .limit(1);

    return {
      ...invitation,
      inviter: inviter || null,
    };
  }),

  /**
   * Mark expired invitations as expired (utility endpoint)
   */
  markExpired: adminProcedure.mutation(async ({ ctx }) => {
    const now = new Date();

    const result = await ctx.db
      .update(invitations)
      .set({
        status: 'expired',
        updatedAt: now,
      })
      .where(
        and(
          eq(invitations.tenantId, ctx.tenantId),
          eq(invitations.status, 'pending'),
          lt(invitations.expiresAt, now)
        )
      )
      .returning({ id: invitations.id });

    return { expiredCount: result.length };
  }),

  /**
   * Validate an invitation token (public — no auth required)
   * Used by the accept-invite page to check token validity before showing sign-in
   */
  validateToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();

      const [invitation] = await ctx.db
        .select({
          id: invitations.id,
          email: invitations.email,
          role: invitations.role,
          status: invitations.status,
          expiresAt: invitations.expiresAt,
          tenantId: invitations.tenantId,
        })
        .from(invitations)
        .where(
          and(
            eq(invitations.token, input.token),
            eq(invitations.status, 'pending'),
            gt(invitations.expiresAt, now)
          )
        )
        .limit(1);

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found or has expired',
        });
      }

      // Fetch tenant name
      const [tenant] = await ctx.db
        .select({ name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, invitation.tenantId))
        .limit(1);

      return {
        valid: true as const,
        email: invitation.email,
        role: invitation.role,
        tenantName: tenant?.name ?? '',
      };
    }),

  /**
   * Accept an invitation token (public — no auth required)
   * Called after successful Keycloak sign-in to mark the invitation as accepted
   */
  acceptToken: publicProcedure
    .input(z.object({ token: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      const [invitation] = await ctx.db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.token, input.token),
            eq(invitations.status, 'pending'),
            gt(invitations.expiresAt, now)
          )
        )
        .limit(1);

      if (!invitation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invitation not found or has expired',
        });
      }

      const [updated] = await ctx.db
        .update(invitations)
        .set({
          status: 'accepted',
          acceptedBy: input.userId,
          updatedAt: now,
        })
        .where(eq(invitations.id, invitation.id))
        .returning();

      return updated;
    }),
});
