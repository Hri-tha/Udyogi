// src/services/pushNotifications.js
// Handles Expo push token registration and device-level push notifications.
// Works with Expo Go (development) and standalone builds.
//
// Setup required:
//   npx expo install expo-notifications expo-device expo-constants
//
// In app.json / app.config.js add:
//   "plugins": ["expo-notifications"]
//   For Android:  "notification": { "icon": "./assets/notification-icon.png" }
//   For iOS:      handled automatically by the plugin

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

// ── Configure how notifications appear when the app is foregrounded ──────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Register for push notifications and get Expo push token ─────────────────
export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device.');
    return null;
  }

  // Android channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1a56db',
    });

    await Notifications.setNotificationChannelAsync('jobs', {
      name: 'Job Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#16a34a',
      description: 'Notifications for job applications and tracking',
    });

    await Notifications.setNotificationChannelAsync('payments', {
      name: 'Payments',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#dc2626',
      description: 'Payment related notifications',
    });
  }

  // Check / request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission not granted.');
    return null;
  }

  // Get Expo push token
  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    let tokenData;
    if (projectId) {
      tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    } else {
      // Fallback for Expo Go without EAS config
      tokenData = await Notifications.getExpoPushTokenAsync();
    }

    console.log('📲 Expo Push Token:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

// ── Save push token to Firestore user document ───────────────────────────────
export async function savePushToken(userId, token) {
  if (!userId || !token) return;

  try {
    const db = getFirebaseDb();
    if (!db) return;

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      expoPushToken: token,
      pushTokenUpdatedAt: serverTimestamp(),
      pushEnabled: true,
    });
    console.log('✅ Push token saved for user:', userId);
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

// ── Remove push token on logout ───────────────────────────────────────────────
export async function removePushToken(userId) {
  if (!userId) return;
  try {
    const db = getFirebaseDb();
    if (!db) return;
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      expoPushToken: null,
      pushEnabled: false,
      pushTokenUpdatedAt: serverTimestamp(),
    });
    console.log('✅ Push token removed for user:', userId);
  } catch (error) {
    console.error('Error removing push token:', error);
  }
}

// ── Send a push notification via Expo Push API ───────────────────────────────
// Call this from your server or Cloud Functions.
// For client-side (dev/testing only), you can call it directly.
export async function sendPushNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken) return;

  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
    badge: 1,
    channelId: data.channelId || 'default',
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    const result = await response.json();
    console.log('📤 Push notification sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

// ── Helper: get a user's push token from Firestore ───────────────────────────
export async function getUserPushToken(userId) {
  if (!userId) return null;
  try {
    const db = getFirebaseDb();
    if (!db) return null;
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists() ? snap.data().expoPushToken : null;
  } catch (error) {
    console.error('Error getting user push token:', error);
    return null;
  }
}

// ── Send notification to a specific user by userId (fetches token first) ─────
export async function sendPushToUser(userId, title, body, data = {}) {
  const token = await getUserPushToken(userId);
  if (!token) {
    console.warn('No push token for user:', userId);
    return;
  }
  return sendPushNotification(token, title, body, data);
}

// ── Clear app badge count ─────────────────────────────────────────────────────
export async function clearBadgeCount() {
  await Notifications.setBadgeCountAsync(0);
}

// ── Set badge count ───────────────────────────────────────────────────────────
export async function setBadgeCount(count) {
  await Notifications.setBadgeCountAsync(count);
}