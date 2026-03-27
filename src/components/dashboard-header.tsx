'use client';

import Link from 'next/link';
import { ViewSwitcher } from './view-switcher';
import { signOutAction } from '@/app/actions/sign-out';

interface DashboardHeaderProps {
  userEmail: string;
}

export function DashboardHeader({ userEmail }: DashboardHeaderProps) {
  return (
    <nav className="border-b border-rdy-gray-200 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-lg font-bold text-rdy-black">
              Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <ViewSwitcher />
            <span className="text-sm text-rdy-gray-400">{userEmail}</span>
            <Link href="/" className="text-sm text-rdy-gray-500 hover:text-rdy-black">
              Home
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg border border-rdy-gray-200 px-3 py-1.5 text-sm text-rdy-gray-500 transition-colors hover:bg-rdy-gray-100"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
