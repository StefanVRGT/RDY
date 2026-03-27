'use client';

import { createContext, useContext, useState } from 'react';

interface SidebarContextValue {
  hasSidebar: boolean;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const defaultValue: SidebarContextValue = {
  hasSidebar: false,
  sidebarOpen: false,
  toggleSidebar: () => {},
  closeSidebar: () => {},
};

const SidebarContext = createContext<SidebarContextValue>(defaultValue);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SidebarContext.Provider
      value={{
        hasSidebar: true,
        sidebarOpen,
        toggleSidebar: () => setSidebarOpen((prev) => !prev),
        closeSidebar: () => setSidebarOpen(false),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext(): SidebarContextValue {
  return useContext(SidebarContext);
}
