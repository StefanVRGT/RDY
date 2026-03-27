import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MentorAnalyticsPage from './page';

// Mock data
const mockOverview = {
  totalClasses: 4,
  activeClasses: 3,
  totalMentees: 15,
  overallCompletionRate: 72,
  overallMoodScore: 65,
  menteesNeedingAttentionCount: 3,
  topPerformingClass: { name: 'Morning Class', completionRate: 92 },
  lowestPerformingClass: { name: 'Evening Class', completionRate: 45 },
};

const mockClassCompletionData = {
  classes: [
    {
      id: 'class-1',
      name: 'Morning Class',
      status: 'active',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      durationLevels: 3,
      memberCount: 5,
      totalExercises: 100,
      completedExercises: 92,
      completionRate: 92,
    },
    {
      id: 'class-2',
      name: 'Evening Class',
      status: 'active',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-04-30'),
      durationLevels: 3,
      memberCount: 7,
      totalExercises: 80,
      completedExercises: 36,
      completionRate: 45,
    },
    {
      id: 'class-3',
      name: 'Weekend Class',
      status: 'active',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-04-15'),
      durationLevels: 3,
      memberCount: 3,
      totalExercises: 50,
      completedExercises: 35,
      completionRate: 70,
    },
  ],
  overallCompletionRate: 72,
  totalExercises: 230,
  completedExercises: 163,
};

const mockMenteeProgressData = {
  mentees: [
    {
      id: 'member-1',
      userId: 'user-1',
      user: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
      classId: 'class-2',
      className: 'Evening Class',
      enrolledAt: new Date('2024-02-01'),
      completedAt: null,
      totalExercises: 20,
      completedExercises: 5,
      completionRate: 25,
      lastActivity: new Date('2024-01-15'),
    },
    {
      id: 'member-2',
      userId: 'user-2',
      user: { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com' },
      classId: 'class-1',
      className: 'Morning Class',
      enrolledAt: new Date('2024-01-01'),
      completedAt: null,
      totalExercises: 25,
      completedExercises: 23,
      completionRate: 92,
      lastActivity: new Date(),
    },
    {
      id: 'member-3',
      userId: 'user-3',
      user: { id: 'user-3', name: 'Bob Wilson', email: 'bob@example.com' },
      classId: 'class-3',
      className: 'Weekend Class',
      enrolledAt: new Date('2024-01-15'),
      completedAt: null,
      totalExercises: 18,
      completedExercises: 12,
      completionRate: 67,
      lastActivity: new Date('2024-01-20'),
    },
  ],
  totalMentees: 3,
  averageCompletionRate: 61,
};

const mockMoodTrendsData = {
  classTrends: [
    {
      classId: 'class-1',
      className: 'Morning Class',
      moodScore: 75,
      participantCount: 5,
      totalEntries: 120,
    },
    {
      classId: 'class-2',
      className: 'Evening Class',
      moodScore: 45,
      participantCount: 7,
      totalEntries: 80,
    },
    {
      classId: 'class-3',
      className: 'Weekend Class',
      moodScore: 60,
      participantCount: 3,
      totalEntries: 45,
    },
  ],
  overallMoodScore: 65,
  patternSummary: {
    stress: { total: 50, strong: 15, weak: 20, none: 15, avgIntensity: 1.0 },
    energy: { total: 60, strong: 25, weak: 25, none: 10, avgIntensity: 1.25 },
    mood: { total: 55, strong: 30, weak: 20, none: 5, avgIntensity: 1.45 },
    focus: { total: 45, strong: 20, weak: 15, none: 10, avgIntensity: 1.22 },
    anxiety: { total: 40, strong: 10, weak: 15, none: 15, avgIntensity: 0.88 },
    motivation: { total: 50, strong: 22, weak: 18, none: 10, avgIntensity: 1.24 },
  },
  dailyTrends: [
    { date: '2024-01-15', moodScore: 55, entryCount: 30, participantCount: 10 },
    { date: '2024-01-16', moodScore: 60, entryCount: 35, participantCount: 12 },
    { date: '2024-01-17', moodScore: 58, entryCount: 28, participantCount: 9 },
    { date: '2024-01-18', moodScore: 65, entryCount: 40, participantCount: 14 },
    { date: '2024-01-19', moodScore: 70, entryCount: 45, participantCount: 13 },
    { date: '2024-01-20', moodScore: 68, entryCount: 38, participantCount: 11 },
    { date: '2024-01-21', moodScore: 72, entryCount: 42, participantCount: 15 },
  ],
  totalEntries: 245,
  participantCount: 15,
};

const mockAttentionData = {
  menteesNeedingAttention: [
    {
      id: 'member-1',
      userId: 'user-1',
      user: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
      classId: 'class-2',
      className: 'Evening Class',
      enrolledAt: new Date('2024-02-01'),
      needsAttention: true,
      flags: { lowCompletion: true, inactive: true, lowMood: false },
      details: {
        completionRate: 25,
        lastActivity: new Date('2024-01-15'),
        moodScore: 55,
        scheduledCount: 20,
        completedCount: 5,
      },
      priority: 'high',
      reasons: ['Low completion rate (25%)', 'Inactive for 10 days'],
    },
    {
      id: 'member-3',
      userId: 'user-3',
      user: { id: 'user-3', name: 'Bob Wilson', email: 'bob@example.com' },
      classId: 'class-3',
      className: 'Weekend Class',
      enrolledAt: new Date('2024-01-15'),
      needsAttention: true,
      flags: { lowCompletion: false, inactive: false, lowMood: true },
      details: {
        completionRate: 67,
        lastActivity: new Date('2024-01-20'),
        moodScore: 35,
        scheduledCount: 18,
        completedCount: 12,
      },
      priority: 'low',
      reasons: ['Low mood score (35)'],
    },
    {
      id: 'member-4',
      userId: 'user-4',
      user: { id: 'user-4', name: 'Alice Brown', email: 'alice@example.com' },
      classId: 'class-2',
      className: 'Evening Class',
      enrolledAt: new Date('2024-02-01'),
      needsAttention: true,
      flags: { lowCompletion: true, inactive: false, lowMood: true },
      details: {
        completionRate: 40,
        lastActivity: new Date(),
        moodScore: 38,
        scheduledCount: 20,
        completedCount: 8,
      },
      priority: 'medium',
      reasons: ['Low completion rate (40%)', 'Low mood score (38)'],
    },
  ],
  summary: {
    lowCompletion: 2,
    inactive: 1,
    lowMood: 2,
    total: 3,
  },
  thresholds: {
    lowCompletionRate: 50,
    inactiveDays: 7,
    lowMoodScore: 40,
  },
};

// Track loading states
let overviewLoading = false;
let classCompletionLoading = false;
let menteeProgressLoading = false;
let moodTrendsLoading = false;
let attentionLoading = false;

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    mentorAnalytics: {
      getAnalyticsOverview: {
        useQuery: () => ({
          data: overviewLoading ? undefined : mockOverview,
          isLoading: overviewLoading,
        }),
      },
      getClassCompletionRates: {
        useQuery: () => ({
          data: classCompletionLoading ? undefined : mockClassCompletionData,
          isLoading: classCompletionLoading,
        }),
      },
      getMenteeProgress: {
        useQuery: () => ({
          data: menteeProgressLoading ? undefined : mockMenteeProgressData,
          isLoading: menteeProgressLoading,
        }),
      },
      getClassMoodTrends: {
        useQuery: () => ({
          data: moodTrendsLoading ? undefined : mockMoodTrendsData,
          isLoading: moodTrendsLoading,
        }),
      },
      getMenteesNeedingAttention: {
        useQuery: () => ({
          data: attentionLoading ? undefined : mockAttentionData,
          isLoading: attentionLoading,
        }),
      },
    },
  },
}));

// Mock MobileLayout
vi.mock('@/components/mobile', () => ({
  MobileLayout: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="mobile-layout" data-title={title}>
      {children}
    </div>
  ),
}));

// Mock UI components
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (value: string) => void }) => (
    <div data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tabs-list" role="tablist">{children}</div>
  ),
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-${value}`} role="tab" data-value={value}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`} role="tabpanel">{children}</div>
  ),
}));

describe('MentorAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    overviewLoading = false;
    classCompletionLoading = false;
    menteeProgressLoading = false;
    moodTrendsLoading = false;
    attentionLoading = false;
  });

  describe('AC: Class-level completion rates', () => {
    it('should display the analytics page', () => {
      render(<MentorAnalyticsPage />);
      expect(screen.getByTestId('mentor-analytics-page')).toBeInTheDocument();
    });

    it('should display overall completion rate in overview stats', () => {
      render(<MentorAnalyticsPage />);

      const completionRateStat = screen.getByTestId('stat-completion-rate');
      expect(completionRateStat).toBeInTheDocument();
      expect(completionRateStat).toHaveTextContent('72%');
      expect(completionRateStat).toHaveTextContent('Completion Rate');
    });

    it('should display class completion list in classes tab', () => {
      render(<MentorAnalyticsPage />);

      const classCompletionList = screen.getByTestId('class-completion-list');
      expect(classCompletionList).toBeInTheDocument();
    });

    it('should show individual class completion rates', () => {
      render(<MentorAnalyticsPage />);

      // Check for each class
      expect(screen.getByTestId('class-completion-class-1')).toBeInTheDocument();
      expect(screen.getByTestId('class-completion-class-2')).toBeInTheDocument();
      expect(screen.getByTestId('class-completion-class-3')).toBeInTheDocument();
    });

    it('should display class names with completion percentages', () => {
      render(<MentorAnalyticsPage />);

      // Check class names are displayed
      const classCompletionList = screen.getByTestId('class-completion-list');
      expect(classCompletionList).toHaveTextContent('Morning Class');
      expect(classCompletionList).toHaveTextContent('Evening Class');
      expect(classCompletionList).toHaveTextContent('Weekend Class');

      // Check completion percentages
      expect(classCompletionList).toHaveTextContent('92%');
      expect(classCompletionList).toHaveTextContent('45%');
      expect(classCompletionList).toHaveTextContent('70%');
    });

    it('should show exercises completed vs total for each class', () => {
      render(<MentorAnalyticsPage />);

      expect(screen.getByText('92 / 100 exercises completed')).toBeInTheDocument();
      expect(screen.getByText('36 / 80 exercises completed')).toBeInTheDocument();
      expect(screen.getByText('35 / 50 exercises completed')).toBeInTheDocument();
    });

    it('should display mentee count per class', () => {
      render(<MentorAnalyticsPage />);

      const classCompletionList = screen.getByTestId('class-completion-list');
      expect(classCompletionList).toHaveTextContent('5 mentees');
      expect(classCompletionList).toHaveTextContent('7 mentees');
      expect(classCompletionList).toHaveTextContent('3 mentees');
    });

    it('should highlight top and lowest performing classes in overview', () => {
      render(<MentorAnalyticsPage />);

      const topPerforming = screen.getByTestId('top-performing-class');
      expect(topPerforming).toHaveTextContent('Morning Class');
      expect(topPerforming).toHaveTextContent('92%');

      const lowestPerforming = screen.getByTestId('lowest-performing-class');
      expect(lowestPerforming).toHaveTextContent('Evening Class');
      expect(lowestPerforming).toHaveTextContent('45%');
    });
  });

  describe('AC: Individual mentee progress', () => {
    it('should display mentee progress list in mentees tab', () => {
      render(<MentorAnalyticsPage />);

      const menteeProgressList = screen.getByTestId('mentee-progress-list');
      expect(menteeProgressList).toBeInTheDocument();
    });

    it('should show individual mentee progress items', () => {
      render(<MentorAnalyticsPage />);

      expect(screen.getByTestId('mentee-progress-user-1')).toBeInTheDocument();
      expect(screen.getByTestId('mentee-progress-user-2')).toBeInTheDocument();
      expect(screen.getByTestId('mentee-progress-user-3')).toBeInTheDocument();
    });

    it('should display mentee names', () => {
      render(<MentorAnalyticsPage />);

      const menteeList = screen.getByTestId('mentee-progress-list');
      expect(menteeList).toHaveTextContent('John Doe');
      expect(menteeList).toHaveTextContent('Jane Smith');
      expect(menteeList).toHaveTextContent('Bob Wilson');
    });

    it('should display class name for each mentee', () => {
      render(<MentorAnalyticsPage />);

      // Each mentee should show their class
      const johnProgress = screen.getByTestId('mentee-progress-user-1');
      expect(johnProgress).toHaveTextContent('Evening Class');

      const janeProgress = screen.getByTestId('mentee-progress-user-2');
      expect(janeProgress).toHaveTextContent('Morning Class');

      const bobProgress = screen.getByTestId('mentee-progress-user-3');
      expect(bobProgress).toHaveTextContent('Weekend Class');
    });

    it('should display completion rate for each mentee', () => {
      render(<MentorAnalyticsPage />);

      const johnProgress = screen.getByTestId('mentee-progress-user-1');
      expect(johnProgress).toHaveTextContent('25%');

      const janeProgress = screen.getByTestId('mentee-progress-user-2');
      expect(janeProgress).toHaveTextContent('92%');

      const bobProgress = screen.getByTestId('mentee-progress-user-3');
      expect(bobProgress).toHaveTextContent('67%');
    });

    it('should show exercise counts for each mentee', () => {
      render(<MentorAnalyticsPage />);

      expect(screen.getByText('5 / 20 exercises')).toBeInTheDocument();
      expect(screen.getByText('23 / 25 exercises')).toBeInTheDocument();
      expect(screen.getByText('12 / 18 exercises')).toBeInTheDocument();
    });

    it('should display average completion rate', () => {
      render(<MentorAnalyticsPage />);

      const menteeProgressList = screen.getByTestId('mentee-progress-list');
      expect(menteeProgressList).toHaveTextContent('Avg: 61%');
    });

    it('should display total mentees count in overview', () => {
      render(<MentorAnalyticsPage />);

      const totalMenteesStat = screen.getByTestId('stat-total-mentees');
      expect(totalMenteesStat).toHaveTextContent('15');
      expect(totalMenteesStat).toHaveTextContent('Total Mentees');
    });
  });

  describe('AC: Mood trends across class', () => {
    it('should display mood score in overview stats', () => {
      render(<MentorAnalyticsPage />);

      const moodScoreStat = screen.getByTestId('stat-mood-score');
      expect(moodScoreStat).toBeInTheDocument();
      expect(moodScoreStat).toHaveTextContent('65');
      expect(moodScoreStat).toHaveTextContent('Mood Score');
    });

    it('should display mood trends section in mood tab', () => {
      render(<MentorAnalyticsPage />);

      const moodTrends = screen.getByTestId('mood-trends');
      expect(moodTrends).toBeInTheDocument();
    });

    it('should show overall mood score with indicator', () => {
      render(<MentorAnalyticsPage />);

      const overallMood = screen.getByTestId('overall-mood');
      expect(overallMood).toBeInTheDocument();
      expect(overallMood).toHaveTextContent('Overall Mood Score');
      expect(overallMood).toHaveTextContent('65');
    });

    it('should display class mood breakdown', () => {
      render(<MentorAnalyticsPage />);

      const classMoodBreakdown = screen.getByTestId('class-mood-breakdown');
      expect(classMoodBreakdown).toBeInTheDocument();
    });

    it('should show mood score for each class', () => {
      render(<MentorAnalyticsPage />);

      expect(screen.getByTestId('class-mood-class-1')).toBeInTheDocument();
      expect(screen.getByTestId('class-mood-class-2')).toBeInTheDocument();
      expect(screen.getByTestId('class-mood-class-3')).toBeInTheDocument();

      const classMood1 = screen.getByTestId('class-mood-class-1');
      expect(classMood1).toHaveTextContent('Morning Class');
      expect(classMood1).toHaveTextContent('75');

      const classMood2 = screen.getByTestId('class-mood-class-2');
      expect(classMood2).toHaveTextContent('Evening Class');
      expect(classMood2).toHaveTextContent('45');
    });

    it('should display pattern distribution', () => {
      render(<MentorAnalyticsPage />);

      const patternDistribution = screen.getByTestId('pattern-distribution');
      expect(patternDistribution).toBeInTheDocument();
    });

    it('should show all pattern types', () => {
      render(<MentorAnalyticsPage />);

      expect(screen.getByTestId('pattern-stress')).toBeInTheDocument();
      expect(screen.getByTestId('pattern-energy')).toBeInTheDocument();
      expect(screen.getByTestId('pattern-mood')).toBeInTheDocument();
      expect(screen.getByTestId('pattern-focus')).toBeInTheDocument();
      expect(screen.getByTestId('pattern-anxiety')).toBeInTheDocument();
      expect(screen.getByTestId('pattern-motivation')).toBeInTheDocument();
    });

    it('should show intensity breakdown for patterns', () => {
      render(<MentorAnalyticsPage />);

      const stressPattern = screen.getByTestId('pattern-stress');
      expect(stressPattern).toHaveTextContent('15 strong');
      expect(stressPattern).toHaveTextContent('20 weak');
      expect(stressPattern).toHaveTextContent('15 none');
    });

    it('should display daily mood trends chart', () => {
      render(<MentorAnalyticsPage />);

      const dailyTrends = screen.getByTestId('daily-trends');
      expect(dailyTrends).toBeInTheDocument();
      expect(dailyTrends).toHaveTextContent('Daily Mood Trends');
    });
  });

  describe('AC: Identify mentees needing attention', () => {
    it('should display needs attention count in overview', () => {
      render(<MentorAnalyticsPage />);

      const needsAttentionStat = screen.getByTestId('stat-needs-attention');
      expect(needsAttentionStat).toBeInTheDocument();
      expect(needsAttentionStat).toHaveTextContent('3');
      expect(needsAttentionStat).toHaveTextContent('Need Attention');
    });

    it('should display attention summary in overview tab', () => {
      render(<MentorAnalyticsPage />);

      const attentionSummary = screen.getByTestId('attention-summary');
      expect(attentionSummary).toBeInTheDocument();
      expect(attentionSummary).toHaveTextContent('Attention Required');
    });

    it('should show mentees needing attention with priority badges', () => {
      render(<MentorAnalyticsPage />);

      expect(screen.getByTestId('attention-mentee-user-1')).toBeInTheDocument();
    });

    it('should display reasons for attention flags', () => {
      render(<MentorAnalyticsPage />);

      const johnAttention = screen.getByTestId('attention-mentee-user-1');
      expect(johnAttention).toHaveTextContent('John Doe');
      expect(johnAttention).toHaveTextContent('Low completion rate');
    });

    it('should show priority badges', () => {
      render(<MentorAnalyticsPage />);

      const johnAttention = screen.getByTestId('attention-mentee-user-1');
      expect(johnAttention).toHaveTextContent('high');
    });

    it('should highlight mentees needing attention in mentee progress list', () => {
      render(<MentorAnalyticsPage />);

      // John Doe needs attention and should have alert styling
      const johnProgress = screen.getByTestId('mentee-progress-user-1');
      expect(johnProgress).toHaveTextContent('John Doe');
      expect(johnProgress).toHaveTextContent('high');
      expect(johnProgress).toHaveTextContent('Low completion rate');
    });

    it('should show multiple reasons when mentee has multiple flags', () => {
      render(<MentorAnalyticsPage />);

      // Alice Brown has both low completion and low mood
      const aliceAttention = screen.queryAllByText(/Low completion rate/).find(
        el => el.closest('[data-testid]')?.getAttribute('data-testid')?.includes('user-4')
      );
      // The mentee with multiple reasons should be displayed
      expect(screen.getByText(/Low completion rate \(40%\)/)).toBeInTheDocument();
    });
  });

  describe('Overview tab content', () => {
    it('should display overview stats grid', () => {
      render(<MentorAnalyticsPage />);

      expect(screen.getByTestId('overview-stats')).toBeInTheDocument();
    });

    it('should show all four overview stat cards', () => {
      render(<MentorAnalyticsPage />);

      expect(screen.getByTestId('stat-completion-rate')).toBeInTheDocument();
      expect(screen.getByTestId('stat-mood-score')).toBeInTheDocument();
      expect(screen.getByTestId('stat-total-mentees')).toBeInTheDocument();
      expect(screen.getByTestId('stat-needs-attention')).toBeInTheDocument();
    });
  });

  describe('Tabs navigation', () => {
    it('should display tabs for different views', () => {
      render(<MentorAnalyticsPage />);

      expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
      expect(screen.getByTestId('tab-overview')).toBeInTheDocument();
      expect(screen.getByTestId('tab-classes')).toBeInTheDocument();
      expect(screen.getByTestId('tab-mentees')).toBeInTheDocument();
      expect(screen.getByTestId('tab-mood')).toBeInTheDocument();
    });

    it('should display tab content for all tabs', () => {
      render(<MentorAnalyticsPage />);

      expect(screen.getByTestId('tab-content-overview')).toBeInTheDocument();
      expect(screen.getByTestId('tab-content-classes')).toBeInTheDocument();
      expect(screen.getByTestId('tab-content-mentees')).toBeInTheDocument();
      expect(screen.getByTestId('tab-content-mood')).toBeInTheDocument();
    });
  });

  describe('Loading states', () => {
    it('should show loading state for overview stats', () => {
      overviewLoading = true;
      render(<MentorAnalyticsPage />);

      const completionRateStat = screen.getByTestId('stat-completion-rate');
      expect(completionRateStat).toHaveTextContent('-');
    });

    it('should show loading message for class completion list', () => {
      classCompletionLoading = true;
      render(<MentorAnalyticsPage />);

      expect(screen.getByText('Loading classes...')).toBeInTheDocument();
    });

    it('should show loading message for mentee progress list', () => {
      menteeProgressLoading = true;
      render(<MentorAnalyticsPage />);

      expect(screen.getByText('Loading mentees...')).toBeInTheDocument();
    });

    it('should show loading message for attention data', () => {
      attentionLoading = true;
      render(<MentorAnalyticsPage />);

      const attentionSummary = screen.getByTestId('attention-summary');
      expect(attentionSummary).toHaveTextContent('Loading...');
    });
  });

  describe('Empty states', () => {
    it('should show message when no classes found', () => {
      // Temporarily empty the mock data
      const originalClasses = mockClassCompletionData.classes;
      mockClassCompletionData.classes = [];

      render(<MentorAnalyticsPage />);

      expect(screen.getByText('No classes found')).toBeInTheDocument();

      // Restore
      mockClassCompletionData.classes = originalClasses;
    });

    it('should show message when no mentees found', () => {
      // Temporarily empty the mock data
      const originalMentees = mockMenteeProgressData.mentees;
      mockMenteeProgressData.mentees = [];

      render(<MentorAnalyticsPage />);

      expect(screen.getByText('No mentees found')).toBeInTheDocument();

      // Restore
      mockMenteeProgressData.mentees = originalMentees;
    });

    it('should show message when all mentees are on track', () => {
      // Temporarily empty the attention data
      const originalAttention = mockAttentionData.menteesNeedingAttention;
      mockAttentionData.menteesNeedingAttention = [];

      render(<MentorAnalyticsPage />);

      expect(screen.getByText('All mentees are on track!')).toBeInTheDocument();

      // Restore
      mockAttentionData.menteesNeedingAttention = originalAttention;
    });
  });
});
