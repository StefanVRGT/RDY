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
    <div className="flex min-h-screen items-center justify-center bg-rdy-white">
      <div className="rdy-content-width px-rdy-lg text-center space-y-rdy-2xl">
        {/* RDY Logo */}
        <div className="space-y-rdy-md">
          <h1 className="text-[60px] font-bold text-rdy-black tracking-wider">
            RDY
          </h1>
          <p className="rdy-subtitle">SIGN IN TO CONTINUE</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-rdy-error/10 rounded-lg p-rdy-md">
            <p className="text-rdy-sm text-rdy-error">
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

        {/* Sign In Button - RDY Style */}
        <div className="space-y-rdy-md">
          <button
            onClick={handleSignIn}
            className="w-full py-rdy-lg text-rdy-lg uppercase font-bold text-rdy-orange-500 active:opacity-60 transition-opacity"
          >
            SIGN IN →
          </button>

          {/* Optional: Additional info */}
          <p className="rdy-body text-rdy-gray-400">
            Secure authentication via Keycloak
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-rdy-white">
          <div className="w-10 h-10 rounded-full bg-rdy-orange-500 animate-pulse" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
