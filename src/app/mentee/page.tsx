'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Mentee Home Page - Redirects to Daily Calendar View
 *
 * Per S6.8 acceptance criteria: "Daily view as default for mentees"
 * The mentee home page redirects to the calendar page which shows the daily view.
 */
export default function MenteeHomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the daily calendar view as the default for mentees
    router.replace('/mentee/calendar');
  }, [router]);

  // Show a brief loading state during redirect
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rdy-orange-500 border-t-transparent" />
        <p className="text-rdy-gray-400">Loading...</p>
      </div>
    </div>
  );
}
