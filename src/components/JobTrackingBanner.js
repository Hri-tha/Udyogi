// src/components/JobTrackingBanner.js
// FIXES:
// 1. Real-time onSnapshot (no more 30s polling)
// 2. Shows immediately after apply (pending + accepted statuses)
// 3. Worker can update journey status directly from banner
// 4. Enhanced UI to look production-ready
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { updateWorkerJourneyStatus } from '../services/database';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  // Application statuses
  pending: {
    icon: '⏳', color: '#8B5CF6', bgColor: '#EDE9FE',
    title: 'Application Sent',
    subtitle: app => `Waiting for employer to respond`,
    action: null, actionLabel: null,
    showTrack: true, trackLabel: 'View',
  },
  // Journey statuses
  accepted: {
    icon: '✅', color: '#2563EB', bgColor: '#DBEAFE',
    title: 'Job Accepted!',
    subtitle: app => `Ready to start your journey`,
    action: 'onTheWay', actionLabel: "I'm On the Way",
    showTrack: true, trackLabel: 'Track',
  },
  onTheWay: {
    icon: '🚗', color: '#D97706', bgColor: '#FEF3C7',
    title: 'On the Way',
    subtitle: app => `Heading to job location`,
    action: 'reached', actionLabel: 'I Arrived',
    showTrack: true, trackLabel: 'Track',
  },
  reached: {
    icon: '📍', color: '#059669', bgColor: '#D1FAE5',
    title: 'Arrived!',
    subtitle: app => `Ready to begin work`,
    action: 'started', actionLabel: 'Start Work',
    showTrack: true, trackLabel: 'Track',
  },
  started: {
    icon: '⚡', color: '#7C3AED', bgColor: '#EDE9FE',
    title: 'Work in Progress',
    subtitle: app => `Work timer running`,
    action: 'completed', actionLabel: 'Complete Work',
    showTrack: true, trackLabel: 'Track',
    isDestructive: true,
  },
};

const PRIORITY_ORDER = { started: 0, reached: 1, onTheWay: 2, accepted: 3, pending: 4 };

const JobTrackingBanner = () => {
  const navigation = useNavigation();
  const { resolvedUid } = useAuth();

  const [activeApp, setActiveApp]       = useState(null);
  const [showBanner, setShowBanner]     = useState(true);
  const [updating, setUpdating]         = useState(false);
  const [manuallyClosed, setManuallyClosed] = useState(false);

  const slideY    = useRef(new Animated.Value(120)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Hide banner on JobTracking screen ────────────────────────────────────
  useEffect(() => {
    const unsub = navigation.addListener('state', () => {
      try {
        const state = navigation.getState();
        const route = state?.routes?.[state?.index]?.name;
        setShowBanner(route !== 'JobTracking');
      } catch (_) {}
    });
    return unsub;
  }, [navigation]);

  // ── Real-time Firestore listener ─────────────────────────────────────────
  useEffect(() => {
    if (!resolvedUid) { setActiveApp(null); return; }

    setManuallyClosed(false);

    // Watch ALL relevant application statuses for this worker
    const q = query(
      collection(db, 'applications'),
      where('workerId', '==', resolvedUid),
      where('status', 'in', ['pending', 'accepted'])
    );

    const unsub = onSnapshot(q, snap => {
      if (snap.empty) { setActiveApp(null); return; }

      const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Filter to only "active" apps
      const active = apps.filter(app => {
        if (app.status === 'pending') return true;
        if (app.status === 'accepted') {
          return ['accepted', 'onTheWay', 'reached', 'started'].includes(app.journeyStatus);
        }
        return false;
      });

      if (!active.length) { setActiveApp(null); return; }

      // Pick highest-priority app
      const best = active.sort((a, b) => {
        const aPrio = PRIORITY_ORDER[a.journeyStatus || (a.status === 'pending' ? 'pending' : 'accepted')] ?? 99;
        const bPrio = PRIORITY_ORDER[b.journeyStatus || (b.status === 'pending' ? 'pending' : 'accepted')] ?? 99;
        return aPrio - bPrio;
      })[0];

      setActiveApp(best);
      setManuallyClosed(false);
    }, err => console.error('JobTrackingBanner snapshot error:', err));

    return () => unsub();
  }, [resolvedUid]);

  // ── Slide animation ───────────────────────────────────────────────────────
  useEffect(() => {
    const visible = !!activeApp && showBanner && !manuallyClosed;
    Animated.spring(slideY, {
      toValue: visible ? 0 : 120,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [activeApp, showBanner, manuallyClosed]);

  // ── Pulse animation for "started" status ─────────────────────────────────
  useEffect(() => {
    if (activeApp?.journeyStatus === 'started') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [activeApp?.journeyStatus]);

  if (!activeApp || !showBanner || manuallyClosed) return null;

  // Determine display key
  const displayKey = activeApp.status === 'pending'
    ? 'pending'
    : (activeApp.journeyStatus || 'accepted');
  const cfg = STATUS_CONFIG[displayKey] || STATUS_CONFIG.accepted;

  // ── Update journey status ─────────────────────────────────────────────────
  const handleAction = () => {
    if (!cfg.action) return;

    if (cfg.isDestructive) {
      Alert.alert(
        'Complete Work?',
        'Mark this job as done? This will stop the timer and notify the employer.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Complete', style: 'destructive', onPress: () => doUpdate(cfg.action) },
        ]
      );
    } else if (cfg.action === 'onTheWay') {
      Alert.alert('Start Journey?', 'Confirm you are heading to the job location?', [
        { text: 'Cancel', style: 'cancel' },
        { text: "Yes, On My Way", onPress: () => doUpdate('onTheWay') },
      ]);
    } else {
      doUpdate(cfg.action);
    }
  };

  const doUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      const result = await updateWorkerJourneyStatus(activeApp.id, newStatus);
      if (!result.success) Alert.alert('Error', result.error || 'Failed to update status');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleTrack = () => {
    if (activeApp?.id) {
      navigation.navigate('JobTracking', { applicationId: activeApp.id });
    }
  };

  const jobTitle = activeApp.jobTitle || 'Job';

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideY }, { scale: pulseAnim }] },
      ]}
      pointerEvents="box-none"
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: cfg.color }]} />

      <View style={styles.inner}>
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: cfg.bgColor }]}>
          <Text style={styles.iconText}>{cfg.icon}</Text>
          {activeApp.journeyStatus === 'started' && (
            <View style={[styles.liveDot, { backgroundColor: cfg.color }]} />
          )}
        </View>

        {/* Text */}
        <TouchableOpacity style={styles.textWrap} onPress={handleTrack} activeOpacity={0.7}>
          <Text style={styles.title} numberOfLines={1}>{cfg.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {typeof cfg.subtitle === 'function' ? cfg.subtitle(activeApp) : cfg.subtitle}
            {' · '}
            <Text style={styles.jobName}>{jobTitle}</Text>
          </Text>
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.actions}>
          {cfg.action && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: cfg.color }]}
              onPress={handleAction}
              activeOpacity={0.8}
              disabled={updating}
            >
              {updating
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.actionBtnText} numberOfLines={1}>{cfg.actionLabel}</Text>
              }
            </TouchableOpacity>
          )}
          {cfg.showTrack && (
            <TouchableOpacity
              style={[styles.trackBtn, { borderColor: cfg.color }]}
              onPress={handleTrack}
              activeOpacity={0.8}
            >
              <Text style={[styles.trackBtnText, { color: cfg.color }]}>{cfg.trackLabel} ›</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Close button — only for pending (no active journey) */}
      {displayKey === 'pending' && (
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => setManuallyClosed(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      )}

      {/* Progress indicator strip at bottom */}
      <View style={styles.progressStrip}>
        {['pending', 'accepted', 'onTheWay', 'reached', 'started'].map((key, i) => (
          <View
            key={key}
            style={[
              styles.progressDot,
              {
                backgroundColor:
                  PRIORITY_ORDER[displayKey] <= PRIORITY_ORDER[key]
                    ? cfg.color
                    : '#E5E7EB',
                width: key === displayKey ? 18 : 6,
              },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 70,
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 99,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    overflow: 'visible',
    paddingBottom: 10,
  },
  accentBar: {
    width: 5,
    alignSelf: 'stretch',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    marginRight: 10,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 10,
    gap: 10,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconText: { fontSize: 22 },
  liveDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  jobName: {
    fontWeight: '700',
    color: '#374151',
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 5,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  trackBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.5,
    minWidth: 60,
    alignItems: 'center',
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '700',
    lineHeight: 14,
  },
  // Progress dots strip
  progressStrip: {
    position: 'absolute',
    bottom: 5,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressDot: {
    height: 4,
    borderRadius: 2,
  },
});

export default JobTrackingBanner;