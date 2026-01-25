'use client';

import Link from 'next/link';
import { useViewContext } from '@/components/providers';
import type { UserRole } from '@/auth';

interface DashboardContentProps {
  user: {
    id: string;
    email: string;
    name: string;
    roles: UserRole[];
  };
}

export function DashboardContent({ user }: DashboardContentProps) {
  const { currentView, availableViews } = useViewContext();

  // Determine what to show based on current view
  const showAdminContent = currentView === 'admin';
  const showMentorContent = currentView === 'mentor' || currentView === 'admin';
  const showMenteeContent = true; // Always show mentee content

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">User Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-400">Name</dt>
              <dd className="text-white">{user.name || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-400">Email</dt>
              <dd className="text-white">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-400">User ID</dt>
              <dd className="font-mono text-sm text-gray-300">{user.id}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Current View</h2>
          <div className="space-y-3">
            <div>
              <dt className="text-sm text-gray-400">Viewing as</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                    currentView === 'admin'
                      ? 'bg-orange-900/30 text-orange-300'
                      : currentView === 'mentor'
                        ? 'bg-blue-900/30 text-blue-300'
                        : 'bg-green-900/30 text-green-300'
                  }`}
                  data-testid="current-view-badge"
                >
                  {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-400">Your Roles</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-purple-600/20 px-3 py-1 text-sm font-medium text-purple-300"
                  >
                    {role}
                  </span>
                ))}
              </dd>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-lg bg-gray-900 p-6" data-testid="view-based-content">
        <h2 className="mb-4 text-lg font-semibold text-white">
          {currentView === 'admin'
            ? 'Admin Dashboard'
            : currentView === 'mentor'
              ? 'Mentor Dashboard'
              : 'Mentee Dashboard'}
        </h2>
        <p className="mb-4 text-sm text-gray-400">
          {currentView === 'admin'
            ? 'Administrative tools and user management'
            : currentView === 'mentor'
              ? 'Manage your mentees and track their progress'
              : 'Access your learning materials and track your progress'}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {showAdminContent && (
            <>
              {user.roles.includes('superadmin') && (
                <Link
                  href="/superadmin"
                  className="rounded-lg bg-red-900/30 p-4 text-center transition-colors hover:bg-red-900/50"
                  data-testid="superadmin-link"
                >
                  <span className="text-sm font-medium text-red-300">Superadmin Panel</span>
                </Link>
              )}
              <Link
                href="/admin"
                className="rounded-lg bg-orange-900/30 p-4 text-center transition-colors hover:bg-orange-900/50"
                data-testid="admin-link"
              >
                <span className="text-sm font-medium text-orange-300">Admin Panel</span>
              </Link>
            </>
          )}
          {showMentorContent && (
            <Link
              href="/mentor"
              className="rounded-lg bg-blue-900/30 p-4 text-center transition-colors hover:bg-blue-900/50"
              data-testid="mentor-link"
            >
              <span className="text-sm font-medium text-blue-300">Mentor Area</span>
            </Link>
          )}
          {showMenteeContent && (
            <Link
              href="/mentee"
              className="rounded-lg bg-green-900/30 p-4 text-center transition-colors hover:bg-green-900/50"
              data-testid="mentee-link"
            >
              <span className="text-sm font-medium text-green-300">Mentee Area</span>
            </Link>
          )}
        </div>
      </div>

      {availableViews.length > 1 && (
        <div className="mt-4 text-sm text-gray-500">
          Use the view switcher in the header to change your perspective.
        </div>
      )}

      <div className="mt-4">
        <Link href="/" className="text-sm text-purple-400 hover:text-purple-300">
          &larr; Back to Home
        </Link>
      </div>
    </>
  );
}
