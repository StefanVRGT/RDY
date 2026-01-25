import { auth } from '@/auth';
import Link from 'next/link';

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold text-white">RDY</h1>
        <p className="text-gray-400">Mentorship Program Course Tracking</p>

        {session?.user ? (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-lg bg-gray-900 p-6 text-center">
              <p className="text-lg text-white">
                Welcome, {session.user.name || session.user.email}
              </p>
              <p className="mt-2 text-sm text-gray-400">{session.user.email}</p>
              {session.user.roles.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {session.user.roles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full bg-purple-600/20 px-3 py-1 text-xs font-medium text-purple-300"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className="rounded-lg bg-purple-600 px-6 py-2 text-white transition-colors hover:bg-purple-700"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/api/auth/signout"
                className="rounded-lg border border-gray-700 px-6 py-2 text-gray-300 transition-colors hover:bg-gray-800"
              >
                Sign Out
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-gray-400">Sign in to access the platform</p>
            <Link
              href="/auth/signin"
              className="rounded-lg bg-purple-600 px-6 py-3 text-white transition-colors hover:bg-purple-700"
            >
              Sign In
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
