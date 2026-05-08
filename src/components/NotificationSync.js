// src/components/NotificationSync.js
import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

/**
 * This component syncs the authentication state with the notification system.
 * It listens to auth changes and updates the NotificationContext accordingly.
 *
 * FIX: Firebase Auth may not initialise properly (Component auth has not been
 * registered yet), so `user` can be null even when the session is valid.
 * We fall back to userProfile?.uid which is always populated from AsyncStorage.
 */
export default function NotificationSync() {
  const { user, userProfile } = useAuth();
  const { setUserId } = useNotification();

  useEffect(() => {
    // FIX: prefer Firebase Auth uid, fall back to AsyncStorage-persisted uid
    const resolvedUid = user?.uid || userProfile?.uid || null;

    if (resolvedUid) {
      console.log('🔄 NotificationSync: Syncing user ID to NotificationContext:', resolvedUid);
      setUserId(resolvedUid);
    } else {
      console.log('🔄 NotificationSync: Clearing user ID from NotificationContext');
      setUserId(null);
    }
  }, [user?.uid, userProfile?.uid, setUserId]);

  return null; // This component doesn't render anything
}