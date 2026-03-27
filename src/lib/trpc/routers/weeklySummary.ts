import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  scheduledExercises,
  exercises,
  users,
  patternEntries,
  diaryEntries,
} from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { MOOD_NEUTRAL_SCORE } from '@/lib/constants';

/**
 * Mentee middleware - ensures user has mentee role and extracts mentee user info
 */
const weeklySummaryProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const userRoles = ctx.session.user.roles || [];

  // Allow mentee, mentor, admin, and superadmin to access weekly summary
  if (
    !userRoles.includes('mentee') &&
    !userRoles.includes('mentor') &&
    !userRoles.includes('admin') &&
    !userRoles.includes('superadmin')
  ) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
  }

  const [user] = await ctx.db
    .select({ id: users.id, tenantId: users.tenantId })
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
    },
  });
});

// Helper to get start and end of week
function getWeekBounds(weekStartDate: Date) {
  const start = new Date(weekStartDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

// Helper to get previous week bounds
function getPreviousWeekBounds(weekStartDate: Date) {
  const prevStart = new Date(weekStartDate);
  prevStart.setDate(prevStart.getDate() - 7);
  prevStart.setHours(0, 0, 0, 0);

  const prevEnd = new Date(prevStart);
  prevEnd.setDate(prevEnd.getDate() + 6);
  prevEnd.setHours(23, 59, 59, 999);

  return { start: prevStart, end: prevEnd };
}

export const weeklySummaryRouter = router({
  /**
   * Get complete weekly summary data
   * Combines exercise stats, emotional patterns, and diary highlights
   */
  getWeeklySummary: weeklySummaryProcedure
    .input(
      z.object({
        weekStartDate: z.string().datetime(),
      })
    )
    .query(async ({ ctx, input }) => {
      const currentWeek = getWeekBounds(new Date(input.weekStartDate));
      const previousWeek = getPreviousWeekBounds(new Date(input.weekStartDate));

      // === EXERCISE COMPLETION STATS ===
      // Current week exercises
      const currentWeekExercises = await ctx.db
        .select({
          id: scheduledExercises.id,
          completed: scheduledExercises.completed,
          scheduledAt: scheduledExercises.scheduledAt,
          exerciseId: scheduledExercises.exerciseId,
        })
        .from(scheduledExercises)
        .where(
          and(
            eq(scheduledExercises.userId, ctx.userId),
            gte(scheduledExercises.scheduledAt, currentWeek.start),
            lte(scheduledExercises.scheduledAt, currentWeek.end)
          )
        );

      // Previous week exercises for comparison
      const previousWeekExercises = await ctx.db
        .select({
          id: scheduledExercises.id,
          completed: scheduledExercises.completed,
        })
        .from(scheduledExercises)
        .where(
          and(
            eq(scheduledExercises.userId, ctx.userId),
            gte(scheduledExercises.scheduledAt, previousWeek.start),
            lte(scheduledExercises.scheduledAt, previousWeek.end)
          )
        );

      // Get exercise details to determine types
      const exerciseIds = Array.from(new Set(currentWeekExercises.map(e => e.exerciseId)));
      let exerciseDetails: Record<string, { type: 'video' | 'audio' | 'text'; durationMinutes: number | null }> = {};

      if (exerciseIds.length > 0) {
        const details = await ctx.db
          .select({
            id: exercises.id,
            type: exercises.type,
            durationMinutes: exercises.durationMinutes,
          })
          .from(exercises)
          .where(sql`${exercises.id} = ANY(${exerciseIds})`);

        exerciseDetails = details.reduce((acc, d) => {
          acc[d.id] = { type: d.type, durationMinutes: d.durationMinutes };
          return acc;
        }, {} as typeof exerciseDetails);
      }

      // Calculate exercise stats
      const currentCompleted = currentWeekExercises.filter(e => e.completed).length;
      const currentTotal = currentWeekExercises.length;
      const previousCompleted = previousWeekExercises.filter(e => e.completed).length;
      const previousTotal = previousWeekExercises.length;

      // Group by exercise type
      const exercisesByType = currentWeekExercises.reduce(
        (acc, e) => {
          const type = exerciseDetails[e.exerciseId]?.type || 'text';
          if (!acc[type]) {
            acc[type] = { total: 0, completed: 0 };
          }
          acc[type].total++;
          if (e.completed) {
            acc[type].completed++;
          }
          return acc;
        },
        {} as Record<string, { total: number; completed: number }>
      );

      // Group by day for daily completion chart
      const completionByDay: Record<string, { total: number; completed: number }> = {};
      for (let i = 0; i < 7; i++) {
        const day = new Date(currentWeek.start);
        day.setDate(day.getDate() + i);
        const dateKey = day.toISOString().split('T')[0];
        completionByDay[dateKey] = { total: 0, completed: 0 };
      }

      for (const exercise of currentWeekExercises) {
        const dateKey = new Date(exercise.scheduledAt).toISOString().split('T')[0];
        if (completionByDay[dateKey]) {
          completionByDay[dateKey].total++;
          if (exercise.completed) {
            completionByDay[dateKey].completed++;
          }
        }
      }

      // === PATTERN/MOOD DATA ===
      // Get all pattern entries for the week
      const weekPatterns = await ctx.db
        .select({
          id: patternEntries.id,
          entryDate: patternEntries.entryDate,
          hour: patternEntries.hour,
          patternType: patternEntries.patternType,
          intensity: patternEntries.intensity,
        })
        .from(patternEntries)
        .where(
          and(
            eq(patternEntries.userId, ctx.userId),
            gte(patternEntries.entryDate, currentWeek.start),
            lte(patternEntries.entryDate, currentWeek.end)
          )
        );

      // Previous week patterns for comparison
      const prevWeekPatterns = await ctx.db
        .select({
          patternType: patternEntries.patternType,
          intensity: patternEntries.intensity,
        })
        .from(patternEntries)
        .where(
          and(
            eq(patternEntries.userId, ctx.userId),
            gte(patternEntries.entryDate, previousWeek.start),
            lte(patternEntries.entryDate, previousWeek.end)
          )
        );

      // Aggregate pattern data by type
      const patternTypes = ['stress', 'energy', 'mood', 'focus', 'anxiety', 'motivation'] as const;
      type PatternType = typeof patternTypes[number];

      const patternSummary: Record<
        PatternType,
        {
          total: number;
          strong: number;
          weak: number;
          none: number;
          avgIntensity: number;
          prevWeekTotal: number;
          prevWeekStrong: number;
        }
      > = {} as typeof patternSummary;

      for (const type of patternTypes) {
        const typeEntries = weekPatterns.filter(p => p.patternType === type);
        const prevTypeEntries = prevWeekPatterns.filter(p => p.patternType === type);

        const strong = typeEntries.filter(p => p.intensity === 'strong').length;
        const weak = typeEntries.filter(p => p.intensity === 'weak').length;
        const none = typeEntries.filter(p => p.intensity === 'none').length;
        const total = typeEntries.length;

        // Calculate average intensity (strong=2, weak=1, none=0)
        const avgIntensity = total > 0
          ? (strong * 2 + weak * 1) / total
          : 0;

        patternSummary[type] = {
          total,
          strong,
          weak,
          none,
          avgIntensity,
          prevWeekTotal: prevTypeEntries.length,
          prevWeekStrong: prevTypeEntries.filter(p => p.intensity === 'strong').length,
        };
      }

      // Pattern frequency by day (for charts)
      const patternByDay: Record<string, Record<PatternType, { strong: number; weak: number; none: number }>> = {};
      for (let i = 0; i < 7; i++) {
        const day = new Date(currentWeek.start);
        day.setDate(day.getDate() + i);
        const dateKey = day.toISOString().split('T')[0];
        patternByDay[dateKey] = {} as Record<PatternType, { strong: number; weak: number; none: number }>;
        for (const type of patternTypes) {
          patternByDay[dateKey][type] = { strong: 0, weak: 0, none: 0 };
        }
      }

      for (const entry of weekPatterns) {
        const dateKey = new Date(entry.entryDate).toISOString().split('T')[0];
        if (patternByDay[dateKey] && patternByDay[dateKey][entry.patternType as PatternType]) {
          patternByDay[dateKey][entry.patternType as PatternType][entry.intensity as 'strong' | 'weak' | 'none']++;
        }
      }

      // Calculate mood barometer (overall mood score based on positive vs negative patterns)
      // Positive: mood, energy, motivation, focus
      // Negative: stress, anxiety
      const positivePatterns = ['mood', 'energy', 'motivation', 'focus'] as const;
      const negativePatterns = ['stress', 'anxiety'] as const;

      let positiveScore = 0;
      let negativeScore = 0;
      let totalPatternEntries = 0;

      for (const type of positivePatterns) {
        const summary = patternSummary[type];
        positiveScore += summary.strong * 2 + summary.weak * 1;
        totalPatternEntries += summary.total;
      }

      for (const type of negativePatterns) {
        const summary = patternSummary[type];
        negativeScore += summary.strong * 2 + summary.weak * 1;
        totalPatternEntries += summary.total;
      }

      // Mood barometer: scale of 0-100 where 100 is best
      // Formula: (positiveScore - negativeScore + maxPossibleNegative) / (maxPossiblePositive + maxPossibleNegative) * 100
      const maxPositive = totalPatternEntries * 2 * 0.67; // Assuming ~67% entries are positive types
      const maxNegative = totalPatternEntries * 2 * 0.33;
      const moodBarometer = totalPatternEntries > 0
        ? Math.round(Math.max(0, Math.min(100, ((positiveScore - negativeScore + maxNegative) / (maxPositive + maxNegative || 1)) * 100)))
        : MOOD_NEUTRAL_SCORE;

      // === DIARY HIGHLIGHTS ===
      // Get diary entries for the week
      const weekDiaryEntries = await ctx.db
        .select({
          id: diaryEntries.id,
          entryType: diaryEntries.entryType,
          content: diaryEntries.content,
          voiceTranscription: diaryEntries.voiceTranscription,
          entryDate: diaryEntries.entryDate,
        })
        .from(diaryEntries)
        .where(
          and(
            eq(diaryEntries.userId, ctx.userId),
            gte(diaryEntries.entryDate, currentWeek.start),
            lte(diaryEntries.entryDate, currentWeek.end)
          )
        )
        .orderBy(desc(diaryEntries.entryDate));

      // Previous week diary count
      const [prevDiaryCount] = await ctx.db
        .select({ count: count() })
        .from(diaryEntries)
        .where(
          and(
            eq(diaryEntries.userId, ctx.userId),
            gte(diaryEntries.entryDate, previousWeek.start),
            lte(diaryEntries.entryDate, previousWeek.end)
          )
        );

      // Count diary entries by type
      const diaryByType = weekDiaryEntries.reduce(
        (acc, entry) => {
          acc[entry.entryType] = (acc[entry.entryType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Extract recent diary highlights (first 100 chars of recent entries)
      const diaryHighlights = weekDiaryEntries.slice(0, 3).map(entry => {
        const text = entry.content || entry.voiceTranscription || '';
        return {
          id: entry.id,
          preview: text.length > 100 ? text.substring(0, 100) + '...' : text,
          entryDate: entry.entryDate,
          entryType: entry.entryType,
        };
      });

      // Count entries by day
      const diaryByDay: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const day = new Date(currentWeek.start);
        day.setDate(day.getDate() + i);
        const dateKey = day.toISOString().split('T')[0];
        diaryByDay[dateKey] = 0;
      }

      for (const entry of weekDiaryEntries) {
        const dateKey = new Date(entry.entryDate).toISOString().split('T')[0];
        if (diaryByDay[dateKey] !== undefined) {
          diaryByDay[dateKey]++;
        }
      }

      return {
        weekStartDate: input.weekStartDate,
        weekEndDate: currentWeek.end.toISOString(),

        // Exercise completion stats
        exerciseStats: {
          totalExercises: currentTotal,
          completedExercises: currentCompleted,
          completionRate: currentTotal > 0 ? Math.round((currentCompleted / currentTotal) * 100) : 0,
          previousWeekTotal: previousTotal,
          previousWeekCompleted: previousCompleted,
          previousWeekRate: previousTotal > 0 ? Math.round((previousCompleted / previousTotal) * 100) : 0,
          byType: exercisesByType,
          byDay: Object.entries(completionByDay).map(([date, data]) => ({
            date,
            ...data,
          })),
        },

        // Emotional/mood data
        patternStats: {
          summary: patternSummary,
          byDay: Object.entries(patternByDay).map(([date, patterns]) => ({
            date,
            patterns,
          })),
          totalEntries: totalPatternEntries,
        },

        // Mood barometer
        moodBarometer: {
          score: moodBarometer,
          positiveScore,
          negativeScore,
          trend: (moodBarometer > MOOD_NEUTRAL_SCORE ? 'positive' : moodBarometer < MOOD_NEUTRAL_SCORE ? 'negative' : 'neutral') as 'positive' | 'negative' | 'neutral',
        },

        // Diary highlights
        diaryStats: {
          totalEntries: weekDiaryEntries.length,
          previousWeekEntries: prevDiaryCount?.count || 0,
          byType: diaryByType,
          byDay: Object.entries(diaryByDay).map(([date, count]) => ({
            date,
            count,
          })),
          highlights: diaryHighlights,
        },
      };
    }),

  /**
   * Get week-over-week comparison data
   * Returns comparison metrics for the last 4 weeks
   */
  getWeeklyTrends: weeklySummaryProcedure
    .input(
      z.object({
        weekStartDate: z.string().datetime(),
        weeksToCompare: z.number().min(2).max(8).default(4),
      })
    )
    .query(async ({ ctx, input }) => {
      const weeks: {
        weekStart: string;
        exerciseCompletionRate: number;
        moodScore: number;
        diaryEntries: number;
        totalPatternEntries: number;
      }[] = [];

      const currentWeekStart = new Date(input.weekStartDate);

      for (let i = 0; i < input.weeksToCompare; i++) {
        const weekStart = new Date(currentWeekStart);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Get exercise completion for this week
        const weekExercises = await ctx.db
          .select({
            completed: scheduledExercises.completed,
          })
          .from(scheduledExercises)
          .where(
            and(
              eq(scheduledExercises.userId, ctx.userId),
              gte(scheduledExercises.scheduledAt, weekStart),
              lte(scheduledExercises.scheduledAt, weekEnd)
            )
          );

        const completionRate = weekExercises.length > 0
          ? Math.round((weekExercises.filter(e => e.completed).length / weekExercises.length) * 100)
          : 0;

        // Get pattern entries for mood calculation
        const weekPatterns = await ctx.db
          .select({
            patternType: patternEntries.patternType,
            intensity: patternEntries.intensity,
          })
          .from(patternEntries)
          .where(
            and(
              eq(patternEntries.userId, ctx.userId),
              gte(patternEntries.entryDate, weekStart),
              lte(patternEntries.entryDate, weekEnd)
            )
          );

        // Calculate mood score
        const positivePatterns = ['mood', 'energy', 'motivation', 'focus'];
        const negativePatterns = ['stress', 'anxiety'];

        let positiveScore = 0;
        let negativeScore = 0;

        for (const pattern of weekPatterns) {
          const intensityValue = pattern.intensity === 'strong' ? 2 : pattern.intensity === 'weak' ? 1 : 0;
          if (positivePatterns.includes(pattern.patternType)) {
            positiveScore += intensityValue;
          } else if (negativePatterns.includes(pattern.patternType)) {
            negativeScore += intensityValue;
          }
        }

        const maxScore = weekPatterns.length * 2;
        const moodScore = maxScore > 0
          ? Math.round(((positiveScore - negativeScore + maxScore) / (maxScore * 2)) * 100)
          : MOOD_NEUTRAL_SCORE;

        // Get diary entries count
        const [diaryCount] = await ctx.db
          .select({ count: count() })
          .from(diaryEntries)
          .where(
            and(
              eq(diaryEntries.userId, ctx.userId),
              gte(diaryEntries.entryDate, weekStart),
              lte(diaryEntries.entryDate, weekEnd)
            )
          );

        weeks.push({
          weekStart: weekStart.toISOString(),
          exerciseCompletionRate: completionRate,
          moodScore,
          diaryEntries: Number(diaryCount?.count) || 0,
          totalPatternEntries: weekPatterns.length,
        });
      }

      return {
        weeks: weeks.reverse(), // Return in chronological order
        currentWeek: input.weekStartDate,
      };
    }),
});
