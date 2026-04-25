// src/context/NotificationContext.js - FIXED VERSION
import React, { createContext, useState, useContext, useEffect } from 'react';
import { fetchUserNotifications, markNotificationAsRead } from '../services/database';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastNotification, setToastNotification] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const loadNotifications = async () => {
    if (!currentUserId) return;
    
    try {
      console.log('📥 Loading notifications for user:', currentUserId);
      const result = await fetchUserNotifications(currentUserId);
      if (result.success) {
        setNotifications(result.notifications);
        const unread = result.notifications.filter(n => !n.read).length;
        setUnreadCount(unread);
        console.log('✅ Loaded notifications:', result.notifications.length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const showToast = (notification) => {
    console.log('🔔 Showing toast notification:', notification.title);
    setToastNotification(notification);
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToastNotification(null);
    }, 3000);
  };

  const markAsRead = async (notificationId) => {
    try {
      console.log('📝 Marking notification as read:', notificationId);
      const result = await markNotificationAsRead(notificationId);
      if (result.success) {
        await loadNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('📝 Marking all notifications as read');
      const unreadNotifications = notifications.filter(n => !n.read);
      for (const notification of unreadNotifications) {
        await markNotificationAsRead(notification.id);
      }
      await loadNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    if (!currentUserId) {
      console.log('⏳ No user ID set, skipping notification listener');
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    console.log('🎧 Setting up notification listener for user:', currentUserId);
    
    // Set up real-time listener for new notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUserId),
      orderBy('createdAt', 'desc')
    );

    let unsubscribe;
    try {
      unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
        const allNotifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('📨 Real-time notification update:', allNotifications.length, 'notifications');
        
        // Show toast for new notifications
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const notification = {
              id: change.doc.id,
              ...change.doc.data()
            };
            
            // Only show toast if we already have some notifications (not initial load)
            if (notifications.length > 0 && !notification.read) {
              showToast(notification);
            }
          }
        });
        
        setNotifications(allNotifications);
        const unread = allNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
      }, (error) => {
        console.error('🔥 Error in notification listener:', error);
      });
    } catch (error) {
      console.error('❌ Failed to set up notification listener:', error);
    }

    return () => {
      if (unsubscribe) {
        console.log('🔕 Cleaning up notification listener');
        unsubscribe();
      }
    };
  }, [currentUserId]);

  // Load notifications when userId changes
  useEffect(() => {
    if (currentUserId) {
      loadNotifications();
    }
  }, [currentUserId]);

  const value = {
    notifications,
    unreadCount,
    toastNotification,
    setUserId: setCurrentUserId, // Expose this function for NotificationSync component
    loadNotifications,
    markAsRead,
    markAllAsRead,
    hideToast: () => setToastNotification(null)
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};