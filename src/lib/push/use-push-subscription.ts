'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  getCurrentPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  serializePushSubscription,
} from './client';
import { trpc } from '@/lib/trpc/client';

export type PushSubscriptionState = {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
};

/**
 * React hook for managing push notification subscriptions
 * Integrates with tRPC for server-side subscription storage
 */
export function usePushSubscription() {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    permission: 'unsupported',
    isSubscribed: false,
    isLoading: true,
    error: null,
  });

  const subscribeMutation = trpc.pushSubscriptions.subscribe.useMutation();
  const unsubscribeMutation = trpc.pushSubscriptions.unsubscribe.useMutation();

  // Check initial state
  useEffect(() => {
    const checkState = async () => {
      const supported = isPushNotificationSupported();
      const permission = getNotificationPermission();

      let isSubscribed = false;
      if (supported && permission === 'granted') {
        const subscription = await getCurrentPushSubscription();
        isSubscribed = !!subscription;
      }

      setState({
        isSupported: supported,
        permission,
        isSubscribed,
        isLoading: false,
        error: null,
      });
    };

    checkState();
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      const subscription = await subscribeToPush(vapidPublicKey);
      if (!subscription) {
        throw new Error('Failed to create push subscription');
      }

      // Send subscription to server
      const serialized = serializePushSubscription(subscription);
      await subscribeMutation.mutateAsync({
        ...serialized,
        userAgent: navigator.userAgent,
      });

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        permission: 'granted',
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      return false;
    }
  }, [subscribeMutation]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const subscription = await getCurrentPushSubscription();
      if (subscription) {
        // Remove from server first
        try {
          await unsubscribeMutation.mutateAsync({
            endpoint: subscription.endpoint,
          });
        } catch {
          // Server might not have the subscription, continue with local unsubscribe
        }

        // Then unsubscribe locally
        await unsubscribeFromPush();
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      return false;
    }
  }, [unsubscribeMutation]);

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}
