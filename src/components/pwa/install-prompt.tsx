'use client';

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const INSTALL_PROMPT_DISMISSED_KEY = 'rdy-install-prompt-dismissed';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - iOS Safari specific
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Detect iOS
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      // @ts-expect-error - MSStream check for old Edge
      !window.MSStream;
    setIsIOS(iOS);

    // Check if user previously dismissed the prompt
    const dismissed = localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show manual install instructions
    if (iOS && !standalone) {
      // Delay showing iOS prompt
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => {
        window.removeEventListener(
          'beforeinstallprompt',
          handleBeforeInstallPrompt
        );
        clearTimeout(timer);
      };
    }

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, Date.now().toString());
  };

  // Don't show if already installed or not showing
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-20 left-4 right-4 z-50 rounded-xl bg-white p-4 shadow-lg border border-rdy-gray-200',
        'animate-in slide-in-from-bottom-4 duration-300',
        'safe-area-inset-bottom'
      )}
      role="dialog"
      aria-label="Install app prompt"
    >
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded-full p-1 text-rdy-gray-400 hover:bg-rdy-gray-100 hover:text-rdy-black"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-rdy-orange-500/10">
          <Download className="h-6 w-6 text-rdy-orange-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-rdy-black">Install RDY App</h3>
          {isIOS ? (
            <p className="mt-1 text-sm text-rdy-gray-400">
              Tap the share button{' '}
              <span className="inline-block h-4 w-4 rounded border border-rdy-gray-200 text-center text-xs leading-4">
                ↑
              </span>{' '}
              and select &quot;Add to Home Screen&quot;
            </p>
          ) : (
            <p className="mt-1 text-sm text-rdy-gray-400">
              Add to your home screen for quick access and a better experience
            </p>
          )}
        </div>
      </div>

      {!isIOS && deferredPrompt && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-lg border border-rdy-gray-200 px-4 py-2 text-sm font-medium text-rdy-gray-500 transition-colors hover:bg-rdy-gray-100"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 rounded-lg bg-rdy-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rdy-orange-600"
          >
            Install
          </button>
        </div>
      )}
    </div>
  );
}
