import webpush from 'web-push';
import { configureWebPush } from './config';

/**
 * Payload structure for push notifications
 */
export type PushNotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
};

/**
 * Push subscription keys structure (from browser)
 */
export type PushSubscriptionKeys = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Send a push notification to a subscription
 * Returns true on success, false on failure
 */
export async function sendPushNotification(
  subscription: PushSubscriptionKeys,
  payload: PushNotificationPayload
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  // Ensure web-push is configured
  if (!configureWebPush()) {
    return { success: false, error: 'VAPID keys not configured' };
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return { success: true };
  } catch (error) {
    const webpushError = error as { statusCode?: number; message?: string };

    // Handle specific error cases
    if (webpushError.statusCode === 410 || webpushError.statusCode === 404) {
      // Subscription is no longer valid - should be removed from DB
      return {
        success: false,
        error: 'Subscription expired or invalid',
        statusCode: webpushError.statusCode,
      };
    }

    return {
      success: false,
      error: webpushError.message || 'Unknown error',
      statusCode: webpushError.statusCode,
    };
  }
}
