// src/components/EmployerJobTrackingBanner.js - ENHANCED VERSION
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
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import {
  fetchEmployerJobs,
  fetchJobApplications,
  createRating,
} from '../services/database';
import { colors } from '../constants/colors';

const EmployerJobTrackingBanner = () => {
  const { user, userProfile } = useAuth();
  const navigation = useNavigation();

  const [mainApp, setMainApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);
  const [manuallyClosed, setManuallyClosed] = useState(false);
  
  const isLoadingRef = useRef(false);

  // Track navigation state
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      const state = navigation.getState();
      const currentRouteName = state?.routes[state?.index]?.name;
      
      if (currentRouteName === 'EmployerJobTracking' || currentRouteName === 'PaymentProcessing') {
        setShowBanner(false);
      } else {
        setShowBanner(true);
      }
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    loadInitialData();
    
    const interval = setInterval(() => {
      if (!isLoadingRef.current) {
        loadInitialData();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [user?.uid]);

  // Refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!isLoadingRef.current) {
        loadInitialData();
      }
    });

    return unsubscribe;
  }, [navigation]);

  const loadInitialData = async () => {
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    
    try {
      if (!user?.uid) return;

      const jobsResult = await fetchEmployerJobs(user.uid);
      if (!jobsResult.success) return;

      console.log('Fetched ALL employer jobs:', jobsResult.jobs.length);

      // Get all applications that need employer attention from ALL jobs
      const allActiveApplications = [];
      
      for (const job of jobsResult.jobs) {
        // Check ALL job statuses - not just 'open' or 'completed'
        const appsResult = await fetchJobApplications(job.id);
        
        if (appsResult.success && appsResult.applications) {
          // CRITICAL FIX: Include applications that need employer action
          const employerActionApps = appsResult.applications.filter(app => {
            console.log('Checking application:', {
              id: app.id,
              status: app.status,
              journeyStatus: app.journeyStatus,
              paymentStatus: app.paymentStatus,
              hasRating: app.hasRating
            });

            // Applications that are accepted and in progress
            if (app.status === 'accepted' && ['accepted', 'onTheWay', 'reached', 'started'].includes(app.journeyStatus)) {
              console.log('Found in-progress application');
              return true;
            }
            
            // Applications waiting for payment after completion
            if (app.status === 'awaiting_payment' && app.journeyStatus === 'completed' && app.paymentStatus === 'pending') {
              console.log('Found application needing payment');
              return true;
            }
            
            // Applications waiting for rating after payment
            if (app.status === 'awaiting_rating' && app.paymentStatus === 'paid' && app.hasRating === false) {
              console.log('Found application needing rating');
              return true;
            }
            
            return false;
          });
          
          allActiveApplications.push(...employerActionApps);
        }
      }

      console.log('All active applications for employer:', allActiveApplications.length);
      
      const prioritizedApp = getPriorityApplication(allActiveApplications);
      console.log('Prioritized application:', prioritizedApp ? {
        id: prioritizedApp.id,
        status: prioritizedApp.status,
        journeyStatus: prioritizedApp.journeyStatus,
        paymentStatus: prioritizedApp.paymentStatus,
        workerName: prioritizedApp.workerName,
        hasRating: prioritizedApp.hasRating
      } : 'No application');
      
      setMainApp(prioritizedApp);
      setLoading(false);
    } catch (error) {
      console.error('Error loading employer tracking data:', error);
      setLoading(false);
    } finally {
      isLoadingRef.current = false;
    }
  };

  const getPriorityApplication = (allApps) => {
    if (!allApps || allApps.length === 0) return null;
    
    console.log('All apps for prioritization:', allApps.map(app => ({
      id: app.id,
      status: app.status,
      journeyStatus: app.journeyStatus,
      paymentStatus: app.paymentStatus,
      workerName: app.workerName,
      hasRating: app.hasRating
    })));
    
    // Priority 1: Work completed, needs payment (awaiting_payment status)
    const completedNeedingPayment = allApps.find(app => 
      app.status === 'awaiting_payment' && 
      app.journeyStatus === 'completed' &&
      app.paymentStatus === 'pending'
    );
    if (completedNeedingPayment) {
      console.log('Found application needing payment:', completedNeedingPayment.id);
      return completedNeedingPayment;
    }
    
    // Priority 2: Payment done, needs rating
    const paidNeedingRating = allApps.find(app => 
      app.status === 'awaiting_rating' &&
      app.paymentStatus === 'paid' && 
      (app.hasRating === false || app.hasRating === undefined)
    );
    if (paidNeedingRating) {
      console.log('Found application needing rating:', paidNeedingRating.id);
      return paidNeedingRating;
    }
    
    // Priority 3: Work in progress
    const inProgress = allApps.find(app => 
      ['onTheWay', 'reached', 'started'].includes(app.journeyStatus) &&
      app.status === 'accepted'
    );
    if (inProgress) {
      console.log('Found in-progress application:', inProgress.id);
      return inProgress;
    }
    
    // Priority 4: Accepted but not started journey
    const accepted = allApps.find(app => 
      app.status === 'accepted' && 
      app.journeyStatus === 'accepted'
    );
    
    if (accepted) {
      console.log('Found accepted application:', accepted.id);
      return accepted;
    }
    
    console.log('No prioritized application found');
    return null;
  };

  const shouldShowBanner = !loading && mainApp && user && userProfile?.userType === 'employer' && showBanner && !manuallyClosed;

  console.log('Should show banner:', shouldShowBanner, {
    loading,
    hasMainApp: !!mainApp,
    hasUser: !!user,
    userType: userProfile?.userType,
    showBanner,
    manuallyClosed
  });

  if (!shouldShowBanner) {
    return null;
  }

  const getStatusInfo = () => {
    // CRITICAL FIX: Check for awaiting_payment status first
    if (mainApp.status === 'awaiting_payment' && mainApp.journeyStatus === 'completed' && mainApp.paymentStatus === 'pending') {
      return {
        icon: '💰',
        title: 'Payment Required',
        subtitle: `${mainApp.workerName} completed work - Pay now`,
        color: '#FF6B35',
        action: 'Pay Now',
        showClose: false,
      };
    }
    
    if (mainApp.status === 'awaiting_rating' && mainApp.paymentStatus === 'paid' && (mainApp.hasRating === false || mainApp.hasRating === undefined)) {
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

  const handleBannerPress = () => {
    console.log('Banner pressed with status:', {
      status: mainApp.status,
      journeyStatus: mainApp.journeyStatus,
      paymentStatus: mainApp.paymentStatus,
      hasRating: mainApp.hasRating
    });

    // CRITICAL FIX: Handle payment requirement first
    if (mainApp.status === 'awaiting_payment' && mainApp.journeyStatus === 'completed' && mainApp.paymentStatus === 'pending') {
      console.log('Navigating to EmployerJobTracking for payment');
      navigation.navigate('EmployerJobTracking', { applicationId: mainApp.id });
    }
    else if (mainApp.status === 'awaiting_rating' && mainApp.paymentStatus === 'paid' && (mainApp.hasRating === false || mainApp.hasRating === undefined)) {
      console.log('Opening rating modal');
      setShowRatingModal(true);
    }
    else {
      console.log('Navigating to EmployerJobTracking for tracking');
      navigation.navigate('EmployerJobTracking', { applicationId: mainApp.id });
    }
  };

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
        employerId: user.uid,
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
              loadInitialData();
            }
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

  return (
    <>
      <View style={styles.bannerContainer}>
        <View style={[styles.banner, { borderLeftColor: statusInfo.color }]}>
          <TouchableOpacity style={styles.leftSection} onPress={handleBannerPress} activeOpacity={0.7}>
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
              <TouchableOpacity style={styles.closeButton} onPress={() => setManuallyClosed(true)} activeOpacity={0.7}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Rating Modal */}
      <Modal visible={showRatingModal} animationType="slide" transparent={true} onRequestClose={() => setShowRatingModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate Worker Performance</Text>
              <TouchableOpacity onPress={() => setShowRatingModal(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.workerInfoCard}>
                <View style={styles.workerAvatar}>
                  <Text style={styles.avatarText}>{mainApp.workerName?.charAt(0) || 'W'}</Text>
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
                  {rating === 0 ? 'Tap a star to rate' : ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating - 1]}
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
                  style={[styles.modalButton, styles.submitButton, (rating === 0 || ratingLoading) && styles.submitButtonDisabled]}
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

// ... (keep the same styles as before)

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    bottom: 50,
    left: 12,
    right: 12,
    zIndex: 999,
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