import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard-header';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/dashboard');
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userEmail={session.user.email} />
      {children}
    </div>
  );
}
