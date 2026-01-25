'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  const handleSignIn = () => {
    signIn('keycloak', { callbackUrl });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-gray-900 p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">RDY</h1>
          <p className="mt-2 text-gray-400">Sign in to continue</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-900/50 p-4">
            <p className="text-sm text-red-300">
              {error === 'OAuthSignin' && 'Error starting the sign in process.'}
              {error === 'OAuthCallback' && 'Error during the OAuth callback.'}
              {error === 'OAuthCreateAccount' && 'Error creating user account.'}
              {error === 'EmailCreateAccount' && 'Error creating email account.'}
              {error === 'Callback' && 'Error in the callback handler.'}
              {error === 'OAuthAccountNotLinked' && 'Email already linked to another account.'}
              {error === 'SessionRequired' && 'Please sign in to access this page.'}
              {error === 'Default' && 'An error occurred during sign in.'}
              {![
                'OAuthSignin',
                'OAuthCallback',
                'OAuthCreateAccount',
                'EmailCreateAccount',
                'Callback',
                'OAuthAccountNotLinked',
                'SessionRequired',
                'Default',
              ].includes(error) && 'An unexpected error occurred.'}
            </p>
          </div>
        )}

        <button
          onClick={handleSignIn}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-purple-600 px-4 py-3 text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
          Sign in with Keycloak
        </button>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-950">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
