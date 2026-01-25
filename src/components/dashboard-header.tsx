'use client';

import Link from 'next/link';
import { ViewSwitcher } from './view-switcher';

interface DashboardHeaderProps {
  userEmail: string;
}

export function DashboardHeader({ userEmail }: DashboardHeaderProps) {
  return (
    <nav className="border-b border-gray-800 bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-lg font-bold text-white">
              Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <ViewSwitcher />
            <span className="text-sm text-gray-400">{userEmail}</span>
            <Link href="/" className="text-sm text-gray-300 hover:text-white">
              Home
            </Link>
            <Link
              href="/api/auth/signout"
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-800"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
