// src/services/auth.js
import { signOut as firebaseSignOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseAuth } from './firebase';

// Keys that belong to our app session — cleared on logout
const SESSION_KEYS = ['current_user', 'last_used_email', 'user_type', 'session_token'];

/**
 * Clears all app-level AsyncStorage session keys.
 * Called on every logout path so the app always returns to Welcome.
 */
const clearAppSession = async () => {
  try {
    // Remove known session keys
    await AsyncStorage.multiRemove(SESSION_KEYS);

    // Also sweep for any firebase-prefixed keys
    const allKeys = await AsyncStorage.getAllKeys();
    const firebaseKeys = allKeys.filter(k =>
      k.includes('firebase') ||
      k.includes('firebaseLocalStorage') ||
      k.startsWith('@firebase')
    );
    if (firebaseKeys.length > 0) {
      await AsyncStorage.multiRemove(firebaseKeys);
    }

    console.log('✅ App session cleared from AsyncStorage');
  } catch (e) {
    console.warn('AsyncStorage clear error (non-fatal):', e.message);
  }
};

/**
 * Sign out the current user.
 * Always clears AsyncStorage regardless of whether Firebase Auth succeeds,
 * so the AuthContext loading screen routes back to Welcome every time.
 */
export const signOut = async () => {
  try {
    console.log('🔓 Attempting to sign out...');

    // 1. Clear our own session data first (so the app resets even if Firebase fails)
    await clearAppSession();

    // 2. Attempt Firebase sign-out
    const authInstance = getFirebaseAuth();
    if (authInstance) {
      try {
        await firebaseSignOut(authInstance);
        console.log('✅ Firebase sign-out successful');
      } catch (firebaseError) {
        // Firebase sign-out failing is non-fatal — session is already cleared
        console.warn('Firebase signOut error (non-fatal):', firebaseError.message);
      }
    } else {
      console.warn('⚠️ Firebase Auth unavailable — session cleared via AsyncStorage only');
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Sign Out Error:', error);
    // Last-resort cleanup
    await clearAppSession().catch(() => {});
    return { success: false, error: error.message };
  }
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  const authInstance = getFirebaseAuth();
  return authInstance?.currentUser ?? null;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  const authInstance = getFirebaseAuth();
  return authInstance?.currentUser !== null;
};