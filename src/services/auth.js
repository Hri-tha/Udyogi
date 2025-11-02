// src/services/auth.js
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';

/**
 * Sign out the current user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const signOut = async () => {
  try {
    console.log('🔓 Attempting to sign out...');
    await firebaseSignOut(auth);
    console.log('✅ User signed out successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Sign Out Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return auth.currentUser !== null;
};