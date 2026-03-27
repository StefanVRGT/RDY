import { SidebarProvider } from '@/components/providers/sidebar-context';
import { AppSidebar, type SidebarRole } from '@/components/app-sidebar';
import { TingshaPlayer } from '@/components/tingsha-player';

interface AppShellProps {
  children: React.ReactNode;
  role: SidebarRole;
  userEmail: string;
}

export function AppShell({ children, role, userEmail }: AppShellProps) {
  return (
    <SidebarProvider>
      <TingshaPlayer />
      <div className="flex min-h-screen bg-background">
        <AppSidebar role={role} userEmail={userEmail} />
        <div className="flex-1 min-w-0">
          {role === 'admin' ? (
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </main>
          ) : (
            children
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
