const CACHE_NAME = 'rdy-cache-v6';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip API, auth, and Next.js internal session requests
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('/auth/') ||
    event.request.url.includes('/session/')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses to avoid TypeError on non-cacheable responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request);
      })
  );
});

// Sound URLs for notification tones
const TONE_SOUNDS = {
  default: '/sounds/tingsha.webm',
  tingsha: '/sounds/tingsha.webm',
  gentle: '/sounds/tingsha.webm',
  chime: '/sounds/tingsha.webm',
  alert: '/sounds/tingsha.webm',
  silent: null, // No sound for silent
};

// Play notification sound based on tone preference
async function playNotificationSound(tone) {
  // Skip if silent or no tone specified
  if (!tone || tone === 'silent') {
    return;
  }

  const soundUrl = TONE_SOUNDS[tone];
  if (!soundUrl) {
    return;
  }

  try {
    // Use the Clients API to ask a window client to play the sound
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({
        type: 'PLAY_NOTIFICATION_SOUND',
        soundUrl: soundUrl,
        tone: tone,
      });
      return; // Only need one client to play the sound
    }
  } catch (error) {
    console.log('Could not play notification sound:', error);
  }
}

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    // If not JSON, treat as plain text
    payload = {
      title: 'RDY Notification',
      body: event.data.text(),
    };
  }

  // Extract tone from payload data
  const tone = payload.data?.tone || 'default';

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon.svg',
    badge: payload.badge || '/icons/icon.svg',
    tag: payload.tag || 'rdy-notification',
    data: { ...payload.data, tone } || { tone },
    actions: payload.actions || [],
    vibrate: tone === 'silent' ? [] : [100, 50, 100],
    requireInteraction: false,
    // Use silent: true when tone is silent (this prevents default browser sound)
    silent: tone === 'silent',
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title || 'RDY', options),
      // Play custom sound if not silent
      playNotificationSound(tone),
    ])
  );
});

// Notification click event - handle user interaction with notifications
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  // Handle action clicks
  if (action) {
    // Custom action handling can be added here
    console.log('Notification action clicked:', action);
  }

  // Determine URL to open
  const urlToOpen = data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (data.url) {
              client.navigate(urlToOpen);
            }
            return;
          }
        }
        // If no window is open, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Push subscription change event - handle subscription updates
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    // Attempt to resubscribe and update the server
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        // Send the new subscription to the server
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oldEndpoint: event.oldSubscription ? event.oldSubscription.endpoint : null,
            newSubscription: subscription.toJSON(),
          }),
        });
      })
      .catch((error) => {
        console.error('Failed to resubscribe:', error);
      })
  );
});
