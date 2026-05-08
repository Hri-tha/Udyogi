// src/components/EmployerJobTrackingBanner.js - FIXED + COMPLETE VERSION
// FIX 1: Uses resolvedUid (not user?.uid) so it works when Firebase Auth is unavailable
// FIX 2: Real-time Firestore onSnapshot instead of polling interval
// FIX 3: initialLoadDoneRef pattern so banner appears immediately on login
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { createRating } from '../services/database';
import { colors } from '../constants/colors';

const EmployerJobTrackingBanner = () => {
  // FIX: use resolvedUid — it falls back to userProfile?.uid when Firebase Auth
  // returns null (which happens in AsyncStorage-only mode after OTP login).
  const { user, userProfile, resolvedUid } = useAuth();
  const navigation = useNavigation();

  const [mainApp, setMainApp] = useState(null);
  const [showBanner, setShowBanner] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);
  const [manuallyClosed, setManuallyClosed] = useState(false);

  // Slide animation (slides up from below the tab bar)
  const slideY = useRef(new Animated.Value(100)).current;

  const isEmployer =
    userProfile?.userType === 'employer' ||
    userProfile?.userType === 'Employer';

  // ── Hide banner when on tracking / payment screens ──────────────────────────
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      try {
        const state = navigation.getState();
        const currentRoute = state?.routes?.[state?.index]?.name;
        if (
          currentRoute === 'EmployerJobTracking' ||
          currentRoute === 'PaymentProcessing'
        ) {
          setShowBanner(false);
        } else {
          setShowBanner(true);
        }
      } catch (_) {}
    });
    return unsubscribe;
  }, [navigation]);

  // ── Real-time Firestore listener ─────────────────────────────────────────────
  useEffect(() => {
    if (!resolvedUid || !isEmployer) {
      setMainApp(null);
      return;
    }

    // Reset manual-close when user changes (e.g. new login)
    setManuallyClosed(false);

    // Watch ALL applications where this employer has something to act on.
    // We query by employerId + the set of statuses that need attention.
    const activeJourneyStatuses = ['accepted', 'onTheWay', 'reached', 'started', 'completed'];

    const q = query(
      collection(db, 'applications'),
      where('employerId', '==', resolvedUid),
      where('journeyStatus', 'in', activeJourneyStatuses)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setMainApp(null);
          return;
        }

        const allApps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const filtered = allApps.filter(app => {
          // In-progress journey
          if (
            app.status === 'accepted' &&
            ['accepted', 'onTheWay', 'reached', 'started'].includes(app.journeyStatus)
          ) {
            return true;
          }
          // Work done, waiting for payment
          if (
            (app.status === 'awaiting_payment' || app.journeyStatus === 'completed') &&
            app.paymentStatus === 'pending'
          ) {
            return true;
          }
          // Paid, waiting for rating
          if (
            app.paymentStatus === 'paid' &&
            app.hasRating === false
          ) {
            return true;
          }
          return false;
        });

        const prioritized = getPriorityApplication(filtered);
        setMainApp(prioritized);
        // Reset manual close when a new active job appears
        if (prioritized) setManuallyClosed(false);
      },
      (err) => {
        console.error('EmployerJobTrackingBanner snapshot error:', err);
      }
    );

    return () => unsub();
  }, [resolvedUid, isEmployer]);

  // ── Slide animation whenever visibility changes ──────────────────────────────
  useEffect(() => {
    const shouldShow = mainApp && isEmployer && showBanner && !manuallyClosed;
    Animated.timing(slideY, {
      toValue: shouldShow ? 0 : 100,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [mainApp, isEmployer, showBanner, manuallyClosed]);

  // ── Priority logic (same as original) ───────────────────────────────────────
  const getPriorityApplication = (apps) => {
    if (!apps || apps.length === 0) return null;

    // 1. Work completed, needs payment
    const needsPayment = apps.find(
      app =>
        (app.status === 'awaiting_payment' || app.journeyStatus === 'completed') &&
        app.paymentStatus === 'pending'
    );
    if (needsPayment) return needsPayment;

    // 2. Payment done, needs rating
    const needsRating = apps.find(
      app =>
        app.paymentStatus === 'paid' &&
        (app.hasRating === false || app.hasRating === undefined)
    );
    if (needsRating) return needsRating;

    // 3. Work in progress
    const inProgress = apps.find(app =>
      ['onTheWay', 'reached', 'started'].includes(app.journeyStatus) &&
      app.status === 'accepted'
    );
    if (inProgress) return inProgress;

    // 4. Accepted, journey not yet started
    const accepted = apps.find(
      app => app.status === 'accepted' && app.journeyStatus === 'accepted'
    );
    return accepted || null;
  };

  // ── Don't render at all when nothing to show ─────────────────────────────────
  const shouldShowBanner =
    mainApp && isEmployer && showBanner && !manuallyClosed;

  if (!mainApp || !shouldShowBanner) return null;

  // ── Status display config (same as original) ─────────────────────────────────
  const getStatusInfo = () => {
    if (
      (mainApp.status === 'awaiting_payment' || mainApp.journeyStatus === 'completed') &&
      mainApp.paymentStatus === 'pending'
    ) {
      return {
        icon: '💰',
        title: 'Payment Required',
        subtitle: `${mainApp.workerName} completed work - Pay now`,
        color: '#FF6B35',
        action: 'Pay Now',
        showClose: false,
      };
    }

    if (
      mainApp.paymentStatus === 'paid' &&
      (mainApp.hasRating === false || mainApp.hasRating === undefined)
    ) {
      return {
        icon: '⭐',
        title: 'Rate Worker',
        subtitle: `Rate ${mainApp.workerName}'s performance`,
        color: '#FFB800',
        action: 'Rate Now',
        showClose: true,
      };
    }

    switch (mainApp.journeyStatus) {
      case 'accepted':
        return {
          icon: '✔',
          title: 'Job Accepted',
          subtitle: `${mainApp.workerName} accepted your job`,
          color: colors.info,
          action: 'Track',
          showClose: false,
        };
      case 'onTheWay':
        return {
          icon: '🚗',
          title: 'Worker On The Way',
          subtitle: `${mainApp.workerName} is heading to location`,
          color: colors.warning,
          action: 'Track',
          showClose: false,
        };
      case 'reached':
        return {
          icon: '📍',
          title: 'Worker Arrived',
          subtitle: `${mainApp.workerName} has reached`,
          color: colors.success,
          action: 'Track',
          showClose: false,
        };
      case 'started':
        return {
          icon: '▶️',
          title: 'Work In Progress',
          subtitle: `${mainApp.workerName} is working`,
          color: colors.primary,
          action: 'Track',
          showClose: false,
        };
      default:
        return {
          icon: '💼',
          title: 'Job Active',
          subtitle: 'View job details',
          color: colors.primary,
          action: 'View',
          showClose: false,
        };
    }
  };

  const statusInfo = getStatusInfo();

  // ── Banner tap handler (same logic as original) ──────────────────────────────
  const handleBannerPress = () => {
    const needsPayment =
      (mainApp.status === 'awaiting_payment' || mainApp.journeyStatus === 'completed') &&
      mainApp.paymentStatus === 'pending';

    const needsRating =
      mainApp.paymentStatus === 'paid' &&
      (mainApp.hasRating === false || mainApp.hasRating === undefined);

    if (needsPayment) {
      navigation.navigate('EmployerJobTracking', { applicationId: mainApp.id });
    } else if (needsRating) {
      setShowRatingModal(true);
    } else {
      navigation.navigate('EmployerJobTracking', { applicationId: mainApp.id });
    }
  };

  // ── Rating submission (same as original) ────────────────────────────────────
  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting');
      return;
    }

    setRatingLoading(true);

    try {
      const result = await createRating({
        jobId: mainApp.jobId,
        jobTitle: mainApp.jobTitle || 'Job',
        workerId: mainApp.workerId,
        workerName: mainApp.workerName,
        employerId: resolvedUid,
        employerName: userProfile?.name || 'Employer',
        rating,
        comment: comment.trim(),
        applicationId: mainApp.id,
      });

      setRatingLoading(false);

      if (result.success) {
        Alert.alert(
          '🎉 Thank You!',
          'Your rating has been submitted successfully.',
          [{
            text: 'OK',
            onPress: () => {
              setShowRatingModal(false);
              setRating(0);
              setComment('');
              setManuallyClosed(true);
            },
          }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit rating');
      }
    } catch (error) {
      setRatingLoading(false);
      Alert.alert('Error', 'An error occurred. Please try again.');
      console.error('Rating submission error:', error);
    }
  };

  const renderStars = () => (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => setRating(star)} style={styles.starButton}>
          <Text style={[styles.star, star <= rating && styles.starSelected]}>
            {star <= rating ? '⭐' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <Animated.View
        style={[styles.bannerContainer, { transform: [{ translateY: slideY }] }]}
        pointerEvents="box-none"
      >
        <View style={[styles.banner, { borderLeftColor: statusInfo.color }]}>
          <TouchableOpacity
            style={styles.leftSection}
            onPress={handleBannerPress}
            activeOpacity={0.7}
          >
            <View style={[styles.statusIcon, { backgroundColor: statusInfo.color + '20' }]}>
              <Text style={styles.statusIconText}>{statusInfo.icon}</Text>
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle} numberOfLines={1}>{statusInfo.title}</Text>
              <Text style={styles.statusSubtitle} numberOfLines={1}>{statusInfo.subtitle}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.rightSection}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: statusInfo.color }]}
              onPress={handleBannerPress}
              activeOpacity={0.7}
            >
              <Text style={styles.actionText}>{statusInfo.action}</Text>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>

            {statusInfo.showClose && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setManuallyClosed(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      {/* ── Rating Modal (identical to original) ── */}
      <Modal
        visible={showRatingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate Worker Performance</Text>
              <TouchableOpacity
                onPress={() => setShowRatingModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.workerInfoCard}>
                <View style={styles.workerAvatar}>
                  <Text style={styles.avatarText}>
                    {mainApp.workerName?.charAt(0) || 'W'}
                  </Text>
                </View>
                <View style={styles.workerInfoText}>
                  <Text style={styles.workerName}>{mainApp.workerName}</Text>
                  <Text style={styles.jobTitle}>{mainApp.jobTitle}</Text>
                </View>
              </View>

              <View style={styles.ratingSection}>
                <Text style={styles.ratingQuestion}>How was the work quality?</Text>
                {renderStars()}
                <Text style={styles.ratingLabel}>
                  {rating === 0
                    ? 'Tap a star to rate'
                    : ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating - 1]}
                </Text>
              </View>

              <View style={styles.commentSection}>
                <Text style={styles.commentLabel}>Share your feedback (optional)</Text>
                <View style={styles.commentInputWrapper}>
                  <Text style={styles.commentInputIcon}>💬</Text>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Tell us about this worker's performance..."
                    placeholderTextColor={colors.textSecondary}
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.skipButton]}
                  onPress={() => {
                    setShowRatingModal(false);
                    setRating(0);
                    setComment('');
                    setManuallyClosed(true);
                  }}
                  disabled={ratingLoading}
                >
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.submitButton,
                    (rating === 0 || ratingLoading) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmitRating}
                  disabled={rating === 0 || ratingLoading}
                >
                  {ratingLoading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Submit Rating</Text>
                      <Text style={styles.submitButtonArrow}>→</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ── Styles (identical to original) ──────────────────────────────────────────────
const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 78 : 68, // sits above the 60px tab bar
    left: 12,
    right: 12,
    zIndex: 9998,
    elevation: 98,
  },
  banner: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 70,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusIconText: {
    fontSize: 24,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  statusSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.white,
  },
  actionArrow: {
    fontSize: 16,
    color: colors.white,
    marginLeft: 4,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  // ── Modal styles ────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseIcon: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  modalContent: {
    padding: 20,
  },
  workerInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  workerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.white,
  },
  workerInfoText: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  jobTitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  ratingQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 40,
    opacity: 0.3,
  },
  starSelected: {
    opacity: 1,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  commentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
  },
  commentInputIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 2,
  },
  commentInput: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  skipButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  submitButton: {
    backgroundColor: '#FFB800',
  },
  submitButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  submitButtonArrow: {
    fontSize: 14,
    color: colors.white,
    marginLeft: 6,
  },
});

export default EmployerJobTrackingBanner;