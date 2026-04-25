// src/components/NotificationSync.js
import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

/**
 * This component syncs the authentication state with the notification system.
 * It listens to auth changes and updates the NotificationContext accordingly.
 */
export default function NotificationSync() {
  const { user } = useAuth();
  const { setUserId } = useNotification();

  useEffect(() => {
    // Sync user ID with NotificationContext when auth changes
    if (user) {
      console.log('🔄 NotificationSync: Syncing user ID to NotificationContext:', user.uid);
      setUserId(user.uid);
    } else {
      console.log('🔄 NotificationSync: Clearing user ID from NotificationContext');
      setUserId(null);
    }
  }, [user, setUserId]);

  return null; // This component doesn't render anything
}