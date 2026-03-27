'use client';

import { signOut } from 'next-auth/react';
import { MobileLayout } from '@/components/mobile';
import { trpc } from '@/lib/trpc/client';
import { User, Mail, Shield, GraduationCap, BookOpen, Loader2 } from 'lucide-react';

export default function MenteeProfilePage() {
  const { data: profile, isLoading } = trpc.mentee.getProfile.useQuery();

  return (
    <MobileLayout title="Profile" showBack>
      <div className="px-4 py-6">
        {/* Avatar */}
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-rdy-orange-500/10">
            <User className="h-12 w-12 text-rdy-orange-500" />
          </div>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-rdy-gray-400" />
          ) : (
            <>
              <h2 className="text-xl font-bold text-rdy-black">{profile?.name || 'User'}</h2>
              <p className="text-sm text-rdy-gray-400 capitalize mt-0.5">{profile?.role}</p>
            </>
          )}
        </div>

        {/* Info cards */}
        <div className="mb-6 space-y-3">
          {/* Email */}
          <div className="flex items-center gap-4 rounded-xl bg-rdy-gray-100 p-4">
            <Mail className="h-5 w-5 flex-shrink-0 text-rdy-gray-400" />
            <div>
              <p className="text-xs text-rdy-gray-400">Email</p>
              <p className="text-rdy-black">{profile?.email || '—'}</p>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-center gap-4 rounded-xl bg-rdy-gray-100 p-4">
            <Shield className="h-5 w-5 flex-shrink-0 text-rdy-gray-400" />
            <div>
              <p className="text-xs text-rdy-gray-400">Role</p>
              <p className="text-rdy-black capitalize">{profile?.role || '—'}</p>
            </div>
          </div>

          {/* Mentor */}
          <div className="flex items-center gap-4 rounded-xl bg-rdy-gray-100 p-4">
            <User className="h-5 w-5 flex-shrink-0 text-rdy-gray-400" />
            <div>
              <p className="text-xs text-rdy-gray-400">Mentor</p>
              {isLoading ? (
                <p className="text-rdy-gray-400 text-sm">Loading…</p>
              ) : profile?.mentor ? (
                <div>
                  <p className="text-rdy-black">{profile.mentor.name}</p>
                  <p className="text-xs text-rdy-gray-400">{profile.mentor.email}</p>
                </div>
              ) : (
                <p className="text-rdy-gray-400 text-sm">Not assigned</p>
              )}
            </div>
          </div>

          {/* Courses / Classes */}
          <div className="flex items-start gap-4 rounded-xl bg-rdy-gray-100 p-4">
            <BookOpen className="h-5 w-5 flex-shrink-0 text-rdy-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-rdy-gray-400 mb-1">Enrolled Courses</p>
              {isLoading ? (
                <p className="text-rdy-gray-400 text-sm">Loading…</p>
              ) : profile?.classes?.length ? (
                <ul className="space-y-1">
                  {profile.classes.map((cls) => (
                    <li key={cls.id} className="flex items-center gap-2">
                      <GraduationCap className="h-3.5 w-3.5 text-rdy-orange-500 flex-shrink-0" />
                      <span className="text-sm text-rdy-black">{cls.name}</span>
                      <span
                        className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
                          cls.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-rdy-gray-200 text-rdy-gray-500'
                        }`}
                      >
                        {cls.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-rdy-gray-400 text-sm">No courses enrolled</p>
              )}
            </div>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="block w-full rounded-xl bg-red-500/10 p-4 text-center font-medium text-red-400 transition-colors hover:bg-red-500/20"
        >
          Sign Out
        </button>
      </div>
    </MobileLayout>
  );
}
