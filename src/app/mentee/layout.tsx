import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function MenteeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  // All authenticated users can access mentee views
  return <>{children}</>;
}
