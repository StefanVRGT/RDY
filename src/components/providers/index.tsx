'use client';

import { SessionProvider } from './session-provider';
import { UserProvider } from './user-context';
import { ViewProvider } from './view-context';
import { TRPCProvider } from './trpc-provider';
import { ThemeProvider } from './theme-provider';
import { LanguageProvider } from './language-context';
import { ServiceWorkerRegistration, InstallPrompt } from '@/components/pwa';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <TRPCProvider>
        <SessionProvider>
          <UserProvider>
            <LanguageProvider>
              <ViewProvider>
                <ServiceWorkerRegistration />
                {children}
                <InstallPrompt />
              </ViewProvider>
            </LanguageProvider>
          </UserProvider>
        </SessionProvider>
      </TRPCProvider>
    </ThemeProvider>
  );
}

export { SessionProvider } from './session-provider';
export { UserProvider, useUser } from './user-context';
export { ViewProvider, useViewContext } from './view-context';
export type { ViewMode } from './view-context';
export { TRPCProvider } from './trpc-provider';
export { ThemeProvider } from './theme-provider';
export { LanguageProvider, useLanguage } from './language-context';
export type { Language } from './language-context';
