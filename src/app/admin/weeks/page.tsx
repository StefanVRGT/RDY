'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { WeeksManagement } from './weeks-management';

function WeeksContent() {
  const searchParams = useSearchParams();
  const schwerpunktebeneId = searchParams.get('schwerpunktebeneId');

  if (!schwerpunktebeneId) {
    return (
      <div className="rounded-lg bg-yellow-500/10 p-4 text-yellow-600">
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
        <h1 className="text-2xl font-bold text-rdy-black">Weeks Management</h1>
        <p className="text-rdy-gray-400">Manage weekly themes within a focus area</p>
      </div>

      <Suspense
        fallback={
          <div className="rounded-lg border border-rdy-gray-200 bg-rdy-gray-100 p-8 text-center text-rdy-gray-400">
            Loading...
          </div>
        }
      >
        <WeeksContent />
      </Suspense>
    </div>
  );
}
