'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile';
import { useUser } from '@/components/providers';
import { trpc } from '@/lib/trpc/client';
import {
  Calendar,
  Users,
  Clock,
  TrendingUp,
  RefreshCw,
  BookOpen,
  MessageSquare,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';

// Format date to readable time
function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

// Format date to readable date string
function formatDate(date: Date): string {
  const today = new Date();
  const sessionDate = new Date(date);

  if (
    sessionDate.getFullYear() === today.getFullYear() &&
    sessionDate.getMonth() === today.getMonth() &&
    sessionDate.getDate() === today.getDate()
  ) {
    return 'Today';
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (
    sessionDate.getFullYear() === tomorrow.getFullYear() &&
    sessionDate.getMonth() === tomorrow.getMonth() &&
    sessionDate.getDate() === tomorrow.getDate()
  ) {
    return 'Tomorrow';
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(sessionDate);
}

// Check if a date is today
function isToday(date: Date): boolean {
  const today = new Date();
  const checkDate = new Date(date);
  return (
    checkDate.getFullYear() === today.getFullYear() &&
    checkDate.getMonth() === today.getMonth() &&
    checkDate.getDate() === today.getDate()
  );
}

export default function MentorHomePage() {
  const { user } = useUser();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // TRPC queries
  const utils = trpc.useUtils();
  const { data: stats, isLoading: statsLoading } = trpc.mentor.getDashboardStats.useQuery();
  const { data: myClasses, isLoading: classesLoading } = trpc.mentor.getMyClasses.useQuery();
  const { data: todaysSessions, isLoading: todaysLoading } =
    trpc.mentor.getTodaysSessions.useQuery();
  const { data: upcomingSessions, isLoading: upcomingLoading } =
    trpc.mentor.getUpcomingSessions.useQuery({ limit: 5 });

  // Pull to refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollTop = contentRef.current?.scrollTop ?? 0;
    if (scrollTop <= 0) {
      setTouchStart(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (touchStart === null) return;

      const currentTouch = e.touches[0].clientY;
      const distance = currentTouch - touchStart;

      if (distance > 0) {
        setPullDistance(Math.min(distance, 100));
      }
    },
    [touchStart]
  );

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= 60 && !isRefreshing) {
      setIsRefreshing(true);

      // Invalidate all queries to refresh data
      await Promise.all([
        utils.mentor.getDashboardStats.invalidate(),
        utils.mentor.getMyClasses.invalidate(),
        utils.mentor.getTodaysSessions.invalidate(),
        utils.mentor.getUpcomingSessions.invalidate(),
      ]);

      setIsRefreshing(false);
    }

    setTouchStart(null);
    setPullDistance(0);
  }, [pullDistance, isRefreshing, utils]);

  // Reset pull distance when not touching
  useEffect(() => {
    if (touchStart === null) {
      setPullDistance(0);
    }
  }, [touchStart]);

  const isLoading = statsLoading || classesLoading || todaysLoading || upcomingLoading;

  return (
    <MobileLayout title="Mentor Dashboard" showNotifications>
      <div
        ref={contentRef}
        className="px-4 py-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="mentor-dashboard"
      >
        {/* Pull to refresh indicator */}
        {(pullDistance > 0 || isRefreshing) && (
          <div
            className="flex items-center justify-center py-4 transition-all duration-200"
            style={{ height: isRefreshing ? 48 : pullDistance * 0.5 }}
            data-testid="pull-to-refresh-indicator"
          >
            <RefreshCw
              className={`h-6 w-6 text-rdy-orange-500 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{
                transform: isRefreshing ? 'rotate(0deg)' : `rotate(${pullDistance * 3.6}deg)`,
                opacity: isRefreshing ? 1 : Math.min(pullDistance / 60, 1),
              }}
            />
          </div>
        )}

        {/* Welcome section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-rdy-black">
            Welcome back, {user?.name?.split(' ')[0] || 'Mentor'}
          </h2>
          <p className="mt-1 text-rdy-gray-400">Here&apos;s your overview for today</p>
        </div>

        {/* Quick stats */}
        <div className="mb-6 grid grid-cols-2 gap-4" data-testid="stats-grid">
          <div className="rounded-xl bg-rdy-gray-100 p-4" data-testid="stat-sessions-today">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-rdy-orange-500/10">
              <Calendar className="h-5 w-5 text-rdy-orange-500" />
            </div>
            <p className="text-2xl font-bold text-rdy-black">
              {isLoading ? '-' : (stats?.sessionsToday ?? 0)}
            </p>
            <p className="text-sm text-rdy-gray-400">Sessions today</p>
          </div>
          <div className="rounded-xl bg-rdy-gray-100 p-4" data-testid="stat-active-mentees">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20">
              <Users className="h-5 w-5 text-cyan-400" />
            </div>
            <p className="text-2xl font-bold text-rdy-black">
              {isLoading ? '-' : (stats?.totalMentees ?? 0)}
            </p>
            <p className="text-sm text-rdy-gray-400">Active mentees</p>
          </div>
          <div className="rounded-xl bg-rdy-gray-100 p-4" data-testid="stat-classes">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-rdy-orange-500/10">
              <BookOpen className="h-5 w-5 text-rdy-orange-500" />
            </div>
            <p className="text-2xl font-bold text-rdy-black">
              {isLoading ? '-' : (stats?.totalClasses ?? 0)}
            </p>
            <p className="text-sm text-rdy-gray-400">Active classes</p>
          </div>
          <div className="rounded-xl bg-rdy-gray-100 p-4" data-testid="stat-completion-rate">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-rdy-orange-500/10">
              <TrendingUp className="h-5 w-5 text-rdy-orange-500" />
            </div>
            <p className="text-2xl font-bold text-rdy-black">
              {isLoading ? '-' : `${stats?.completionRate ?? 0}%`}
            </p>
            <p className="text-sm text-rdy-gray-400">Completion rate</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-6" data-testid="quick-actions">
          <h3 className="mb-4 text-lg font-semibold text-rdy-black">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/mentor/classes"
              className="flex items-center gap-3 rounded-xl bg-rdy-orange-500 p-4 text-white transition-colors hover:bg-rdy-orange-600"
              data-testid="action-view-classes"
            >
              <BookOpen className="h-5 w-5" />
              <span className="font-medium">View Classes</span>
            </Link>
            <Link
              href="/mentor/calendar"
              className="flex items-center gap-3 rounded-xl bg-rdy-gray-100 p-4 text-rdy-black transition-colors hover:bg-rdy-gray-200"
              data-testid="action-calendar"
            >
              <Calendar className="h-5 w-5" />
              <span className="font-medium">Calendar</span>
            </Link>
            <Link
              href="/mentor/availability"
              className="flex items-center gap-3 rounded-xl bg-rdy-gray-100 p-4 text-rdy-black transition-colors hover:bg-rdy-gray-200"
              data-testid="action-availability"
            >
              <Clock className="h-5 w-5" />
              <span className="font-medium">Availability</span>
            </Link>
            <Link
              href="/mentor/analytics"
              className="flex items-center gap-3 rounded-xl bg-rdy-gray-100 p-4 text-rdy-black transition-colors hover:bg-rdy-gray-200"
              data-testid="action-analytics"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="font-medium">Analytics</span>
            </Link>
          </div>
        </div>

        {/* My Classes */}
        <div className="mb-6" data-testid="my-classes-section">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-rdy-black">My Classes</h3>
            <Link
              href="/mentor/classes"
              className="flex items-center text-sm text-rdy-orange-500 hover:text-rdy-orange-500"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3" data-testid="classes-list">
            {classesLoading ? (
              <div className="rounded-xl bg-rdy-gray-100 p-4 text-center text-rdy-gray-400">
                Loading classes...
              </div>
            ) : myClasses && myClasses.length > 0 ? (
              myClasses.slice(0, 3).map((cls) => (
                <Link
                  key={cls.id}
                  href={`/mentor/classes/${cls.id}`}
                  className="flex items-center justify-between rounded-xl bg-rdy-gray-100 p-4 transition-colors hover:bg-rdy-gray-200"
                  data-testid={`class-item-${cls.id}`}
                >
                  <div>
                    <p className="font-medium text-rdy-black">{cls.name}</p>
                    <p className="text-sm text-rdy-gray-400">
                      {cls.memberCount} mentee{cls.memberCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${cls.status === 'active' ? 'bg-green-500' : 'bg-rdy-gray-400'}`}
                    />
                    <ChevronRight className="h-5 w-5 text-rdy-gray-400" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-xl bg-rdy-gray-100 p-4 text-center text-rdy-gray-400">
                No classes yet
              </div>
            )}
          </div>
        </div>

        {/* Today's Sessions */}
        <div className="mb-6" data-testid="todays-sessions-section">
          <h3 className="mb-4 text-lg font-semibold text-rdy-black">
            Today&apos;s Sessions
            {todaysSessions && todaysSessions.length > 0 && (
              <span className="ml-2 rounded-full bg-rdy-orange-500 px-2 py-0.5 text-sm text-white">
                {todaysSessions.length}
              </span>
            )}
          </h3>
          <div className="space-y-3" data-testid="todays-sessions-list">
            {todaysLoading ? (
              <div className="rounded-xl bg-rdy-gray-100 p-4 text-center text-rdy-gray-400">
                Loading sessions...
              </div>
            ) : todaysSessions && todaysSessions.length > 0 ? (
              todaysSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border-l-4 border-rdy-orange-500 bg-rdy-gray-100 p-4"
                  data-testid={`today-session-${session.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-rdy-black">
                        {session.mentee?.name || 'Unknown Mentee'}
                      </p>
                      <p className="text-sm text-rdy-gray-400">{session.className}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-rdy-orange-500">
                        {formatTime(session.scheduledAt)}
                      </p>
                      {session.completed && (
                        <span className="text-xs text-green-400">Completed</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-rdy-gray-100 p-4 text-center text-rdy-gray-400">
                No sessions scheduled for today
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div className="mb-6" data-testid="upcoming-sessions-section">
          <h3 className="mb-4 text-lg font-semibold text-rdy-black">Upcoming Sessions</h3>
          <div className="space-y-3" data-testid="upcoming-sessions-list">
            {upcomingLoading ? (
              <div className="rounded-xl bg-rdy-gray-100 p-4 text-center text-rdy-gray-400">
                Loading upcoming sessions...
              </div>
            ) : upcomingSessions && upcomingSessions.length > 0 ? (
              upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between rounded-xl p-4 ${
                    isToday(session.scheduledAt)
                      ? 'border-l-4 border-rdy-orange-500 bg-rdy-gray-100'
                      : 'bg-rdy-gray-100'
                  }`}
                  data-testid={`upcoming-session-${session.id}`}
                  data-is-today={isToday(session.scheduledAt)}
                >
                  <div>
                    <p className="font-medium text-rdy-black">
                      {session.mentee?.name || 'Unknown Mentee'}
                    </p>
                    <p className="text-sm text-rdy-gray-400">{session.className}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${isToday(session.scheduledAt) ? 'text-rdy-orange-500' : 'text-rdy-gray-600'}`}
                    >
                      {formatDate(session.scheduledAt)}
                    </p>
                    <p className="text-xs text-rdy-gray-400">{formatTime(session.scheduledAt)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-rdy-gray-100 p-4 text-center text-rdy-gray-400">
                No upcoming sessions
              </div>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
