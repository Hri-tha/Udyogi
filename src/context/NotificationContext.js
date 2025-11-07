// src/context/NotificationContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { fetchUserNotifications, markNotificationAsRead } from '../services/database';
import { useAuth } from './AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastNotification, setToastNotification] = useState(null);
  const { user } = useAuth();

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      const result = await fetchUserNotifications(user.uid);
      if (result.success) {
        setNotifications(result.notifications);
        const unread = result.notifications.filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const showToast = (notification) => {
    setToastNotification(notification);
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToastNotification(null);
    }, 3000);
  };

  const markAsRead = async (notificationId) => {
    try {
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
    if (!user) return;

    // Set up real-time listener for new notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = {
            id: change.doc.id,
            ...change.doc.data()
          };
          
          // Show toast for new notifications (not initial load)
          if (notifications.length > 0) {
            showToast(notification);
          }
        }
      });

      // Update all notifications
      const allNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setNotifications(allNotifications);
      const unread = allNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [user]);

  const value = {
    notifications,
    unreadCount,
    toastNotification,
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