'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You do not have permission to access this resource.',
    Verification: 'The verification link may have expired or already been used.',
    OAuthSignin: 'Error starting the OAuth sign in process.',
    OAuthCallback: 'Error during the OAuth callback.',
    OAuthCreateAccount: 'Could not create OAuth account.',
    EmailCreateAccount: 'Could not create email account.',
    Callback: 'Error in the callback handler.',
    OAuthAccountNotLinked: 'The email is already linked to another account.',
    SessionRequired: 'Please sign in to access this page.',
    Default: 'An unexpected authentication error occurred.',
  };

  const errorMessage = error
    ? errorMessages[error] || errorMessages.Default
    : errorMessages.Default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-rdy-gray-100 p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <svg
              className="h-6 w-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-rdy-black">Authentication Error</h1>
          <p className="mt-2 text-rdy-gray-400">{errorMessage}</p>
          {error && (
            <p className="mt-1 text-sm text-rdy-gray-500">
              Error code: <code className="rounded bg-rdy-gray-200 px-1 py-0.5">{error}</code>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/auth/signin"
            className="flex w-full items-center justify-center rounded-lg bg-rdy-orange-500 px-4 py-3 text-white transition-colors hover:bg-rdy-orange-600 focus:outline-none focus:ring-2 focus:ring-rdy-orange-500 focus:ring-offset-2"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="flex w-full items-center justify-center rounded-lg border border-rdy-gray-200 px-4 py-3 text-rdy-gray-600 transition-colors hover:bg-rdy-gray-100 focus:outline-none focus:ring-2 focus:ring-rdy-gray-400 focus:ring-offset-2"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-rdy-black">Loading...</div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
