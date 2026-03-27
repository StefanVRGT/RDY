import { vi } from 'vitest';

/**
 * Creates a comprehensive tRPC mock that covers all commonly-used mentee routes.
 * Use this to avoid "Cannot read properties of undefined" errors in tests.
 */
export function createTrpcMock(overrides: Record<string, unknown> = {}) {
  const defaultQuery = () => ({ data: undefined, isLoading: false, error: null });
  const defaultMutation = () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isLoading: false,
  });

  return {
    trpc: {
      mentee: {
        getExercisesForDate: { useQuery: vi.fn(defaultQuery) },
        getExercisesForWeek: { useQuery: vi.fn(defaultQuery) },
        getCurrentWeekTheme: { useQuery: vi.fn(defaultQuery) },
        getWeeklyTracking: { useQuery: vi.fn(defaultQuery) },
        getActiveSchwerpunktebenen: { useQuery: vi.fn(defaultQuery) },
        getExperienceForDate: { useQuery: vi.fn(defaultQuery) },
        getPrivacySettings: { useQuery: vi.fn(defaultQuery) },
        getDiaryEntries: { useQuery: vi.fn(defaultQuery) },
        getWeeklySummary: { useQuery: vi.fn(defaultQuery) },
        toggleExerciseCompletion: { useMutation: vi.fn(defaultMutation) },
        toggleExperience: { useMutation: vi.fn(defaultMutation) },
        updatePrivacySettings: { useMutation: vi.fn(defaultMutation) },
        createDiaryEntry: { useMutation: vi.fn(defaultMutation) },
        updateExerciseTime: { useMutation: vi.fn(defaultMutation) },
        rescheduleExerciseSeries: { useMutation: vi.fn(defaultMutation) },
        ...overrides,
      },
      mentor: {
        getUpcomingSessions: { useQuery: vi.fn(defaultQuery) },
        getMentees: { useQuery: vi.fn(defaultQuery) },
        getClasses: { useQuery: vi.fn(defaultQuery) },
        getGroupSessions: { useQuery: vi.fn(defaultQuery) },
        ...overrides,
      },
      useUtils: () => ({
        mentee: {
          getExercisesForDate: { invalidate: vi.fn() },
          getExercisesForWeek: { invalidate: vi.fn() },
          getCurrentWeekTheme: { invalidate: vi.fn() },
          getPrivacySettings: { invalidate: vi.fn() },
          getExperienceForDate: { invalidate: vi.fn() },
          getDiaryEntries: { invalidate: vi.fn() },
        },
        mentor: {
          getUpcomingSessions: { invalidate: vi.fn() },
        },
      }),
    },
  };
}
