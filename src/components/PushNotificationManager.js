// src/components/PushNotificationManager.js
// Drop this component inside your root App.js (inside AuthProvider + NavigationContainer).
// It registers the device for push notifications, saves the token to Firestore,
// and handles tapping a push notification to navigate to the right screen.
//
// Usage in App.js:
//   <NavigationContainer ref={navigationRef}>
//     <NotificationProvider>
//       <PushNotificationManager navigationRef={navigationRef} />
//       ...rest of app
//     </NotificationProvider>
//   </NavigationContainer>

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  registerForPushNotificationsAsync,
  savePushToken,
  removePushToken,
  clearBadgeCount,
  setBadgeCount,
} from '../services/pushNotifications';

export default function PushNotificationManager({ navigationRef }) {
  const { resolvedUid, userProfile } = useAuth();
  const { unreadCount, loadNotifications } = useNotification();

  const notificationListener    = useRef(null);
  const notificationResponseListener = useRef(null);
  const lastUidRef              = useRef(null);

  // ── Register / deregister token when auth state changes ─────────────────────
  useEffect(() => {
    if (resolvedUid && resolvedUid !== lastUidRef.current) {
      lastUidRef.current = resolvedUid;

      registerForPushNotificationsAsync().then(token => {
        if (token) {
          savePushToken(resolvedUid, token);
        }
      });
    }

    if (!resolvedUid && lastUidRef.current) {
      // User logged out — remove token
      removePushToken(lastUidRef.current);
      lastUidRef.current = null;
      clearBadgeCount();
    }
  }, [resolvedUid]);

  // ── Update iOS badge count to match unread notification count ────────────────
  useEffect(() => {
    setBadgeCount(unreadCount);
  }, [unreadCount]);

  // ── Clear badge when app comes to foreground ─────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        clearBadgeCount();
        if (resolvedUid) loadNotifications();
      }
    });
    return () => sub.remove();
  }, [resolvedUid]);

  // ── Foreground notification received ─────────────────────────────────────────
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(
      notification => {
        console.log('📲 Push notification received in foreground:', notification);
        // The in-app toast (InAppNotificationBanner) handles foreground display
        // via Firestore real-time listener — no need to do anything extra here.
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
    };
  }, []);

  // ── User tapped a notification (from background / killed state) ──────────────
  useEffect(() => {
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        console.log('📲 Notification tapped, data:', data);
        handleNotificationNavigation(data);
      });

    // Handle the case where the app was launched by tapping a notification
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response?.notification?.request?.content?.data) {
        handleNotificationNavigation(response.notification.request.content.data);
      }
    });

    return () => {
      if (notificationResponseListener.current) {
        Notifications.removeNotificationSubscription(notificationResponseListener.current);
      }
    };
  }, []);

  // ── Navigation routing based on notification data ────────────────────────────
  const handleNotificationNavigation = (data) => {
    if (!navigationRef?.current || !data) return;

    const { actionType, actionId, userType } = data;
    const type = userType || userProfile?.userType;

    setTimeout(() => {
      try {
        switch (actionType) {
          case 'view_applications':
          case 'view_job_tracking':
            if (type === 'employer') {
              navigationRef.current.navigate('Applications');
            } else {
              navigationRef.current.navigate('MyJobs');
            }
            break;
          case 'view_jobs':
          case 'view_job_details':
            if (type === 'worker') {
              navigationRef.current.navigate('WorkerHome');
            }
            break;
          case 'process_payment':
          case 'pay_platform_fee':
            if (type === 'employer') {
              navigationRef.current.navigate('Home');
            }
            break;
          case 'rate_worker':
          case 'rate_employer':
            navigationRef.current.navigate('Notifications');
            break;
          case 'view_earnings':
            if (type === 'worker') {
              navigationRef.current.navigate('WorkerProfile');
            }
            break;
          default:
            // Default: open the Notifications tab
            navigationRef.current.navigate('Notifications');
            break;
        }
      } catch (navError) {
        console.error('Navigation error from push notification:', navError);
      }
    }, 500); // small delay to ensure navigator is ready
  };

  return null; // This component renders nothing
}