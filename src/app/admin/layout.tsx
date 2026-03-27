import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/admin');
  }

  const hasAdminAccess =
    session.user.roles?.includes('admin') || session.user.roles?.includes('superadmin');
  if (!hasAdminAccess) {
    redirect('/auth/error?error=AccessDenied');
  }

  return (
    <AppShell role="admin" userEmail={session.user.email ?? ''}>
      {children}
    </AppShell>
  );
}
