import { router, protectedProcedure } from '../trpc';
import {
  users,
  classes,
  classMembers,
  exercises,
  weekExercises,
  weeks,
  schwerpunktebenen,
} from '@/lib/db/schema';
import { eq, count, and, sql, desc, isNotNull } from 'drizzle-orm';
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

export const analyticsRouter = router({
  /**
   * Get exercise completion rates across tenant
   * Shows total exercises, exercises per curriculum, and completion metrics
   */
  getExerciseCompletionRates: adminProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;

    // Get total exercise count for this tenant
    const [totalExercisesResult] = await ctx.db
      .select({ count: count() })
      .from(exercises)
      .where(eq(exercises.tenantId, tenantId));
    const totalExercises = Number(totalExercisesResult?.count ?? 0);

    // Get exercises by type
    const exercisesByType = await ctx.db
      .select({
        type: exercises.type,
        count: count(),
      })
      .from(exercises)
      .where(eq(exercises.tenantId, tenantId))
      .groupBy(exercises.type);

    // Get exercises assigned to weeks (curriculum exercises)
    const assignedExercisesResult = await ctx.db
      .select({ count: sql<number>`count(distinct ${weekExercises.exerciseId})` })
      .from(weekExercises)
      .innerJoin(exercises, eq(weekExercises.exerciseId, exercises.id))
      .where(eq(exercises.tenantId, tenantId));
    const assignedExercisesCount = Number(assignedExercisesResult[0]?.count ?? 0);

    // Get exercises per schwerpunktebene (monthly curriculum)
    const exercisesPerSchwerpunktebene = await ctx.db
      .select({
        schwerpunktebeneId: schwerpunktebenen.id,
        title: schwerpunktebenen.titleDe,
        monthNumber: schwerpunktebenen.monthNumber,
        exerciseCount: sql<number>`count(distinct ${weekExercises.exerciseId})`,
        obligatoryCount: sql<number>`count(case when ${weekExercises.isObligatory} = true then 1 end)`,
        optionalCount: sql<number>`count(case when ${weekExercises.isObligatory} = false then 1 end)`,
      })
      .from(schwerpunktebenen)
      .leftJoin(weeks, eq(weeks.schwerpunktebeneId, schwerpunktebenen.id))
      .leftJoin(weekExercises, eq(weekExercises.weekId, weeks.id))
      .where(eq(schwerpunktebenen.tenantId, tenantId))
      .groupBy(schwerpunktebenen.id, schwerpunktebenen.titleDe, schwerpunktebenen.monthNumber)
      .orderBy(schwerpunktebenen.monthNumber);

    // Get total mentees enrolled in classes (for potential completion rate calculations)
    const [enrolledMenteesResult] = await ctx.db
      .select({ count: sql<number>`count(distinct ${classMembers.userId})` })
      .from(classMembers)
      .innerJoin(classes, eq(classMembers.classId, classes.id))
      .where(eq(classes.tenantId, tenantId));
    const enrolledMenteesCount = Number(enrolledMenteesResult?.count ?? 0);

    // Calculate curriculum coverage (what % of exercises are part of curriculum)
    const curriculumCoverage = totalExercises > 0
      ? Math.round((assignedExercisesCount / totalExercises) * 100)
      : 0;

    return {
      totalExercises,
      assignedExercisesCount,
      curriculumCoverage,
      exercisesByType: exercisesByType.map((e) => ({
        type: e.type,
        count: Number(e.count),
      })),
      exercisesPerSchwerpunktebene: exercisesPerSchwerpunktebene.map((s) => ({
        id: s.schwerpunktebeneId,
        title: s.title,
        monthNumber: s.monthNumber,
        exerciseCount: Number(s.exerciseCount),
        obligatoryCount: Number(s.obligatoryCount),
        optionalCount: Number(s.optionalCount),
      })),
      enrolledMenteesCount,
    };
  }),

  /**
   * Get session utilization metrics
   * Analyzes class session configurations and active sessions
   */
  getSessionUtilization: adminProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;
    const now = new Date();

    // Get all classes with their session configs
    const allClasses = await ctx.db
      .select({
        id: classes.id,
        name: classes.name,
        status: classes.status,
        durationMonths: classes.durationMonths,
        startDate: classes.startDate,
        endDate: classes.endDate,
        sessionConfig: classes.sessionConfig,
        mentorId: classes.mentorId,
      })
      .from(classes)
      .where(eq(classes.tenantId, tenantId));

    // Get member counts per class
    const memberCounts = await ctx.db
      .select({
        classId: classMembers.classId,
        totalMembers: count(),
        completedMembers: sql<number>`count(case when ${classMembers.completedAt} is not null then 1 end)`,
      })
      .from(classMembers)
      .innerJoin(classes, eq(classMembers.classId, classes.id))
      .where(eq(classes.tenantId, tenantId))
      .groupBy(classMembers.classId);

    const memberCountsMap = memberCounts.reduce(
      (acc, m) => {
        acc[m.classId] = {
          totalMembers: Number(m.totalMembers),
          completedMembers: Number(m.completedMembers),
        };
        return acc;
      },
      {} as Record<string, { totalMembers: number; completedMembers: number }>
    );

    // Calculate session statistics
    let totalPlannedSessions = 0;
    let totalSessionMinutes = 0;
    let activeClassesCount = 0;
    let completedClassesCount = 0;
    let upcomingClassesCount = 0;

    const classDetails = allClasses.map((cls) => {
      const config = cls.sessionConfig as { monthlySessionCount?: number; sessionDurationMinutes?: number } | null;
      const monthlySessionCount = config?.monthlySessionCount ?? 2;
      const sessionDurationMinutes = config?.sessionDurationMinutes ?? 60;

      const plannedSessions = monthlySessionCount * cls.durationMonths;
      const plannedMinutes = plannedSessions * sessionDurationMinutes;

      totalPlannedSessions += plannedSessions;
      totalSessionMinutes += plannedMinutes;

      const isActive = cls.status === 'active' && now >= cls.startDate && now <= cls.endDate;
      const isCompleted = now > cls.endDate;
      const isUpcoming = now < cls.startDate;

      if (isActive) activeClassesCount++;
      if (isCompleted) completedClassesCount++;
      if (isUpcoming) upcomingClassesCount++;

      const memberInfo = memberCountsMap[cls.id] || { totalMembers: 0, completedMembers: 0 };

      return {
        id: cls.id,
        name: cls.name,
        status: cls.status,
        isActive,
        isCompleted,
        isUpcoming,
        durationMonths: cls.durationMonths,
        startDate: cls.startDate,
        endDate: cls.endDate,
        monthlySessionCount,
        sessionDurationMinutes,
        plannedSessions,
        totalMembers: memberInfo.totalMembers,
        completedMembers: memberInfo.completedMembers,
      };
    });

    // Calculate average session hours per month across all classes
    const avgSessionHoursPerMonth = allClasses.length > 0
      ? (totalSessionMinutes / allClasses.length / 60).toFixed(1)
      : '0';

    return {
      summary: {
        totalClasses: allClasses.length,
        activeClasses: activeClassesCount,
        completedClasses: completedClassesCount,
        upcomingClasses: upcomingClassesCount,
        totalPlannedSessions,
        totalSessionMinutes,
        avgSessionHoursPerMonth: parseFloat(avgSessionHoursPerMonth),
      },
      classes: classDetails,
    };
  }),

  /**
   * Get mentor workload overview
   * Shows mentee assignments, class assignments, and workload distribution
   */
  getMentorWorkload: adminProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;

    // Get all mentors in the tenant
    const mentors = await ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.role, 'mentor')))
      .orderBy(users.name);

    if (mentors.length === 0) {
      return {
        totalMentors: 0,
        avgMenteesPerMentor: 0,
        avgClassesPerMentor: 0,
        mentors: [],
        workloadDistribution: {
          underloaded: 0, // < 3 mentees
          optimal: 0, // 3-8 mentees
          overloaded: 0, // > 8 mentees
        },
      };
    }

    // Get mentee counts per mentor (from users table - direct assignments)
    const menteeCounts = await ctx.db
      .select({
        mentorId: users.mentorId,
        count: count(),
      })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.role, 'mentee'),
          isNotNull(users.mentorId)
        )
      )
      .groupBy(users.mentorId);

    const menteeCountsMap = menteeCounts.reduce(
      (acc, m) => {
        if (m.mentorId) {
          acc[m.mentorId] = Number(m.count);
        }
        return acc;
      },
      {} as Record<string, number>
    );

    // Get class counts per mentor
    const classCounts = await ctx.db
      .select({
        mentorId: classes.mentorId,
        totalClasses: count(),
        activeClasses: sql<number>`count(case when ${classes.status} = 'active' then 1 end)`,
      })
      .from(classes)
      .where(eq(classes.tenantId, tenantId))
      .groupBy(classes.mentorId);

    const classCountsMap = classCounts.reduce(
      (acc, c) => {
        acc[c.mentorId] = {
          totalClasses: Number(c.totalClasses),
          activeClasses: Number(c.activeClasses),
        };
        return acc;
      },
      {} as Record<string, { totalClasses: number; activeClasses: number }>
    );

    // Build mentor details with workload info
    let totalMentees = 0;
    let totalClasses = 0;
    let underloaded = 0;
    let optimal = 0;
    let overloaded = 0;

    const mentorDetails = mentors.map((mentor) => {
      const menteeCount = menteeCountsMap[mentor.id] || 0;
      const classInfo = classCountsMap[mentor.id] || { totalClasses: 0, activeClasses: 0 };

      totalMentees += menteeCount;
      totalClasses += classInfo.totalClasses;

      // Workload classification
      let workloadStatus: 'underloaded' | 'optimal' | 'overloaded';
      if (menteeCount < 3) {
        workloadStatus = 'underloaded';
        underloaded++;
      } else if (menteeCount <= 8) {
        workloadStatus = 'optimal';
        optimal++;
      } else {
        workloadStatus = 'overloaded';
        overloaded++;
      }

      return {
        id: mentor.id,
        name: mentor.name,
        email: mentor.email,
        createdAt: mentor.createdAt,
        menteeCount,
        totalClasses: classInfo.totalClasses,
        activeClasses: classInfo.activeClasses,
        workloadStatus,
      };
    });

    // Sort by mentee count descending to show highest workload first
    mentorDetails.sort((a, b) => b.menteeCount - a.menteeCount);

    return {
      totalMentors: mentors.length,
      avgMenteesPerMentor: mentors.length > 0 ? +(totalMentees / mentors.length).toFixed(1) : 0,
      avgClassesPerMentor: mentors.length > 0 ? +(totalClasses / mentors.length).toFixed(1) : 0,
      mentors: mentorDetails,
      workloadDistribution: {
        underloaded,
        optimal,
        overloaded,
      },
    };
  }),

  /**
   * Get mentee progress aggregates
   * Shows enrollment stats, completion rates, and progress overview
   */
  getMenteeProgress: adminProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId;

    // Get total mentee count
    const [totalMenteesResult] = await ctx.db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.role, 'mentee')));
    const totalMentees = Number(totalMenteesResult?.count ?? 0);

    // Get mentees with mentor assignments
    const [assignedMenteesResult] = await ctx.db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          eq(users.role, 'mentee'),
          isNotNull(users.mentorId)
        )
      );
    const assignedMentees = Number(assignedMenteesResult?.count ?? 0);
    const unassignedMentees = totalMentees - assignedMentees;

    // Get enrollment statistics from class_members
    const enrollmentStats = await ctx.db
      .select({
        totalEnrollments: count(),
        completedEnrollments: sql<number>`count(case when ${classMembers.completedAt} is not null then 1 end)`,
        paidEnrollments: sql<number>`count(case when ${classMembers.paid} = true then 1 end)`,
      })
      .from(classMembers)
      .innerJoin(classes, eq(classMembers.classId, classes.id))
      .where(eq(classes.tenantId, tenantId));

    const totalEnrollments = Number(enrollmentStats[0]?.totalEnrollments ?? 0);
    const completedEnrollments = Number(enrollmentStats[0]?.completedEnrollments ?? 0);
    const paidEnrollments = Number(enrollmentStats[0]?.paidEnrollments ?? 0);

    // Get unique enrolled mentees
    const [uniqueEnrolledResult] = await ctx.db
      .select({ count: sql<number>`count(distinct ${classMembers.userId})` })
      .from(classMembers)
      .innerJoin(classes, eq(classMembers.classId, classes.id))
      .where(eq(classes.tenantId, tenantId));
    const uniqueEnrolledMentees = Number(uniqueEnrolledResult?.count ?? 0);
    const notEnrolledMentees = totalMentees - uniqueEnrolledMentees;

    // Get mentee enrollment details (top 10 by most recent enrollment)
    const recentEnrollments = await ctx.db
      .select({
        userId: classMembers.userId,
        userName: users.name,
        userEmail: users.email,
        className: classes.name,
        enrolledAt: classMembers.enrolledAt,
        completedAt: classMembers.completedAt,
        paid: classMembers.paid,
      })
      .from(classMembers)
      .innerJoin(users, eq(classMembers.userId, users.id))
      .innerJoin(classes, eq(classMembers.classId, classes.id))
      .where(eq(classes.tenantId, tenantId))
      .orderBy(desc(classMembers.enrolledAt))
      .limit(10);

    // Calculate completion rate
    const completionRate = totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;

    // Calculate payment rate
    const paymentRate = totalEnrollments > 0
      ? Math.round((paidEnrollments / totalEnrollments) * 100)
      : 0;

    return {
      summary: {
        totalMentees,
        assignedMentees,
        unassignedMentees,
        enrolledMentees: uniqueEnrolledMentees,
        notEnrolledMentees,
        totalEnrollments,
        completedEnrollments,
        completionRate,
        paidEnrollments,
        paymentRate,
      },
      recentEnrollments: recentEnrollments.map((e) => ({
        userId: e.userId,
        userName: e.userName,
        userEmail: e.userEmail,
        className: e.className,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
        paid: e.paid,
        status: e.completedAt ? 'completed' : 'in_progress',
      })),
    };
  }),
});
