import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();

  // This should be handled by middleware, but double-check here
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/dashboard');
  }

  const { user } = session;

  // Route users based on their primary role
  // Mentees go directly to their calendar
  if (user.roles.includes('mentee') && !user.roles.includes('mentor') && !user.roles.includes('admin')) {
    redirect('/mentee/calendar');
  }

  // Mentors go to their dashboard
  if (user.roles.includes('mentor') && !user.roles.includes('admin')) {
    redirect('/mentor');
  }

  // Admins go to admin panel
  if (user.roles.includes('admin')) {
    redirect('/admin');
  }

  // Superadmins go to superadmin panel
  if (user.roles.includes('superadmin')) {
    redirect('/superadmin');
  }

  // Fallback: redirect to mentee area
  redirect('/mentee/calendar');
}
