'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile';
import { trpc } from '@/lib/trpc/client';
import {
  Users,
  RefreshCw,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Clock,
  BookOpen,
  TrendingUp,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// Format date to readable date string
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

// Format date/time for session history
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

// Check if date is in the past
function isPast(date: Date): boolean {
  return new Date(date) < new Date();
}

// Progress bar component
function ProgressBar({ percentage, size = 'md' }: { percentage: number; size?: 'sm' | 'md' | 'lg' }) {
  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';

  return (
    <div className={`w-full overflow-hidden rounded-full bg-rdy-gray-200 ${heightClass}`}>
      <div
        className={`${heightClass} rounded-full bg-rdy-orange-500 transition-all duration-300`}
        style={{ width: `${percentage}%` }}
        data-testid="progress-bar-fill"
      />
    </div>
  );
}

type TabType = 'mentees' | 'sessions';

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('mentees');
  const contentRef = useRef<HTMLDivElement>(null);

  // TRPC queries
  const utils = trpc.useUtils();
  const { data: classDetail, isLoading: classLoading } = trpc.mentor.getClassDetail.useQuery(
    { classId },
    { enabled: !!classId }
  );
  const { data: menteeProgress, isLoading: progressLoading } = trpc.mentor.getMenteeProgress.useQuery(
    { classId },
    { enabled: !!classId }
  );
  const { data: sessionHistory, isLoading: historyLoading } = trpc.mentor.getClassSessionHistory.useQuery(
    { classId, limit: 50 },
    { enabled: !!classId }
  );

  // Pull to refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollTop = contentRef.current?.scrollTop ?? 0;
    if (scrollTop <= 0) {
      setTouchStart(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStart === null) return;

    const currentTouch = e.touches[0].clientY;
    const distance = currentTouch - touchStart;

    if (distance > 0) {
      setPullDistance(Math.min(distance, 100));
    }
  }, [touchStart]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= 60 && !isRefreshing) {
      setIsRefreshing(true);
      await Promise.all([
        utils.mentor.getClassDetail.invalidate({ classId }),
        utils.mentor.getMenteeProgress.invalidate({ classId }),
        utils.mentor.getClassSessionHistory.invalidate({ classId }),
      ]);
      setIsRefreshing(false);
    }

    setTouchStart(null);
    setPullDistance(0);
  }, [pullDistance, isRefreshing, utils, classId]);

  // Reset pull distance when not touching
  useEffect(() => {
    if (touchStart === null) {
      setPullDistance(0);
    }
  }, [touchStart]);

  // Calculate class progress stats
  const totalMentees = menteeProgress?.length ?? 0;
  const avgProgress = menteeProgress && menteeProgress.length > 0
    ? Math.round(menteeProgress.reduce((sum, m) => sum + m.progressPercentage, 0) / menteeProgress.length)
    : 0;
  const totalSessions = sessionHistory?.total ?? 0;
  const completedSessions = sessionHistory?.sessions.filter(s => s.completed).length ?? 0;

  // Handle mentee tap to view diary
  const handleMenteeTap = (menteeId: string) => {
    router.push(`/mentor/mentee/${menteeId}/diary`);
  };

  return (
    <MobileLayout title={classDetail?.name ?? 'Class Details'} showBack showNotifications>
      <div
        ref={contentRef}
        className="px-4 py-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="class-detail-page"
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

        {classLoading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-rdy-orange-500" />
          </div>
        ) : classDetail ? (
          <>
            {/* Class header */}
            <div className="mb-6" data-testid="class-header">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-rdy-black">{classDetail.name}</h2>
                <div
                  className={`h-2 w-2 rounded-full ${classDetail.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}
                />
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-rdy-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(classDetail.startDate)} - {formatDate(classDetail.endDate)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {classDetail.memberCount} mentee{classDetail.memberCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Stats summary */}
            <div className="mb-6 grid grid-cols-2 gap-3" data-testid="class-stats">
              <div className="rounded-xl bg-rdy-gray-100 p-4">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-rdy-orange-500/10">
                  <TrendingUp className="h-4 w-4 text-rdy-orange-500" />
                </div>
                <p className="text-xl font-bold text-rdy-black">{avgProgress}%</p>
                <p className="text-xs text-rdy-gray-400">Avg. Progress</p>
              </div>
              <div className="rounded-xl bg-rdy-gray-100 p-4">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                </div>
                <p className="text-xl font-bold text-rdy-black">
                  {completedSessions}/{totalSessions}
                </p>
                <p className="text-xs text-rdy-gray-400">Sessions</p>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="mb-4 flex rounded-xl bg-rdy-gray-100 p-1" data-testid="tab-navigation">
              <button
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  activeTab === 'mentees'
                    ? 'bg-rdy-orange-500 text-white'
                    : 'text-rdy-gray-400 hover:text-rdy-black'
                }`}
                onClick={() => setActiveTab('mentees')}
                data-testid="tab-mentees"
              >
                <Users className="mr-1 inline-block h-4 w-4" />
                Mentees ({totalMentees})
              </button>
              <button
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  activeTab === 'sessions'
                    ? 'bg-rdy-orange-500 text-white'
                    : 'text-rdy-gray-400 hover:text-rdy-black'
                }`}
                onClick={() => setActiveTab('sessions')}
                data-testid="tab-sessions"
              >
                <BookOpen className="mr-1 inline-block h-4 w-4" />
                Sessions ({totalSessions})
              </button>
            </div>

            {/* Tab content */}
            {activeTab === 'mentees' && (
              <div className="space-y-3" data-testid="enrolled-mentees-list">
                {progressLoading ? (
                  <div className="rounded-xl bg-rdy-gray-100 p-4 text-center text-rdy-gray-400">
                    Loading mentees...
                  </div>
                ) : menteeProgress && menteeProgress.length > 0 ? (
                  menteeProgress.map((mentee) => (
                    <button
                      key={mentee.id}
                      onClick={() => handleMenteeTap(mentee.userId)}
                      className="w-full rounded-xl bg-rdy-gray-100 p-4 text-left transition-colors hover:bg-rdy-gray-200"
                      data-testid={`mentee-item-${mentee.userId}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-rdy-black">
                            {mentee.user.name || mentee.user.email}
                          </p>
                          <p className="text-sm text-rdy-gray-400">
                            Month {mentee.currentMonth} of {mentee.totalMonths}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-medium text-rdy-orange-500"
                            data-testid={`mentee-progress-${mentee.userId}`}
                          >
                            {mentee.progressPercentage}%
                          </span>
                          <ChevronRight className="h-5 w-5 text-rdy-gray-400" />
                        </div>
                      </div>
                      <div className="mt-3">
                        <ProgressBar percentage={mentee.progressPercentage} size="sm" />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-rdy-gray-500">
                        <span>
                          {mentee.completedSessions}/{mentee.totalSessions} sessions
                        </span>
                        <span>
                          Enrolled {formatDate(mentee.enrolledAt)}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl bg-rdy-gray-100 p-4 text-center text-rdy-gray-400">
                    No mentees enrolled yet
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sessions' && (
              <div className="space-y-3" data-testid="session-history-list">
                {historyLoading ? (
                  <div className="rounded-xl bg-rdy-gray-100 p-4 text-center text-rdy-gray-400">
                    Loading session history...
                  </div>
                ) : sessionHistory && sessionHistory.sessions.length > 0 ? (
                  <>
                    {sessionHistory.sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`rounded-xl p-4 ${
                          session.completed
                            ? 'border-l-4 border-green-500 bg-rdy-gray-100'
                            : isPast(session.scheduledAt)
                              ? 'border-l-4 border-amber-500 bg-rdy-gray-100'
                              : 'border-l-4 border-rdy-orange-500 bg-rdy-gray-100'
                        }`}
                        data-testid={`session-item-${session.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-rdy-black">
                              {session.mentee?.name || session.mentee?.email || 'Unknown Mentee'}
                            </p>
                            <p className="text-sm text-rdy-gray-400">
                              {session.exercise?.titleEn || session.exercise?.titleDe || 'Session'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-rdy-gray-600">
                              {formatDateTime(session.scheduledAt)}
                            </p>
                            <span
                              className={`text-xs ${
                                session.completed
                                  ? 'text-green-400'
                                  : isPast(session.scheduledAt)
                                    ? 'text-rdy-orange-500'
                                    : 'text-rdy-orange-500'
                              }`}
                            >
                              {session.completed ? (
                                <span className="flex items-center justify-end gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Completed
                                </span>
                              ) : isPast(session.scheduledAt) ? (
                                <span className="flex items-center justify-end gap-1">
                                  <Clock className="h-3 w-3" />
                                  Missed
                                </span>
                              ) : (
                                <span className="flex items-center justify-end gap-1">
                                  <Clock className="h-3 w-3" />
                                  Scheduled
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                        {session.notes && (
                          <p className="mt-2 text-sm text-rdy-gray-500">{session.notes}</p>
                        )}
                      </div>
                    ))}
                    {sessionHistory.hasMore && (
                      <button
                        className="w-full rounded-xl bg-rdy-gray-100 p-3 text-center text-sm text-rdy-orange-500 transition-colors hover:bg-rdy-gray-200"
                        data-testid="load-more-sessions"
                      >
                        Load more sessions
                      </button>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl bg-rdy-gray-100 p-4 text-center text-rdy-gray-400">
                    No sessions recorded yet
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex min-h-[50vh] flex-col items-center justify-center">
            <p className="text-rdy-gray-400">Class not found</p>
            <Link
              href="/mentor/classes"
              className="mt-4 text-rdy-orange-500 hover:text-rdy-orange-500"
            >
              Back to classes
            </Link>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
