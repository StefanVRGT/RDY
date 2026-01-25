'use client';

import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.getAdminStats.useQuery();
  const { data: activities, isLoading: activitiesLoading } = trpc.dashboard.getAdminRecentActivity.useQuery();

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_joined':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
            <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        );
      case 'invitation_sent':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
            <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'invitation_accepted':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10">
            <svg className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'class_created':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/10">
            <svg className="h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case 'class_updated':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10">
            <svg className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-500/10">
            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-gray-400">Overview of your organization</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Mentors Count */}
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Mentors</CardDescription>
            <CardTitle className="text-3xl text-white">
              {statsLoading ? (
                <span className="inline-block h-8 w-16 animate-pulse rounded bg-gray-800" />
              ) : (
                stats?.users.mentors ?? 0
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">
              Active mentors in your organization
            </p>
          </CardContent>
        </Card>

        {/* Mentees Count */}
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Mentees</CardDescription>
            <CardTitle className="text-3xl text-white">
              {statsLoading ? (
                <span className="inline-block h-8 w-16 animate-pulse rounded bg-gray-800" />
              ) : (
                stats?.users.mentees ?? 0
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">
              Total mentees enrolled
            </p>
          </CardContent>
        </Card>

        {/* Active Classes Count */}
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Active Classes</CardDescription>
            <CardTitle className="text-3xl text-white">
              {statsLoading ? (
                <span className="inline-block h-8 w-16 animate-pulse rounded bg-gray-800" />
              ) : (
                stats?.classes.active ?? 0
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">
              {stats?.classes.total ?? 0} total classes
            </p>
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Pending Invitations</CardDescription>
            <CardTitle className="text-3xl text-white">
              {statsLoading ? (
                <span className="inline-block h-8 w-16 animate-pulse rounded bg-gray-800" />
              ) : (
                stats?.invitations.pending ?? 0
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">
              Awaiting acceptance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="border-gray-800 bg-gray-900">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-gray-400">
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/invitations">
              <Button variant="outline" className="w-full justify-start border-gray-700 bg-gray-800 text-white hover:bg-gray-700">
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Invite User
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="outline" className="w-full justify-start border-gray-700 bg-gray-800 text-white hover:bg-gray-700">
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage Users
              </Button>
            </Link>
            <Link href="/admin/curriculum-builder">
              <Button variant="outline" className="w-full justify-start border-gray-700 bg-gray-800 text-white hover:bg-gray-700">
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Curriculum Builder
              </Button>
            </Link>
            <Link href="/admin/exercises">
              <Button variant="outline" className="w-full justify-start border-gray-700 bg-gray-800 text-white hover:bg-gray-700">
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Manage Exercises
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="border-gray-800 bg-gray-900 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <CardDescription className="text-gray-400">
              Latest activity in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-gray-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-gray-800" />
                      <div className="h-3 w-1/4 animate-pulse rounded bg-gray-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{activity.description}</p>
                      <p className="text-xs text-gray-500">{formatRelativeTime(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg className="h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No recent activity</p>
                <p className="text-xs text-gray-600">Activity will appear here as users join and classes are created</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Summary */}
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-white">User Summary</CardTitle>
          <CardDescription className="text-gray-400">
            Breakdown of users in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Total Users</span>
                <span className="text-2xl font-bold text-white">
                  {statsLoading ? '-' : stats?.users.total ?? 0}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800">
                <div className="h-full bg-blue-500" style={{ width: '100%' }} />
              </div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Mentors</span>
                <span className="text-2xl font-bold text-white">
                  {statsLoading ? '-' : stats?.users.mentors ?? 0}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: stats?.users.total
                      ? `${(stats.users.mentors / stats.users.total) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>
            <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Mentees</span>
                <span className="text-2xl font-bold text-white">
                  {statsLoading ? '-' : stats?.users.mentees ?? 0}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full bg-purple-500"
                  style={{
                    width: stats?.users.total
                      ? `${(stats.users.mentees / stats.users.total) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>
          </div>
          {stats?.users.newLast7Days !== undefined && stats.users.newLast7Days > 0 && (
            <p className="mt-4 text-sm text-gray-500">
              <span className="text-green-500">+{stats.users.newLast7Days}</span> new users in the last 7 days
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
