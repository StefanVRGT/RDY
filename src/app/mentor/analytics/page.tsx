'use client';

import { useState, useMemo } from 'react';
import { MobileLayout } from '@/components/mobile';
import { trpc } from '@/lib/trpc/client';
import {
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Activity,
  ChevronRight,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Link from 'next/link';

// Helper to format date for display
function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

// Helper to get date range for last N days
function getDateRange(days: number) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

// Mood score indicator component
function MoodIndicator({ score }: { score: number }) {
  const color = score >= 60 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400';
  const bgColor = score >= 60 ? 'bg-green-500/20' : score >= 40 ? 'bg-yellow-500/20' : 'bg-red-500/20';
  const label = score >= 60 ? 'Good' : score >= 40 ? 'Moderate' : 'Low';

  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1 ${bgColor}`}>
      <div className={`h-2 w-2 rounded-full ${color.replace('text-', 'bg-')}`} />
      <span className={`text-sm font-medium ${color}`}>{label}</span>
    </div>
  );
}

// Progress bar component
function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const color = value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-gray-700 ${className}`}>
      <div
        className={`h-full transition-all duration-300 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// Priority badge component
function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'bg-red-500/20 text-red-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-blue-500/20 text-blue-400',
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[priority]}`}>
      {priority}
    </span>
  );
}

export default function MentorAnalyticsPage() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [dateRange] = useState(() => getDateRange(30));

  // Fetch analytics data
  const { data: overview, isLoading: overviewLoading } = trpc.mentorAnalytics.getAnalyticsOverview.useQuery({
    dateRange,
  });

  const { data: classCompletionData, isLoading: classCompletionLoading } = trpc.mentorAnalytics.getClassCompletionRates.useQuery({
    dateRange,
  });

  const { data: menteeProgressData, isLoading: menteeProgressLoading } = trpc.mentorAnalytics.getMenteeProgress.useQuery({
    sortBy: 'completionRate',
    sortOrder: 'asc',
  });

  const { data: moodTrendsData, isLoading: moodTrendsLoading } = trpc.mentorAnalytics.getClassMoodTrends.useQuery({
    dateRange,
  });

  const { data: attentionData, isLoading: attentionLoading } = trpc.mentorAnalytics.getMenteesNeedingAttention.useQuery();

  const isLoading = overviewLoading || classCompletionLoading || menteeProgressLoading || moodTrendsLoading || attentionLoading;

  // Compute pattern distribution for display
  const patternDistribution = useMemo(() => {
    if (!moodTrendsData?.patternSummary) return [];

    const patterns = moodTrendsData.patternSummary;
    return Object.entries(patterns).map(([type, data]) => ({
      type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      ...data,
    }));
  }, [moodTrendsData]);

  return (
    <MobileLayout title="Analytics" showBack showNotifications>
      <div className="px-4 py-6" data-testid="mentor-analytics-page">
        {/* Overview Stats */}
        <div className="mb-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Overview</h2>
          <div className="grid grid-cols-2 gap-4" data-testid="overview-stats">
            <div className="rounded-xl bg-gray-900 p-4" data-testid="stat-completion-rate">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-twilight-500/20">
                <TrendingUp className="h-5 w-5 text-twilight-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {overviewLoading ? '-' : `${overview?.overallCompletionRate ?? 0}%`}
              </p>
              <p className="text-sm text-gray-400">Completion Rate</p>
            </div>

            <div className="rounded-xl bg-gray-900 p-4" data-testid="stat-mood-score">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20">
                <Activity className="h-5 w-5 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {overviewLoading ? '-' : overview?.overallMoodScore ?? 50}
              </p>
              <p className="text-sm text-gray-400">Mood Score</p>
            </div>

            <div className="rounded-xl bg-gray-900 p-4" data-testid="stat-total-mentees">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                <Users className="h-5 w-5 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {overviewLoading ? '-' : overview?.totalMentees ?? 0}
              </p>
              <p className="text-sm text-gray-400">Total Mentees</p>
            </div>

            <div className="rounded-xl bg-gray-900 p-4" data-testid="stat-needs-attention">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {overviewLoading ? '-' : overview?.menteesNeedingAttentionCount ?? 0}
              </p>
              <p className="text-sm text-gray-400">Need Attention</p>
            </div>
          </div>
        </div>

        {/* Tabs for detailed views */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="classes" className="text-xs">Classes</TabsTrigger>
            <TabsTrigger value="mentees" className="text-xs">Mentees</TabsTrigger>
            <TabsTrigger value="mood" className="text-xs">Mood</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-4">
              {/* Top/Lowest Performing Classes */}
              {overview?.topPerformingClass && (
                <div className="rounded-xl bg-gray-900 p-4" data-testid="top-performing-class">
                  <div className="mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-gray-400">Top Performing</span>
                  </div>
                  <p className="font-medium text-white">{overview.topPerformingClass.name}</p>
                  <p className="text-sm text-green-400">{overview.topPerformingClass.completionRate}% completion</p>
                </div>
              )}

              {overview?.lowestPerformingClass && (
                <div className="rounded-xl bg-gray-900 p-4" data-testid="lowest-performing-class">
                  <div className="mb-2 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-gray-400">Needs Attention</span>
                  </div>
                  <p className="font-medium text-white">{overview.lowestPerformingClass.name}</p>
                  <p className="text-sm text-red-400">{overview.lowestPerformingClass.completionRate}% completion</p>
                </div>
              )}

              {/* Mentees Needing Attention Summary */}
              <div className="rounded-xl bg-gray-900 p-4" data-testid="attention-summary">
                <h3 className="mb-3 font-semibold text-white">Attention Required</h3>
                {attentionLoading ? (
                  <p className="text-gray-400">Loading...</p>
                ) : attentionData?.menteesNeedingAttention && attentionData.menteesNeedingAttention.length > 0 ? (
                  <div className="space-y-3">
                    {attentionData.menteesNeedingAttention.slice(0, 3).map((mentee) => (
                      <div
                        key={mentee.id}
                        className="flex items-center justify-between rounded-lg bg-gray-800 p-3"
                        data-testid={`attention-mentee-${mentee.userId}`}
                      >
                        <div>
                          <p className="font-medium text-white">{mentee.user.name || mentee.user.email}</p>
                          <p className="text-xs text-gray-400">{mentee.reasons.slice(0, 2).join(' / ')}</p>
                        </div>
                        <PriorityBadge priority={mentee.priority as 'high' | 'medium' | 'low'} />
                      </div>
                    ))}
                    {attentionData.menteesNeedingAttention.length > 3 && (
                      <button
                        onClick={() => setSelectedTab('mentees')}
                        className="w-full rounded-lg bg-gray-800 p-2 text-center text-sm text-twilight-400 hover:bg-gray-700"
                      >
                        View all {attentionData.menteesNeedingAttention.length} mentees
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400">All mentees are on track!</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes">
            <div className="space-y-4" data-testid="class-completion-list">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-white">Class Completion Rates</h3>
                <span className="text-sm text-gray-400">
                  Overall: {classCompletionData?.overallCompletionRate ?? 0}%
                </span>
              </div>

              {classCompletionLoading ? (
                <div className="rounded-xl bg-gray-900 p-4 text-center text-gray-400">
                  Loading classes...
                </div>
              ) : classCompletionData?.classes && classCompletionData.classes.length > 0 ? (
                classCompletionData.classes.map((cls) => (
                  <Link
                    key={cls.id}
                    href={`/mentor/classes/${cls.id}`}
                    className="block rounded-xl bg-gray-900 p-4 transition-colors hover:bg-gray-800"
                    data-testid={`class-completion-${cls.id}`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-twilight-400" />
                        <span className="font-medium text-white">{cls.name}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-gray-400">{cls.memberCount} mentees</span>
                      <span className={cls.completionRate >= 70 ? 'text-green-400' : cls.completionRate >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                        {cls.completionRate}%
                      </span>
                    </div>
                    <ProgressBar value={cls.completionRate} />
                    <div className="mt-2 text-xs text-gray-500">
                      {cls.completedExercises} / {cls.totalExercises} exercises completed
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-xl bg-gray-900 p-4 text-center text-gray-400">
                  No classes found
                </div>
              )}
            </div>
          </TabsContent>

          {/* Mentees Tab */}
          <TabsContent value="mentees">
            <div className="space-y-4" data-testid="mentee-progress-list">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-white">Individual Progress</h3>
                <span className="text-sm text-gray-400">
                  Avg: {menteeProgressData?.averageCompletionRate ?? 0}%
                </span>
              </div>

              {menteeProgressLoading ? (
                <div className="rounded-xl bg-gray-900 p-4 text-center text-gray-400">
                  Loading mentees...
                </div>
              ) : menteeProgressData?.mentees && menteeProgressData.mentees.length > 0 ? (
                menteeProgressData.mentees.map((mentee) => {
                  const needsAttention = attentionData?.menteesNeedingAttention?.find(
                    m => m.userId === mentee.userId
                  );

                  return (
                    <div
                      key={mentee.id}
                      className="rounded-xl bg-gray-900 p-4"
                      data-testid={`mentee-progress-${mentee.userId}`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-cyan-400" />
                          <span className="font-medium text-white">{mentee.user.name || mentee.user.email}</span>
                        </div>
                        {needsAttention && (
                          <PriorityBadge priority={needsAttention.priority as 'high' | 'medium' | 'low'} />
                        )}
                      </div>
                      <p className="mb-2 text-sm text-gray-400">{mentee.className}</p>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-gray-400">Progress</span>
                        <span className={mentee.completionRate >= 70 ? 'text-green-400' : mentee.completionRate >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                          {mentee.completionRate}%
                        </span>
                      </div>
                      <ProgressBar value={mentee.completionRate} />
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span>{mentee.completedExercises} / {mentee.totalExercises} exercises</span>
                        {mentee.lastActivity && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Last active: {formatDate(mentee.lastActivity)}
                          </span>
                        )}
                      </div>
                      {needsAttention && needsAttention.reasons.length > 0 && (
                        <div className="mt-2 rounded-lg bg-amber-500/10 p-2">
                          <p className="text-xs text-amber-400">
                            {needsAttention.reasons.join(' / ')}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl bg-gray-900 p-4 text-center text-gray-400">
                  No mentees found
                </div>
              )}
            </div>
          </TabsContent>

          {/* Mood Tab */}
          <TabsContent value="mood">
            <div className="space-y-4" data-testid="mood-trends">
              {/* Overall Mood Score */}
              <div className="rounded-xl bg-gray-900 p-4" data-testid="overall-mood">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-white">Overall Mood Score</h3>
                  <MoodIndicator score={moodTrendsData?.overallMoodScore ?? 50} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="relative h-4 overflow-hidden rounded-full bg-gray-700">
                      <div
                        className="absolute left-0 h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                        style={{ width: '100%' }}
                      />
                      <div
                        className="absolute top-0 h-full w-1 -translate-x-1/2 bg-white shadow-md"
                        style={{ left: `${moodTrendsData?.overallMoodScore ?? 50}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-gray-500">
                      <span>Low</span>
                      <span>Moderate</span>
                      <span>Good</span>
                    </div>
                  </div>
                  <span className="text-3xl font-bold text-white">
                    {moodTrendsLoading ? '-' : moodTrendsData?.overallMoodScore ?? 50}
                  </span>
                </div>
              </div>

              {/* Class Mood Breakdown */}
              <div className="rounded-xl bg-gray-900 p-4" data-testid="class-mood-breakdown">
                <h3 className="mb-3 font-semibold text-white">Class Mood Breakdown</h3>
                {moodTrendsLoading ? (
                  <p className="text-gray-400">Loading...</p>
                ) : moodTrendsData?.classTrends && moodTrendsData.classTrends.length > 0 ? (
                  <div className="space-y-3">
                    {moodTrendsData.classTrends.map((cls) => (
                      <div
                        key={cls.classId}
                        className="flex items-center justify-between rounded-lg bg-gray-800 p-3"
                        data-testid={`class-mood-${cls.classId}`}
                      >
                        <div>
                          <p className="font-medium text-white">{cls.className}</p>
                          <p className="text-xs text-gray-400">{cls.participantCount} participants</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${cls.moodScore >= 60 ? 'text-green-400' : cls.moodScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {cls.moodScore}
                          </p>
                          <p className="text-xs text-gray-500">{cls.totalEntries} entries</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">No mood data available</p>
                )}
              </div>

              {/* Pattern Distribution */}
              <div className="rounded-xl bg-gray-900 p-4" data-testid="pattern-distribution">
                <h3 className="mb-3 font-semibold text-white">Pattern Distribution</h3>
                {moodTrendsLoading ? (
                  <p className="text-gray-400">Loading...</p>
                ) : patternDistribution.length > 0 ? (
                  <div className="space-y-3">
                    {patternDistribution.map((pattern) => {
                      const isPositive = ['mood', 'energy', 'motivation', 'focus'].includes(pattern.type);
                      const color = isPositive ? 'bg-green-500' : 'bg-red-500';

                      return (
                        <div key={pattern.type} data-testid={`pattern-${pattern.type}`}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="text-gray-300">{pattern.label}</span>
                            <span className="text-gray-400">
                              {pattern.strong} strong / {pattern.weak} weak / {pattern.none} none
                            </span>
                          </div>
                          <div className="flex h-2 overflow-hidden rounded-full bg-gray-700">
                            {pattern.total > 0 && (
                              <>
                                <div
                                  className={`${color}`}
                                  style={{ width: `${(pattern.strong / pattern.total) * 100}%` }}
                                />
                                <div
                                  className={`${color} opacity-50`}
                                  style={{ width: `${(pattern.weak / pattern.total) * 100}%` }}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-400">No pattern data available</p>
                )}
              </div>

              {/* Daily Trends */}
              {moodTrendsData?.dailyTrends && moodTrendsData.dailyTrends.length > 0 && (
                <div className="rounded-xl bg-gray-900 p-4" data-testid="daily-trends">
                  <h3 className="mb-3 font-semibold text-white">Daily Mood Trends</h3>
                  <div className="flex items-end justify-between gap-1">
                    {moodTrendsData.dailyTrends.slice(-14).map((day) => {
                      const height = Math.max(10, (day.moodScore / 100) * 60);
                      const color = day.moodScore >= 60 ? 'bg-green-500' : day.moodScore >= 40 ? 'bg-yellow-500' : 'bg-red-500';

                      return (
                        <div key={day.date} className="flex flex-1 flex-col items-center">
                          <div
                            className={`w-full rounded-t ${color}`}
                            style={{ height: `${height}px` }}
                            title={`${day.date}: ${day.moodScore}`}
                          />
                          <span className="mt-1 text-[8px] text-gray-500">
                            {new Date(day.date).getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-center text-xs text-gray-500">Last 14 days</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
