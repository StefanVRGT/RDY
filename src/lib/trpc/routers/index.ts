import { router } from '../trpc';
import { tenantsRouter } from './tenants';
import { usersRouter } from './users';
import { classesRouter } from './classes';
import { exercisesRouter } from './exercises';
import { invitationsRouter } from './invitations';
import { schwerpunktebenenRouter } from './schwerpunktebenen';
import { weeksRouter } from './weeks';
import { weekExercisesRouter } from './weekExercises';
import { curriculumBuilderRouter } from './curriculumBuilder';
import { classCurriculumRouter } from './classCurriculum';
import { dashboardRouter } from './dashboard';
import { analyticsRouter } from './analytics';
import { mentorRouter } from './mentor';
import { menteeRouter } from './mentee';
import { bookingRouter } from './booking';
import { groupSessionsRouter } from './groupSessions';
import { diaryRouter } from './diary';
import { pushSubscriptionsRouter } from './pushSubscriptions';
import { notificationSettingsRouter } from './notificationSettings';
import { aiSettingsRouter } from './aiSettings';
import { aiPromptsRouter } from './aiPrompts';
import { patternsRouter } from './patterns';
import { weeklySummaryRouter } from './weeklySummary';
import { mentorAnalyticsRouter } from './mentorAnalytics';

/**
 * Root router combining all domain routers
 */
export const appRouter = router({
  tenants: tenantsRouter,
  users: usersRouter,
  classes: classesRouter,
  exercises: exercisesRouter,
  invitations: invitationsRouter,
  schwerpunktebenen: schwerpunktebenenRouter,
  weeks: weeksRouter,
  weekExercises: weekExercisesRouter,
  curriculumBuilder: curriculumBuilderRouter,
  classCurriculum: classCurriculumRouter,
  dashboard: dashboardRouter,
  analytics: analyticsRouter,
  mentor: mentorRouter,
  mentee: menteeRouter,
  booking: bookingRouter,
  groupSessions: groupSessionsRouter,
  diary: diaryRouter,
  pushSubscriptions: pushSubscriptionsRouter,
  notificationSettings: notificationSettingsRouter,
  aiSettings: aiSettingsRouter,
  aiPrompts: aiPromptsRouter,
  patterns: patternsRouter,
  weeklySummary: weeklySummaryRouter,
  mentorAnalytics: mentorAnalyticsRouter,
});

/**
 * Export type definition of the complete API
 * This is used by the client for type inference
 */
export type AppRouter = typeof appRouter;
