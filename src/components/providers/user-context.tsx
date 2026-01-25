'use client';

import { createContext, useContext } from 'react';
import { useSession } from 'next-auth/react';
import type { UserRole } from '@/auth';

interface User {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
}

interface UserContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasAllRoles: (roles: UserRole[]) => boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  const user: User | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        roles: session.user.roles,
      }
    : null;

  const hasRole = (role: UserRole): boolean => {
    return user?.roles.includes(role) ?? false;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return roles.some((role) => user?.roles.includes(role));
  };

  const hasAllRoles = (roles: UserRole[]): boolean => {
    return roles.every((role) => user?.roles.includes(role));
  };

  const value: UserContextValue = {
    user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated' && !!user,
    hasRole,
    hasAnyRole,
    hasAllRoles,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
