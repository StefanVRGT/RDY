'use client';

import { MobileLayout } from '@/components/mobile';
import { useUser } from '@/components/providers';
import { User, Mail, Shield } from 'lucide-react';
import Link from 'next/link';

export default function MentorProfilePage() {
  const { user } = useUser();

  return (
    <MobileLayout title="Profile">
      <div className="px-4 py-6">
        {/* Profile header */}
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-twilight-500/20">
            <User className="h-12 w-12 text-twilight-400" />
          </div>
          <h2 className="text-xl font-bold text-white">{user?.name || 'User'}</h2>
          <p className="text-gray-400">Mentor</p>
        </div>

        {/* Profile info */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-4 rounded-xl bg-gray-900 p-4">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-400">Email</p>
              <p className="text-white">{user?.email || 'Not set'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-gray-900 p-4">
            <Shield className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-400">Roles</p>
              <p className="text-white capitalize">
                {user?.roles.join(', ') || 'None'}
              </p>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <Link
          href="/api/auth/signout"
          className="block w-full rounded-xl bg-red-500/10 p-4 text-center font-medium text-red-400 transition-colors hover:bg-red-500/20"
        >
          Sign Out
        </Link>
      </div>
    </MobileLayout>
  );
}
