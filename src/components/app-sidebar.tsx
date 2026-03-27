'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Dumbbell,
  GraduationCap,
  Users,
  Mail,
  BarChart2,
  Settings,
  MessageSquare,
  Home,
  Calendar,
  Clock,
  Video,
  Sun,
  CalendarPlus,
  User,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Eye,
  HelpCircle,
  Smartphone,
} from 'lucide-react';
import { useInstallPrompt } from '@/lib/hooks/use-install-prompt';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useSidebarContext } from '@/components/providers/sidebar-context';
import { useViewContext, type ViewMode } from '@/components/providers/view-context';

export type SidebarRole = 'admin' | 'mentor' | 'mentee';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const adminSections: NavSection[] = [
  {
    items: [{ href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'CONTENT',
    items: [
      { href: '/admin/program-builder', label: 'RDY Program', icon: BookOpen },
      { href: '/admin/exercises', label: 'Exercises', icon: Dumbbell },
      { href: '/admin/classes', label: 'Classes', icon: GraduationCap },
    ],
  },
  {
    label: 'PEOPLE',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/invitations', label: 'Invitations', icon: Mail },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [{ href: '/admin/analytics', label: 'Analytics', icon: BarChart2 }],
  },
  {
    label: 'AI',
    items: [
      { href: '/admin/ai-settings', label: 'AI Settings', icon: Settings },
      { href: '/admin/ai-prompts', label: 'AI Prompts', icon: MessageSquare },
    ],
  },
];

const mentorSections: NavSection[] = [
  {
    items: [
      { href: '/mentor', label: 'Home', icon: Home },
      { href: '/mentor/calendar', label: 'Calendar', icon: Calendar },
      { href: '/mentor/classes', label: 'Classes', icon: Users },
      { href: '/mentor/group-sessions', label: 'Group Sessions', icon: Video },
      { href: '/mentor/availability', label: 'Availability', icon: Clock },
      { href: '/mentor/analytics', label: 'Analytics', icon: BarChart2 },
    ],
  },
];

const menteeSections: NavSection[] = [
  {
    items: [
      { href: '/mentee/calendar', label: 'Today', icon: Sun },
      { href: '/mentee/calendar/weekly', label: 'Week', icon: Calendar },
      { href: '/mentee/calendar/tracking', label: 'Reflect', icon: BookOpen },
      { href: '/mentee/booking', label: 'Booking', icon: CalendarPlus },
      { href: '/mentee/profile', label: 'Profile', icon: User },
    ],
  },
];

function getSectionsForRole(role: SidebarRole): NavSection[] {
  switch (role) {
    case 'admin':
      return adminSections;
    case 'mentor':
      return mentorSections;
    case 'mentee':
      return menteeSections;
  }
}

const roleHomeUrls: Record<ViewMode, string> = {
  admin: '/admin/dashboard',
  mentor: '/mentor',
  mentee: '/mentee/calendar',
};

interface AppSidebarProps {
  role: SidebarRole;
  userEmail: string;
}

function isNavItemActive(href: string, pathname: string): boolean {
  // Exact match for root-level role paths
  if (href === '/mentor' || href === '/mentee' || href === '/admin/dashboard') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(href + '/');
}

export function AppSidebar({ role, userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, toggleSidebar, closeSidebar } = useSidebarContext();
  const { availableViews, setCurrentView } = useViewContext();
  const [collapsed, setCollapsed] = useState(false);
  const { isInstalled, isIOS, canInstallNatively, install } = useInstallPrompt();

  const sections = getSectionsForRole(role);

  function handleViewSwitch(view: ViewMode) {
    setCurrentView(view);
    router.push(roleHomeUrls[view]);
    closeSidebar();
  }

  // Shared nav content — rendered in both mobile drawer and desktop sidebar
  function renderNav(mobile = false) {
    const isExpanded = mobile || !collapsed;

    return (
      <div className={cn('flex flex-col h-full bg-background')}>
        {/* Header: logo + collapse/close button */}
        <div
          className={cn(
            'flex items-center border-b border-rdy-gray-200 px-4 py-4 min-h-[64px]',
            !isExpanded && 'justify-center px-0'
          )}
        >
          {isExpanded && (
            <span className="flex-1 text-lg font-bold text-rdy-black tracking-widest">RDY</span>
          )}
          {mobile ? (
            <button
              onClick={closeSidebar}
              className="p-1 text-rdy-gray-400 hover:text-rdy-black transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="p-1 text-rdy-gray-400 hover:text-rdy-black transition-colors"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-4">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {/* Section label — only when expanded */}
              {section.label && isExpanded && (
                <p className="px-4 mb-1 text-xs font-semibold uppercase tracking-widest text-rdy-gray-400">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isNavItemActive(item.href, pathname);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={mobile ? closeSidebar : undefined}
                      title={!isExpanded ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-3 py-2.5 text-sm font-medium uppercase tracking-wide transition-colors border-l-2',
                        isExpanded ? 'px-4' : 'justify-center px-0',
                        active
                          ? 'border-rdy-orange-500 text-rdy-orange-500 bg-orange-100'
                          : 'border-transparent text-rdy-gray-500 hover:text-rdy-black hover:bg-rdy-gray-50'
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {isExpanded && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* View switcher — only when expanded and user has multiple views */}
        {isExpanded && availableViews.length > 1 && (
          <div className="border-t border-rdy-gray-200 p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-rdy-gray-400 mb-2">
              Switch View
            </p>
            {availableViews.map((view) => (
              <button
                key={view}
                onClick={() => handleViewSwitch(view)}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors',
                  view === role
                    ? 'text-rdy-orange-500 bg-orange-100'
                    : 'text-rdy-gray-500 hover:text-rdy-black hover:bg-rdy-gray-50'
                )}
              >
                <Eye className="h-4 w-4 flex-shrink-0" />
                <span className="capitalize">{view} View</span>
              </button>
            ))}
          </div>
        )}

        {/* User + sign out */}
        <div className="border-t border-rdy-gray-200 p-4 space-y-2">
          <Link
            href={`/${role}/help`}
            title="User Manual"
            className={cn(
              'flex items-center gap-3 py-2 text-sm font-medium uppercase tracking-wide transition-colors text-rdy-gray-400 hover:text-rdy-black',
              !isExpanded && 'justify-center',
              pathname === `/${role}/help` && 'text-rdy-black'
            )}
          >
            <HelpCircle className="h-5 w-5 flex-shrink-0" />
            {isExpanded && <span>Help</span>}
          </Link>

          {/* Install App — hidden once installed or on iOS (manual process) */}
          {!isInstalled && (canInstallNatively || isIOS) && (
            <button
              onClick={canInstallNatively ? install : undefined}
              title={isIOS ? 'Tap Share ↑ → Add to Home Screen' : 'Install App'}
              className={cn(
                'flex items-center gap-3 py-2 text-sm font-medium uppercase tracking-wide transition-colors text-rdy-orange-500 hover:text-rdy-orange-600 w-full text-left',
                !isExpanded && 'justify-center'
              )}
            >
              <Smartphone className="h-5 w-5 flex-shrink-0" />
              {isExpanded && (
                <span>{isIOS ? 'Add to Home Screen' : 'Install App'}</span>
              )}
            </button>
          )}
          {isExpanded && (
            <>
              <p className="text-xs text-rdy-gray-400 truncate">{userEmail}</p>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="w-full rounded-lg border border-rdy-gray-200 px-3 py-1.5 text-sm text-rdy-gray-500 transition-colors hover:bg-rdy-gray-100 text-left"
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: floating hamburger button (always visible, outside drawer) */}
      <button
        className="fixed top-4 left-4 z-40 p-2 rounded-lg bg-background/90 backdrop-blur-sm shadow-sm border border-rdy-gray-200 lg:hidden"
        onClick={toggleSidebar}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5 text-rdy-black" />
      </button>

      {/* Mobile: overlay drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          aria-modal="true"
          role="dialog"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-rdy-black/50"
            onClick={closeSidebar}
          />
          {/* Drawer panel */}
          <div
            className="absolute left-0 top-0 h-full w-64 shadow-xl border-r border-rdy-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {renderNav(true)}
          </div>
        </div>
      )}

      {/* Desktop: persistent sidebar */}
      <div
        className={cn(
          'hidden lg:flex flex-col h-screen sticky top-0 border-r border-rdy-gray-200 overflow-hidden transition-all duration-200 flex-shrink-0',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {renderNav(false)}
      </div>
    </>
  );
}
