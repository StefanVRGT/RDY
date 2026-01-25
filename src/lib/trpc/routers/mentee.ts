import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  scheduledExercises,
  exercises,
  users,
  classMembers,
  classes,
  weeklyRecurringExercises,
  weekExercises,
  classCurriculum,
  weeks,
  schwerpunktebenen,
} from '@/lib/db/schema';
import { eq, and, gte, lte, inArray, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * Mentee middleware - ensures user has mentee role and extracts mentee user info
 */
const menteeProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const userRoles = ctx.session.user.roles || [];

  // Allow mentee, mentor, admin, and superadmin to access mentee views
  if (
    !userRoles.includes('mentee') &&
    !userRoles.includes('mentor') &&
    !userRoles.includes('admin') &&
    !userRoles.includes('superadmin')
  ) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
  }

  const [menteeUser] = await ctx.db
    .select({ id: users.id, tenantId: users.tenantId })
    .from(users)
    .where(eq(users.email, ctx.session.user.email))
    .limit(1);

  if (!menteeUser) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'User not found',
    });
  }

  return next({
    ctx: {
      ...ctx,
      tenantId: menteeUser.tenantId,
      userId: menteeUser.id,
    },
  });
});

export const menteeRouter = router({
  /**
   * Get exercises for a specific date
   * Returns both scheduled exercises and available optional exercises
   */
  getExercisesForDate: menteeProcedure
    .input(
      z.object({
        date: z.string().datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      const targetDate = new Date(input.date);
      const startOfDay = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate()
      );
      const endOfDay = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        23,
        59,
        59,
        999
      );

      // Get scheduled exercises for this day
      const scheduled = await ctx.db
        .select({
          id: scheduledExercises.id,
          scheduledAt: scheduledExercises.scheduledAt,
          completed: scheduledExercises.completed,
          completedAt: scheduledExercises.completedAt,
          notes: scheduledExercises.notes,
          exerciseId: scheduledExercises.exerciseId,
          classId: scheduledExercises.classId,
        })
        .from(scheduledExercises)
        .where(
          and(
            eq(scheduledExercises.userId, ctx.userId),
            gte(scheduledExercises.scheduledAt, startOfDay),
            lte(scheduledExercises.scheduledAt, endOfDay)
          )
        )
        .orderBy(asc(scheduledExercises.scheduledAt));

      // Get exercise details for scheduled exercises
      const exerciseIds = scheduled.map(s => s.exerciseId);
      let exercisesMap: Record<
        string,
        {
          id: string;
          type: 'video' | 'audio' | 'text';
          titleDe: string;
          titleEn: string | null;
          descriptionDe: string | null;
          descriptionEn: string | null;
          durationMinutes: number | null;
          videoUrl: string | null;
          audioUrl: string | null;
          contentDe: string | null;
          contentEn: string | null;
        }
      > = {};

      if (exerciseIds.length > 0) {
        const exercisesData = await ctx.db
          .select({
            id: exercises.id,
            type: exercises.type,
            titleDe: exercises.titleDe,
            titleEn: exercises.titleEn,
            descriptionDe: exercises.descriptionDe,
            descriptionEn: exercises.descriptionEn,
            durationMinutes: exercises.durationMinutes,
            videoUrl: exercises.videoUrl,
            audioUrl: exercises.audioUrl,
            contentDe: exercises.contentDe,
            contentEn: exercises.contentEn,
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

      // Get class membership info to find obligatory flag
      const classIds = Array.from(new Set(scheduled.map(s => s.classId)));
      let weekExercisesMap: Record<string, boolean> = {}; // exerciseId -> isObligatory

      if (classIds.length > 0) {
        // Get current week's exercises from curriculum
        const curricula = await ctx.db
          .select({
            classId: classCurriculum.classId,
            schwerpunktebeneId: classCurriculum.schwerpunktebeneId,
          })
          .from(classCurriculum)
          .where(inArray(classCurriculum.classId, classIds));

        const schwerpunktebeneIds = curricula.map(c => c.schwerpunktebeneId);

        if (schwerpunktebeneIds.length > 0) {
          const weeksData = await ctx.db
            .select({ id: weeks.id })
            .from(weeks)
            .where(inArray(weeks.schwerpunktebeneId, schwerpunktebeneIds));

          const weekIds = weeksData.map(w => w.id);

          if (weekIds.length > 0) {
            const weekExercisesData = await ctx.db
              .select({
                exerciseId: weekExercises.exerciseId,
                isObligatory: weekExercises.isObligatory,
              })
              .from(weekExercises)
              .where(inArray(weekExercises.weekId, weekIds));

            weekExercisesMap = weekExercisesData.reduce(
              (acc, we) => {
                // If exercise appears multiple times, prefer obligatory status
                if (acc[we.exerciseId] === undefined || we.isObligatory) {
                  acc[we.exerciseId] = we.isObligatory;
                }
                return acc;
              },
              {} as typeof weekExercisesMap
            );
          }
        }
      }

      // Enrich scheduled exercises with exercise details
      const enrichedScheduled = scheduled.map(s => ({
        ...s,
        exercise: exercisesMap[s.exerciseId] || null,
        isObligatory: weekExercisesMap[s.exerciseId] ?? true, // Default to obligatory if not found
      }));

      return {
        scheduledExercises: enrichedScheduled,
        date: input.date,
      };
    }),

  /**
   * Get optional exercises available for the mentee to add
   */
  getOptionalExercises: menteeProcedure.query(async ({ ctx }) => {
    // Get user's class memberships
    const memberships = await ctx.db
      .select({ classId: classMembers.classId })
      .from(classMembers)
      .where(eq(classMembers.userId, ctx.userId));

    if (memberships.length === 0) {
      return [];
    }

    const classIds = memberships.map(m => m.classId);

    // Get class curriculum to find available exercises
    const curricula = await ctx.db
      .select({
        classId: classCurriculum.classId,
        schwerpunktebeneId: classCurriculum.schwerpunktebeneId,
      })
      .from(classCurriculum)
      .where(inArray(classCurriculum.classId, classIds));

    const schwerpunktebeneIds = curricula.map(c => c.schwerpunktebeneId);

    if (schwerpunktebeneIds.length === 0) {
      return [];
    }

    // Get weeks from curriculum
    const weeksData = await ctx.db
      .select({ id: weeks.id })
      .from(weeks)
      .where(inArray(weeks.schwerpunktebeneId, schwerpunktebeneIds));

    const weekIds = weeksData.map(w => w.id);

    if (weekIds.length === 0) {
      return [];
    }

    // Get optional week exercises
    const optionalWeekExercises = await ctx.db
      .select({
        exerciseId: weekExercises.exerciseId,
      })
      .from(weekExercises)
      .where(and(inArray(weekExercises.weekId, weekIds), eq(weekExercises.isObligatory, false)));

    const exerciseIds = optionalWeekExercises.map(we => we.exerciseId);

    if (exerciseIds.length === 0) {
      return [];
    }

    // Get exercise details
    const optionalExercises = await ctx.db
      .select({
        id: exercises.id,
        type: exercises.type,
        titleDe: exercises.titleDe,
        titleEn: exercises.titleEn,
        descriptionDe: exercises.descriptionDe,
        descriptionEn: exercises.descriptionEn,
        durationMinutes: exercises.durationMinutes,
        videoUrl: exercises.videoUrl,
        audioUrl: exercises.audioUrl,
        contentDe: exercises.contentDe,
        contentEn: exercises.contentEn,
      })
      .from(exercises)
      .where(inArray(exercises.id, exerciseIds));

    return optionalExercises;
  }),

  /**
   * Toggle exercise completion status
   */
  toggleExerciseCompletion: menteeProcedure
    .input(
      z.object({
        scheduledExerciseId: z.string().uuid(),
        completed: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the scheduled exercise belongs to this user
      const [exercise] = await ctx.db
        .select()
        .from(scheduledExercises)
        .where(
          and(
            eq(scheduledExercises.id, input.scheduledExerciseId),
            eq(scheduledExercises.userId, ctx.userId)
          )
        )
        .limit(1);

      if (!exercise) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Scheduled exercise not found',
        });
      }

      // Update completion status
      const [updated] = await ctx.db
        .update(scheduledExercises)
        .set({
          completed: input.completed,
          completedAt: input.completed ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(scheduledExercises.id, input.scheduledExerciseId))
        .returning();

      return updated;
    }),

  /**
   * Add an optional exercise to today's schedule
   */
  addExerciseToSchedule: menteeProcedure
    .input(
      z.object({
        exerciseId: z.string().uuid(),
        scheduledAt: z.string().datetime(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get user's primary class membership
      const [membership] = await ctx.db
        .select({ classId: classMembers.classId })
        .from(classMembers)
        .where(eq(classMembers.userId, ctx.userId))
        .limit(1);

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No class membership found',
        });
      }

      // Verify exercise exists
      const [exercise] = await ctx.db
        .select({ id: exercises.id })
        .from(exercises)
        .where(eq(exercises.id, input.exerciseId))
        .limit(1);

      if (!exercise) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Exercise not found',
        });
      }

      // Create scheduled exercise
      const [newScheduled] = await ctx.db
        .insert(scheduledExercises)
        .values({
          userId: ctx.userId,
          exerciseId: input.exerciseId,
          classId: membership.classId,
          scheduledAt: new Date(input.scheduledAt),
          completed: false,
        })
        .returning();

      return newScheduled;
    }),

  /**
   * Get exercise details for media popup
   */
  getExerciseDetail: menteeProcedure
    .input(
      z.object({
        exerciseId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [exercise] = await ctx.db
        .select({
          id: exercises.id,
          type: exercises.type,
          titleDe: exercises.titleDe,
          titleEn: exercises.titleEn,
          descriptionDe: exercises.descriptionDe,
          descriptionEn: exercises.descriptionEn,
          durationMinutes: exercises.durationMinutes,
          videoUrl: exercises.videoUrl,
          audioUrl: exercises.audioUrl,
          contentDe: exercises.contentDe,
          contentEn: exercises.contentEn,
        })
        .from(exercises)
        .where(eq(exercises.id, input.exerciseId))
        .limit(1);

      if (!exercise) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Exercise not found',
        });
      }

      return exercise;
    }),

  /**
   * Get weekly recurring exercises for the user
   */
  getRecurringExercises: menteeProcedure.query(async ({ ctx }) => {
    const recurring = await ctx.db
      .select({
        id: weeklyRecurringExercises.id,
        exerciseId: weeklyRecurringExercises.exerciseId,
        defaultTime: weeklyRecurringExercises.defaultTime,
        applicableDays: weeklyRecurringExercises.applicableDays,
        activeFrom: weeklyRecurringExercises.activeFrom,
        activeThrough: weeklyRecurringExercises.activeThrough,
        durationMinutes: weeklyRecurringExercises.durationMinutes,
      })
      .from(weeklyRecurringExercises)
      .where(eq(weeklyRecurringExercises.userId, ctx.userId));

    // Get exercise details
    const exerciseIds = recurring.map(r => r.exerciseId);
    if (exerciseIds.length === 0) {
      return [];
    }

    const exercisesData = await ctx.db
      .select({
        id: exercises.id,
        type: exercises.type,
        titleDe: exercises.titleDe,
        titleEn: exercises.titleEn,
        durationMinutes: exercises.durationMinutes,
      })
      .from(exercises)
      .where(inArray(exercises.id, exerciseIds));

    const exercisesMap = exercisesData.reduce(
      (acc, e) => {
        acc[e.id] = e;
        return acc;
      },
      {} as Record<string, (typeof exercisesData)[0]>
    );

    return recurring.map(r => ({
      ...r,
      exercise: exercisesMap[r.exerciseId] || null,
    }));
  }),

  /**
   * Get user's class membership info
   */
  getMyClasses: menteeProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db
      .select({
        membershipId: classMembers.id,
        classId: classMembers.classId,
        enrolledAt: classMembers.enrolledAt,
        completedAt: classMembers.completedAt,
        className: classes.name,
        startDate: classes.startDate,
        endDate: classes.endDate,
        status: classes.status,
      })
      .from(classMembers)
      .innerJoin(classes, eq(classMembers.classId, classes.id))
      .where(eq(classMembers.userId, ctx.userId));

    return memberships;
  }),

  /**
   * Get current week's theme based on class curriculum
   * Returns week theme info from the active schwerpunktebene
   */
  getCurrentWeekTheme: menteeProcedure
    .input(
      z.object({
        weekStartDate: z.string().datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get user's class memberships
      const memberships = await ctx.db
        .select({
          classId: classMembers.classId,
          enrolledAt: classMembers.enrolledAt,
          startDate: classes.startDate,
        })
        .from(classMembers)
        .innerJoin(classes, eq(classMembers.classId, classes.id))
        .where(eq(classMembers.userId, ctx.userId))
        .limit(1);

      if (memberships.length === 0) {
        return null;
      }

      const membership = memberships[0];
      const weekStartDate = new Date(input.weekStartDate);
      const classStartDate = new Date(membership.startDate);

      // Calculate which week of the program this is (1-indexed)
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const weeksSinceStart = Math.floor(
        (weekStartDate.getTime() - classStartDate.getTime()) / msPerWeek
      );
      const weekNumber = Math.max(1, weeksSinceStart + 1);

      // Calculate which month of the program (for curriculum lookup)
      const monthNumber = Math.ceil(weekNumber / 4); // ~4 weeks per month

      // Get curriculum for this month
      const [curriculum] = await ctx.db
        .select({
          id: classCurriculum.id,
          schwerpunktebeneId: classCurriculum.schwerpunktebeneId,
          customTitleDe: classCurriculum.customTitleDe,
          customTitleEn: classCurriculum.customTitleEn,
        })
        .from(classCurriculum)
        .where(
          and(
            eq(classCurriculum.classId, membership.classId),
            eq(classCurriculum.monthNumber, monthNumber)
          )
        )
        .limit(1);

      if (!curriculum) {
        return null;
      }

      // Get schwerpunktebene details
      const [schwerpunktebene] = await ctx.db
        .select({
          id: schwerpunktebenen.id,
          titleDe: schwerpunktebenen.titleDe,
          titleEn: schwerpunktebenen.titleEn,
          descriptionDe: schwerpunktebenen.descriptionDe,
          descriptionEn: schwerpunktebenen.descriptionEn,
          herkunftDe: schwerpunktebenen.herkunftDe,
          herkunftEn: schwerpunktebenen.herkunftEn,
          zielDe: schwerpunktebenen.zielDe,
          zielEn: schwerpunktebenen.zielEn,
          imageUrl: schwerpunktebenen.imageUrl,
        })
        .from(schwerpunktebenen)
        .where(eq(schwerpunktebenen.id, curriculum.schwerpunktebeneId))
        .limit(1);

      if (!schwerpunktebene) {
        return null;
      }

      // Calculate week within the month (1-4)
      const weekWithinMonth = ((weekNumber - 1) % 4) + 1;

      // Get week-specific theme if available
      const [weekTheme] = await ctx.db
        .select({
          id: weeks.id,
          weekNumber: weeks.weekNumber,
          titleDe: weeks.titleDe,
          titleEn: weeks.titleEn,
          descriptionDe: weeks.descriptionDe,
          descriptionEn: weeks.descriptionEn,
          herkunftDe: weeks.herkunftDe,
          herkunftEn: weeks.herkunftEn,
          zielDe: weeks.zielDe,
          zielEn: weeks.zielEn,
        })
        .from(weeks)
        .where(
          and(
            eq(weeks.schwerpunktebeneId, schwerpunktebene.id),
            eq(weeks.weekNumber, String(weekWithinMonth))
          )
        )
        .limit(1);

      return {
        monthTheme: {
          id: schwerpunktebene.id,
          titleDe: curriculum.customTitleDe || schwerpunktebene.titleDe,
          titleEn: curriculum.customTitleEn || schwerpunktebene.titleEn,
          descriptionDe: schwerpunktebene.descriptionDe,
          descriptionEn: schwerpunktebene.descriptionEn,
          herkunftDe: schwerpunktebene.herkunftDe,
          herkunftEn: schwerpunktebene.herkunftEn,
          zielDe: schwerpunktebene.zielDe,
          zielEn: schwerpunktebene.zielEn,
          imageUrl: schwerpunktebene.imageUrl,
        },
        weekTheme: weekTheme
          ? {
              id: weekTheme.id,
              weekNumber: weekTheme.weekNumber,
              titleDe: weekTheme.titleDe,
              titleEn: weekTheme.titleEn,
              descriptionDe: weekTheme.descriptionDe,
              descriptionEn: weekTheme.descriptionEn,
              herkunftDe: weekTheme.herkunftDe,
              herkunftEn: weekTheme.herkunftEn,
              zielDe: weekTheme.zielDe,
              zielEn: weekTheme.zielEn,
            }
          : null,
        weekNumber,
        monthNumber,
      };
    }),

  /**
   * Get all exercises for a week
   * Returns exercises grouped by day
   */
  getExercisesForWeek: menteeProcedure
    .input(
      z.object({
        weekStartDate: z.string().datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      const weekStart = new Date(input.weekStartDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Get scheduled exercises for the entire week
      const scheduled = await ctx.db
        .select({
          id: scheduledExercises.id,
          scheduledAt: scheduledExercises.scheduledAt,
          completed: scheduledExercises.completed,
          completedAt: scheduledExercises.completedAt,
          notes: scheduledExercises.notes,
          exerciseId: scheduledExercises.exerciseId,
          classId: scheduledExercises.classId,
        })
        .from(scheduledExercises)
        .where(
          and(
            eq(scheduledExercises.userId, ctx.userId),
            gte(scheduledExercises.scheduledAt, weekStart),
            lte(scheduledExercises.scheduledAt, weekEnd)
          )
        )
        .orderBy(asc(scheduledExercises.scheduledAt));

      // Get exercise details
      const exerciseIds = Array.from(new Set(scheduled.map(s => s.exerciseId)));
      let exercisesMap: Record<
        string,
        {
          id: string;
          type: 'video' | 'audio' | 'text';
          titleDe: string;
          titleEn: string | null;
          descriptionDe: string | null;
          descriptionEn: string | null;
          durationMinutes: number | null;
        }
      > = {};

      if (exerciseIds.length > 0) {
        const exercisesData = await ctx.db
          .select({
            id: exercises.id,
            type: exercises.type,
            titleDe: exercises.titleDe,
            titleEn: exercises.titleEn,
            descriptionDe: exercises.descriptionDe,
            descriptionEn: exercises.descriptionEn,
            durationMinutes: exercises.durationMinutes,
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

      // Get obligatory status for exercises
      const classIds = Array.from(new Set(scheduled.map(s => s.classId)));
      let weekExercisesMap: Record<string, boolean> = {};

      if (classIds.length > 0) {
        const curricula = await ctx.db
          .select({
            schwerpunktebeneId: classCurriculum.schwerpunktebeneId,
          })
          .from(classCurriculum)
          .where(inArray(classCurriculum.classId, classIds));

        const schwerpunktebeneIds = curricula.map(c => c.schwerpunktebeneId);

        if (schwerpunktebeneIds.length > 0) {
          const weeksData = await ctx.db
            .select({ id: weeks.id })
            .from(weeks)
            .where(inArray(weeks.schwerpunktebeneId, schwerpunktebeneIds));

          const weekIds = weeksData.map(w => w.id);

          if (weekIds.length > 0) {
            const weekExercisesData = await ctx.db
              .select({
                exerciseId: weekExercises.exerciseId,
                isObligatory: weekExercises.isObligatory,
              })
              .from(weekExercises)
              .where(inArray(weekExercises.weekId, weekIds));

            weekExercisesMap = weekExercisesData.reduce(
              (acc, we) => {
                if (acc[we.exerciseId] === undefined || we.isObligatory) {
                  acc[we.exerciseId] = we.isObligatory;
                }
                return acc;
              },
              {} as typeof weekExercisesMap
            );
          }
        }
      }

      // Enrich and group by day
      const enriched = scheduled.map(s => ({
        ...s,
        exercise: exercisesMap[s.exerciseId] || null,
        isObligatory: weekExercisesMap[s.exerciseId] ?? true,
      }));

      // Group by date (YYYY-MM-DD)
      const byDay: Record<
        string,
        {
          date: string;
          exercises: typeof enriched;
          totalCount: number;
          completedCount: number;
        }
      > = {};

      // Initialize all 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        byDay[dateKey] = {
          date: dateKey,
          exercises: [],
          totalCount: 0,
          completedCount: 0,
        };
      }

      // Populate with exercises
      for (const ex of enriched) {
        const dateKey = new Date(ex.scheduledAt).toISOString().split('T')[0];
        if (byDay[dateKey]) {
          byDay[dateKey].exercises.push(ex);
          byDay[dateKey].totalCount++;
          if (ex.completed) {
            byDay[dateKey].completedCount++;
          }
        }
      }

      return {
        weekStartDate: input.weekStartDate,
        days: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
      };
    }),

  /**
   * Update scheduled exercise time and/or duration
   */
  updateExerciseTime: menteeProcedure
    .input(
      z.object({
        scheduledExerciseId: z.string().uuid(),
        scheduledAt: z.string().datetime(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the scheduled exercise belongs to this user
      const [exercise] = await ctx.db
        .select()
        .from(scheduledExercises)
        .where(
          and(
            eq(scheduledExercises.id, input.scheduledExerciseId),
            eq(scheduledExercises.userId, ctx.userId)
          )
        )
        .limit(1);

      if (!exercise) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Scheduled exercise not found',
        });
      }

      // Update the scheduled time
      const [updated] = await ctx.db
        .update(scheduledExercises)
        .set({
          scheduledAt: new Date(input.scheduledAt),
          updatedAt: new Date(),
        })
        .where(eq(scheduledExercises.id, input.scheduledExerciseId))
        .returning();

      return updated;
    }),

  /**
   * Bulk update scheduled exercise times
   */
  bulkUpdateExerciseTimes: menteeProcedure
    .input(
      z.object({
        updates: z.array(
          z.object({
            scheduledExerciseId: z.string().uuid(),
            scheduledAt: z.string().datetime(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.updates.length === 0) {
        return { updatedCount: 0 };
      }

      // Verify all exercises belong to this user
      const exerciseIds = input.updates.map((u) => u.scheduledExerciseId);
      const existingExercises = await ctx.db
        .select({ id: scheduledExercises.id })
        .from(scheduledExercises)
        .where(
          and(
            inArray(scheduledExercises.id, exerciseIds),
            eq(scheduledExercises.userId, ctx.userId)
          )
        );

      if (existingExercises.length !== exerciseIds.length) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Some exercises do not belong to this user',
        });
      }

      // Update each exercise
      let updatedCount = 0;
      for (const update of input.updates) {
        await ctx.db
          .update(scheduledExercises)
          .set({
            scheduledAt: new Date(update.scheduledAt),
            updatedAt: new Date(),
          })
          .where(eq(scheduledExercises.id, update.scheduledExerciseId));
        updatedCount++;
      }

      return { updatedCount };
    }),

  /**
   * Get existing time slots for conflict detection
   * Returns all scheduled exercises and mentor availability for a date range
   */
  getTimeSlotsForRange: menteeProcedure
    .input(
      z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);

      // Get scheduled exercises in range
      const exerciseSlots = await ctx.db
        .select({
          id: scheduledExercises.id,
          scheduledAt: scheduledExercises.scheduledAt,
          exerciseId: scheduledExercises.exerciseId,
        })
        .from(scheduledExercises)
        .where(
          and(
            eq(scheduledExercises.userId, ctx.userId),
            gte(scheduledExercises.scheduledAt, start),
            lte(scheduledExercises.scheduledAt, end)
          )
        );

      // Get exercise durations
      const exerciseIds = Array.from(new Set(exerciseSlots.map((e) => e.exerciseId)));
      let durations: Record<string, number> = {};

      if (exerciseIds.length > 0) {
        const exerciseDurations = await ctx.db
          .select({
            id: exercises.id,
            durationMinutes: exercises.durationMinutes,
          })
          .from(exercises)
          .where(inArray(exercises.id, exerciseIds));

        durations = exerciseDurations.reduce(
          (acc, e) => {
            acc[e.id] = e.durationMinutes || 30; // Default 30 minutes
            return acc;
          },
          {} as Record<string, number>
        );
      }

      // Format exercise slots
      const formattedExerciseSlots = exerciseSlots.map((slot) => {
        const duration = durations[slot.exerciseId] || 30;
        return {
          id: slot.id,
          startTime: slot.scheduledAt,
          endTime: new Date(slot.scheduledAt.getTime() + duration * 60 * 1000),
          type: 'exercise' as const,
          label: 'Exercise',
        };
      });

      return {
        exerciseSlots: formattedExerciseSlots,
        mentorAvailabilitySlots: [], // Can be expanded later to include mentor availability
      };
    }),

  /**
   * Reschedule exercise series - moves all future occurrences of the same exercise
   * by the same day offset (e.g., shift from Monday to Wednesday = +2 days for all)
   */
  rescheduleExerciseSeries: menteeProcedure
    .input(
      z.object({
        scheduledExerciseId: z.string().uuid(),
        newScheduledAt: z.string().datetime(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the original exercise
      const [originalExercise] = await ctx.db
        .select()
        .from(scheduledExercises)
        .where(
          and(
            eq(scheduledExercises.id, input.scheduledExerciseId),
            eq(scheduledExercises.userId, ctx.userId)
          )
        )
        .limit(1);

      if (!originalExercise) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Scheduled exercise not found',
        });
      }

      const originalDate = new Date(originalExercise.scheduledAt);
      const newDate = new Date(input.newScheduledAt);

      // Calculate the day offset (preserving time of day from original)
      const dayOffset = Math.round(
        (newDate.setHours(0, 0, 0, 0) - new Date(originalDate).setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24)
      );

      // Find all future occurrences of the same exercise for this user
      const futureExercises = await ctx.db
        .select()
        .from(scheduledExercises)
        .where(
          and(
            eq(scheduledExercises.userId, ctx.userId),
            eq(scheduledExercises.exerciseId, originalExercise.exerciseId),
            eq(scheduledExercises.classId, originalExercise.classId),
            gte(scheduledExercises.scheduledAt, originalDate)
          )
        )
        .orderBy(asc(scheduledExercises.scheduledAt));

      // Update all future occurrences by shifting them by the same day offset
      let updatedCount = 0;
      for (const exercise of futureExercises) {
        const exerciseDate = new Date(exercise.scheduledAt);
        const newScheduledAt = new Date(exerciseDate);
        newScheduledAt.setDate(newScheduledAt.getDate() + dayOffset);

        await ctx.db
          .update(scheduledExercises)
          .set({
            scheduledAt: newScheduledAt,
            updatedAt: new Date(),
          })
          .where(eq(scheduledExercises.id, exercise.id));
        updatedCount++;
      }

      return { updatedCount, dayOffset };
    }),

  /**
   * Complete exercise with optional notes
   * Marks the exercise as completed and saves any notes
   */
  completeExerciseWithNotes: menteeProcedure
    .input(
      z.object({
        scheduledExerciseId: z.string().uuid(),
        completed: z.boolean(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the scheduled exercise belongs to this user
      const [exercise] = await ctx.db
        .select()
        .from(scheduledExercises)
        .where(
          and(
            eq(scheduledExercises.id, input.scheduledExerciseId),
            eq(scheduledExercises.userId, ctx.userId)
          )
        )
        .limit(1);

      if (!exercise) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Scheduled exercise not found',
        });
      }

      // Build update object
      const updateData: {
        completed: boolean;
        completedAt: Date | null;
        notes?: string;
        updatedAt: Date;
      } = {
        completed: input.completed,
        completedAt: input.completed ? new Date() : null,
        updatedAt: new Date(),
      };

      // Only update notes if provided
      if (input.notes !== undefined) {
        updateData.notes = input.notes;
      }

      // Update completion status and notes
      const [updated] = await ctx.db
        .update(scheduledExercises)
        .set(updateData)
        .where(eq(scheduledExercises.id, input.scheduledExerciseId))
        .returning();

      return updated;
    }),

  /**
   * Update exercise notes only (without changing completion status)
   */
  updateExerciseNotes: menteeProcedure
    .input(
      z.object({
        scheduledExerciseId: z.string().uuid(),
        notes: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the scheduled exercise belongs to this user
      const [exercise] = await ctx.db
        .select()
        .from(scheduledExercises)
        .where(
          and(
            eq(scheduledExercises.id, input.scheduledExerciseId),
            eq(scheduledExercises.userId, ctx.userId)
          )
        )
        .limit(1);

      if (!exercise) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Scheduled exercise not found',
        });
      }

      // Update notes
      const [updated] = await ctx.db
        .update(scheduledExercises)
        .set({
          notes: input.notes,
          updatedAt: new Date(),
        })
        .where(eq(scheduledExercises.id, input.scheduledExerciseId))
        .returning();

      return updated;
    }),

  /**
   * Get scheduled exercise by ID with full details
   */
  getScheduledExerciseById: menteeProcedure
    .input(
      z.object({
        scheduledExerciseId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get the scheduled exercise
      const [scheduled] = await ctx.db
        .select({
          id: scheduledExercises.id,
          scheduledAt: scheduledExercises.scheduledAt,
          completed: scheduledExercises.completed,
          completedAt: scheduledExercises.completedAt,
          notes: scheduledExercises.notes,
          exerciseId: scheduledExercises.exerciseId,
          classId: scheduledExercises.classId,
        })
        .from(scheduledExercises)
        .where(
          and(
            eq(scheduledExercises.id, input.scheduledExerciseId),
            eq(scheduledExercises.userId, ctx.userId)
          )
        )
        .limit(1);

      if (!scheduled) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Scheduled exercise not found',
        });
      }

      // Get exercise details
      const [exercise] = await ctx.db
        .select({
          id: exercises.id,
          type: exercises.type,
          titleDe: exercises.titleDe,
          titleEn: exercises.titleEn,
          descriptionDe: exercises.descriptionDe,
          descriptionEn: exercises.descriptionEn,
          durationMinutes: exercises.durationMinutes,
          videoUrl: exercises.videoUrl,
          audioUrl: exercises.audioUrl,
          contentDe: exercises.contentDe,
          contentEn: exercises.contentEn,
        })
        .from(exercises)
        .where(eq(exercises.id, scheduled.exerciseId))
        .limit(1);

      // Get obligatory status
      const classIds = [scheduled.classId];
      let isObligatory = true; // Default to obligatory

      const curricula = await ctx.db
        .select({
          schwerpunktebeneId: classCurriculum.schwerpunktebeneId,
        })
        .from(classCurriculum)
        .where(inArray(classCurriculum.classId, classIds));

      const schwerpunktebeneIds = curricula.map(c => c.schwerpunktebeneId);

      if (schwerpunktebeneIds.length > 0) {
        const weeksData = await ctx.db
          .select({ id: weeks.id })
          .from(weeks)
          .where(inArray(weeks.schwerpunktebeneId, schwerpunktebeneIds));

        const weekIds = weeksData.map(w => w.id);

        if (weekIds.length > 0) {
          const [weekExerciseData] = await ctx.db
            .select({
              isObligatory: weekExercises.isObligatory,
            })
            .from(weekExercises)
            .where(
              and(
                inArray(weekExercises.weekId, weekIds),
                eq(weekExercises.exerciseId, scheduled.exerciseId)
              )
            )
            .limit(1);

          if (weekExerciseData) {
            isObligatory = weekExerciseData.isObligatory;
          }
        }
      }

      return {
        ...scheduled,
        exercise: exercise || null,
        isObligatory,
      };
    }),

  /**
   * Update weekly recurring exercise default time
   */
  updateRecurringExerciseTime: menteeProcedure
    .input(
      z.object({
        recurringExerciseId: z.string().uuid(),
        defaultTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
        durationMinutes: z.number().int().min(5).max(240).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the recurring exercise belongs to this user
      const [existing] = await ctx.db
        .select()
        .from(weeklyRecurringExercises)
        .where(
          and(
            eq(weeklyRecurringExercises.id, input.recurringExerciseId),
            eq(weeklyRecurringExercises.userId, ctx.userId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Recurring exercise not found',
        });
      }

      // Build update object
      const updateData: {
        defaultTime: string;
        updatedAt: Date;
        durationMinutes?: number;
      } = {
        defaultTime: input.defaultTime,
        updatedAt: new Date(),
      };

      if (input.durationMinutes !== undefined) {
        updateData.durationMinutes = input.durationMinutes;
      }

      // Update the recurring exercise
      const [updated] = await ctx.db
        .update(weeklyRecurringExercises)
        .set(updateData)
        .where(eq(weeklyRecurringExercises.id, input.recurringExerciseId))
        .returning();

      return updated;
    }),
});
