import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Home() {
  const session = await auth();

  // If user is logged in, redirect based on role
  if (session?.user) {
    const { user } = session;

    // Determine redirect path based on primary role
    if (user.roles.includes('superadmin')) {
      redirect('/superadmin');
    } else if (user.roles.includes('admin')) {
      redirect('/admin');
    } else if (user.roles.includes('mentor') && !user.roles.includes('mentee')) {
      redirect('/mentor');
    } else {
      redirect('/mentee/calendar');
    }
  }

  // Landing page for non-authenticated users - RDY Design
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-rdy-white">
      {/* Background Video - Full screen */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        >
          <source src="/videos/background.mp4" type="video/mp4" />
        </video>
        {/* Subtle white overlay for readability */}
        <div className="absolute inset-0 bg-rdy-white/40"></div>
      </div>

      {/* Content - Centered */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-rdy-lg">
        <main className="flex flex-col items-center gap-rdy-2xl text-center">
          {/* RDY Logo */}
          <div className="space-y-rdy-md">
            <h1 className="text-[80px] md:text-[120px] font-bold text-rdy-black tracking-wider">
              RDY
            </h1>
            <p className="rdy-heading-lg text-rdy-gray-500">
              START YOUR JOURNEY
            </p>
          </div>

          {/* CTA Button - Minimal RDY Style */}
          <Link
            href="/auth/signin"
            className="mt-rdy-xl px-rdy-2xl py-rdy-lg text-rdy-lg uppercase font-bold text-rdy-orange-500 active:opacity-60 transition-opacity"
          >
            BEGIN →
          </Link>
        </main>
      </div>
    </div>
  );
}
