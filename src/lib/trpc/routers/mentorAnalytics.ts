import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  classes,
  classMembers,
  users,
  scheduledExercises,
  patternEntries,
  diaryEntries,
} from '@/lib/db/schema';
import { eq, and, count, gte, lte, inArray, sql, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { ANALYTICS_LOW_COMPLETION_RATE, ANALYTICS_LOW_MOOD_SCORE, ANALYTICS_HIGH_PRIORITY_FLAGS, ANALYTICS_DEFAULT_INACTIVE_DAYS, ANALYTICS_MOOD_ANALYSIS_DAYS, ANALYTICS_DEFAULT_RANGE_DAYS } from '@/lib/constants';

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

// Pattern types for mood tracking
const patternTypes = ['stress', 'energy', 'mood', 'focus', 'anxiety', 'motivation'] as const;
type PatternType = typeof patternTypes[number];

// Positive patterns contribute positively to mood score
const positivePatterns: PatternType[] = ['mood', 'energy', 'motivation', 'focus'];
// Negative patterns contribute negatively to mood score
const negativePatterns: PatternType[] = ['stress', 'anxiety'];

/**
 * Calculate mood score from pattern entries
 * Returns a score from 0-100 where higher is better
 */
function calculateMoodScore(patterns: { patternType: string; intensity: string }[]): number {
  if (patterns.length === 0) return 50; // Neutral if no data

  let positiveScore = 0;
  let negativeScore = 0;

  for (const pattern of patterns) {
    const intensityValue = pattern.intensity === 'strong' ? 2 : pattern.intensity === 'weak' ? 1 : 0;
    if (positivePatterns.includes(pattern.patternType as PatternType)) {
      positiveScore += intensityValue;
    } else if (negativePatterns.includes(pattern.patternType as PatternType)) {
      negativeScore += intensityValue;
    }
  }

  const maxScore = patterns.length * 2;
  if (maxScore === 0) return 50;

  // Scale to 0-100 where 50 is neutral
  return Math.round(Math.max(0, Math.min(100, ((positiveScore - negativeScore + maxScore) / (maxScore * 2)) * 100)));
}

export const mentorAnalyticsRouter = router({
  /**
   * Get class-level completion rates
   * Returns completion rates for all classes assigned to the mentor
   */
  getClassCompletionRates: mentorProcedure
    .input(
      z.object({
        classId: z.string().uuid().optional(), // Optional: filter by specific class
        dateRange: z.object({
          startDate: z.string().datetime().optional(),
          endDate: z.string().datetime().optional(),
        }).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Get mentor's classes
      const classConditions = [
        eq(classes.mentorId, ctx.mentorUserId),
        eq(classes.tenantId, ctx.tenantId),
      ];

      if (input?.classId) {
        classConditions.push(eq(classes.id, input.classId));
      }

      const mentorClasses = await ctx.db
        .select({
          id: classes.id,
          name: classes.name,
          status: classes.status,
          startDate: classes.startDate,
          endDate: classes.endDate,
          durationLevels: classes.durationLevels,
        })
        .from(classes)
        .where(and(...classConditions));

      if (mentorClasses.length === 0) {
        return {
          classes: [],
          overallCompletionRate: 0,
          totalExercises: 0,
          completedExercises: 0,
        };
      }

      const classIds = mentorClasses.map(c => c.id);

      // Build date conditions for exercise queries
      const exerciseConditions = [inArray(scheduledExercises.classId, classIds)];
      if (input?.dateRange?.startDate) {
        exerciseConditions.push(gte(scheduledExercises.scheduledAt, new Date(input.dateRange.startDate)));
      }
      if (input?.dateRange?.endDate) {
        exerciseConditions.push(lte(scheduledExercises.scheduledAt, new Date(input.dateRange.endDate)));
      }

      // Get completion stats per class
      const completionStats = await ctx.db
        .select({
          classId: scheduledExercises.classId,
          total: count(),
          completed: sql<number>`count(case when ${scheduledExercises.completed} = true then 1 end)`,
        })
        .from(scheduledExercises)
        .where(and(...exerciseConditions))
        .groupBy(scheduledExercises.classId);

      const statsMap = completionStats.reduce((acc, stat) => {
        acc[stat.classId] = {
          total: Number(stat.total),
          completed: Number(stat.completed),
        };
        return acc;
      }, {} as Record<string, { total: number; completed: number }>);

      // Get member count per class
      const memberCounts = await ctx.db
        .select({
          classId: classMembers.classId,
          count: count(),
        })
        .from(classMembers)
        .where(inArray(classMembers.classId, classIds))
        .groupBy(classMembers.classId);

      const memberCountMap = memberCounts.reduce((acc, m) => {
        acc[m.classId] = Number(m.count);
        return acc;
      }, {} as Record<string, number>);

      // Calculate completion rates for each class
      let totalExercises = 0;
      let completedExercises = 0;

      const classCompletionRates = mentorClasses.map(cls => {
        const stats = statsMap[cls.id] || { total: 0, completed: 0 };
        totalExercises += stats.total;
        completedExercises += stats.completed;

        const completionRate = stats.total > 0
          ? Math.round((stats.completed / stats.total) * 100)
          : 0;

        return {
          id: cls.id,
          name: cls.name,
          status: cls.status,
          startDate: cls.startDate,
          endDate: cls.endDate,
          durationLevels: cls.durationLevels,
          memberCount: memberCountMap[cls.id] || 0,
          totalExercises: stats.total,
          completedExercises: stats.completed,
          completionRate,
        };
      });

      // Sort by completion rate (lowest first to highlight classes needing attention)
      classCompletionRates.sort((a, b) => a.completionRate - b.completionRate);

      const overallCompletionRate = totalExercises > 0
        ? Math.round((completedExercises / totalExercises) * 100)
        : 0;

      return {
        classes: classCompletionRates,
        overallCompletionRate,
        totalExercises,
        completedExercises,
      };
    }),

  /**
   * Get individual mentee progress
   * Returns detailed progress for each mentee across all classes or specific class
   */
  getMenteeProgress: mentorProcedure
    .input(
      z.object({
        classId: z.string().uuid().optional(),
        sortBy: z.enum(['name', 'completionRate', 'lastActivity']).optional().default('name'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // Get mentor's classes
      const classConditions = [
        eq(classes.mentorId, ctx.mentorUserId),
        eq(classes.tenantId, ctx.tenantId),
      ];

      if (input?.classId) {
        classConditions.push(eq(classes.id, input.classId));
      }

      const mentorClasses = await ctx.db
        .select({ id: classes.id, name: classes.name })
        .from(classes)
        .where(and(...classConditions));

      if (mentorClasses.length === 0) {
        return {
          mentees: [],
          totalMentees: 0,
          averageCompletionRate: 0,
        };
      }

      const classIds = mentorClasses.map(c => c.id);
      const classNamesMap = mentorClasses.reduce((acc, c) => {
        acc[c.id] = c.name;
        return acc;
      }, {} as Record<string, string>);

      // Get all class members with user info
      const members = await ctx.db
        .select({
          id: classMembers.id,
          classId: classMembers.classId,
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
        .where(inArray(classMembers.classId, classIds));

      // Get exercise stats for all members
      const memberProgressPromises = members.map(async (member) => {
        // Get exercise completion stats
        const [totalResult] = await ctx.db
          .select({ count: count() })
          .from(scheduledExercises)
          .where(
            and(
              eq(scheduledExercises.classId, member.classId),
              eq(scheduledExercises.userId, member.userId)
            )
          );

        const [completedResult] = await ctx.db
          .select({ count: count() })
          .from(scheduledExercises)
          .where(
            and(
              eq(scheduledExercises.classId, member.classId),
              eq(scheduledExercises.userId, member.userId),
              eq(scheduledExercises.completed, true)
            )
          );

        // Get most recent activity (last completed exercise or last diary entry)
        const [lastExercise] = await ctx.db
          .select({ completedAt: scheduledExercises.completedAt })
          .from(scheduledExercises)
          .where(
            and(
              eq(scheduledExercises.userId, member.userId),
              eq(scheduledExercises.completed, true)
            )
          )
          .orderBy(desc(scheduledExercises.completedAt))
          .limit(1);

        const [lastDiary] = await ctx.db
          .select({ entryDate: diaryEntries.entryDate })
          .from(diaryEntries)
          .where(eq(diaryEntries.userId, member.userId))
          .orderBy(desc(diaryEntries.entryDate))
          .limit(1);

        const lastExerciseDate = lastExercise?.completedAt;
        const lastDiaryDate = lastDiary?.entryDate;

        let lastActivity: Date | null = null;
        if (lastExerciseDate && lastDiaryDate) {
          lastActivity = lastExerciseDate > lastDiaryDate ? lastExerciseDate : lastDiaryDate;
        } else {
          lastActivity = lastExerciseDate || lastDiaryDate || null;
        }

        const totalExercises = Number(totalResult?.count ?? 0);
        const completedExercises = Number(completedResult?.count ?? 0);
        const completionRate = totalExercises > 0
          ? Math.round((completedExercises / totalExercises) * 100)
          : 0;

        return {
          id: member.id,
          userId: member.userId,
          user: member.user,
          classId: member.classId,
          className: classNamesMap[member.classId] || 'Unknown Class',
          enrolledAt: member.enrolledAt,
          completedAt: member.completedAt,
          totalExercises,
          completedExercises,
          completionRate,
          lastActivity,
        };
      });

      const menteeProgress = await Promise.all(memberProgressPromises);

      // Sort based on input
      const sortBy = input?.sortBy || 'name';
      const sortOrder = input?.sortOrder || 'asc';
      const sortMultiplier = sortOrder === 'asc' ? 1 : -1;

      menteeProgress.sort((a, b) => {
        if (sortBy === 'name') {
          return sortMultiplier * ((a.user.name || '').localeCompare(b.user.name || ''));
        } else if (sortBy === 'completionRate') {
          return sortMultiplier * (a.completionRate - b.completionRate);
        } else if (sortBy === 'lastActivity') {
          const aTime = a.lastActivity?.getTime() || 0;
          const bTime = b.lastActivity?.getTime() || 0;
          return sortMultiplier * (aTime - bTime);
        }
        return 0;
      });

      // Calculate average completion rate
      const averageCompletionRate = menteeProgress.length > 0
        ? Math.round(menteeProgress.reduce((sum, m) => sum + m.completionRate, 0) / menteeProgress.length)
        : 0;

      return {
        mentees: menteeProgress,
        totalMentees: menteeProgress.length,
        averageCompletionRate,
      };
    }),

  /**
   * Get mood trends across class
   * Returns aggregated mood/pattern data for all mentees in a class
   */
  getClassMoodTrends: mentorProcedure
    .input(
      z.object({
        classId: z.string().uuid().optional(),
        dateRange: z.object({
          startDate: z.string().datetime(),
          endDate: z.string().datetime(),
        }),
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateRange } = input;
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);

      // Get mentor's classes
      const classConditions = [
        eq(classes.mentorId, ctx.mentorUserId),
        eq(classes.tenantId, ctx.tenantId),
      ];

      if (input.classId) {
        classConditions.push(eq(classes.id, input.classId));
      }

      const mentorClasses = await ctx.db
        .select({ id: classes.id, name: classes.name })
        .from(classes)
        .where(and(...classConditions));

      if (mentorClasses.length === 0) {
        return {
          classTrends: [],
          overallMoodScore: 50,
          patternSummary: {},
          dailyTrends: [],
        };
      }

      const classIds = mentorClasses.map(c => c.id);

      // Get all mentee IDs in these classes
      const classMembers_list = await ctx.db
        .select({ userId: classMembers.userId, classId: classMembers.classId })
        .from(classMembers)
        .where(inArray(classMembers.classId, classIds));

      if (classMembers_list.length === 0) {
        return {
          classTrends: [],
          overallMoodScore: 50,
          patternSummary: {},
          dailyTrends: [],
        };
      }

      const menteeIds = Array.from(new Set(classMembers_list.map(m => m.userId)));

      // Get all pattern entries for these mentees in the date range
      const patterns = await ctx.db
        .select({
          userId: patternEntries.userId,
          entryDate: patternEntries.entryDate,
          patternType: patternEntries.patternType,
          intensity: patternEntries.intensity,
        })
        .from(patternEntries)
        .where(
          and(
            inArray(patternEntries.userId, menteeIds),
            gte(patternEntries.entryDate, startDate),
            lte(patternEntries.entryDate, endDate)
          )
        );

      // Calculate overall mood score
      const overallMoodScore = calculateMoodScore(patterns);

      // Aggregate pattern summary by type
      const patternSummary: Record<PatternType, {
        total: number;
        strong: number;
        weak: number;
        none: number;
        avgIntensity: number;
      }> = {} as typeof patternSummary;

      for (const type of patternTypes) {
        const typePatterns = patterns.filter(p => p.patternType === type);
        const strong = typePatterns.filter(p => p.intensity === 'strong').length;
        const weak = typePatterns.filter(p => p.intensity === 'weak').length;
        const none = typePatterns.filter(p => p.intensity === 'none').length;
        const total = typePatterns.length;
        const avgIntensity = total > 0 ? (strong * 2 + weak * 1) / total : 0;

        patternSummary[type] = { total, strong, weak, none, avgIntensity };
      }

      // Calculate daily mood trends
      const dailyPatterns: Record<string, { patternType: string; intensity: string }[]> = {};

      for (const pattern of patterns) {
        const dateKey = new Date(pattern.entryDate).toISOString().split('T')[0];
        if (!dailyPatterns[dateKey]) {
          dailyPatterns[dateKey] = [];
        }
        dailyPatterns[dateKey].push(pattern);
      }

      const dailyTrends = Object.entries(dailyPatterns)
        .map(([date, pats]) => ({
          date,
          moodScore: calculateMoodScore(pats),
          entryCount: pats.length,
          participantCount: new Set(patterns.filter(p =>
            new Date(p.entryDate).toISOString().split('T')[0] === date
          ).map(p => p.userId)).size,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate per-class mood scores
      const classTrends = await Promise.all(mentorClasses.map(async (cls) => {
        const classMemberIds = classMembers_list
          .filter(m => m.classId === cls.id)
          .map(m => m.userId);

        const classPatterns = patterns.filter(p => classMemberIds.includes(p.userId));
        const classMoodScore = calculateMoodScore(classPatterns);

        return {
          classId: cls.id,
          className: cls.name,
          moodScore: classMoodScore,
          participantCount: new Set(classPatterns.map(p => p.userId)).size,
          totalEntries: classPatterns.length,
        };
      }));

      return {
        classTrends,
        overallMoodScore,
        patternSummary,
        dailyTrends,
        totalEntries: patterns.length,
        participantCount: new Set(patterns.map(p => p.userId)).size,
      };
    }),

  /**
   * Identify mentees needing attention
   * Returns mentees who may need support based on various indicators
   */
  getMenteesNeedingAttention: mentorProcedure
    .input(
      z.object({
        classId: z.string().uuid().optional(),
        // Thresholds for determining who needs attention
        thresholds: z.object({
          lowCompletionRate: z.number().min(0).max(100).default(ANALYTICS_LOW_COMPLETION_RATE), // Below this % completion
          inactiveDays: z.number().min(1).default(ANALYTICS_DEFAULT_INACTIVE_DAYS), // No activity for this many days
          lowMoodScore: z.number().min(0).max(100).default(ANALYTICS_LOW_MOOD_SCORE), // Below this mood score
        }).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const thresholds = input?.thresholds || {
        lowCompletionRate: ANALYTICS_LOW_COMPLETION_RATE,
        inactiveDays: ANALYTICS_DEFAULT_INACTIVE_DAYS,
        lowMoodScore: ANALYTICS_LOW_MOOD_SCORE,
      };

      const now = new Date();
      const inactiveThresholdDate = new Date(now.getTime() - thresholds.inactiveDays * 24 * 60 * 60 * 1000);

      // Date range for mood analysis (last 14 days)
      const moodStartDate = new Date(now.getTime() - ANALYTICS_MOOD_ANALYSIS_DAYS * 24 * 60 * 60 * 1000);

      // Get mentor's classes
      const classConditions = [
        eq(classes.mentorId, ctx.mentorUserId),
        eq(classes.tenantId, ctx.tenantId),
        eq(classes.status, 'active'),
      ];

      if (input?.classId) {
        classConditions.push(eq(classes.id, input.classId));
      }

      const mentorClasses = await ctx.db
        .select({ id: classes.id, name: classes.name })
        .from(classes)
        .where(and(...classConditions));

      if (mentorClasses.length === 0) {
        return {
          menteesNeedingAttention: [],
          summary: {
            lowCompletion: 0,
            inactive: 0,
            lowMood: 0,
            total: 0,
          },
        };
      }

      const classIds = mentorClasses.map(c => c.id);
      const classNamesMap = mentorClasses.reduce((acc, c) => {
        acc[c.id] = c.name;
        return acc;
      }, {} as Record<string, string>);

      // Get all class members
      const members = await ctx.db
        .select({
          id: classMembers.id,
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
        .where(inArray(classMembers.classId, classIds));

      // Analyze each mentee
      const menteeAnalysisPromises = members.map(async (member) => {
        const flags: {
          lowCompletion: boolean;
          inactive: boolean;
          lowMood: boolean;
        } = {
          lowCompletion: false,
          inactive: false,
          lowMood: false,
        };

        const details: {
          completionRate: number;
          lastActivity: Date | null;
          moodScore: number;
          scheduledCount: number;
          completedCount: number;
        } = {
          completionRate: 0,
          lastActivity: null,
          moodScore: 50,
          scheduledCount: 0,
          completedCount: 0,
        };

        // Check completion rate
        const [totalResult] = await ctx.db
          .select({ count: count() })
          .from(scheduledExercises)
          .where(
            and(
              eq(scheduledExercises.classId, member.classId),
              eq(scheduledExercises.userId, member.userId)
            )
          );

        const [completedResult] = await ctx.db
          .select({ count: count() })
          .from(scheduledExercises)
          .where(
            and(
              eq(scheduledExercises.classId, member.classId),
              eq(scheduledExercises.userId, member.userId),
              eq(scheduledExercises.completed, true)
            )
          );

        details.scheduledCount = Number(totalResult?.count ?? 0);
        details.completedCount = Number(completedResult?.count ?? 0);
        details.completionRate = details.scheduledCount > 0
          ? Math.round((details.completedCount / details.scheduledCount) * 100)
          : 0;

        if (details.scheduledCount > 0 && details.completionRate < thresholds.lowCompletionRate) {
          flags.lowCompletion = true;
        }

        // Check for inactivity
        const [lastExercise] = await ctx.db
          .select({ completedAt: scheduledExercises.completedAt })
          .from(scheduledExercises)
          .where(
            and(
              eq(scheduledExercises.userId, member.userId),
              eq(scheduledExercises.completed, true)
            )
          )
          .orderBy(desc(scheduledExercises.completedAt))
          .limit(1);

        const [lastDiary] = await ctx.db
          .select({ entryDate: diaryEntries.entryDate })
          .from(diaryEntries)
          .where(eq(diaryEntries.userId, member.userId))
          .orderBy(desc(diaryEntries.entryDate))
          .limit(1);

        const [lastPattern] = await ctx.db
          .select({ entryDate: patternEntries.entryDate })
          .from(patternEntries)
          .where(eq(patternEntries.userId, member.userId))
          .orderBy(desc(patternEntries.entryDate))
          .limit(1);

        const lastExerciseDate = lastExercise?.completedAt;
        const lastDiaryDate = lastDiary?.entryDate;
        const lastPatternDate = lastPattern?.entryDate;

        // Find most recent activity
        const activities = [lastExerciseDate, lastDiaryDate, lastPatternDate].filter(Boolean) as Date[];
        details.lastActivity = activities.length > 0
          ? activities.reduce((latest, current) => current > latest ? current : latest)
          : null;

        if (!details.lastActivity || details.lastActivity < inactiveThresholdDate) {
          flags.inactive = true;
        }

        // Check mood score (last 14 days)
        const recentPatterns = await ctx.db
          .select({
            patternType: patternEntries.patternType,
            intensity: patternEntries.intensity,
          })
          .from(patternEntries)
          .where(
            and(
              eq(patternEntries.userId, member.userId),
              gte(patternEntries.entryDate, moodStartDate),
              lte(patternEntries.entryDate, now)
            )
          );

        details.moodScore = calculateMoodScore(recentPatterns);

        if (recentPatterns.length > 0 && details.moodScore < thresholds.lowMoodScore) {
          flags.lowMood = true;
        }

        // Determine if mentee needs attention
        const needsAttention = flags.lowCompletion || flags.inactive || flags.lowMood;

        // Calculate priority (more flags = higher priority)
        const flagCount = (flags.lowCompletion ? 1 : 0) + (flags.inactive ? 1 : 0) + (flags.lowMood ? 1 : 0);
        const priority = flagCount >= ANALYTICS_HIGH_PRIORITY_FLAGS ? 'high' : flagCount === 2 ? 'medium' : 'low';

        return {
          id: member.id,
          userId: member.userId,
          user: member.user,
          classId: member.classId,
          className: classNamesMap[member.classId] || 'Unknown Class',
          enrolledAt: member.enrolledAt,
          needsAttention,
          flags,
          details,
          priority,
          reasons: [
            flags.lowCompletion && `Low completion rate (${details.completionRate}%)`,
            flags.inactive && `Inactive for ${details.lastActivity
              ? Math.floor((now.getTime() - details.lastActivity.getTime()) / (1000 * 60 * 60 * 24))
              : 'many'} days`,
            flags.lowMood && `Low mood score (${details.moodScore})`,
          ].filter(Boolean) as string[],
        };
      });

      const menteeAnalysis = await Promise.all(menteeAnalysisPromises);

      // Filter to only those needing attention and sort by priority
      const menteesNeedingAttention = menteeAnalysis
        .filter(m => m.needsAttention)
        .sort((a, b) => {
          // Sort by priority (high first), then by flag count, then by completion rate
          const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.details.completionRate - b.details.completionRate;
        });

      // Calculate summary
      const summary = {
        lowCompletion: menteeAnalysis.filter(m => m.flags.lowCompletion).length,
        inactive: menteeAnalysis.filter(m => m.flags.inactive).length,
        lowMood: menteeAnalysis.filter(m => m.flags.lowMood).length,
        total: menteesNeedingAttention.length,
      };

      return {
        menteesNeedingAttention,
        summary,
        thresholds,
      };
    }),

  /**
   * Get comprehensive analytics overview for mentor dashboard
   * Combines key metrics from all analytics endpoints
   */
  getAnalyticsOverview: mentorProcedure
    .input(
      z.object({
        dateRange: z.object({
          startDate: z.string().datetime(),
          endDate: z.string().datetime(),
        }).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const startDate = input?.dateRange?.startDate
        ? new Date(input.dateRange.startDate)
        : new Date(now.getTime() - ANALYTICS_DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000); // Default to last 30 days
      const endDate = input?.dateRange?.endDate
        ? new Date(input.dateRange.endDate)
        : now;

      // Get mentor's classes
      const mentorClasses = await ctx.db
        .select({
          id: classes.id,
          name: classes.name,
          status: classes.status,
        })
        .from(classes)
        .where(
          and(
            eq(classes.mentorId, ctx.mentorUserId),
            eq(classes.tenantId, ctx.tenantId)
          )
        );

      if (mentorClasses.length === 0) {
        return {
          totalClasses: 0,
          activeClasses: 0,
          totalMentees: 0,
          overallCompletionRate: 0,
          overallMoodScore: 50,
          menteesNeedingAttentionCount: 0,
          topPerformingClass: null,
          lowestPerformingClass: null,
        };
      }

      const classIds = mentorClasses.map(c => c.id);
      const activeClasses = mentorClasses.filter(c => c.status === 'active').length;

      // Get total mentees
      const [menteeCountResult] = await ctx.db
        .select({ count: count() })
        .from(classMembers)
        .where(inArray(classMembers.classId, classIds));
      const totalMentees = Number(menteeCountResult?.count ?? 0);

      // Get overall completion rate
      const [totalExercisesResult] = await ctx.db
        .select({ count: count() })
        .from(scheduledExercises)
        .where(
          and(
            inArray(scheduledExercises.classId, classIds),
            gte(scheduledExercises.scheduledAt, startDate),
            lte(scheduledExercises.scheduledAt, endDate)
          )
        );

      const [completedExercisesResult] = await ctx.db
        .select({ count: count() })
        .from(scheduledExercises)
        .where(
          and(
            inArray(scheduledExercises.classId, classIds),
            gte(scheduledExercises.scheduledAt, startDate),
            lte(scheduledExercises.scheduledAt, endDate),
            eq(scheduledExercises.completed, true)
          )
        );

      const totalExercises = Number(totalExercisesResult?.count ?? 0);
      const completedExercises = Number(completedExercisesResult?.count ?? 0);
      const overallCompletionRate = totalExercises > 0
        ? Math.round((completedExercises / totalExercises) * 100)
        : 0;

      // Get mood score for all mentees
      const membersList = await ctx.db
        .select({ userId: classMembers.userId })
        .from(classMembers)
        .where(inArray(classMembers.classId, classIds));

      const menteeIds = Array.from(new Set(membersList.map(m => m.userId)));

      let overallMoodScore = 50;
      if (menteeIds.length > 0) {
        const patterns = await ctx.db
          .select({
            patternType: patternEntries.patternType,
            intensity: patternEntries.intensity,
          })
          .from(patternEntries)
          .where(
            and(
              inArray(patternEntries.userId, menteeIds),
              gte(patternEntries.entryDate, startDate),
              lte(patternEntries.entryDate, endDate)
            )
          );

        overallMoodScore = calculateMoodScore(patterns);
      }

      // Count mentees needing attention (simplified check)
      const inactiveThreshold = new Date(now.getTime() - ANALYTICS_DEFAULT_INACTIVE_DAYS * 24 * 60 * 60 * 1000);
      let menteesNeedingAttentionCount = 0;

      for (const memberId of menteeIds) {
        // Check last activity
        const [lastActivity] = await ctx.db
          .select({ completedAt: scheduledExercises.completedAt })
          .from(scheduledExercises)
          .where(
            and(
              eq(scheduledExercises.userId, memberId),
              eq(scheduledExercises.completed, true)
            )
          )
          .orderBy(desc(scheduledExercises.completedAt))
          .limit(1);

        if (!lastActivity?.completedAt || lastActivity.completedAt < inactiveThreshold) {
          menteesNeedingAttentionCount++;
        }
      }

      // Find top and lowest performing classes
      const classPerformance = await Promise.all(
        mentorClasses.filter(c => c.status === 'active').map(async (cls) => {
          const [total] = await ctx.db
            .select({ count: count() })
            .from(scheduledExercises)
            .where(
              and(
                eq(scheduledExercises.classId, cls.id),
                gte(scheduledExercises.scheduledAt, startDate),
                lte(scheduledExercises.scheduledAt, endDate)
              )
            );

          const [completed] = await ctx.db
            .select({ count: count() })
            .from(scheduledExercises)
            .where(
              and(
                eq(scheduledExercises.classId, cls.id),
                gte(scheduledExercises.scheduledAt, startDate),
                lte(scheduledExercises.scheduledAt, endDate),
                eq(scheduledExercises.completed, true)
              )
            );

          const totalCount = Number(total?.count ?? 0);
          const completedCount = Number(completed?.count ?? 0);
          const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

          return { ...cls, completionRate: rate, totalExercises: totalCount };
        })
      );

      // Sort by completion rate
      classPerformance.sort((a, b) => b.completionRate - a.completionRate);

      const topPerformingClass = classPerformance.length > 0 && classPerformance[0].totalExercises > 0
        ? { name: classPerformance[0].name, completionRate: classPerformance[0].completionRate }
        : null;

      const lowestPerformingClass = classPerformance.length > 0 && classPerformance[classPerformance.length - 1].totalExercises > 0
        ? { name: classPerformance[classPerformance.length - 1].name, completionRate: classPerformance[classPerformance.length - 1].completionRate }
        : null;

      return {
        totalClasses: mentorClasses.length,
        activeClasses,
        totalMentees,
        overallCompletionRate,
        overallMoodScore,
        menteesNeedingAttentionCount,
        topPerformingClass,
        lowestPerformingClass,
      };
    }),
});
