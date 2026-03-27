'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DiaryRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/mentee/calendar/tracking'); }, [router]);
  return null;
}
