import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  groupSessions,
  groupSessionRsvps,
  users,
  classes,
  classMembers,
} from '@/lib/db/schema';
import { eq, and, count, asc, gte, lte, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { GROUP_SESSION_MAX_DURATION_MINUTES, SESSION_DEFAULT_DURATION_MINUTES } from '@/lib/constants';

/**
 * Mentor middleware - ensures user has mentor role and extracts mentor user info
 */
const mentorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const userRoles = ctx.session.user.roles || [];

  if (!userRoles.includes('mentor') && !userRoles.includes('admin') && !userRoles.includes('superadmin')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Mentor access required' });
  }

  const [mentorUser] = await ctx.db
    .select({ id: users.id, tenantId: users.tenantId })
    .from(users)
    .where(eq(users.email, ctx.session.user.email))
    .limit(1);

  if (!mentorUser) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Mentor user not found',
    });
  }

  if (!mentorUser.tenantId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Mentor must be associated with a tenant',
    });
  }

  return next({
    ctx: {
      ...ctx,
      tenantId: mentorUser.tenantId,
      mentorUserId: mentorUser.id,
    },
  });
});

/**
 * Mentee middleware - ensures user has mentee role and extracts mentee user info
 */
const menteeProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const userRoles = ctx.session.user.roles || [];

  if (!userRoles.includes('mentee') && !userRoles.includes('admin') && !userRoles.includes('superadmin')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Mentee access required' });
  }

  const [menteeUser] = await ctx.db
    .select({ id: users.id, tenantId: users.tenantId })
    .from(users)
    .where(eq(users.email, ctx.session.user.email))
    .limit(1);

  if (!menteeUser) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Mentee user not found',
    });
  }

  if (!menteeUser.tenantId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Mentee must be associated with a tenant',
    });
  }

  return next({
    ctx: {
      ...ctx,
      tenantId: menteeUser.tenantId,
      menteeUserId: menteeUser.id,
    },
  });
});

// Input schemas
const createGroupSessionSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  agenda: z.string().optional(),
  classId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().positive().max(GROUP_SESSION_MAX_DURATION_MINUTES).optional().default(SESSION_DEFAULT_DURATION_MINUTES),
  maxParticipants: z.number().int().positive().optional(),
  location: z.string().optional(),
});

const updateGroupSessionSchema = z.object({
  sessionId: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  agenda: z.string().optional().nullable(),
  scheduledAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().positive().max(GROUP_SESSION_MAX_DURATION_MINUTES).optional(),
  maxParticipants: z.number().int().positive().optional().nullable(),
  location: z.string().optional().nullable(),
  status: z.enum(['scheduled', 'available', 'booked', 'completed', 'cancelled']).optional(),
});

const rsvpSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(['accepted', 'declined']),
  notes: z.string().optional(),
});

export const groupSessionsRouter = router({
  /**
   * Create a new group session (mentor only)
   */
  create: mentorProcedure.input(createGroupSessionSchema).mutation(async ({ ctx, input }) => {
    // If classId is provided, verify the class belongs to this mentor
    if (input.classId) {
      const [cls] = await ctx.db
        .select()
        .from(classes)
        .where(
          and(
            eq(classes.id, input.classId),
            eq(classes.mentorId, ctx.mentorUserId),
            eq(classes.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!cls) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Class not found or not authorized' });
      }
    }

    // Create the group session
    const [newSession] = await ctx.db
      .insert(groupSessions)
      .values({
        tenantId: ctx.tenantId,
        mentorId: ctx.mentorUserId,
        classId: input.classId || null,
        title: input.title,
        description: input.description || null,
        agenda: input.agenda || null,
        scheduledAt: new Date(input.scheduledAt),
        durationMinutes: input.durationMinutes,
        maxParticipants: input.maxParticipants || null,
        location: input.location || null,
        status: 'scheduled',
      })
      .returning();

    // If associated with a class, create pending RSVPs for all class members
    if (input.classId) {
      const members = await ctx.db
        .select({ userId: classMembers.userId })
        .from(classMembers)
        .where(eq(classMembers.classId, input.classId));

      if (members.length > 0) {
        await ctx.db.insert(groupSessionRsvps).values(
          members.map((member) => ({
            groupSessionId: newSession.id,
            userId: member.userId,
            status: 'pending' as const,
          }))
        );
      }
    }

    return newSession;
  }),

  /**
   * Update an existing group session (mentor only)
   */
  update: mentorProcedure.input(updateGroupSessionSchema).mutation(async ({ ctx, input }) => {
    // Verify session belongs to this mentor
    const [existingSession] = await ctx.db
      .select()
      .from(groupSessions)
      .where(
        and(
          eq(groupSessions.id, input.sessionId),
          eq(groupSessions.mentorId, ctx.mentorUserId),
          eq(groupSessions.tenantId, ctx.tenantId)
        )
      )
      .limit(1);

    if (!existingSession) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Group session not found' });
    }

    // Build update object
    const updateData: Partial<typeof groupSessions.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.agenda !== undefined) updateData.agenda = input.agenda;
    if (input.scheduledAt !== undefined) updateData.scheduledAt = new Date(input.scheduledAt);
    if (input.durationMinutes !== undefined) updateData.durationMinutes = input.durationMinutes;
    if (input.maxParticipants !== undefined) updateData.maxParticipants = input.maxParticipants;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.status !== undefined) updateData.status = input.status;

    const [updatedSession] = await ctx.db
      .update(groupSessions)
      .set(updateData)
      .where(eq(groupSessions.id, input.sessionId))
      .returning();

    return updatedSession;
  }),

  /**
   * Delete a group session (mentor only)
   */
  delete: mentorProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify session belongs to this mentor
      const [existingSession] = await ctx.db
        .select()
        .from(groupSessions)
        .where(
          and(
            eq(groupSessions.id, input.sessionId),
            eq(groupSessions.mentorId, ctx.mentorUserId),
            eq(groupSessions.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!existingSession) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Group session not found' });
      }

      // Delete the session (RSVPs will cascade delete due to foreign key)
      await ctx.db.delete(groupSessions).where(eq(groupSessions.id, input.sessionId));

      return { success: true };
    }),

  /**
   * Get all group sessions for a mentor
   */
  getMyGroupSessions: mentorProcedure
    .input(
      z
        .object({
          classId: z.string().uuid().optional(),
          status: z.enum(['scheduled', 'available', 'booked', 'completed', 'cancelled', 'all']).optional().default('all'),
          startDate: z.string().datetime().optional(),
          endDate: z.string().datetime().optional(),
          limit: z.number().int().positive().max(100).optional().default(50),
          offset: z.number().int().nonnegative().optional().default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { classId, status = 'all', startDate, endDate, limit = 50, offset = 0 } = input || {};

      // Build conditions
      const conditions = [
        eq(groupSessions.mentorId, ctx.mentorUserId),
        eq(groupSessions.tenantId, ctx.tenantId),
      ];

      if (classId) {
        conditions.push(eq(groupSessions.classId, classId));
      }

      if (status !== 'all') {
        conditions.push(eq(groupSessions.status, status));
      }

      if (startDate) {
        conditions.push(gte(groupSessions.scheduledAt, new Date(startDate)));
      }

      if (endDate) {
        conditions.push(lte(groupSessions.scheduledAt, new Date(endDate)));
      }

      // Get sessions
      const sessions = await ctx.db
        .select()
        .from(groupSessions)
        .where(and(...conditions))
        .orderBy(asc(groupSessions.scheduledAt))
        .limit(limit)
        .offset(offset);

      // Get RSVP counts for each session
      const sessionIds = sessions.map((s) => s.id);
      let rsvpCountsMap: Record<string, { pending: number; accepted: number; declined: number }> = {};

      if (sessionIds.length > 0) {
        // Get counts by status for each session
        const rsvpCounts = await ctx.db
          .select({
            groupSessionId: groupSessionRsvps.groupSessionId,
            status: groupSessionRsvps.status,
            count: count(),
          })
          .from(groupSessionRsvps)
          .where(inArray(groupSessionRsvps.groupSessionId, sessionIds))
          .groupBy(groupSessionRsvps.groupSessionId, groupSessionRsvps.status);

        // Build counts map
        rsvpCountsMap = rsvpCounts.reduce(
          (acc, rc) => {
            if (!acc[rc.groupSessionId]) {
              acc[rc.groupSessionId] = { pending: 0, accepted: 0, declined: 0 };
            }
            acc[rc.groupSessionId][rc.status] = Number(rc.count);
            return acc;
          },
          {} as typeof rsvpCountsMap
        );
      }

      // Get class names if sessions have classId
      const classIds = Array.from(new Set(sessions.filter((s) => s.classId).map((s) => s.classId!)));
      let classNamesMap: Record<string, string> = {};

      if (classIds.length > 0) {
        const classesData = await ctx.db
          .select({ id: classes.id, name: classes.name })
          .from(classes)
          .where(inArray(classes.id, classIds));

        classNamesMap = classesData.reduce(
          (acc, c) => {
            acc[c.id] = c.name;
            return acc;
          },
          {} as typeof classNamesMap
        );
      }

      // Get total count
      const [totalResult] = await ctx.db
        .select({ count: count() })
        .from(groupSessions)
        .where(and(...conditions));

      const total = Number(totalResult?.count ?? 0);

      // Enrich sessions
      const enrichedSessions = sessions.map((session) => ({
        ...session,
        className: session.classId ? classNamesMap[session.classId] || null : null,
        rsvpCounts: rsvpCountsMap[session.id] || { pending: 0, accepted: 0, declined: 0 },
      }));

      return {
        sessions: enrichedSessions,
        total,
        hasMore: offset + sessions.length < total,
      };
    }),

  /**
   * Get a single group session with full details
   */
  getGroupSessionDetail: mentorProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Get session
      const [session] = await ctx.db
        .select()
        .from(groupSessions)
        .where(
          and(
            eq(groupSessions.id, input.sessionId),
            eq(groupSessions.mentorId, ctx.mentorUserId),
            eq(groupSessions.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Group session not found' });
      }

      // Get RSVPs with user info
      const rsvps = await ctx.db
        .select({
          id: groupSessionRsvps.id,
          userId: groupSessionRsvps.userId,
          status: groupSessionRsvps.status,
          notes: groupSessionRsvps.notes,
          respondedAt: groupSessionRsvps.respondedAt,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(groupSessionRsvps)
        .innerJoin(users, eq(groupSessionRsvps.userId, users.id))
        .where(eq(groupSessionRsvps.groupSessionId, input.sessionId))
        .orderBy(asc(groupSessionRsvps.status), asc(users.name));

      // Get class name if applicable
      let className: string | null = null;
      if (session.classId) {
        const [cls] = await ctx.db
          .select({ name: classes.name })
          .from(classes)
          .where(eq(classes.id, session.classId))
          .limit(1);
        className = cls?.name || null;
      }

      // Count RSVPs by status
      const rsvpCounts = rsvps.reduce(
        (acc, r) => {
          acc[r.status]++;
          return acc;
        },
        { pending: 0, accepted: 0, declined: 0 }
      );

      return {
        ...session,
        className,
        rsvps,
        rsvpCounts,
      };
    }),

  /**
   * Invite additional mentees to a group session (mentor only)
   */
  inviteMentees: mentorProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        userIds: z.array(z.string().uuid()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify session belongs to this mentor
      const [session] = await ctx.db
        .select()
        .from(groupSessions)
        .where(
          and(
            eq(groupSessions.id, input.sessionId),
            eq(groupSessions.mentorId, ctx.mentorUserId),
            eq(groupSessions.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Group session not found' });
      }

      // Check max participants if set
      if (session.maxParticipants) {
        const [currentCount] = await ctx.db
          .select({ count: count() })
          .from(groupSessionRsvps)
          .where(eq(groupSessionRsvps.groupSessionId, input.sessionId));

        const currentTotal = Number(currentCount?.count ?? 0);
        if (currentTotal + input.userIds.length > session.maxParticipants) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot invite more participants. Max participants is ${session.maxParticipants}.`,
          });
        }
      }

      // Verify users exist and belong to same tenant
      const validUsers = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(and(inArray(users.id, input.userIds), eq(users.tenantId, ctx.tenantId)));

      const validUserIds = validUsers.map((u) => u.id);

      if (validUserIds.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No valid users found' });
      }

      // Get existing RSVPs to avoid duplicates
      const existingRsvps = await ctx.db
        .select({ userId: groupSessionRsvps.userId })
        .from(groupSessionRsvps)
        .where(
          and(
            eq(groupSessionRsvps.groupSessionId, input.sessionId),
            inArray(groupSessionRsvps.userId, validUserIds)
          )
        );

      const existingUserIds = new Set(existingRsvps.map((r) => r.userId));
      const newUserIds = validUserIds.filter((id) => !existingUserIds.has(id));

      if (newUserIds.length === 0) {
        return { invited: 0, message: 'All users are already invited' };
      }

      // Create RSVPs for new users
      await ctx.db.insert(groupSessionRsvps).values(
        newUserIds.map((userId) => ({
          groupSessionId: input.sessionId,
          userId,
          status: 'pending' as const,
        }))
      );

      return { invited: newUserIds.length, message: `Invited ${newUserIds.length} mentee(s)` };
    }),

  /**
   * RSVP to a group session (mentee only)
   */
  rsvp: menteeProcedure.input(rsvpSchema).mutation(async ({ ctx, input }) => {
    // Check if RSVP exists for this user and session
    const [existingRsvp] = await ctx.db
      .select()
      .from(groupSessionRsvps)
      .where(
        and(
          eq(groupSessionRsvps.groupSessionId, input.sessionId),
          eq(groupSessionRsvps.userId, ctx.menteeUserId)
        )
      )
      .limit(1);

    if (!existingRsvp) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'You are not invited to this session',
      });
    }

    // If accepting, check max participants
    if (input.status === 'accepted') {
      const [session] = await ctx.db
        .select({ maxParticipants: groupSessions.maxParticipants })
        .from(groupSessions)
        .where(eq(groupSessions.id, input.sessionId))
        .limit(1);

      if (session?.maxParticipants) {
        const [acceptedCount] = await ctx.db
          .select({ count: count() })
          .from(groupSessionRsvps)
          .where(
            and(
              eq(groupSessionRsvps.groupSessionId, input.sessionId),
              eq(groupSessionRsvps.status, 'accepted')
            )
          );

        const currentAccepted = Number(acceptedCount?.count ?? 0);
        // Only count if this isn't already an accepted RSVP being updated
        const willExceed = existingRsvp.status !== 'accepted' && currentAccepted >= session.maxParticipants;

        if (willExceed) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Session is at maximum capacity',
          });
        }
      }
    }

    // Update RSVP
    const [updatedRsvp] = await ctx.db
      .update(groupSessionRsvps)
      .set({
        status: input.status,
        notes: input.notes || null,
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(groupSessionRsvps.id, existingRsvp.id))
      .returning();

    return updatedRsvp;
  }),

  /**
   * Get group sessions a mentee is invited to
   */
  getMyInvitedSessions: menteeProcedure
    .input(
      z
        .object({
          status: z.enum(['pending', 'accepted', 'declined', 'all']).optional().default('all'),
          includeCompleted: z.boolean().optional().default(false),
          limit: z.number().int().positive().max(100).optional().default(50),
          offset: z.number().int().nonnegative().optional().default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { status = 'all', includeCompleted = false, limit = 50, offset = 0 } = input || {};

      // Get RSVPs for this user
      const rsvpConditions = [eq(groupSessionRsvps.userId, ctx.menteeUserId)];

      if (status !== 'all') {
        rsvpConditions.push(eq(groupSessionRsvps.status, status));
      }

      const rsvps = await ctx.db
        .select({
          rsvpId: groupSessionRsvps.id,
          rsvpStatus: groupSessionRsvps.status,
          notes: groupSessionRsvps.notes,
          respondedAt: groupSessionRsvps.respondedAt,
          session: groupSessions,
        })
        .from(groupSessionRsvps)
        .innerJoin(groupSessions, eq(groupSessionRsvps.groupSessionId, groupSessions.id))
        .where(and(...rsvpConditions))
        .orderBy(asc(groupSessions.scheduledAt))
        .limit(limit)
        .offset(offset);

      // Filter by session status if needed
      let filteredRsvps = rsvps;
      if (!includeCompleted) {
        filteredRsvps = rsvps.filter(
          (r) => r.session.status !== 'completed' && r.session.status !== 'cancelled'
        );
      }

      // Get mentor info
      const mentorIds = Array.from(new Set(filteredRsvps.map((r) => r.session.mentorId)));
      let mentorsMap: Record<string, { id: string; name: string | null; email: string }> = {};

      if (mentorIds.length > 0) {
        const mentorsData = await ctx.db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(inArray(users.id, mentorIds));

        mentorsMap = mentorsData.reduce(
          (acc, m) => {
            acc[m.id] = m;
            return acc;
          },
          {} as typeof mentorsMap
        );
      }

      // Get class names
      const classIds = Array.from(
        new Set(filteredRsvps.filter((r) => r.session.classId).map((r) => r.session.classId!))
      );
      let classNamesMap: Record<string, string> = {};

      if (classIds.length > 0) {
        const classesData = await ctx.db
          .select({ id: classes.id, name: classes.name })
          .from(classes)
          .where(inArray(classes.id, classIds));

        classNamesMap = classesData.reduce(
          (acc, c) => {
            acc[c.id] = c.name;
            return acc;
          },
          {} as typeof classNamesMap
        );
      }

      // Enrich response
      const enrichedSessions = filteredRsvps.map((r) => ({
        rsvpId: r.rsvpId,
        rsvpStatus: r.rsvpStatus,
        rsvpNotes: r.notes,
        respondedAt: r.respondedAt,
        session: {
          ...r.session,
          className: r.session.classId ? classNamesMap[r.session.classId] || null : null,
          mentor: mentorsMap[r.session.mentorId] || null,
        },
      }));

      return {
        sessions: enrichedSessions,
        total: filteredRsvps.length,
      };
    }),

  /**
   * Get mentor's classes for dropdown selection
   */
  getMentorClasses: mentorProcedure.query(async ({ ctx }) => {
    const mentorClasses = await ctx.db
      .select({ id: classes.id, name: classes.name })
      .from(classes)
      .where(
        and(
          eq(classes.mentorId, ctx.mentorUserId),
          eq(classes.tenantId, ctx.tenantId),
          eq(classes.status, 'active')
        )
      )
      .orderBy(asc(classes.name));

    return mentorClasses;
  }),

  /**
   * Get class members for inviting to a session
   */
  getClassMembers: mentorProcedure
    .input(z.object({ classId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify class belongs to this mentor
      const [cls] = await ctx.db
        .select()
        .from(classes)
        .where(
          and(
            eq(classes.id, input.classId),
            eq(classes.mentorId, ctx.mentorUserId),
            eq(classes.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!cls) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Class not found' });
      }

      // Get class members with user info
      const members = await ctx.db
        .select({
          id: classMembers.id,
          userId: classMembers.userId,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(classMembers)
        .innerJoin(users, eq(classMembers.userId, users.id))
        .where(eq(classMembers.classId, input.classId))
        .orderBy(asc(users.name));

      return members;
    }),
});
