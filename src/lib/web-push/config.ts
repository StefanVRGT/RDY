import webpush from 'web-push';

/**
 * VAPID keys configuration for Web Push API
 *
 * Keys should be stored in environment variables:
 * - NEXT_PUBLIC_VAPID_PUBLIC_KEY: Public key (used on client)
 * - VAPID_PRIVATE_KEY: Private key (server-only)
 * - VAPID_SUBJECT: Contact email (mailto: or https:)
 */
export type VapidKeys = {
  publicKey: string;
  privateKey: string;
};

/**
 * Get VAPID keys from environment variables
 * Returns null if keys are not configured
 */
export function getVapidKeys(): VapidKeys | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey };
}

/**
 * Get the VAPID subject (contact email/URL)
 */
export function getVapidSubject(): string {
  return process.env.VAPID_SUBJECT || 'mailto:admin@rdy.app';
}

/**
 * Generate new VAPID keys
 * Use this to create keys for .env configuration
 */
export function generateVapidKeys(): VapidKeys {
  const vapidKeys = webpush.generateVAPIDKeys();
  return {
    publicKey: vapidKeys.publicKey,
    privateKey: vapidKeys.privateKey,
  };
}

/**
 * Configure web-push with VAPID credentials
 * Must be called before sending push notifications
 */
export function configureWebPush(): boolean {
  const keys = getVapidKeys();

  if (!keys) {
    console.warn('VAPID keys not configured. Push notifications disabled.');
    return false;
  }

  webpush.setVapidDetails(getVapidSubject(), keys.publicKey, keys.privateKey);
  return true;
}

/**
 * Check if web push is properly configured
 */
export function isWebPushConfigured(): boolean {
  return getVapidKeys() !== null;
}
