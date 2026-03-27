'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser } from './user-context';

export type ViewMode = 'admin' | 'mentor' | 'mentee';

interface ViewContextValue {
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  availableViews: ViewMode[];
  isViewingAs: (view: ViewMode) => boolean;
}

const VIEW_STORAGE_KEY = 'rdy-view-mode';

const ViewContext = createContext<ViewContextValue | null>(null);

export function ViewProvider({ children }: { children: React.ReactNode }) {
  const { user, hasRole } = useUser();
  const [currentView, setCurrentViewState] = useState<ViewMode>('mentee');
  const [isHydrated, setIsHydrated] = useState(false);

  // Determine available views based on user roles
  const availableViews: ViewMode[] = (() => {
    if (!user) return [];

    const views: ViewMode[] = [];

    // Superadmins can switch to Admin, Mentor, and Mentee views
    if (hasRole('superadmin')) {
      views.push('admin', 'mentor', 'mentee');
    }
    // Admins can switch between Admin, Mentor and Mentee views
    else if (hasRole('admin')) {
      views.push('admin', 'mentor', 'mentee');
    }
    // Mentors only see mentor and mentee views (no switcher needed for them in this context)
    else if (hasRole('mentor')) {
      views.push('mentor', 'mentee');
    }
    // Mentees only have mentee view
    else {
      views.push('mentee');
    }

    return views;
  })();

  // Load view from localStorage on mount (client-side only)
  useEffect(() => {
    const savedView = localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode | null;
    if (savedView && availableViews.includes(savedView)) {
      setCurrentViewState(savedView);
    } else if (availableViews.length > 0 && !availableViews.includes(currentView)) {
      // Default to first available view if current view is not allowed
      setCurrentViewState(availableViews[0]);
    }
    setIsHydrated(true);
  }, [availableViews, currentView]);

  // Set current view and persist to localStorage
  const setCurrentView = useCallback(
    (view: ViewMode) => {
      if (availableViews.includes(view)) {
        setCurrentViewState(view);
        localStorage.setItem(VIEW_STORAGE_KEY, view);
      }
    },
    [availableViews]
  );

  // Check if currently viewing as a specific role
  const isViewingAs = useCallback(
    (view: ViewMode): boolean => {
      return currentView === view;
    },
    [currentView]
  );

  const value: ViewContextValue = {
    currentView,
    setCurrentView,
    availableViews,
    isViewingAs,
  };

  // Prevent hydration mismatch by not rendering children until hydrated
  // But we still render the provider to avoid context errors
  if (!isHydrated) {
    return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
  }

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}

export function useViewContext(): ViewContextValue {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error('useViewContext must be used within a ViewProvider');
  }
  return context;
}
