import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  mentorAvailability,
  mentoringSessions,
  users,
  classMembers,
  classes,
} from '@/lib/db/schema';
import { eq, and, gte, lte, inArray, count, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { SESSION_MIN_DURATION_MINUTES, SESSION_MAX_DURATION_MINUTES, SESSION_DEFAULT_DURATION_MINUTES } from '@/lib/constants';

// Session status enum matching the schema
const sessionStatusEnum = z.enum(['scheduled', 'available', 'booked', 'completed', 'cancelled']);

/**
 * Mentee booking middleware - ensures user has mentee role and extracts mentee user info
 */
const bookingProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const userRoles = ctx.session.user.roles || [];

  // Allow mentee, mentor, admin, and superadmin to access booking views
  if (
    !userRoles.includes('mentee') &&
    !userRoles.includes('mentor') &&
    !userRoles.includes('admin') &&
    !userRoles.includes('superadmin')
  ) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
  }

  const [user] = await ctx.db
    .select({ id: users.id, tenantId: users.tenantId, role: users.role })
    .from(users)
    .where(eq(users.email, ctx.session.user.email))
    .limit(1);

  if (!user) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'User not found',
    });
  }

  return next({
    ctx: {
      ...ctx,
      tenantId: user.tenantId,
      userId: user.id,
      userRole: user.role,
    },
  });
});

export const bookingRouter = router({
  /**
   * Get available mentor slots for booking
   * Returns slots that are available (not already booked) for mentors associated with the mentee's classes
   */
  getAvailableSlots: bookingProcedure
    .input(
      z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
        mentorId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      // Get mentee's class memberships to find associated mentors
      const memberships = await ctx.db
        .select({
          classId: classMembers.classId,
          mentorId: classes.mentorId,
          className: classes.name,
          sessionConfig: classes.sessionConfig,
        })
        .from(classMembers)
        .innerJoin(classes, eq(classMembers.classId, classes.id))
        .where(
          and(
            eq(classMembers.userId, ctx.userId),
            eq(classes.status, 'active')
          )
        );

      if (memberships.length === 0) {
        return { slots: [], mentors: [] };
      }

      // Get unique mentor IDs
      let mentorIds = Array.from(new Set(memberships.map(m => m.mentorId)));

      // Filter by specific mentor if provided
      if (input.mentorId) {
        if (!mentorIds.includes(input.mentorId)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You are not enrolled in any class with this mentor',
          });
        }
        mentorIds = [input.mentorId];
      }

      // Get mentor info
      const mentorsData = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(inArray(users.id, mentorIds));

      // Get available time slots for these mentors
      // Non-recurring slots within the date range
      const nonRecurringSlots = await ctx.db
        .select()
        .from(mentorAvailability)
        .where(
          and(
            inArray(mentorAvailability.mentorId, mentorIds),
            eq(mentorAvailability.isRecurring, false),
            gte(mentorAvailability.startTime, startDate),
            lte(mentorAvailability.endTime, endDate)
          )
        );

      // Recurring slots - we need to expand these to actual dates
      const recurringSlots = await ctx.db
        .select()
        .from(mentorAvailability)
        .where(
          and(
            inArray(mentorAvailability.mentorId, mentorIds),
            eq(mentorAvailability.isRecurring, true)
          )
        );

      // Get already booked sessions to exclude from available slots
      const bookedSessions = await ctx.db
        .select({
          id: mentoringSessions.id,
          mentorId: mentoringSessions.mentorId,
          scheduledAt: mentoringSessions.scheduledAt,
          durationMinutes: mentoringSessions.durationMinutes,
        })
        .from(mentoringSessions)
        .where(
          and(
            inArray(mentoringSessions.mentorId, mentorIds),
            inArray(mentoringSessions.status, ['scheduled', 'booked']),
            gte(mentoringSessions.scheduledAt, startDate),
            lte(mentoringSessions.scheduledAt, endDate)
          )
        );

      // Create a map of booked times for quick lookup
      const bookedTimes = new Map<string, Set<string>>();
      for (const session of bookedSessions) {
        const key = session.mentorId;
        if (!bookedTimes.has(key)) {
          bookedTimes.set(key, new Set());
        }
        bookedTimes.get(key)!.add(session.scheduledAt.toISOString());
      }

      // Build available slots list
      type AvailableSlot = {
        id: string;
        mentorId: string;
        startTime: Date;
        endTime: Date;
        isRecurring: boolean;
        isBooked: boolean;
      };

      const availableSlots: AvailableSlot[] = [];

      // Add non-recurring slots
      for (const slot of nonRecurringSlots) {
        const isBooked = bookedTimes.get(slot.mentorId)?.has(slot.startTime.toISOString()) || false;
        availableSlots.push({
          id: slot.id,
          mentorId: slot.mentorId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isRecurring: false,
          isBooked,
        });
      }

      // Expand recurring slots to actual dates within the range
      for (const slot of recurringSlots) {
        if (slot.dayOfWeek === null || !slot.recurringStartTime || !slot.recurringEndTime) {
          continue;
        }

        // Check if slot is valid within the query date range
        const slotValidFrom = slot.validFrom || startDate;
        const slotValidUntil = slot.validUntil || endDate;

        // Iterate through each day in the range and check if it matches the recurring day
        const currentDate = new Date(Math.max(startDate.getTime(), slotValidFrom.getTime()));
        const rangeEnd = new Date(Math.min(endDate.getTime(), slotValidUntil.getTime()));

        while (currentDate <= rangeEnd) {
          // JavaScript getDay: 0=Sunday, 1=Monday, ..., 6=Saturday
          if (currentDate.getDay() === slot.dayOfWeek) {
            const [startHour, startMin] = slot.recurringStartTime.split(':').map(Number);
            const [endHour, endMin] = slot.recurringEndTime.split(':').map(Number);

            const slotStart = new Date(currentDate);
            slotStart.setHours(startHour, startMin, 0, 0);

            const slotEnd = new Date(currentDate);
            slotEnd.setHours(endHour, endMin, 0, 0);

            // Only include future slots
            if (slotStart > new Date()) {
              const isBooked = bookedTimes.get(slot.mentorId)?.has(slotStart.toISOString()) || false;
              availableSlots.push({
                id: `${slot.id}-${currentDate.toISOString().split('T')[0]}`,
                mentorId: slot.mentorId,
                startTime: slotStart,
                endTime: slotEnd,
                isRecurring: true,
                isBooked,
              });
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      // Filter out booked slots and sort by start time
      const filteredSlots = availableSlots
        .filter(slot => !slot.isBooked)
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      return {
        slots: filteredSlots,
        mentors: mentorsData,
      };
    }),

  /**
   * Book a mentor session slot
   * Creates a mentoring session for the mentee
   */
  bookSlot: bookingProcedure
    .input(
      z.object({
        mentorId: z.string().uuid(),
        scheduledAt: z.string().datetime(),
        durationMinutes: z.number().int().min(SESSION_MIN_DURATION_MINUTES).max(SESSION_MAX_DURATION_MINUTES).optional().default(SESSION_DEFAULT_DURATION_MINUTES),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const scheduledAt = new Date(input.scheduledAt);

      // Verify mentee is enrolled in a class with this mentor
      const [membership] = await ctx.db
        .select({
          classId: classMembers.classId,
          className: classes.name,
          sessionConfig: classes.sessionConfig,
          startDate: classes.startDate,
        })
        .from(classMembers)
        .innerJoin(classes, eq(classMembers.classId, classes.id))
        .where(
          and(
            eq(classMembers.userId, ctx.userId),
            eq(classes.mentorId, input.mentorId),
            eq(classes.status, 'active')
          )
        )
        .limit(1);

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not enrolled in any class with this mentor',
        });
      }

      // Check monthly session limit
      const sessionConfig = membership.sessionConfig as { monthlySessionCount?: number; sessionDurationMinutes?: number } | null;
      const monthlyLimit = sessionConfig?.monthlySessionCount ?? 2;

      // Get first day of the month for the scheduled session
      const firstDayOfMonth = new Date(scheduledAt.getFullYear(), scheduledAt.getMonth(), 1);
      const lastDayOfMonth = new Date(scheduledAt.getFullYear(), scheduledAt.getMonth() + 1, 0, 23, 59, 59, 999);

      // Count booked sessions for this month
      const [sessionCountResult] = await ctx.db
        .select({ count: count() })
        .from(mentoringSessions)
        .where(
          and(
            eq(mentoringSessions.menteeId, ctx.userId),
            inArray(mentoringSessions.status, ['scheduled', 'booked', 'completed']),
            gte(mentoringSessions.scheduledAt, firstDayOfMonth),
            lte(mentoringSessions.scheduledAt, lastDayOfMonth)
          )
        );

      const bookedCount = Number(sessionCountResult?.count ?? 0);

      if (bookedCount >= monthlyLimit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `You have reached your monthly session limit of ${monthlyLimit} ${monthlyLimit === 1 ? 'session' : 'sessions'} for ${scheduledAt.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        });
      }

      // Check if the slot is still available (not double-booked)
      const [existingBooking] = await ctx.db
        .select({ id: mentoringSessions.id })
        .from(mentoringSessions)
        .where(
          and(
            eq(mentoringSessions.mentorId, input.mentorId),
            eq(mentoringSessions.scheduledAt, scheduledAt),
            inArray(mentoringSessions.status, ['scheduled', 'booked'])
          )
        )
        .limit(1);

      if (existingBooking) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This slot has already been booked',
        });
      }

      // Get tenant ID from mentor
      const [mentor] = await ctx.db
        .select({ tenantId: users.tenantId })
        .from(users)
        .where(eq(users.id, input.mentorId))
        .limit(1);

      if (!mentor?.tenantId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Mentor not found',
        });
      }

      // Create the session booking
      const [newSession] = await ctx.db
        .insert(mentoringSessions)
        .values({
          tenantId: mentor.tenantId,
          mentorId: input.mentorId,
          menteeId: ctx.userId,
          classId: membership.classId,
          sessionType: '1:1',
          status: 'booked',
          scheduledAt,
          durationMinutes: input.durationMinutes,
          notes: input.notes || null,
        })
        .returning();

      return {
        session: newSession,
        message: 'Session booked successfully',
        remainingSessions: monthlyLimit - bookedCount - 1,
      };
    }),

  /**
   * Cancel a booked session
   */
  cancelBooking: bookingProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the session and verify ownership
      const [session] = await ctx.db
        .select()
        .from(mentoringSessions)
        .where(
          and(
            eq(mentoringSessions.id, input.sessionId),
            eq(mentoringSessions.menteeId, ctx.userId)
          )
        )
        .limit(1);

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      if (session.status === 'cancelled') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Session is already cancelled',
        });
      }

      if (session.status === 'completed') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot cancel a completed session',
        });
      }

      // Check if cancellation is within allowed time (e.g., 24 hours before)
      const now = new Date();
      const sessionDate = new Date(session.scheduledAt);
      const hoursUntilSession = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilSession < 24) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Sessions can only be cancelled at least 24 hours in advance',
        });
      }

      // Update the session status to cancelled
      const [updatedSession] = await ctx.db
        .update(mentoringSessions)
        .set({
          status: 'cancelled',
          notes: input.reason
            ? `${session.notes || ''}\n\nCancellation reason: ${input.reason}`.trim()
            : session.notes,
          updatedAt: new Date(),
        })
        .where(eq(mentoringSessions.id, input.sessionId))
        .returning();

      return {
        session: updatedSession,
        message: 'Session cancelled successfully',
      };
    }),

  /**
   * Get mentee's booked sessions (for calendar view)
   */
  getMyBookings: bookingProcedure
    .input(
      z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        status: z.array(sessionStatusEnum).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, status } = input || {};

      // Build conditions
      const conditions = [eq(mentoringSessions.menteeId, ctx.userId)];

      if (startDate) {
        conditions.push(gte(mentoringSessions.scheduledAt, new Date(startDate)));
      }
      if (endDate) {
        conditions.push(lte(mentoringSessions.scheduledAt, new Date(endDate)));
      }
      if (status && status.length > 0) {
        conditions.push(inArray(mentoringSessions.status, status));
      }

      // Get bookings
      const bookings = await ctx.db
        .select({
          id: mentoringSessions.id,
          mentorId: mentoringSessions.mentorId,
          classId: mentoringSessions.classId,
          sessionType: mentoringSessions.sessionType,
          status: mentoringSessions.status,
          scheduledAt: mentoringSessions.scheduledAt,
          durationMinutes: mentoringSessions.durationMinutes,
          notes: mentoringSessions.notes,
          createdAt: mentoringSessions.createdAt,
        })
        .from(mentoringSessions)
        .where(and(...conditions))
        .orderBy(sql`${mentoringSessions.scheduledAt} ASC`);

      // Get mentor info
      const mentorIds = Array.from(new Set(bookings.map(b => b.mentorId)));
      let mentorsMap: Record<string, { id: string; name: string | null; email: string }> = {};

      if (mentorIds.length > 0) {
        const mentorsData = await ctx.db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
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

      // Get class info
      const classIds = Array.from(new Set(bookings.filter(b => b.classId).map(b => b.classId!)));
      let classesMap: Record<string, { id: string; name: string }> = {};

      if (classIds.length > 0) {
        const classesData = await ctx.db
          .select({
            id: classes.id,
            name: classes.name,
          })
          .from(classes)
          .where(inArray(classes.id, classIds));

        classesMap = classesData.reduce(
          (acc, c) => {
            acc[c.id] = c;
            return acc;
          },
          {} as typeof classesMap
        );
      }

      // Enrich bookings
      const enrichedBookings = bookings.map(booking => ({
        ...booking,
        mentor: mentorsMap[booking.mentorId] || null,
        class: booking.classId ? classesMap[booking.classId] || null : null,
      }));

      return enrichedBookings;
    }),

  /**
   * Get monthly session usage stats
   */
  getMonthlyUsage: bookingProcedure
    .input(
      z.object({
        year: z.number().int().min(2020).max(2100),
        month: z.number().int().min(1).max(12),
      })
    )
    .query(async ({ ctx, input }) => {
      const firstDayOfMonth = new Date(input.year, input.month - 1, 1);
      const lastDayOfMonth = new Date(input.year, input.month, 0, 23, 59, 59, 999);

      // Get user's class memberships to find monthly limits
      const memberships = await ctx.db
        .select({
          classId: classMembers.classId,
          sessionConfig: classes.sessionConfig,
        })
        .from(classMembers)
        .innerJoin(classes, eq(classMembers.classId, classes.id))
        .where(
          and(
            eq(classMembers.userId, ctx.userId),
            eq(classes.status, 'active')
          )
        );

      // Get the monthly limit from the class config (use configured value, fallback to 2)
      let monthlyLimit = 2; // default
      for (const membership of memberships) {
        const config = membership.sessionConfig as { monthlySessionCount?: number } | null;
        if (config?.monthlySessionCount) {
          monthlyLimit = config.monthlySessionCount;
        }
      }

      // Count booked/completed sessions for this month
      const [bookedResult] = await ctx.db
        .select({ count: count() })
        .from(mentoringSessions)
        .where(
          and(
            eq(mentoringSessions.menteeId, ctx.userId),
            inArray(mentoringSessions.status, ['scheduled', 'booked', 'completed']),
            gte(mentoringSessions.scheduledAt, firstDayOfMonth),
            lte(mentoringSessions.scheduledAt, lastDayOfMonth)
          )
        );

      const bookedCount = Number(bookedResult?.count ?? 0);

      return {
        year: input.year,
        month: input.month,
        monthlyLimit,
        bookedCount,
        remainingSessions: Math.max(0, monthlyLimit - bookedCount),
        limitReached: bookedCount >= monthlyLimit,
      };
    }),

  /**
   * Get a specific booking by ID
   */
  getBookingById: bookingProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [session] = await ctx.db
        .select()
        .from(mentoringSessions)
        .where(
          and(
            eq(mentoringSessions.id, input.sessionId),
            eq(mentoringSessions.menteeId, ctx.userId)
          )
        )
        .limit(1);

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });
      }

      // Get mentor info
      const [mentor] = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, session.mentorId))
        .limit(1);

      // Get class info
      let classInfo = null;
      if (session.classId) {
        const [cls] = await ctx.db
          .select({
            id: classes.id,
            name: classes.name,
          })
          .from(classes)
          .where(eq(classes.id, session.classId))
          .limit(1);
        classInfo = cls || null;
      }

      return {
        ...session,
        mentor: mentor || null,
        class: classInfo,
      };
    }),
});
