'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { WeeksManagement } from './weeks-management';

function WeeksContent() {
  const searchParams = useSearchParams();
  const schwerpunktebeneId = searchParams.get('schwerpunktebeneId');

  if (!schwerpunktebeneId) {
    return (
      <div className="rounded-lg bg-yellow-900/20 p-4 text-yellow-400">
        Please select a focus area from the Focus Areas page to manage its weeks.
      </div>
    );
  }

  return <WeeksManagement schwerpunktebeneId={schwerpunktebeneId} />;
}

export default function WeeksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Weeks Management</h1>
        <p className="text-gray-400">Manage weekly themes within a focus area</p>
      </div>

      <Suspense
        fallback={
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
            Loading...
          </div>
        }
      >
        <WeeksContent />
      </Suspense>
    </div>
  );
}
