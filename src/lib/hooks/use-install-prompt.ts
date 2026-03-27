'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'rdy-install-prompt-dismissed';

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true;
    setIsInstalled(standalone);

    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      // @ts-expect-error old Edge
      !window.MSStream;
    setIsIOS(iOS);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    // Clear any previous dismiss so the banner doesn't re-suppress
    localStorage.removeItem(DISMISSED_KEY);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
    return outcome === 'accepted';
  };

  /** True on Android when Chrome has a native install prompt ready */
  const canInstallNatively = !!deferredPrompt && !isIOS;

  return { isInstalled, isIOS, canInstallNatively, install };
}
