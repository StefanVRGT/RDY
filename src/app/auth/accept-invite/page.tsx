import Link from 'next/link';
import { db } from '@/lib/db';
import { invitations, tenants } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';

interface AcceptInvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const { token } = await searchParams;

  if (!token) {
    return <InvalidInvitePage reason="No invitation token provided." />;
  }

  // Look up the invitation directly in the DB (server component — no tRPC client needed)
  const now = new Date();
  const [invitation] = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      tenantId: invitations.tenantId,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.token, token),
        eq(invitations.status, 'pending'),
        gt(invitations.expiresAt, now)
      )
    )
    .limit(1);

  if (!invitation) {
    return <InvalidInvitePage reason="This invitation link is invalid or has expired." />;
  }

  // Fetch tenant name
  const [tenant] = await db
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, invitation.tenantId))
    .limit(1);

  const tenantName = tenant?.name ?? 'RDY';
  const roleLabel = invitation.role === 'mentor' ? 'Mentor' : 'Mentee';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md px-6 text-center space-y-8">
        {/* RDY Logo */}
        <div className="space-y-2">
          <h1 className="text-[60px] font-bold text-rdy-black tracking-wider">RDY</h1>
          <p className="text-sm font-medium uppercase tracking-widest text-rdy-gray-400">
            You&apos;ve been invited
          </p>
        </div>

        {/* Invitation details */}
        <div className="rounded-xl border border-rdy-gray-200 bg-rdy-gray-100 p-6 text-left space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-rdy-gray-400">
              Organization
            </p>
            <p className="mt-1 text-lg font-semibold text-rdy-black">{tenantName}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-rdy-gray-400">Role</p>
            <p className="mt-1 text-lg font-semibold text-rdy-black">{roleLabel}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-rdy-gray-400">Email</p>
            <p className="mt-1 text-rdy-black">{invitation.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-rdy-gray-400">
            You&apos;ve been invited to join{' '}
            <span className="font-medium text-rdy-black">{tenantName}</span> as a{' '}
            <span className="font-medium text-rdy-black">{roleLabel}</span>. Click the button below
            to create your account via Keycloak.
          </p>

          {/* Sign-in link — goes to Keycloak via NextAuth */}
          <a
            href={`/api/auth/signin/keycloak?callbackUrl=${encodeURIComponent('/')}`}
            className="block w-full rounded-lg bg-rdy-orange-500 py-4 text-center text-base font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 active:opacity-60"
          >
            Create your account →
          </a>

          <Link
            href="/auth/signin"
            className="block text-sm text-rdy-gray-400 hover:text-rdy-black transition-colors"
          >
            Already have an account? Sign in instead
          </Link>
        </div>
      </div>
    </div>
  );
}

function InvalidInvitePage({ reason }: { reason: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md px-6 text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-[60px] font-bold text-rdy-black tracking-wider">RDY</h1>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6 space-y-3">
          <p className="text-base font-semibold text-red-700">Invalid Invitation</p>
          <p className="text-sm text-red-600">{reason}</p>
          <p className="text-sm text-rdy-gray-400">
            Please contact your administrator for a new invitation link.
          </p>
        </div>

        <Link
          href="/auth/signin"
          className="block w-full rounded-lg border border-rdy-gray-200 py-4 text-center text-base font-bold uppercase tracking-wider text-rdy-black transition-colors hover:bg-rdy-gray-100"
        >
          Go to Sign In
        </Link>
      </div>
    </div>
  );
}
