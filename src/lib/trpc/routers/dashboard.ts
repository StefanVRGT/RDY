import { router, superadminProcedure, protectedProcedure } from '../trpc';
import { tenants, users, classes, invitations } from '@/lib/db/schema';
import { eq, count, desc, sql, and, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * Admin middleware - ensures user has admin role and extracts tenantId
 */
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const userRoles = ctx.session.user.roles || [];

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

export const dashboardRouter = router({
  /**
   * Get system-wide statistics for superadmin dashboard
   * Includes tenant counts, user counts by role, and recent activity
   */
  getSystemStats: superadminProcedure.query(async ({ ctx }) => {
    // Get tenant counts by status
    const tenantStats = await ctx.db
      .select({
        status: tenants.status,
        count: count(),
      })
      .from(tenants)
      .groupBy(tenants.status);

    const totalTenants = tenantStats.reduce((sum, r) => sum + Number(r.count), 0);
    const activeTenants = Number(tenantStats.find((r) => r.status === 'active')?.count ?? 0);
    const disabledTenants = Number(tenantStats.find((r) => r.status === 'disabled')?.count ?? 0);

    // Get user counts by role (excluding superadmins who have no tenantId)
    const userStats = await ctx.db
      .select({
        role: users.role,
        count: count(),
      })
      .from(users)
      .groupBy(users.role);

    const totalUsers = userStats.reduce((sum, r) => sum + Number(r.count), 0);
    const usersByRole = {
      superadmin: Number(userStats.find((r) => r.role === 'superadmin')?.count ?? 0),
      admin: Number(userStats.find((r) => r.role === 'admin')?.count ?? 0),
      mentor: Number(userStats.find((r) => r.role === 'mentor')?.count ?? 0),
      mentee: Number(userStats.find((r) => r.role === 'mentee')?.count ?? 0),
    };

    // Get new users in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newUsersCount = await ctx.db
      .select({ count: count() })
      .from(users)
      .where(sql`${users.createdAt} >= ${thirtyDaysAgo}`)
      .then((result) => Number(result[0]?.count ?? 0));

    // Get new tenants in last 30 days
    const newTenantsCount = await ctx.db
      .select({ count: count() })
      .from(tenants)
      .where(sql`${tenants.createdAt} >= ${thirtyDaysAgo}`)
      .then((result) => Number(result[0]?.count ?? 0));

    return {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        disabled: disabledTenants,
        newLast30Days: newTenantsCount,
      },
      users: {
        total: totalUsers,
        byRole: usersByRole,
        newLast30Days: newUsersCount,
      },
    };
  }),

  /**
   * Get tenant list with user counts for dashboard display
   */
  getTenantOverview: superadminProcedure.query(async ({ ctx }) => {
    // Get all tenants with their user counts
    const tenantList = await ctx.db.select().from(tenants).orderBy(desc(tenants.createdAt)).limit(10);

    // Get user counts for each tenant
    const tenantsWithCounts = await Promise.all(
      tenantList.map(async (tenant) => {
        const userCount = await ctx.db
          .select({ count: count() })
          .from(users)
          .where(eq(users.tenantId, tenant.id))
          .then((result) => Number(result[0]?.count ?? 0));

        return {
          ...tenant,
          userCount,
        };
      })
    );

    return tenantsWithCounts;
  }),

  /**
   * Get recent tenant activity (newly created tenants and status changes)
   */
  getRecentActivity: superadminProcedure.query(async ({ ctx }) => {
    // Get recently created tenants
    const recentTenants = await ctx.db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        status: tenants.status,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
      })
      .from(tenants)
      .orderBy(desc(tenants.updatedAt))
      .limit(10);

    // Get recently registered users with tenant info
    const recentUsers = await ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        tenantId: users.tenantId,
        tenantName: tenants.name,
      })
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .orderBy(desc(users.createdAt))
      .limit(10);

    return {
      recentTenants,
      recentUsers,
    };
  }),

  /**
   * Get admin dashboard statistics (tenant-scoped)
   * Shows user counts by role, active classes, and overview stats
   */
  getAdminStats: adminProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;

    // Get user counts by role for this tenant (only mentors and mentees)
    const userStats = await ctx.db
      .select({
        role: users.role,
        count: count(),
      })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          or(eq(users.role, 'mentor'), eq(users.role, 'mentee'))
        )
      )
      .groupBy(users.role);

    const mentorCount = Number(userStats.find((r) => r.role === 'mentor')?.count ?? 0);
    const menteeCount = Number(userStats.find((r) => r.role === 'mentee')?.count ?? 0);
    const totalUsers = mentorCount + menteeCount;

    // Get active classes count for this tenant
    const activeClassesResult = await ctx.db
      .select({ count: count() })
      .from(classes)
      .where(and(eq(classes.tenantId, tenantId), eq(classes.status, 'active')));
    const activeClassesCount = Number(activeClassesResult[0]?.count ?? 0);

    // Get total classes count
    const totalClassesResult = await ctx.db
      .select({ count: count() })
      .from(classes)
      .where(eq(classes.tenantId, tenantId));
    const totalClassesCount = Number(totalClassesResult[0]?.count ?? 0);

    // Get pending invitations count
    const pendingInvitationsResult = await ctx.db
      .select({ count: count() })
      .from(invitations)
      .where(and(eq(invitations.tenantId, tenantId), eq(invitations.status, 'pending')));
    const pendingInvitationsCount = Number(pendingInvitationsResult[0]?.count ?? 0);

    // Get new users in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newUsersResult = await ctx.db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          sql`${users.createdAt} >= ${sevenDaysAgo}`
        )
      );
    const newUsersCount = Number(newUsersResult[0]?.count ?? 0);

    return {
      users: {
        total: totalUsers,
        mentors: mentorCount,
        mentees: menteeCount,
        newLast7Days: newUsersCount,
      },
      classes: {
        total: totalClassesCount,
        active: activeClassesCount,
      },
      invitations: {
        pending: pendingInvitationsCount,
      },
    };
  }),

  /**
   * Get recent activity for admin dashboard (tenant-scoped)
   * Shows recently registered users and invitation activity
   */
  getAdminRecentActivity: adminProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;

    // Get recently registered users in this tenant
    const recentUsers = await ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          or(eq(users.role, 'mentor'), eq(users.role, 'mentee'))
        )
      )
      .orderBy(desc(users.createdAt))
      .limit(10);

    // Get recent invitation activity
    const recentInvitations = await ctx.db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        status: invitations.status,
        createdAt: invitations.createdAt,
        updatedAt: invitations.updatedAt,
      })
      .from(invitations)
      .where(eq(invitations.tenantId, tenantId))
      .orderBy(desc(invitations.updatedAt))
      .limit(10);

    // Get recently updated classes
    const recentClasses = await ctx.db
      .select({
        id: classes.id,
        name: classes.name,
        status: classes.status,
        startDate: classes.startDate,
        createdAt: classes.createdAt,
        updatedAt: classes.updatedAt,
      })
      .from(classes)
      .where(eq(classes.tenantId, tenantId))
      .orderBy(desc(classes.updatedAt))
      .limit(5);

    // Combine into a unified activity feed
    type ActivityItem = {
      id: string;
      type: 'user_joined' | 'invitation_sent' | 'invitation_accepted' | 'class_created' | 'class_updated';
      description: string;
      timestamp: Date;
      metadata: Record<string, unknown>;
    };

    const activities: ActivityItem[] = [];

    // Add user registrations
    for (const user of recentUsers) {
      activities.push({
        id: `user-${user.id}`,
        type: 'user_joined',
        description: `${user.name || user.email} joined as ${user.role}`,
        timestamp: user.createdAt,
        metadata: { userId: user.id, email: user.email, role: user.role },
      });
    }

    // Add invitation activities
    for (const invitation of recentInvitations) {
      if (invitation.status === 'accepted') {
        activities.push({
          id: `invitation-accepted-${invitation.id}`,
          type: 'invitation_accepted',
          description: `${invitation.email} accepted invitation as ${invitation.role}`,
          timestamp: invitation.updatedAt,
          metadata: { invitationId: invitation.id, email: invitation.email, role: invitation.role },
        });
      } else if (invitation.status === 'pending') {
        activities.push({
          id: `invitation-sent-${invitation.id}`,
          type: 'invitation_sent',
          description: `Invitation sent to ${invitation.email} as ${invitation.role}`,
          timestamp: invitation.createdAt,
          metadata: { invitationId: invitation.id, email: invitation.email, role: invitation.role },
        });
      }
    }

    // Add class activities
    for (const cls of recentClasses) {
      const isNew = cls.createdAt.getTime() === cls.updatedAt.getTime();
      activities.push({
        id: `class-${cls.id}`,
        type: isNew ? 'class_created' : 'class_updated',
        description: isNew ? `Class "${cls.name}" created` : `Class "${cls.name}" updated`,
        timestamp: cls.updatedAt,
        metadata: { classId: cls.id, name: cls.name, status: cls.status },
      });
    }

    // Sort by timestamp descending and limit to 15 items
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return activities.slice(0, 15);
  }),
});
