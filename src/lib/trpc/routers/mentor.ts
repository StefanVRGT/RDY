import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { classes, classMembers, users, scheduledExercises, exercises, mentorAvailability, diaryEntries, trackingEntries, reflectionEntries, schwerpunktebenen } from '@/lib/db/schema';
import { eq, and, count, desc, asc, gte, lte, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

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

export const mentorRouter = router({
  /**
   * Get mentor dashboard stats
   */
  getDashboardStats: mentorProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Get total classes for this mentor
    const [classCountResult] = await ctx.db
      .select({ count: count() })
      .from(classes)
      .where(
        and(
          eq(classes.mentorId, ctx.mentorUserId),
          eq(classes.tenantId, ctx.tenantId),
          eq(classes.status, 'active')
        )
      );

    const totalClasses = Number(classCountResult?.count ?? 0);

    // Get all class IDs for this mentor
    const mentorClasses = await ctx.db
      .select({ id: classes.id })
      .from(classes)
      .where(
        and(
          eq(classes.mentorId, ctx.mentorUserId),
          eq(classes.tenantId, ctx.tenantId)
        )
      );

    const classIds = mentorClasses.map(c => c.id);

    // Get total active mentees across all classes
    let totalMentees = 0;
    if (classIds.length > 0) {
      const [menteeCountResult] = await ctx.db
        .select({ count: count() })
        .from(classMembers)
        .where(inArray(classMembers.classId, classIds));
      totalMentees = Number(menteeCountResult?.count ?? 0);
    }

    // Count scheduled exercises for today (sessions today)
    let sessionsToday = 0;
    if (classIds.length > 0) {
      const [sessionsResult] = await ctx.db
        .select({ count: count() })
        .from(scheduledExercises)
        .where(
          and(
            inArray(scheduledExercises.classId, classIds),
            gte(scheduledExercises.scheduledAt, startOfDay),
            lte(scheduledExercises.scheduledAt, endOfDay)
          )
        );
      sessionsToday = Number(sessionsResult?.count ?? 0);
    }

    // Calculate completion rate from scheduled exercises
    let completionRate = 0;
    if (classIds.length > 0) {
      const [totalExercises] = await ctx.db
        .select({ count: count() })
        .from(scheduledExercises)
        .where(inArray(scheduledExercises.classId, classIds));

      const [completedExercises] = await ctx.db
        .select({ count: count() })
        .from(scheduledExercises)
        .where(
          and(
            inArray(scheduledExercises.classId, classIds),
            eq(scheduledExercises.completed, true)
          )
        );

      const total = Number(totalExercises?.count ?? 0);
      const completed = Number(completedExercises?.count ?? 0);
      completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    return {
      totalClasses,
      totalMentees,
      sessionsToday,
      completionRate,
    };
  }),

  /**
   * Get mentor's classes with mentee counts
   */
  getMyClasses: mentorProcedure
    .input(
      z.object({
        status: z.enum(['active', 'disabled', 'all']).optional().default('active'),
        sortBy: z.enum(['name', 'startDate', 'endDate', 'createdAt']).optional().default('startDate'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { status = 'active', sortBy = 'startDate', sortOrder = 'asc' } = input || {};

      // Build where conditions
      const conditions = [
        eq(classes.mentorId, ctx.mentorUserId),
        eq(classes.tenantId, ctx.tenantId),
      ];

      if (status !== 'all') {
        conditions.push(eq(classes.status, status));
      }

      // Build sort order
      const orderColumn =
        sortBy === 'name'
          ? classes.name
          : sortBy === 'startDate'
            ? classes.startDate
            : sortBy === 'endDate'
              ? classes.endDate
              : classes.createdAt;
      const orderDirection = sortOrder === 'asc' ? asc : desc;

      const whereClause = and(...conditions);

      const classesList = await ctx.db
        .select()
        .from(classes)
        .where(whereClause)
        .orderBy(orderDirection(orderColumn));

      // Get member count for each class
      const classIds = classesList.map(c => c.id);
      let memberCountsMap: Record<string, number> = {};

      if (classIds.length > 0) {
        const memberCounts = await ctx.db
          .select({
            classId: classMembers.classId,
            count: count(),
          })
          .from(classMembers)
          .where(inArray(classMembers.classId, classIds))
          .groupBy(classMembers.classId);

        memberCountsMap = memberCounts.reduce(
          (acc, mc) => {
            acc[mc.classId] = Number(mc.count);
            return acc;
          },
          {} as typeof memberCountsMap
        );
      }

      // Enrich class list with member count
      const enrichedClasses = classesList.map(cls => ({
        ...cls,
        memberCount: memberCountsMap[cls.id] || 0,
      }));

      return enrichedClasses;
    }),

  /**
   * Get today's sessions (scheduled exercises for mentor's classes)
   */
  getTodaysSessions: mentorProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Get all class IDs for this mentor
    const mentorClasses = await ctx.db
      .select({ id: classes.id, name: classes.name })
      .from(classes)
      .where(
        and(
          eq(classes.mentorId, ctx.mentorUserId),
          eq(classes.tenantId, ctx.tenantId)
        )
      );

    if (mentorClasses.length === 0) {
      return [];
    }

    const classIds = mentorClasses.map(c => c.id);
    const classNamesMap = mentorClasses.reduce(
      (acc, c) => {
        acc[c.id] = c.name;
        return acc;
      },
      {} as Record<string, string>
    );

    // Get scheduled exercises for today
    const sessions = await ctx.db
      .select({
        id: scheduledExercises.id,
        scheduledAt: scheduledExercises.scheduledAt,
        completed: scheduledExercises.completed,
        classId: scheduledExercises.classId,
        userId: scheduledExercises.userId,
        notes: scheduledExercises.notes,
      })
      .from(scheduledExercises)
      .where(
        and(
          inArray(scheduledExercises.classId, classIds),
          gte(scheduledExercises.scheduledAt, startOfDay),
          lte(scheduledExercises.scheduledAt, endOfDay)
        )
      )
      .orderBy(asc(scheduledExercises.scheduledAt));

    // Get user info for sessions
    const userIds = Array.from(new Set(sessions.map(s => s.userId)));
    let usersMap: Record<string, { id: string; name: string | null; email: string }> = {};

    if (userIds.length > 0) {
      const usersData = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(inArray(users.id, userIds));

      usersMap = usersData.reduce(
        (acc, u) => {
          acc[u.id] = u;
          return acc;
        },
        {} as typeof usersMap
      );
    }

    // Enrich sessions with user and class info
    return sessions.map(session => ({
      ...session,
      className: classNamesMap[session.classId] || 'Unknown Class',
      mentee: usersMap[session.userId] || null,
    }));
  }),

  /**
   * Get upcoming sessions (next 7 days)
   */
  getUpcomingSessions: mentorProcedure
    .input(
      z.object({
        days: z.number().int().positive().max(30).optional().default(7),
        limit: z.number().int().positive().max(50).optional().default(10),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { days = 7, limit = 10 } = input || {};
      const now = new Date();
      const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      // Get all class IDs for this mentor
      const mentorClasses = await ctx.db
        .select({ id: classes.id, name: classes.name })
        .from(classes)
        .where(
          and(
            eq(classes.mentorId, ctx.mentorUserId),
            eq(classes.tenantId, ctx.tenantId),
            eq(classes.status, 'active')
          )
        );

      if (mentorClasses.length === 0) {
        return [];
      }

      const classIds = mentorClasses.map(c => c.id);
      const classNamesMap = mentorClasses.reduce(
        (acc, c) => {
          acc[c.id] = c.name;
          return acc;
        },
        {} as Record<string, string>
      );

      // Get upcoming scheduled exercises
      const sessions = await ctx.db
        .select({
          id: scheduledExercises.id,
          scheduledAt: scheduledExercises.scheduledAt,
          completed: scheduledExercises.completed,
          classId: scheduledExercises.classId,
          userId: scheduledExercises.userId,
          notes: scheduledExercises.notes,
        })
        .from(scheduledExercises)
        .where(
          and(
            inArray(scheduledExercises.classId, classIds),
            gte(scheduledExercises.scheduledAt, now),
            lte(scheduledExercises.scheduledAt, endDate),
            eq(scheduledExercises.completed, false)
          )
        )
        .orderBy(asc(scheduledExercises.scheduledAt))
        .limit(limit);

      // Get user info for sessions
      const userIds = Array.from(new Set(sessions.map(s => s.userId)));
      let usersMap: Record<string, { id: string; name: string | null; email: string }> = {};

      if (userIds.length > 0) {
        const usersData = await ctx.db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(inArray(users.id, userIds));

        usersMap = usersData.reduce(
          (acc, u) => {
            acc[u.id] = u;
            return acc;
          },
          {} as typeof usersMap
        );
      }

      // Enrich sessions with user and class info
      return sessions.map(session => ({
        ...session,
        className: classNamesMap[session.classId] || 'Unknown Class',
        mentee: usersMap[session.userId] || null,
      }));
    }),

  /**
   * Get sessions for a date range (for calendar view)
   */
  getSessionsForDateRange: mentorProcedure
    .input(
      z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      // Get all class IDs for this mentor
      const mentorClasses = await ctx.db
        .select({ id: classes.id, name: classes.name })
        .from(classes)
        .where(
          and(
            eq(classes.mentorId, ctx.mentorUserId),
            eq(classes.tenantId, ctx.tenantId)
          )
        );

      if (mentorClasses.length === 0) {
        return [];
      }

      const classIds = mentorClasses.map(c => c.id);
      const classNamesMap = mentorClasses.reduce(
        (acc, c) => {
          acc[c.id] = c.name;
          return acc;
        },
        {} as Record<string, string>
      );

      // Get scheduled exercises in the date range
      const sessions = await ctx.db
        .select({
          id: scheduledExercises.id,
          scheduledAt: scheduledExercises.scheduledAt,
          completed: scheduledExercises.completed,
          classId: scheduledExercises.classId,
          userId: scheduledExercises.userId,
          notes: scheduledExercises.notes,
        })
        .from(scheduledExercises)
        .where(
          and(
            inArray(scheduledExercises.classId, classIds),
            gte(scheduledExercises.scheduledAt, startDate),
            lte(scheduledExercises.scheduledAt, endDate)
          )
        )
        .orderBy(asc(scheduledExercises.scheduledAt));

      // Get user info for sessions
      const userIds = Array.from(new Set(sessions.map(s => s.userId)));
      let usersMap: Record<string, { id: string; name: string | null; email: string }> = {};

      if (userIds.length > 0) {
        const usersData = await ctx.db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(inArray(users.id, userIds));

        usersMap = usersData.reduce(
          (acc, u) => {
            acc[u.id] = u;
            return acc;
          },
          {} as typeof usersMap
        );
      }

      // Enrich sessions with user and class info
      return sessions.map(session => ({
        ...session,
        className: classNamesMap[session.classId] || 'Unknown Class',
        mentee: usersMap[session.userId] || null,
      }));
    }),

  /**
   * Create a new scheduled session
   */
  createSession: mentorProcedure
    .input(
      z.object({
        classId: z.string().uuid(),
        userId: z.string().uuid(),
        exerciseId: z.string().uuid().optional(),
        scheduledAt: z.string().datetime(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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

      // Verify user is a member of this class
      const [membership] = await ctx.db
        .select()
        .from(classMembers)
        .where(
          and(
            eq(classMembers.classId, input.classId),
            eq(classMembers.userId, input.userId)
          )
        )
        .limit(1);

      if (!membership) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User is not a member of this class' });
      }

      // Get a default exercise if not provided (for now, use first available exercise)
      let exerciseId = input.exerciseId;
      if (!exerciseId) {
        const [defaultExercise] = await ctx.db
          .select({ id: exercises.id })
          .from(exercises)
          .where(eq(exercises.tenantId, ctx.tenantId))
          .limit(1);

        if (!defaultExercise) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'No exercises available' });
        }
        exerciseId = defaultExercise.id;
      }

      // Create the session
      const [newSession] = await ctx.db
        .insert(scheduledExercises)
        .values({
          userId: input.userId,
          exerciseId,
          classId: input.classId,
          scheduledAt: new Date(input.scheduledAt),
          notes: input.notes || null,
          completed: false,
        })
        .returning();

      return newSession;
    }),

  /**
   * Get class details with members
   */
  getClassDetail: mentorProcedure
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
          classId: classMembers.classId,
          userId: classMembers.userId,
          enrolledAt: classMembers.enrolledAt,
          completedAt: classMembers.completedAt,
          paid: classMembers.paid,
          amount: classMembers.amount,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(classMembers)
        .innerJoin(users, eq(classMembers.userId, users.id))
        .where(eq(classMembers.classId, input.classId))
        .orderBy(desc(classMembers.enrolledAt));

      return {
        ...cls,
        members,
        memberCount: members.length,
      };
    }),

  /**
   * Get mentor's availability slots
   */
  getAvailabilitySlots: mentorProcedure
    .input(
      z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        includeRecurring: z.boolean().optional().default(true),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, includeRecurring = true } = input || {};

      // Build conditions
      const conditions = [
        eq(mentorAvailability.mentorId, ctx.mentorUserId),
        eq(mentorAvailability.tenantId, ctx.tenantId),
      ];

      // Add date range filter for non-recurring slots
      if (startDate) {
        conditions.push(gte(mentorAvailability.startTime, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(mentorAvailability.endTime, new Date(endDate)));
      }

      // Get non-recurring slots
      const nonRecurringSlots = await ctx.db
        .select()
        .from(mentorAvailability)
        .where(
          and(
            ...conditions,
            eq(mentorAvailability.isRecurring, false)
          )
        )
        .orderBy(asc(mentorAvailability.startTime));

      // Get recurring slots if requested
      let recurringSlots: typeof nonRecurringSlots = [];
      if (includeRecurring) {
        recurringSlots = await ctx.db
          .select()
          .from(mentorAvailability)
          .where(
            and(
              eq(mentorAvailability.mentorId, ctx.mentorUserId),
              eq(mentorAvailability.tenantId, ctx.tenantId),
              eq(mentorAvailability.isRecurring, true)
            )
          )
          .orderBy(asc(mentorAvailability.dayOfWeek), asc(mentorAvailability.recurringStartTime));
      }

      return {
        slots: nonRecurringSlots,
        recurringSlots,
      };
    }),

  /**
   * Add a new availability slot
   */
  addAvailabilitySlot: mentorProcedure
    .input(
      z.object({
        startTime: z.string().datetime(),
        endTime: z.string().datetime(),
        isRecurring: z.boolean().optional().default(false),
        dayOfWeek: z.number().int().min(0).max(6).optional(),
        recurringStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        recurringEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        validFrom: z.string().datetime().optional(),
        validUntil: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate end time is after start time
      const startTime = new Date(input.startTime);
      const endTime = new Date(input.endTime);

      if (endTime <= startTime) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'End time must be after start time',
        });
      }

      // Validate recurring slot fields
      if (input.isRecurring) {
        if (input.dayOfWeek === undefined || !input.recurringStartTime || !input.recurringEndTime) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Recurring slots require dayOfWeek, recurringStartTime, and recurringEndTime',
          });
        }
      }

      // Create the slot
      const [newSlot] = await ctx.db
        .insert(mentorAvailability)
        .values({
          mentorId: ctx.mentorUserId,
          tenantId: ctx.tenantId,
          startTime,
          endTime,
          isRecurring: input.isRecurring,
          dayOfWeek: input.dayOfWeek ?? null,
          recurringStartTime: input.recurringStartTime ?? null,
          recurringEndTime: input.recurringEndTime ?? null,
          validFrom: input.validFrom ? new Date(input.validFrom) : null,
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
        })
        .returning();

      return newSlot;
    }),

  /**
   * Delete an availability slot
   */
  deleteAvailabilitySlot: mentorProcedure
    .input(z.object({ slotId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify slot belongs to this mentor
      const [slot] = await ctx.db
        .select()
        .from(mentorAvailability)
        .where(
          and(
            eq(mentorAvailability.id, input.slotId),
            eq(mentorAvailability.mentorId, ctx.mentorUserId),
            eq(mentorAvailability.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!slot) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Availability slot not found',
        });
      }

      // Delete the slot
      await ctx.db
        .delete(mentorAvailability)
        .where(eq(mentorAvailability.id, input.slotId));

      return { success: true };
    }),

  /**
   * Get mentee progress for a specific class
   */
  getMenteeProgress: mentorProcedure
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

      // Get all class members with user info
      const members = await ctx.db
        .select({
          id: classMembers.id,
          userId: classMembers.userId,
          enrolledAt: classMembers.enrolledAt,
          completedAt: classMembers.completedAt,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(classMembers)
        .innerJoin(users, eq(classMembers.userId, users.id))
        .where(eq(classMembers.classId, input.classId));

      // Get session stats for each member
      const memberProgress = await Promise.all(
        members.map(async (member) => {
          // Count total and completed scheduled exercises for this member in this class
          const [totalResult] = await ctx.db
            .select({ count: count() })
            .from(scheduledExercises)
            .where(
              and(
                eq(scheduledExercises.classId, input.classId),
                eq(scheduledExercises.userId, member.userId)
              )
            );

          const [completedResult] = await ctx.db
            .select({ count: count() })
            .from(scheduledExercises)
            .where(
              and(
                eq(scheduledExercises.classId, input.classId),
                eq(scheduledExercises.userId, member.userId),
                eq(scheduledExercises.completed, true)
              )
            );

          const totalSessions = Number(totalResult?.count ?? 0);
          const completedSessions = Number(completedResult?.count ?? 0);
          const progressPercentage = totalSessions > 0
            ? Math.round((completedSessions / totalSessions) * 100)
            : 0;

          // Calculate current level based on enrollment date (21 days per level)
          const enrolledDate = new Date(member.enrolledAt);
          const now = new Date();
          const daysElapsed = Math.floor(
            (now.getTime() - enrolledDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          const currentMonth = Math.min(Math.floor(daysElapsed / 21) + 1, cls.durationLevels);

          return {
            id: member.id,
            userId: member.userId,
            user: member.user,
            enrolledAt: member.enrolledAt,
            completedAt: member.completedAt,
            totalSessions,
            completedSessions,
            progressPercentage,
            currentMonth,
            totalLevels: cls.durationLevels,
          };
        })
      );

      return memberProgress;
    }),

  /**
   * Get session history for a class
   */
  getClassSessionHistory: mentorProcedure
    .input(
      z.object({
        classId: z.string().uuid(),
        limit: z.number().int().positive().max(100).optional().default(50),
        offset: z.number().int().nonnegative().optional().default(0),
      })
    )
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

      // Get session history for this class
      const sessions = await ctx.db
        .select({
          id: scheduledExercises.id,
          scheduledAt: scheduledExercises.scheduledAt,
          completed: scheduledExercises.completed,
          completedAt: scheduledExercises.completedAt,
          userId: scheduledExercises.userId,
          exerciseId: scheduledExercises.exerciseId,
          notes: scheduledExercises.notes,
        })
        .from(scheduledExercises)
        .where(eq(scheduledExercises.classId, input.classId))
        .orderBy(desc(scheduledExercises.scheduledAt))
        .limit(input.limit)
        .offset(input.offset);

      // Get user info for sessions
      const userIds = Array.from(new Set(sessions.map(s => s.userId)));
      let usersMap: Record<string, { id: string; name: string | null; email: string }> = {};

      if (userIds.length > 0) {
        const usersData = await ctx.db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(inArray(users.id, userIds));

        usersMap = usersData.reduce(
          (acc, u) => {
            acc[u.id] = u;
            return acc;
          },
          {} as typeof usersMap
        );
      }

      // Get exercise info
      const exerciseIds = Array.from(new Set(sessions.map(s => s.exerciseId)));
      let exercisesMap: Record<string, { id: string; titleDe: string; titleEn: string | null }> = {};

      if (exerciseIds.length > 0) {
        const exercisesData = await ctx.db
          .select({
            id: exercises.id,
            titleDe: exercises.titleDe,
            titleEn: exercises.titleEn,
          })
          .from(exercises)
          .where(inArray(exercises.id, exerciseIds));

        exercisesMap = exercisesData.reduce(
          (acc, e) => {
            acc[e.id] = e;
            return acc;
          },
          {} as typeof exercisesMap
        );
      }

      // Get total count for pagination
      const [totalResult] = await ctx.db
        .select({ count: count() })
        .from(scheduledExercises)
        .where(eq(scheduledExercises.classId, input.classId));

      const total = Number(totalResult?.count ?? 0);

      // Enrich sessions with user and exercise info
      const enrichedSessions = sessions.map(session => ({
        ...session,
        mentee: usersMap[session.userId] || null,
        exercise: exercisesMap[session.exerciseId] || null,
      }));

      return {
        sessions: enrichedSessions,
        total,
        hasMore: input.offset + sessions.length < total,
      };
    }),

  /**
   * Update an availability slot
   */
  updateAvailabilitySlot: mentorProcedure
    .input(
      z.object({
        slotId: z.string().uuid(),
        startTime: z.string().datetime().optional(),
        endTime: z.string().datetime().optional(),
        dayOfWeek: z.number().int().min(0).max(6).optional(),
        recurringStartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        recurringEndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        validFrom: z.string().datetime().optional(),
        validUntil: z.string().datetime().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify slot belongs to this mentor
      const [existingSlot] = await ctx.db
        .select()
        .from(mentorAvailability)
        .where(
          and(
            eq(mentorAvailability.id, input.slotId),
            eq(mentorAvailability.mentorId, ctx.mentorUserId),
            eq(mentorAvailability.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!existingSlot) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Availability slot not found',
        });
      }

      // Build update object
      const updateData: Partial<typeof mentorAvailability.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (input.startTime) {
        updateData.startTime = new Date(input.startTime);
      }
      if (input.endTime) {
        updateData.endTime = new Date(input.endTime);
      }
      if (input.dayOfWeek !== undefined) {
        updateData.dayOfWeek = input.dayOfWeek;
      }
      if (input.recurringStartTime !== undefined) {
        updateData.recurringStartTime = input.recurringStartTime;
      }
      if (input.recurringEndTime !== undefined) {
        updateData.recurringEndTime = input.recurringEndTime;
      }
      if (input.validFrom !== undefined) {
        updateData.validFrom = new Date(input.validFrom);
      }
      if (input.validUntil !== undefined) {
        updateData.validUntil = input.validUntil ? new Date(input.validUntil) : null;
      }

      // Validate times if both are provided
      const startTime = input.startTime ? new Date(input.startTime) : existingSlot.startTime;
      const endTime = input.endTime ? new Date(input.endTime) : existingSlot.endTime;

      if (endTime <= startTime) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'End time must be after start time',
        });
      }

      // Update the slot
      const [updatedSlot] = await ctx.db
        .update(mentorAvailability)
        .set(updateData)
        .where(eq(mentorAvailability.id, input.slotId))
        .returning();

      return updatedSlot;
    }),

  /**
   * Bulk add recurring availability slots
   */
  bulkAddRecurringSlots: mentorProcedure
    .input(
      z.object({
        slots: z.array(
          z.object({
            dayOfWeek: z.number().int().min(0).max(6),
            startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
          })
        ).min(1),
        validFrom: z.string().datetime(),
        validUntil: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const validFrom = new Date(input.validFrom);
      const validUntil = input.validUntil ? new Date(input.validUntil) : null;

      // Generate slots to insert
      const slotsToInsert = input.slots.map(slot => {
        // Create start and end timestamps based on validFrom date and slot times
        const [startHour, startMin] = slot.startTime.split(':').map(Number);
        const [endHour, endMin] = slot.endTime.split(':').map(Number);

        const startTime = new Date(validFrom);
        startTime.setHours(startHour, startMin, 0, 0);

        const endTime = new Date(validFrom);
        endTime.setHours(endHour, endMin, 0, 0);

        return {
          mentorId: ctx.mentorUserId,
          tenantId: ctx.tenantId,
          startTime,
          endTime,
          isRecurring: true,
          dayOfWeek: slot.dayOfWeek,
          recurringStartTime: slot.startTime,
          recurringEndTime: slot.endTime,
          validFrom,
          validUntil,
        };
      });

      // Insert all slots
      const newSlots = await ctx.db
        .insert(mentorAvailability)
        .values(slotsToInsert)
        .returning();

      return newSlots;
    }),

  /**
   * Get mentees in mentor's classes (for diary filter)
   * Returns all mentees across all classes the mentor teaches
   */
  getMyMentees: mentorProcedure.query(async ({ ctx }) => {
    // Get all class IDs for this mentor
    const mentorClasses = await ctx.db
      .select({ id: classes.id, name: classes.name })
      .from(classes)
      .where(
        and(
          eq(classes.mentorId, ctx.mentorUserId),
          eq(classes.tenantId, ctx.tenantId)
        )
      );

    if (mentorClasses.length === 0) {
      return [];
    }

    const classIds = mentorClasses.map(c => c.id);
    const classNamesMap = mentorClasses.reduce(
      (acc, c) => {
        acc[c.id] = c.name;
        return acc;
      },
      {} as Record<string, string>
    );

    // Get all members across all classes with user info
    const members = await ctx.db
      .select({
        classId: classMembers.classId,
        userId: classMembers.userId,
        enrolledAt: classMembers.enrolledAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(classMembers)
      .innerJoin(users, eq(classMembers.userId, users.id))
      .where(inArray(classMembers.classId, classIds))
      .orderBy(asc(users.name));

    // Enrich with class name
    return members.map(member => ({
      ...member,
      className: classNamesMap[member.classId] || 'Unknown Class',
    }));
  }),

  /**
   * Get diary entries for a specific mentee
   * Validates that the mentor has access to the mentee (through class membership)
   * Read-only access - no create/update/delete
   */
  getMenteeDiaryEntries: mentorProcedure
    .input(
      z.object({
        menteeId: z.string().uuid(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify mentor has access to this mentee (mentee must be in one of mentor's classes)
      const mentorClasses = await ctx.db
        .select({ id: classes.id })
        .from(classes)
        .where(
          and(
            eq(classes.mentorId, ctx.mentorUserId),
            eq(classes.tenantId, ctx.tenantId)
          )
        );

      if (mentorClasses.length === 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have any classes',
        });
      }

      const classIds = mentorClasses.map(c => c.id);

      // Check if the mentee is in any of the mentor's classes
      const [membership] = await ctx.db
        .select()
        .from(classMembers)
        .where(
          and(
            eq(classMembers.userId, input.menteeId),
            inArray(classMembers.classId, classIds)
          )
        )
        .limit(1);

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this mentee',
        });
      }

      // Check that the mentee has enabled diary sharing
      const [menteeUser] = await ctx.db
        .select({ shareDiaryWithMentor: users.shareDiaryWithMentor })
        .from(users)
        .where(eq(users.id, input.menteeId))
        .limit(1);

      if (!menteeUser?.shareDiaryWithMentor) {
        // Return empty — diary not shared, don't reveal entries exist
        return { entries: [], total: 0, hasMore: false, diaryNotShared: true };
      }

      // Build query conditions
      const conditions = [eq(diaryEntries.userId, input.menteeId)];

      if (input.startDate) {
        conditions.push(gte(diaryEntries.entryDate, new Date(input.startDate)));
      }

      if (input.endDate) {
        conditions.push(lte(diaryEntries.entryDate, new Date(input.endDate)));
      }

      const orderBy = input.sortOrder === 'asc'
        ? asc(diaryEntries.entryDate)
        : desc(diaryEntries.entryDate);

      // Get diary entries for this mentee
      const entries = await ctx.db
        .select({
          id: diaryEntries.id,
          entryType: diaryEntries.entryType,
          content: diaryEntries.content,
          voiceRecordingUrl: diaryEntries.voiceRecordingUrl,
          voiceRecordingDuration: diaryEntries.voiceRecordingDuration,
          entryDate: diaryEntries.entryDate,
          createdAt: diaryEntries.createdAt,
          updatedAt: diaryEntries.updatedAt,
        })
        .from(diaryEntries)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset);

      return { entries, total: entries.length, hasMore: false, diaryNotShared: false };
    }),

  /**
   * Get diary entries count for a mentee (for calendar highlighting)
   * Validates that the mentor has access to the mentee
   */
  getMenteeDiaryEntriesCount: mentorProcedure
    .input(
      z.object({
        menteeId: z.string().uuid(),
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify mentor has access to this mentee
      const mentorClasses = await ctx.db
        .select({ id: classes.id })
        .from(classes)
        .where(
          and(
            eq(classes.mentorId, ctx.mentorUserId),
            eq(classes.tenantId, ctx.tenantId)
          )
        );

      if (mentorClasses.length === 0) {
        return {};
      }

      const classIds = mentorClasses.map(c => c.id);

      // Check if the mentee is in any of the mentor's classes
      const [membership] = await ctx.db
        .select()
        .from(classMembers)
        .where(
          and(
            eq(classMembers.userId, input.menteeId),
            inArray(classMembers.classId, classIds)
          )
        )
        .limit(1);

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this mentee',
        });
      }

      // Check diary sharing permission
      const [menteeUser] = await ctx.db
        .select({ shareDiaryWithMentor: users.shareDiaryWithMentor })
        .from(users)
        .where(eq(users.id, input.menteeId))
        .limit(1);

      if (!menteeUser?.shareDiaryWithMentor) {
        return {};
      }

      // Get entries in date range
      const entries = await ctx.db
        .select({
          entryDate: diaryEntries.entryDate,
        })
        .from(diaryEntries)
        .where(
          and(
            eq(diaryEntries.userId, input.menteeId),
            gte(diaryEntries.entryDate, new Date(input.startDate)),
            lte(diaryEntries.entryDate, new Date(input.endDate))
          )
        );

      // Group by date and count
      const countByDate: Record<string, number> = {};
      for (const entry of entries) {
        const dateKey = entry.entryDate.toISOString().split('T')[0];
        countByDate[dateKey] = (countByDate[dateKey] || 0) + 1;
      }

      return countByDate;
    }),

  /**
   * Get mentee info for diary view header
   * Returns mentee name and class info
   */
  getMenteeInfo: mentorProcedure
    .input(z.object({ menteeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify mentor has access to this mentee
      const mentorClasses = await ctx.db
        .select({ id: classes.id, name: classes.name })
        .from(classes)
        .where(
          and(
            eq(classes.mentorId, ctx.mentorUserId),
            eq(classes.tenantId, ctx.tenantId)
          )
        );

      if (mentorClasses.length === 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have any classes',
        });
      }

      const classIds = mentorClasses.map(c => c.id);
      const classNamesMap = mentorClasses.reduce(
        (acc, c) => {
          acc[c.id] = c.name;
          return acc;
        },
        {} as Record<string, string>
      );

      // Get mentee's class memberships in mentor's classes
      const memberships = await ctx.db
        .select({
          classId: classMembers.classId,
          enrolledAt: classMembers.enrolledAt,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(classMembers)
        .innerJoin(users, eq(classMembers.userId, users.id))
        .where(
          and(
            eq(classMembers.userId, input.menteeId),
            inArray(classMembers.classId, classIds)
          )
        );

      if (memberships.length === 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this mentee',
        });
      }

      const mentee = memberships[0].user;
      const classes_enrolled = memberships.map(m => ({
        classId: m.classId,
        className: classNamesMap[m.classId] || 'Unknown Class',
        enrolledAt: m.enrolledAt,
      }));

      return {
        id: mentee.id,
        name: mentee.name,
        email: mentee.email,
        classes: classes_enrolled,
      };
    }),

  /**
   * Get a mentee's tracking categories
   */
  getMenteeTrackingCategories: mentorProcedure
    .input(z.object({ menteeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select({ trackingCategories: users.trackingCategories })
        .from(users)
        .where(eq(users.id, input.menteeId))
        .limit(1);

      return (user?.trackingCategories as Array<{ key: string; label: string; emoji: string }>) || null;
    }),

  /**
   * Set tracking categories for a mentee
   */
  setMenteeTrackingCategories: mentorProcedure
    .input(
      z.object({
        menteeId: z.string().uuid(),
        categories: z.array(
          z.object({
            key: z.string().min(1).max(50),
            label: z.string().min(1).max(100),
            emoji: z.string().max(10).default('📌'),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set({
          trackingCategories: input.categories,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.menteeId));

      return { success: true };
    }),

  /**
   * Get a mentee's tracking entries for a date range (for tracking curves)
   */
  getMenteeTracking: mentorProcedure
    .input(
      z.object({
        menteeId: z.string().uuid(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const start = new Date(input.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(input.endDate);
      end.setHours(23, 59, 59, 999);

      return ctx.db
        .select({
          id: trackingEntries.id,
          entryDate: trackingEntries.entryDate,
          category: trackingEntries.category,
          value: trackingEntries.value,
          recordedAt: trackingEntries.recordedAt,
        })
        .from(trackingEntries)
        .where(
          and(
            eq(trackingEntries.userId, input.menteeId),
            gte(trackingEntries.entryDate, start),
            lte(trackingEntries.entryDate, end)
          )
        )
        .orderBy(asc(trackingEntries.recordedAt));
    }),

  /**
   * Get a mentee's submitted reflections
   */
  getMenteeReflections: mentorProcedure
    .input(z.object({ menteeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db
        .select({
          id: reflectionEntries.id,
          schwerpunktebeneId: reflectionEntries.schwerpunktebeneId,
          responses: reflectionEntries.responses,
          submittedAt: reflectionEntries.submittedAt,
          mentorFeedback: reflectionEntries.mentorFeedback,
          mentorFeedbackAt: reflectionEntries.mentorFeedbackAt,
          moduleTitleDe: schwerpunktebenen.titleDe,
          moduleTitleEn: schwerpunktebenen.titleEn,
        })
        .from(reflectionEntries)
        .innerJoin(schwerpunktebenen, eq(reflectionEntries.schwerpunktebeneId, schwerpunktebenen.id))
        .where(eq(reflectionEntries.userId, input.menteeId))
        .orderBy(desc(reflectionEntries.createdAt));

      return entries;
    }),

  /**
   * Save mentor feedback on a reflection
   */
  saveReflectionFeedback: mentorProcedure
    .input(z.object({
      reflectionId: z.string().uuid(),
      feedback: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(reflectionEntries)
        .set({
          mentorFeedback: input.feedback,
          mentorFeedbackAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(reflectionEntries.id, input.reflectionId));

      return { success: true };
    }),
});
