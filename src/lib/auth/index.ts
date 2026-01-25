// Re-export auth utilities
export { auth, signIn, signOut, hasRole, hasAllRoles } from '@/auth';
export type { UserRole } from '@/auth';

// Re-export user context hook
export { useUser } from '@/components/providers';

// Server-side auth helper for getting session in Server Components
import { auth } from '@/auth';

export async function getServerSession() {
  return await auth();
}

// Helper to require authentication in Server Components
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session;
}

// Helper to require specific roles in Server Components
export async function requireRole(requiredRoles: string[]) {
  const session = await requireAuth();
  const userRoles = session.user.roles || [];
  const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role as never));

  if (!hasRequiredRole) {
    throw new Error('Forbidden');
  }

  return session;
}
