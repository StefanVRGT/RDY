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
  experienceEntries,
  trackingEntries,
  reflectionEntries,
  programEvents,
  checkInEntries,
  mentoringSessions,
} from '@/lib/db/schema';
import { eq, and, gte, lte, inArray, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { MS_PER_WEEK, MS_PER_DAY, WEEKS_PER_LEVEL, DAYS_PER_LEVEL } from '@/lib/constants';

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
      // Use UTC methods so the date range is timezone-independent
      const y = targetDate.getUTCFullYear();
      const m = targetDate.getUTCMonth();
      const d = targetDate.getUTCDate();
      const startOfDay = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

      // Get class start date for rest day detection
      const membershipForRestDay = await ctx.db
        .select({ startDate: classes.startDate })
        .from(classMembers)
        .innerJoin(classes, eq(classMembers.classId, classes.id))
        .where(eq(classMembers.userId, ctx.userId))
        .limit(1);

      let restDay = false;
      if (membershipForRestDay.length > 0) {
        const classStart = new Date(membershipForRestDay[0].startDate);
        const daysSinceStart = Math.floor(
          (targetDate.getTime() - classStart.getTime()) / MS_PER_DAY
        );
        restDay = daysSinceStart >= 0 && (daysSinceStart + 1) % DAYS_PER_LEVEL === 0;
      }

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
          videoUrlDe: string | null;
          videoUrlEn: string | null;
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
            videoUrlDe: exercises.videoUrlDe,
            videoUrlEn: exercises.videoUrlEn,
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
        isRestDay: restDay,
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
            videoUrlDe: exercises.videoUrlDe,
            videoUrlEn: exercises.videoUrlEn,
        audioUrl: exercises.audioUrl,
        contentDe: exercises.contentDe,
        contentEn: exercises.contentEn,
      })
      .from(exercises)
      .where(inArray(exercises.id, exerciseIds));

    return optionalExercises;
  }),

  /**
   * Get the current user's full profile: user info, mentor, and enrolled classes.
   */
  getProfile: menteeProcedure.query(async ({ ctx }) => {
    const [userRow] = await ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        mentorId: users.mentorId,
      })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);

    if (!userRow) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }

    // Load mentor details if assigned
    let mentor: { id: string; name: string | null; email: string } | null = null;
    if (userRow.mentorId) {
      const [mentorRow] = await ctx.db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, userRow.mentorId))
        .limit(1);
      mentor = mentorRow ?? null;
    }

    // Load enrolled active classes
    const enrolledClasses = await ctx.db
      .select({ id: classes.id, name: classes.name, status: classes.status })
      .from(classMembers)
      .innerJoin(classes, eq(classMembers.classId, classes.id))
      .where(eq(classMembers.userId, ctx.userId));

    return {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      mentor,
      classes: enrolledClasses,
    };
  }),

  /**
   * Get exercises for a date range (used by weekly tracking view)
   * Returns all scheduled exercises for the mentee within the range.
   */
  getWeeklyTracking: menteeProcedure
    .input(
      z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      const scheduled = await ctx.db
        .select({
          id: scheduledExercises.id,
          exerciseId: scheduledExercises.exerciseId,
          scheduledAt: scheduledExercises.scheduledAt,
          completed: scheduledExercises.completed,
          completedAt: scheduledExercises.completedAt,
        })
        .from(scheduledExercises)
        .where(
          and(
            eq(scheduledExercises.userId, ctx.userId),
            gte(scheduledExercises.scheduledAt, startDate),
            lte(scheduledExercises.scheduledAt, endDate)
          )
        )
        .orderBy(asc(scheduledExercises.scheduledAt));

      const exerciseIds = Array.from(new Set(scheduled.map(s => s.exerciseId)));
      let exercisesMap: Record<string, { id: string; titleDe: string; type: string }> = {};

      if (exerciseIds.length > 0) {
        const exercisesList = await ctx.db
          .select({ id: exercises.id, titleDe: exercises.titleDe, type: exercises.type })
          .from(exercises)
          .where(inArray(exercises.id, exerciseIds));
        exercisesMap = Object.fromEntries(exercisesList.map(e => [e.id, e]));
      }

      return {
        entries: scheduled.map(s => ({
          ...s,
          exercise: exercisesMap[s.exerciseId] ?? null,
        })),
      };
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
            videoUrlDe: exercises.videoUrlDe,
            videoUrlEn: exercises.videoUrlEn,
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
      const weeksSinceStart = Math.floor(
        (weekStartDate.getTime() - classStartDate.getTime()) / MS_PER_WEEK
      );
      const weekNumber = Math.max(1, weeksSinceStart + 1);

      // Calculate which level of the program (for curriculum lookup)
      const levelNumber = Math.ceil(weekNumber / WEEKS_PER_LEVEL);

      // Get curriculum for this level
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
            eq(classCurriculum.levelNumber, levelNumber)
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
          reflectionQuestions: schwerpunktebenen.reflectionQuestions,
          trackingCategories: schwerpunktebenen.trackingCategories,
        })
        .from(schwerpunktebenen)
        .where(eq(schwerpunktebenen.id, curriculum.schwerpunktebeneId))
        .limit(1);

      if (!schwerpunktebene) {
        return null;
      }

      // Calculate week within the level (1-3)
      const weekWithinMonth = ((weekNumber - 1) % WEEKS_PER_LEVEL) + 1;

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
          reflectionQuestions: schwerpunktebene.reflectionQuestions,
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
        levelNumber,
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

      // Get class start date for rest day detection
      const memberships = await ctx.db
        .select({
          startDate: classes.startDate,
        })
        .from(classMembers)
        .innerJoin(classes, eq(classMembers.classId, classes.id))
        .where(eq(classMembers.userId, ctx.userId))
        .limit(1);

      const classStartDate = memberships.length > 0 ? new Date(memberships[0].startDate) : null;

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
          imageUrl: string | null;
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
            imageUrl: exercises.imageUrl,
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

      // Helper: check if a date is a rest day (day 21 of each level)
      function isRestDay(date: Date): boolean {
        if (!classStartDate) return false;
        const daysSinceStart = Math.floor(
          (date.getTime() - classStartDate.getTime()) / MS_PER_DAY
        );
        // Day 21, 42, 63, 84, 105 are rest days (0-indexed: 20, 41, 62, 83, 104)
        return daysSinceStart >= 0 && (daysSinceStart + 1) % DAYS_PER_LEVEL === 0;
      }

      // Group by date (YYYY-MM-DD)
      const byDay: Record<
        string,
        {
          date: string;
          exercises: typeof enriched;
          totalCount: number;
          completedCount: number;
          isRestDay: boolean;
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
          isRestDay: isRestDay(date),
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
            videoUrlDe: exercises.videoUrlDe,
            videoUrlEn: exercises.videoUrlEn,
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

  /**
   * Get privacy settings for the current mentee
   */
  getPrivacySettings: menteeProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db
      .select({
        shareDiaryWithMentor: users.shareDiaryWithMentor,
        shareWeeklySummaryWithMentor: users.shareWeeklySummaryWithMentor,
      })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);

    return {
      shareDiaryWithMentor: user?.shareDiaryWithMentor ?? false,
      shareWeeklySummaryWithMentor: user?.shareWeeklySummaryWithMentor ?? false,
    };
  }),

  /**
   * Update privacy settings for the current mentee
   */
  updatePrivacySettings: menteeProcedure
    .input(
      z.object({
        shareDiaryWithMentor: z.boolean().optional(),
        shareWeeklySummaryWithMentor: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.shareDiaryWithMentor !== undefined)
        updates.shareDiaryWithMentor = input.shareDiaryWithMentor;
      if (input.shareWeeklySummaryWithMentor !== undefined)
        updates.shareWeeklySummaryWithMentor = input.shareWeeklySummaryWithMentor;

      await ctx.db
        .update(users)
        .set(updates)
        .where(eq(users.id, ctx.userId));

      return { success: true };
    }),

  // ── Program Timeline ─────────────────────────────────────────────

  /**
   * Get the full RDY Masterclass program timeline from class start date.
   * Reads from the program_events table (auto-generated when admin creates a class).
   * Falls back to on-the-fly calculation for classes created before this feature.
   */
  getProgramTimeline: menteeProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db
      .select({
        classId: classMembers.classId,
        startDate: classes.startDate,
        className: classes.name,
      })
      .from(classMembers)
      .innerJoin(classes, eq(classMembers.classId, classes.id))
      .where(eq(classMembers.userId, ctx.userId))
      .limit(1);

    if (memberships.length === 0) return null;

    const { classId, startDate, className } = memberships[0];
    const start = new Date(startDate);

    // Try to read from program_events table
    const dbEvents = await ctx.db
      .select({
        type: programEvents.type,
        label: programEvents.label,
        scheduledDate: programEvents.scheduledDate,
      })
      .from(programEvents)
      .where(eq(programEvents.classId, classId))
      .orderBy(asc(programEvents.scheduledDate));

    if (dbEvents.length > 0) {
      const events = dbEvents.map((e) => ({
        type: e.type,
        label: e.label,
        date: new Date(e.scheduledDate).toISOString(),
      }));
      return { className, startDate: start.toISOString(), events };
    }

    // Fallback: calculate on-the-fly for classes created before programEvents existed
    const offsets = [
      { type: 'basics', label: 'BASICS', dayOffset: 0 },
      { type: 'module', label: 'MODUL 1', dayOffset: 7 },
      { type: 'module', label: 'MODUL 2', dayOffset: 28 },
      { type: 'module', label: 'MODUL 3', dayOffset: 49 },
      { type: 'module', label: 'MODUL 4', dayOffset: 70 },
      { type: 'module', label: 'MODUL 5', dayOffset: 91 },
      { type: 'endtalk', label: 'END TALK', dayOffset: 112 },
    ];

    const events = offsets.map((o) => ({
      type: o.type,
      label: o.label,
      date: new Date(start.getTime() + o.dayOffset * 24 * 60 * 60 * 1000).toISOString(),
    }));

    return { className, startDate: start.toISOString(), events };
  }),

  // ── Tracking Categories ──────────────────────────────────────────

  /**
   * Get the mentee's tracking categories (mentor-assigned or defaults)
   */
  getTrackingCategories: menteeProcedure.query(async ({ ctx }) => {
    // 1. Try to get categories from the user's current module (schwerpunktebene)
    const memberships = await ctx.db
      .select({
        classId: classMembers.classId,
        startDate: classes.startDate,
      })
      .from(classMembers)
      .innerJoin(classes, eq(classMembers.classId, classes.id))
      .where(eq(classMembers.userId, ctx.userId))
      .limit(1);

    if (memberships.length > 0) {
      const membership = memberships[0];
      const now = new Date();
      const classStartDate = new Date(membership.startDate);
      const weeksSinceStart = Math.floor(
        (now.getTime() - classStartDate.getTime()) / MS_PER_WEEK
      );
      const weekNumber = Math.max(1, weeksSinceStart + 1);
      const levelNumber = Math.ceil(weekNumber / WEEKS_PER_LEVEL);

      const [curriculum] = await ctx.db
        .select({
          schwerpunktebeneId: classCurriculum.schwerpunktebeneId,
        })
        .from(classCurriculum)
        .where(
          and(
            eq(classCurriculum.classId, membership.classId),
            eq(classCurriculum.levelNumber, levelNumber)
          )
        )
        .limit(1);

      if (curriculum) {
        // Check week-level categories first
        const weekWithinModule = ((weekNumber - 1) % WEEKS_PER_LEVEL) + 1;
        const [weekData] = await ctx.db
          .select({ trackingCategories: weeks.trackingCategories })
          .from(weeks)
          .where(
            and(
              eq(weeks.schwerpunktebeneId, curriculum.schwerpunktebeneId),
              eq(weeks.weekNumber, String(weekWithinModule))
            )
          )
          .limit(1);

        if (weekData?.trackingCategories && Array.isArray(weekData.trackingCategories) && weekData.trackingCategories.length > 0) {
          return weekData.trackingCategories as Array<{ key: string; label: string; emoji: string }>;
        }

        // Then module-level categories
        const [sp] = await ctx.db
          .select({ trackingCategories: schwerpunktebenen.trackingCategories })
          .from(schwerpunktebenen)
          .where(eq(schwerpunktebenen.id, curriculum.schwerpunktebeneId))
          .limit(1);

        if (sp?.trackingCategories && Array.isArray(sp.trackingCategories) && sp.trackingCategories.length > 0) {
          return sp.trackingCategories as Array<{ key: string; label: string; emoji: string }>;
        }
      }
    }

    // 2. Fall back to user's personal tracking categories (mentor-assigned)
    const [user] = await ctx.db
      .select({ trackingCategories: users.trackingCategories })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);

    if (user?.trackingCategories && Array.isArray(user.trackingCategories) && (user.trackingCategories as Array<unknown>).length > 0) {
      return user.trackingCategories as Array<{ key: string; label: string; emoji: string }>;
    }

    // 3. System defaults
    return [
      { key: 'stress', label: 'Stresslevel', emoji: '🔥' },
      { key: 'breathing', label: 'Atmung', emoji: '🌬️' },
      { key: 'body', label: 'Körper', emoji: '🧘' },
      { key: 'thoughts', label: 'Gedanken', emoji: '💭' },
    ];
  }),

  /**
   * Get diary prompts/guiding questions for the current week
   */
  getDiaryPrompts: menteeProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db
      .select({ classId: classMembers.classId, startDate: classes.startDate })
      .from(classMembers)
      .innerJoin(classes, eq(classMembers.classId, classes.id))
      .where(eq(classMembers.userId, ctx.userId))
      .limit(1);

    if (memberships.length === 0) return [];

    const classStartDate = new Date(memberships[0].startDate);
    const weeksSinceStart = Math.floor(
      (Date.now() - classStartDate.getTime()) / MS_PER_WEEK
    );
    const weekNumber = Math.max(1, weeksSinceStart + 1);
    const levelNumber = Math.ceil(weekNumber / WEEKS_PER_LEVEL);
    const weekWithinModule = ((weekNumber - 1) % WEEKS_PER_LEVEL) + 1;

    const [curriculum] = await ctx.db
      .select({ schwerpunktebeneId: classCurriculum.schwerpunktebeneId })
      .from(classCurriculum)
      .where(
        and(
          eq(classCurriculum.classId, memberships[0].classId),
          eq(classCurriculum.levelNumber, levelNumber)
        )
      )
      .limit(1);

    if (!curriculum) return [];

    const [weekData] = await ctx.db
      .select({ diaryPrompts: weeks.diaryPrompts })
      .from(weeks)
      .where(
        and(
          eq(weeks.schwerpunktebeneId, curriculum.schwerpunktebeneId),
          eq(weeks.weekNumber, String(weekWithinModule))
        )
      )
      .limit(1);

    if (weekData?.diaryPrompts && Array.isArray(weekData.diaryPrompts)) {
      return weekData.diaryPrompts as string[];
    }

    return [];
  }),

  // ── Daily Tracking ──────────────────────────────────────────────

  /**
   * Get tracking entries for a specific date (all entries, with timestamps)
   */
  getTrackingForDate: menteeProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      const entryDate = new Date(input.date);
      entryDate.setHours(0, 0, 0, 0);

      return ctx.db
        .select({
          id: trackingEntries.id,
          category: trackingEntries.category,
          value: trackingEntries.value,
          recordedAt: trackingEntries.recordedAt,
        })
        .from(trackingEntries)
        .where(
          and(
            eq(trackingEntries.userId, ctx.userId),
            eq(trackingEntries.entryDate, entryDate)
          )
        )
        .orderBy(asc(trackingEntries.recordedAt));
    }),

  /**
   * Get tracking entries for a date range (for mentor curves)
   */
  getTrackingForRange: menteeProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
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
            eq(trackingEntries.userId, ctx.userId),
            gte(trackingEntries.entryDate, start),
            lte(trackingEntries.entryDate, end)
          )
        )
        .orderBy(asc(trackingEntries.recordedAt));
    }),

  /**
   * Log a tracking value — always inserts (multiple per day per category)
   */
  saveTracking: menteeProcedure
    .input(
      z.object({
        category: z.string().min(1).max(50),
        value: z.number().int().min(0).max(10).optional().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const entryDate = new Date(now);
      entryDate.setHours(0, 0, 0, 0);

      await ctx.db.insert(trackingEntries).values({
        userId: ctx.userId,
        entryDate,
        category: input.category,
        value: input.value,
        recordedAt: now,
      });

      return { success: true };
    }),

  // ── Reflection Sheets ───────────────────────────────────────────────

  /**
   * Get reflection entry for a module
   */
  getReflection: menteeProcedure
    .input(z.object({ schwerpunktebeneId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [entry] = await ctx.db
        .select()
        .from(reflectionEntries)
        .where(
          and(
            eq(reflectionEntries.userId, ctx.userId),
            eq(reflectionEntries.schwerpunktebeneId, input.schwerpunktebeneId)
          )
        )
        .limit(1);

      return entry || null;
    }),

  /**
   * Save reflection responses (upsert)
   */
  saveReflection: menteeProcedure
    .input(
      z.object({
        schwerpunktebeneId: z.string().uuid(),
        responses: z.array(z.object({
          question: z.string(),
          answer: z.string(),
        })),
        submit: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: reflectionEntries.id })
        .from(reflectionEntries)
        .where(
          and(
            eq(reflectionEntries.userId, ctx.userId),
            eq(reflectionEntries.schwerpunktebeneId, input.schwerpunktebeneId)
          )
        )
        .limit(1);

      if (existing) {
        await ctx.db
          .update(reflectionEntries)
          .set({
            responses: input.responses,
            submittedAt: input.submit ? new Date() : undefined,
            updatedAt: new Date(),
          })
          .where(eq(reflectionEntries.id, existing.id));
      } else {
        await ctx.db.insert(reflectionEntries).values({
          userId: ctx.userId,
          schwerpunktebeneId: input.schwerpunktebeneId,
          responses: input.responses,
          submittedAt: input.submit ? new Date() : undefined,
        });
      }

      return { success: true };
    }),

  // ── Booking Reminder ──────────────────────────────────────────────

  /**
   * Check if the mentee needs to book a 1:1 session for the current module period
   */
  getBookingReminder: menteeProcedure.query(async ({ ctx }) => {
    // Get user's class membership
    const memberships = await ctx.db
      .select({
        classId: classMembers.classId,
        startDate: classes.startDate,
      })
      .from(classMembers)
      .innerJoin(classes, eq(classMembers.classId, classes.id))
      .where(eq(classMembers.userId, ctx.userId))
      .limit(1);

    if (memberships.length === 0) {
      return { needsBooking: false };
    }

    const { classId, startDate } = memberships[0];
    const classStart = new Date(startDate);
    const now = new Date();

    // Use the same timeline offsets as getProgramTimeline
    const moduleOffsets = [
      { label: 'MODUL 1', dayOffset: 7, endOffset: 28 },
      { label: 'MODUL 2', dayOffset: 28, endOffset: 49 },
      { label: 'MODUL 3', dayOffset: 49, endOffset: 70 },
      { label: 'MODUL 4', dayOffset: 70, endOffset: 91 },
      { label: 'MODUL 5', dayOffset: 91, endOffset: 112 },
    ];

    const daysSinceStart = Math.floor(
      (now.getTime() - classStart.getTime()) / MS_PER_DAY
    );

    // Find current module
    const currentModule = moduleOffsets.find(
      (m) => daysSinceStart >= m.dayOffset && daysSinceStart < m.endOffset
    );

    if (!currentModule) {
      return { needsBooking: false };
    }

    // Calculate current module period dates
    const moduleStart = new Date(classStart.getTime() + currentModule.dayOffset * MS_PER_DAY);
    const moduleEnd = new Date(classStart.getTime() + currentModule.endOffset * MS_PER_DAY);

    // Check if user has a booked/scheduled 1:1 session in this module period
    const bookedSessions = await ctx.db
      .select({ id: mentoringSessions.id })
      .from(mentoringSessions)
      .where(
        and(
          eq(mentoringSessions.menteeId, ctx.userId),
          eq(mentoringSessions.sessionType, '1:1'),
          gte(mentoringSessions.scheduledAt, moduleStart),
          lte(mentoringSessions.scheduledAt, moduleEnd)
        )
      )
      .limit(1);

    if (bookedSessions.length > 0) {
      return { needsBooking: false };
    }

    return { needsBooking: true, moduleName: currentModule.label };
  }),

  // ── Check-In Questionnaire ────────────────────────────────────────

  /**
   * Get check-in entry for the user's current class
   */
  getCheckIn: menteeProcedure.query(async ({ ctx }) => {
    // Get user's class membership
    const [membership] = await ctx.db
      .select({ classId: classMembers.classId })
      .from(classMembers)
      .where(eq(classMembers.userId, ctx.userId))
      .limit(1);

    if (!membership) return null;

    const [entry] = await ctx.db
      .select()
      .from(checkInEntries)
      .where(
        and(
          eq(checkInEntries.userId, ctx.userId),
          eq(checkInEntries.classId, membership.classId)
        )
      )
      .limit(1);

    return entry || null;
  }),

  /**
   * Save check-in responses (upsert)
   */
  saveCheckIn: menteeProcedure
    .input(
      z.object({
        responses: z.array(z.object({
          question: z.string(),
          answer: z.string(),
        })),
        submit: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get user's class membership
      const [membership] = await ctx.db
        .select({ classId: classMembers.classId })
        .from(classMembers)
        .where(eq(classMembers.userId, ctx.userId))
        .limit(1);

      if (!membership) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No class membership found' });
      }

      const [existing] = await ctx.db
        .select({ id: checkInEntries.id })
        .from(checkInEntries)
        .where(
          and(
            eq(checkInEntries.userId, ctx.userId),
            eq(checkInEntries.classId, membership.classId)
          )
        )
        .limit(1);

      if (existing) {
        await ctx.db
          .update(checkInEntries)
          .set({
            responses: input.responses,
            submittedAt: input.submit ? new Date() : undefined,
          })
          .where(eq(checkInEntries.id, existing.id));
      } else {
        await ctx.db.insert(checkInEntries).values({
          userId: ctx.userId,
          classId: membership.classId,
          responses: input.responses,
          submittedAt: input.submit ? new Date() : undefined,
        });
      }

      return { success: true };
    }),

  /**
   * Check if mentee should see the check-in banner
   * Returns true if in BASICS/pre-Module-1 period and check-in not submitted
   */
  getCheckInStatus: menteeProcedure.query(async ({ ctx }) => {
    // Get user's class membership
    const memberships = await ctx.db
      .select({
        classId: classMembers.classId,
        startDate: classes.startDate,
      })
      .from(classMembers)
      .innerJoin(classes, eq(classMembers.classId, classes.id))
      .where(eq(classMembers.userId, ctx.userId))
      .limit(1);

    if (memberships.length === 0) {
      return { showBanner: false };
    }

    const { classId, startDate } = memberships[0];
    const classStart = new Date(startDate);
    const now = new Date();

    // BASICS period is day 0-6 (before Module 1 starts at day 7)
    const daysSinceStart = Math.floor(
      (now.getTime() - classStart.getTime()) / MS_PER_DAY
    );

    if (daysSinceStart < 0 || daysSinceStart >= 7) {
      return { showBanner: false };
    }

    // Check if check-in already submitted
    const [entry] = await ctx.db
      .select({ submittedAt: checkInEntries.submittedAt })
      .from(checkInEntries)
      .where(
        and(
          eq(checkInEntries.userId, ctx.userId),
          eq(checkInEntries.classId, classId)
        )
      )
      .limit(1);

    if (entry?.submittedAt) {
      return { showBanner: false };
    }

    return { showBanner: true };
  }),

  // ── Upcoming Exercise Reminders ───────────────────────────────────

  /**
   * Get exercises scheduled in the next 15 minutes for the current user
   */
  getUpcomingExerciseReminders: menteeProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

    const upcoming = await ctx.db
      .select({
        id: scheduledExercises.id,
        scheduledAt: scheduledExercises.scheduledAt,
        exerciseId: scheduledExercises.exerciseId,
      })
      .from(scheduledExercises)
      .where(
        and(
          eq(scheduledExercises.userId, ctx.userId),
          eq(scheduledExercises.completed, false),
          gte(scheduledExercises.scheduledAt, now),
          lte(scheduledExercises.scheduledAt, fifteenMinutesFromNow)
        )
      )
      .orderBy(asc(scheduledExercises.scheduledAt));

    if (upcoming.length === 0) return [];

    const exerciseIds = upcoming.map((u) => u.exerciseId);
    const exercisesData = await ctx.db
      .select({
        id: exercises.id,
        titleDe: exercises.titleDe,
        titleEn: exercises.titleEn,
        type: exercises.type,
        durationMinutes: exercises.durationMinutes,
      })
      .from(exercises)
      .where(inArray(exercises.id, exerciseIds));

    const exercisesMap = Object.fromEntries(exercisesData.map((e) => [e.id, e]));

    return upcoming.map((u) => ({
      ...u,
      exercise: exercisesMap[u.exerciseId] || null,
    }));
  }),
});
