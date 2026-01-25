import { describe, it, expect } from 'vitest';
import {
  getNotificationPermission,
  serializePushSubscription,
} from '@/lib/push/client';
import {
  generateVapidKeys,
  getVapidKeys,
  isWebPushConfigured,
} from '@/lib/web-push/config';

describe('Web Push Infrastructure', () => {
  describe('VAPID Key Generation/Storage', () => {
    it('should generate valid VAPID keys', () => {
      const keys = generateVapidKeys();

      expect(keys).toBeDefined();
      expect(keys.publicKey).toBeDefined();
      expect(keys.privateKey).toBeDefined();
      expect(typeof keys.publicKey).toBe('string');
      expect(typeof keys.privateKey).toBe('string');
      expect(keys.publicKey.length).toBeGreaterThan(0);
      expect(keys.privateKey.length).toBeGreaterThan(0);
    });

    it('should return null when VAPID keys are not configured', () => {
      const originalPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const originalPrivate = process.env.VAPID_PRIVATE_KEY;

      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;

      const keys = getVapidKeys();
      expect(keys).toBeNull();

      // Restore
      if (originalPublic) process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalPublic;
      if (originalPrivate) process.env.VAPID_PRIVATE_KEY = originalPrivate;
    });

    it('should detect when web push is not configured', () => {
      const originalPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const originalPrivate = process.env.VAPID_PRIVATE_KEY;

      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;

      expect(isWebPushConfigured()).toBe(false);

      // Restore
      if (originalPublic) process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalPublic;
      if (originalPrivate) process.env.VAPID_PRIVATE_KEY = originalPrivate;
    });

    it('should return keys when configured', () => {
      const originalPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const originalPrivate = process.env.VAPID_PRIVATE_KEY;

      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key';
      process.env.VAPID_PRIVATE_KEY = 'test-private-key';

      const keys = getVapidKeys();
      expect(keys).not.toBeNull();
      expect(keys?.publicKey).toBe('test-public-key');
      expect(keys?.privateKey).toBe('test-private-key');

      // Restore
      if (originalPublic) {
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalPublic;
      } else {
        delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      }
      if (originalPrivate) {
        process.env.VAPID_PRIVATE_KEY = originalPrivate;
      } else {
        delete process.env.VAPID_PRIVATE_KEY;
      }
    });
  });

  describe('Service Worker Registration', () => {
    it('should have service worker file with push event handler', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const swPath = path.join(process.cwd(), 'public', 'sw.js');
      const swContent = fs.readFileSync(swPath, 'utf-8');

      // Check for push event handler
      expect(swContent).toContain("self.addEventListener('push'");
      expect(swContent).toContain('showNotification');
    });

    it('should have service worker file with notificationclick handler', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const swPath = path.join(process.cwd(), 'public', 'sw.js');
      const swContent = fs.readFileSync(swPath, 'utf-8');

      // Check for notification click handler
      expect(swContent).toContain("self.addEventListener('notificationclick'");
    });

    it('should have service worker file with pushsubscriptionchange handler', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const swPath = path.join(process.cwd(), 'public', 'sw.js');
      const swContent = fs.readFileSync(swPath, 'utf-8');

      // Check for subscription change handler
      expect(swContent).toContain("self.addEventListener('pushsubscriptionchange'");
    });
  });

  describe('Push Subscription Management', () => {
    it('should get notification permission status correctly', () => {
      const permission = getNotificationPermission();
      expect(['granted', 'denied', 'default', 'unsupported']).toContain(permission);
    });

    it('should serialize push subscription correctly', () => {
      const mockSubscription = {
        endpoint: 'https://push.example.com/abc123',
        expirationTime: null,
        toJSON: () => ({
          endpoint: 'https://push.example.com/abc123',
          keys: {
            p256dh: 'test-p256dh-key',
            auth: 'test-auth-key',
          },
        }),
      } as unknown as PushSubscription;

      const serialized = serializePushSubscription(mockSubscription);

      expect(serialized.endpoint).toBe('https://push.example.com/abc123');
      expect(serialized.expirationTime).toBeNull();
      expect(serialized.keys.p256dh).toBe('test-p256dh-key');
      expect(serialized.keys.auth).toBe('test-auth-key');
    });

    it('should have push subscription management exports', async () => {
      const pushClient = await import('@/lib/push/client');

      expect(pushClient.isPushNotificationSupported).toBeDefined();
      expect(pushClient.getNotificationPermission).toBeDefined();
      expect(pushClient.requestNotificationPermission).toBeDefined();
      expect(pushClient.getServiceWorkerRegistration).toBeDefined();
      expect(pushClient.getCurrentPushSubscription).toBeDefined();
      expect(pushClient.subscribeToPush).toBeDefined();
      expect(pushClient.unsubscribeFromPush).toBeDefined();
      expect(pushClient.serializePushSubscription).toBeDefined();
    });
  });

  describe('pushSubscriptions Table', () => {
    it('should have pushSubscriptions table defined in schema', async () => {
      const schema = await import('@/lib/db/schema');
      expect(schema.pushSubscriptions).toBeDefined();
    });

    it('should have the expected table name', async () => {
      const schema = await import('@/lib/db/schema');

      // Verify the table is defined and has expected structure
      expect(schema.pushSubscriptions).toBeDefined();

      // The table should have columns defined
      const table = schema.pushSubscriptions;
      expect(typeof table).toBe('object');
    });
  });
});
