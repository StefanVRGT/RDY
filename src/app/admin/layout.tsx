import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AdminHeader } from '@/components/admin-header';

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
    <div className="min-h-screen bg-white">
      <AdminHeader
        title="Admin"
        userEmail={session.user.email}
        navLinks={[
          { href: '/admin/dashboard', label: 'Dashboard' },
          { href: '/admin/analytics', label: 'Analytics' },
          { href: '/admin/users', label: 'Users' },
          { href: '/admin/classes', label: 'Classes' },
          { href: '/admin/ai-settings', label: 'AI Settings' },
          { href: '/admin/ai-prompts', label: 'AI Prompts' },
        ]}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
