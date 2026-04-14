import { signOut } from '@/auth';

export async function GET() {
  const keycloakIssuer = process.env.AUTH_KEYCLOAK_ISSUER;
  const clientId = process.env.AUTH_KEYCLOAK_ID;
  const appUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  const postLogoutRedirectUri = `${appUrl}/auth/signin`;

  const keycloakLogoutUrl = `${keycloakIssuer}/protocol/openid-connect/logout?client_id=${encodeURIComponent(clientId!)}&post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`;

  await signOut({ redirectTo: keycloakLogoutUrl });
}
