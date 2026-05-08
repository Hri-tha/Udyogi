// src/components/InAppNotificationBanner.js
// FIXED: animation resets correctly on each new notification
import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { useNotification } from '../context/NotificationContext';

const { width } = Dimensions.get('window');

const NOTIFICATION_CONFIG = {
  application_accepted:  { icon: '🎉', color: '#16a34a', bg: '#f0fdf4' },
  application_rejected:  { icon: '😔', color: '#dc2626', bg: '#fef2f2' },
  new_application:       { icon: '📥', color: '#2563eb', bg: '#eff6ff' },
  application_update:    { icon: '📋', color: '#d97706', bg: '#fffbeb' },
  new_message:           { icon: '💬', color: '#7c3aed', bg: '#f5f3ff' },
  worker_status_update:  { icon: '🚗', color: '#ea580c', bg: '#fff7ed' },
  payment_required:      { icon: '💰', color: '#dc2626', bg: '#fef2f2' },
  payment_received:      { icon: '✅', color: '#16a34a', bg: '#f0fdf4' },
  rating_required:       { icon: '⭐', color: '#d97706', bg: '#fffbeb' },
  rating_received:       { icon: '⭐', color: '#d97706', bg: '#fffbeb' },
  job_completed:         { icon: '✅', color: '#16a34a', bg: '#f0fdf4' },
  platform_fee_due:      { icon: '💳', color: '#dc2626', bg: '#fef2f2' },
  job_cancelled:         { icon: '❌', color: '#dc2626', bg: '#fef2f2' },
  job_reminder:          { icon: '⏰', color: '#2563eb', bg: '#eff6ff' },
  general:               { icon: '🔔', color: '#2563eb', bg: '#eff6ff' },
};

const getConfig = (type) =>
  NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.general;

export default function InAppNotificationBanner({ onPress }) {
  const { toastNotification, hideToast } = useNotification();

  const slideY        = useRef(new Animated.Value(-120)).current;
  const opacity       = useRef(new Animated.Value(0)).current;
  const progressAnim  = useRef(new Animated.Value(1)).current;
  const autoHideTimer = useRef(null);
  const isVisible     = useRef(false);
  // Keep a stable ref to the current notification so callbacks don't stale-close
  const currentNotifRef = useRef(null);

  const slideIn = useCallback(() => {
    // Always reset to hidden position before animating in
    slideY.setValue(-120);
    opacity.setValue(0);
    progressAnim.setValue(1);

    Animated.parallel([
      Animated.spring(slideY, {
        toValue: 0,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isVisible.current = true;
    });

    // Drain progress bar
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 4000,
      useNativeDriver: false,
    }).start();
  }, [slideY, opacity, progressAnim]);

  const slideOut = useCallback((cb) => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
      autoHideTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isVisible.current = false;
      hideToast();
      cb && cb();
    });
  }, [slideY, opacity, hideToast]);

  useEffect(() => {
    if (toastNotification) {
      currentNotifRef.current = toastNotification;

      // Clear any existing timer
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
        autoHideTimer.current = null;
      }

      slideIn();

      autoHideTimer.current = setTimeout(() => {
        slideOut();
      }, 4000);
    }

    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
        autoHideTimer.current = null;
      }
    };
  }, [toastNotification]);  // re-runs every time a new toast arrives

  // Don't render anything when there's nothing to show
  if (!toastNotification) return null;

  const cfg = getConfig(toastNotification.type);

  const handlePress = () => {
    const captured = currentNotifRef.current;
    slideOut(() => {
      if (onPress && captured) onPress(captured);
    });
  };

  const handleDismiss = () => {
    slideOut();
  };

  const widthPercent = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[styles.banner, { backgroundColor: cfg.bg, borderLeftColor: cfg.color }]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={[styles.iconWrap, { backgroundColor: cfg.color + '22' }]}>
          <Text style={styles.iconText}>{cfg.icon}</Text>
        </View>

        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: '#1e293b' }]} numberOfLines={1}>
            {toastNotification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {toastNotification.message}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.dismissText, { color: cfg.color }]}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Draining progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[styles.progressFill, { width: widthPercent, backgroundColor: cfg.color }]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 12,
    left: 12,
    right: 12,
    zIndex: 99999,
    elevation: 99,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
    gap: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconText: { fontSize: 22 },
  textWrap: { flex: 1 },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  dismissBtn: { padding: 4, flexShrink: 0 },
  dismissText: { fontSize: 15, fontWeight: '700' },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
    marginTop: -1,
  },
  progressFill: { height: '100%' },
});