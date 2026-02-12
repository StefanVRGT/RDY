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
    <nav className="border-b border-rdy-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href={`/${title.toLowerCase()}`} className="text-lg font-bold text-rdy-black">
              {title}
            </Link>
            <div className="flex gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-rdy-gray-500 hover:text-rdy-black"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ViewSwitcher />
            <span className="text-sm text-rdy-gray-400">{userEmail}</span>
            <Link href="/dashboard" className="text-sm text-rdy-gray-500 hover:text-rdy-black">
              Dashboard
            </Link>
            <Link
              href="/api/auth/signout"
              className="rounded-lg border border-rdy-gray-200 px-3 py-1.5 text-sm text-rdy-gray-500 transition-colors hover:bg-rdy-gray-100"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
