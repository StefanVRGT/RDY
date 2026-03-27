'use client';

import { Menu, Bell, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  showNotifications?: boolean;
  onMenuClick?: () => void;
  className?: string;
}

export function MobileHeader({
  title,
  showBack = false,
  showMenu = false,
  showNotifications = false,
  onMenuClick,
  className,
}: MobileHeaderProps) {
  const router = useRouter();

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 border-b border-rdy-gray-200 bg-background/95 backdrop-blur-sm safe-area-inset-top',
        className
      )}
    >
      <div className="flex h-14 items-center justify-between px-4 pt-safe">
        {/* Left side */}
        <div className="flex min-w-[48px] items-center">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-full text-rdy-gray-500 transition-colors hover:bg-rdy-gray-100 hover:text-rdy-black"
              aria-label="Go back"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {showMenu && !showBack && (
            <button
              onClick={onMenuClick}
              className="flex h-10 w-10 items-center justify-center rounded-full text-rdy-gray-500 transition-colors hover:bg-rdy-gray-100 hover:text-rdy-black"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Center - Title */}
        <h1 className="flex-1 truncate text-center text-lg font-semibold text-rdy-black">
          {title}
        </h1>

        {/* Right side */}
        <div className="flex min-w-[48px] items-center justify-end">
          {showNotifications && (
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full text-rdy-gray-500 transition-colors hover:bg-rdy-gray-100 hover:text-rdy-black"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
