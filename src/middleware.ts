import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// Define routes that don't require authentication
const publicRoutes = ['/', '/auth/signin', '/auth/error', '/api/auth', '/api/reminders', '/api/cron'];

// Define role-based route protection
// Routes are matched by prefix - e.g., '/admin' matches '/admin/users', '/admin/settings', etc.
const roleProtectedRoutes: Record<string, string[]> = {
  '/superadmin': ['superadmin'],
  '/admin': ['superadmin', 'admin'],
  '/mentor': ['superadmin', 'admin', 'mentor'],
  '/mentee': ['superadmin', 'admin', 'mentor', 'mentee'],
  '/dashboard': ['superadmin', 'admin', 'mentor', 'mentee'],
};

// Helper to check if a path is public
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => {
    if (route === '/') return pathname === '/';
    return pathname === route || pathname.startsWith(route + '/');
  });
}

// Helper to check if path matches any protected route prefix
function getRequiredRoles(pathname: string): string[] | null {
  for (const [routePrefix, roles] of Object.entries(roleProtectedRoutes)) {
    if (pathname === routePrefix || pathname.startsWith(routePrefix + '/')) {
      return roles;
    }
  }
  return null;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Redirect stale /session/ URLs to home (PWA cache artifacts)
  if (pathname.startsWith('/session/')) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Redirect unauthenticated users to sign in
  if (!session?.user) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check role-based access for protected routes
  const requiredRoles = getRequiredRoles(pathname);
  if (requiredRoles) {
    const userRoles = session.user.roles || [];
    const hasAccess = requiredRoles.some((role) => userRoles.includes(role as never));

    if (!hasAccess) {
      // User is authenticated but doesn't have required role
      const errorUrl = new URL('/auth/error', req.url);
      errorUrl.searchParams.set('error', 'AccessDenied');
      return NextResponse.redirect(errorUrl);
    }
  }

  // User is authenticated and has access
  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - api routes that don't need auth (handled in the middleware itself)
     */
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|sounds/|videos/|images/|icons/|uploads/|help/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|js|css|woff|woff2|webm|m4a|mp3|mp4|ico)$).*)',
  ],
};
