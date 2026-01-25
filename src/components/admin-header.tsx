'use client';

import Link from 'next/link';
import { ViewSwitcher } from './view-switcher';

interface AdminHeaderProps {
  title: string;
  userEmail: string;
  navLinks: Array<{ href: string; label: string }>;
}

export function AdminHeader({ title, userEmail, navLinks }: AdminHeaderProps) {
  return (
    <nav className="border-b border-gray-800 bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href={`/${title.toLowerCase()}`} className="text-lg font-bold text-white">
              {title}
            </Link>
            <div className="flex gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-gray-300 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ViewSwitcher />
            <span className="text-sm text-gray-400">{userEmail}</span>
            <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white">
              Dashboard
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
