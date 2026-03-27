'use client';

import { cn } from '@/lib/utils';
import { BottomNavigation } from './bottom-navigation';
import { MobileHeader } from './mobile-header';
import { useSidebarContext } from '@/components/providers/sidebar-context';
import { useCallback } from 'react';

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showHeader?: boolean;
  showBack?: boolean;
  showMenu?: boolean;
  showNotifications?: boolean;
  showBottomNav?: boolean;
  onMenuClick?: () => void;
  className?: string;
  contentClassName?: string;
}

export function MobileLayout({
  children,
  title = 'RDY',
  showHeader = true,
  showBack = false,
  showMenu = false,
  showNotifications = false,
  showBottomNav = true,
  onMenuClick,
  className,
  contentClassName,
}: MobileLayoutProps) {
  const { hasSidebar, toggleSidebar } = useSidebarContext();
  const shouldShowBottomNav = showBottomNav && !hasSidebar;
  const handleMenuClick = useCallback(
    () => (onMenuClick ? onMenuClick() : toggleSidebar()),
    [onMenuClick, toggleSidebar]
  );

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col bg-background text-rdy-black',
        className
      )}
    >
      {/* Mobile Header */}
      {showHeader && (
        <MobileHeader
          title={title}
          showBack={showBack}
          showMenu={showMenu}
          showNotifications={showNotifications}
          onMenuClick={handleMenuClick}
        />
      )}

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 overflow-y-auto',
          showHeader && 'pt-14 pt-safe-offset-14',
          shouldShowBottomNav && 'pb-16 pb-safe-offset-16',
          contentClassName
        )}
      >
        {children}
      </main>

      {/* Bottom Navigation */}
      {shouldShowBottomNav && <BottomNavigation />}
    </div>
  );
}
