'use server';

import { signOut } from '@/auth';

export async function signOutAction() {
  const keycloakIssuer = process.env.AUTH_KEYCLOAK_ISSUER;
  const clientId = process.env.AUTH_KEYCLOAK_ID;
  const appUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (!appUrl) throw new Error('AUTH_URL or NEXTAUTH_URL env var must be set');
  const postLogoutRedirectUri = `${appUrl}/auth/signin`;

  const keycloakLogoutUrl = `${keycloakIssuer}/protocol/openid-connect/logout?client_id=${encodeURIComponent(clientId!)}&post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;

  await signOut({ redirectTo: keycloakLogoutUrl });
}
