'use client';

/**
 * TingshaPlayer
 *
 * Listens for two types of events and plays the tingsha bell sound:
 * 1. Service worker postMessage PLAY_NOTIFICATION_SOUND — fires when a push
 *    notification arrives and the app tab is open (the SW cannot play audio
 *    itself; it asks the nearest open client to do it).
 * 2. window event 'rdy:tingsha' — any in-app code can dispatch this to ring
 *    the bell immediately (e.g. when a scheduled exercise becomes due).
 *
 * NOTE: When the phone is locked or the browser is fully closed, browsers
 * do not allow custom audio for web push. The phone's default notification
 * sound plays instead — this is a hard platform limitation.
 */

import { useEffect, useRef } from 'react';

const TINGSHA_URL = '/sounds/tingsha.webm';

export function TingshaPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = () => {
    if (!audioRef.current) return;
    // Rewind and play (handles rapid re-triggers)
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {
      // Autoplay blocked — browser requires prior user interaction.
      // Nothing we can do silently; the push notification visual still shows.
    });
  };

  useEffect(() => {
    // Listen for service worker messages
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PLAY_NOTIFICATION_SOUND') {
        play();
      }
    };

    // Listen for in-app triggers
    const handleInAppRing = () => play();

    navigator.serviceWorker?.addEventListener('message', handleSwMessage);
    window.addEventListener('rdy:tingsha', handleInAppRing);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
      window.removeEventListener('rdy:tingsha', handleInAppRing);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // Hidden audio element — preloaded so it plays instantly on trigger
    <audio
      ref={audioRef}
      src={TINGSHA_URL}
      preload="auto"
      className="hidden"
      aria-hidden="true"
    />
  );
}

/**
 * Helper: ring the tingsha bell from any client-side code.
 * Usage: ringTingsha()
 */
export function ringTingsha() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('rdy:tingsha'));
  }
}
