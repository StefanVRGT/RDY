'use client';

import { useEffect, useCallback } from 'react';

// Audio element for playing notification sounds
let audioElement: HTMLAudioElement | null = null;

function getAudioElement(): HTMLAudioElement {
  if (!audioElement && typeof window !== 'undefined') {
    audioElement = new Audio();
    audioElement.volume = 0.7;
  }
  return audioElement!;
}

export function ServiceWorkerRegistration() {
  // Handle notification sound messages from service worker
  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === 'PLAY_NOTIFICATION_SOUND') {
      const { soundUrl, tone } = event.data;

      if (!soundUrl || tone === 'silent') {
        return;
      }

      try {
        const audio = getAudioElement();
        audio.src = soundUrl;
        audio.play().catch((error) => {
          // Autoplay might be blocked, silently fail
          console.log('Could not play notification sound:', error.message);
        });
      } catch (error) {
        console.log('Error setting up audio:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const sw = navigator.serviceWorker;

      // Listen for messages from service worker (only if addEventListener is available)
      if (typeof sw.addEventListener === 'function') {
        sw.addEventListener('message', handleServiceWorkerMessage);
      }

      // Register service worker
      sw.register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (
                  newWorker.state === 'installed' &&
                  sw.controller
                ) {
                  // New content available
                  console.log('New content available, refresh to update');
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });

      return () => {
        if (typeof sw.removeEventListener === 'function') {
          sw.removeEventListener('message', handleServiceWorkerMessage);
        }
      };
    }
  }, [handleServiceWorkerMessage]);

  return null;
}
