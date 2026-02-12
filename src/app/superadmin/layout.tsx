import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AdminHeader } from '@/components/admin-header';

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/superadmin');
  }

  if (!session.user.roles?.includes('superadmin')) {
    redirect('/auth/error?error=AccessDenied');
  }

  return (
    <div className="min-h-screen bg-white">
      <AdminHeader
        title="Superadmin"
        userEmail={session.user.email}
        navLinks={[
          { href: '/superadmin/dashboard', label: 'Dashboard' },
          { href: '/superadmin/tenants', label: 'Tenants' },
        ]}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
