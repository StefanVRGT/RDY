'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile';
import { trpc } from '@/lib/trpc/client';
import { ChevronRight, Users, RefreshCw, Calendar, TrendingUp } from 'lucide-react';
import Link from 'next/link';

// Format date to readable date string
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export default function MentorClassesPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // TRPC queries
  const utils = trpc.useUtils();
  const { data: classes, isLoading } = trpc.mentor.getMyClasses.useQuery({ status: 'all' });

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
      await utils.mentor.getMyClasses.invalidate();
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

  const activeClasses = classes?.filter(c => c.status === 'active') || [];
  const disabledClasses = classes?.filter(c => c.status === 'disabled') || [];

  return (
    <MobileLayout title="Classes" showNotifications>
      <div
        ref={contentRef}
        className="px-4 py-6"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-testid="classes-page"
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

        {/* Page header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-rdy-black">My Classes</h2>
          <p className="mt-1 text-rdy-gray-400">Manage your classes and mentees</p>
        </div>

        {/* Stats summary */}
        <div className="mb-6 grid grid-cols-2 gap-4" data-testid="classes-stats">
          <div className="rounded-xl bg-rdy-gray-100 p-4">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-rdy-orange-500/10">
              <Users className="h-5 w-5 text-rdy-orange-500" />
            </div>
            <p className="text-2xl font-bold text-rdy-black">
              {isLoading ? '-' : activeClasses.length}
            </p>
            <p className="text-sm text-rdy-gray-400">Active Classes</p>
          </div>
          <div className="rounded-xl bg-rdy-gray-100 p-4">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
            </div>
            <p className="text-2xl font-bold text-rdy-black">
              {isLoading ? '-' : classes?.reduce((sum, c) => sum + c.memberCount, 0) || 0}
            </p>
            <p className="text-sm text-rdy-gray-400">Total Mentees</p>
          </div>
        </div>

        {/* Active Classes */}
        <div className="mb-6" data-testid="active-classes-section">
          <h3 className="mb-4 text-lg font-semibold text-rdy-black">
            Active Classes
            {activeClasses.length > 0 && (
              <span className="ml-2 rounded-full bg-green-600 px-2 py-0.5 text-sm text-white">
                {activeClasses.length}
              </span>
            )}
          </h3>
          <div className="space-y-3" data-testid="active-classes-list">
            {isLoading ? (
              <div className="rounded-xl bg-rdy-gray-100 p-4 text-center text-rdy-gray-400">
                Loading classes...
              </div>
            ) : activeClasses.length > 0 ? (
              activeClasses.map((cls) => (
                <Link
                  key={cls.id}
                  href={`/mentor/classes/${cls.id}`}
                  className="flex items-center justify-between rounded-xl bg-rdy-gray-100 p-4 transition-colors hover:bg-rdy-gray-200"
                  data-testid={`class-item-${cls.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-rdy-black">{cls.name}</p>
                    <div className="mt-1 flex items-center gap-3 text-sm text-rdy-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {cls.memberCount} mentee{cls.memberCount !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(cls.startDate)} - {formatDate(cls.endDate)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <ChevronRight className="h-5 w-5 text-rdy-gray-400" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-xl bg-rdy-gray-100 p-4 text-center text-rdy-gray-400">
                No active classes
              </div>
            )}
          </div>
        </div>

        {/* Disabled Classes */}
        {disabledClasses.length > 0 && (
          <div className="mb-6" data-testid="disabled-classes-section">
            <h3 className="mb-4 text-lg font-semibold text-rdy-black">
              Past Classes
              <span className="ml-2 rounded-full bg-gray-600 px-2 py-0.5 text-sm text-white">
                {disabledClasses.length}
              </span>
            </h3>
            <div className="space-y-3" data-testid="disabled-classes-list">
              {disabledClasses.map((cls) => (
                <Link
                  key={cls.id}
                  href={`/mentor/classes/${cls.id}`}
                  className="flex items-center justify-between rounded-xl bg-rdy-gray-100 p-4 opacity-75 transition-colors hover:bg-rdy-gray-200"
                  data-testid={`class-item-${cls.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-rdy-gray-600">{cls.name}</p>
                    <div className="mt-1 flex items-center gap-3 text-sm text-rdy-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {cls.memberCount} mentee{cls.memberCount !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(cls.startDate)} - {formatDate(cls.endDate)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gray-500" />
                    <ChevronRight className="h-5 w-5 text-rdy-gray-500" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
