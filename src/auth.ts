import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';
import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';

// Define the user roles
export type UserRole = 'superadmin' | 'admin' | 'mentor' | 'mentee';

// Extend the built-in types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roles: UserRole[];
    };
    accessToken?: string;
  }

  interface User {
    id: string;
    email: string;
    name: string;
    roles: UserRole[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    roles: UserRole[];
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
  }
}

// Helper to extract roles from Keycloak token
function extractRolesFromToken(token: Record<string, unknown>): UserRole[] {
  const validRoles: UserRole[] = ['superadmin', 'admin', 'mentor', 'mentee'];

  // Try realm_access first (where Keycloak typically stores realm roles)
  const realmAccess = token.realm_access as { roles?: string[] } | undefined;
  if (realmAccess?.roles) {
    return realmAccess.roles.filter((role): role is UserRole =>
      validRoles.includes(role as UserRole)
    );
  }

  // Try resource_access for client-specific roles
  const resourceAccess = token.resource_access as Record<string, { roles?: string[] }> | undefined;
  const clientId = process.env.AUTH_KEYCLOAK_ID || 'rdy-app';
  if (resourceAccess?.[clientId]?.roles) {
    return resourceAccess[clientId].roles.filter((role): role is UserRole =>
      validRoles.includes(role as UserRole)
    );
  }

  // Fallback to checking groups claim
  const groups = token.groups as string[] | undefined;
  if (groups) {
    return groups
      .map((group) => group.replace(/^\//, '').toLowerCase())
      .filter((role): role is UserRole => validRoles.includes(role as UserRole));
  }

  return [];
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }): Promise<JWT> {
      // Initial sign in
      if (account && profile) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : undefined;
        token.id = (profile.sub as string) || '';
        token.email = (profile.email as string) || '';
        token.name = (profile.name as string) || (profile.preferred_username as string) || '';

        // Extract roles from the access token or profile
        const accessTokenPayload = account.access_token
          ? JSON.parse(Buffer.from(account.access_token.split('.')[1], 'base64').toString())
          : {};

        token.roles = extractRolesFromToken(accessTokenPayload);

        // If no roles from access token, try profile
        if (token.roles.length === 0) {
          token.roles = extractRolesFromToken(profile as Record<string, unknown>);
        }
      }

      return token;
    },
    async session({ session, token }): Promise<Session> {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.roles = token.roles || [];
      }
      session.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
});

// Helper function to check if user has any of the specified roles
export function hasRole(userRoles: UserRole[], requiredRoles: UserRole[]): boolean {
  return requiredRoles.some((role) => userRoles.includes(role));
}

// Helper function to check if user has all of the specified roles
export function hasAllRoles(userRoles: UserRole[], requiredRoles: UserRole[]): boolean {
  return requiredRoles.every((role) => userRoles.includes(role));
}
