import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AppShell } from '@/components/app-shell';

export default async function MentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  // Check if user has mentor, admin, or superadmin role
  const hasAccess = session.user.roles.some((role) =>
    ['mentor', 'admin', 'superadmin'].includes(role)
  );

  if (!hasAccess) {
    redirect('/auth/error?error=AccessDenied');
  }

  return (
    <AppShell role="mentor" userEmail={session.user.email ?? ''}>
      {children}
    </AppShell>
  );
}
