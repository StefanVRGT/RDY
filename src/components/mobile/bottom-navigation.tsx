'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Calendar,
  User,
  Clock,
  Users,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useViewContext, type ViewMode } from '@/components/providers';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const mentorNavItems: NavItem[] = [
  { href: '/mentor', label: 'Home', icon: Home },
  { href: '/mentor/calendar', label: 'Calendar', icon: Calendar },
  { href: '/mentor/availability', label: 'Availability', icon: Clock },
  { href: '/mentor/classes', label: 'Classes', icon: Users },
  { href: '/mentor/profile', label: 'Profile', icon: User },
];

const menteeNavItems: NavItem[] = [
  { href: '/mentee/calendar', label: 'Today', icon: Home },
  { href: '/mentee/calendar/weekly', label: 'Week', icon: Calendar },
  { href: '/mentee/calendar/tracking', label: 'Reflect', icon: Target },
  { href: '/mentee/profile', label: 'Profile', icon: User },
];

function getNavItemsForView(view: ViewMode): NavItem[] {
  switch (view) {
    case 'mentor':
      return mentorNavItems;
    case 'mentee':
      return menteeNavItems;
    case 'admin':
      // Admins viewing mobile would default to mentor view
      return mentorNavItems;
    default:
      return menteeNavItems;
  }
}

interface BottomNavigationProps {
  className?: string;
}

export function BottomNavigation({ className }: BottomNavigationProps) {
  const pathname = usePathname();
  const { currentView } = useViewContext();
  const navItems = getNavItemsForView(currentView);

  return (
    <nav
      className={cn(
        'safe-area-inset-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-rdy-gray-200 bg-background/95 backdrop-blur-sm',
        className
      )}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="pb-safe mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/mentor' && item.href !== '/mentee' && item.href !== '/mentee/calendar' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-[64px] flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors',
                isActive ? 'text-rdy-orange-500' : 'text-rdy-gray-400 hover:text-rdy-gray-600'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-colors',
                  isActive ? 'text-rdy-orange-500' : 'text-rdy-gray-400'
                )}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
