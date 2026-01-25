import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DashboardContent } from '@/components/dashboard-content';

export default async function DashboardPage() {
  const session = await auth();

  // This should be handled by middleware, but double-check here
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/dashboard');
  }

  const { user } = session;

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl">
        <DashboardContent user={user} />
      </div>
    </div>
  );
}
