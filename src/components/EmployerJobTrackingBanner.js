// src/components/EmployerJobTrackingBanner.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import {
  fetchEmployerJobs,
  fetchJobApplications,
  onApplicationUpdate,
  createRating,
} from '../services/database';
import { colors } from '../constants/colors';

const EmployerJobTrackingBanner = () => {
  const { user, userProfile } = useAuth();
  const navigation = useNavigation();

  const [activeJobs, setActiveJobs] = useState([]);
  const [activeApplications, setActiveApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unsubscribers, setUnsubscribers] = useState([]);
  const [showBanner, setShowBanner] = useState(true);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);
  const [manuallyClosed, setManuallyClosed] = useState(false);

  // Track navigation state
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      const state = navigation.getState();
      const currentRouteName = state?.routes[state?.index]?.name;
      
      // Hide banner on EmployerJobTracking screen
      if (currentRouteName === 'EmployerJobTracking') {
        setShowBanner(false);
      } else {
        setShowBanner(true);
      }
      
      setCurrentRoute(currentRouteName);
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    loadInitialData();

    return () => {
      unsubscribers.forEach(unsub => unsub && unsub());
    };
  }, [user?.uid]);

  const loadInitialData = async () => {
    try {
      if (!user?.uid) return;

      const jobsResult = await fetchEmployerJobs(user.uid);
      if (!jobsResult.success) return;

      // Filter jobs with active applications
      const jobsWithActiveApps = await Promise.all(
        jobsResult.jobs
          .filter(job => job.status === 'open' || job.status === 'completed')
          .map(async (job) => {
            const appsResult = await fetchJobApplications(job.id);
            const activeApps = appsResult.applications?.filter(
              app => app.status === 'accepted' || app.status === 'pending' || app.status === 'completed'
            ) || [];

            return {
              job,
              applications: activeApps,
            };
          })
      );

      const filteredJobs = jobsWithActiveApps.filter(j => j.applications.length > 0);
      setActiveJobs(filteredJobs);

      // Set up real-time listeners for active applications
      const newUnsubscribers = [];
      filteredJobs.forEach(({ applications }) => {
        applications.forEach(app => {
          const unsub = onApplicationUpdate(app.id, (updatedApp) => {
            setActiveApplications(prev => {
              const filtered = prev.filter(a => a.id !== updatedApp.id);
              return [updatedApp, ...filtered];
            });
          });
          newUnsubscribers.push(unsub);
        });
      });

      setUnsubscribers(newUnsubscribers);
      setLoading(false);
    } catch (error) {
      console.error('Error loading employer tracking data:', error);
      setLoading(false);
    }
  };

  // Get the most important application (first in pending, then in progress, then completed)
  const getMainApplication = () => {
    const allApps = activeJobs.reduce((acc, { applications }) => [...acc, ...applications], []);
    const inProgress = allApps.find(app => ['onTheWay', 'reached', 'started'].includes(app.journeyStatus));
    const pending = allApps.find(app => app.status === 'accepted' && app.journeyStatus === 'accepted');
    const completed = allApps.find(app => app.status === 'completed' && app.journeyStatus === 'completed');
    return inProgress || pending || completed;
  };

  const mainApp = getMainApplication();

  // Hide banner if no main application, manually closed, or after rating completion
  const shouldShowBanner = !loading && mainApp && user && userProfile?.userType === 'employer' && showBanner && !manuallyClosed;

  if (!shouldShowBanner) {
    return null;
  }

  const getStatusInfo = () => {
    switch (mainApp.journeyStatus) {
      case 'accepted':
        return {
          icon: '✓',
          title: 'Job Accepted',
          subtitle: `${mainApp.workerName} accepted your job`,
          color: colors.info,
          action: 'Track',
        };
      case 'onTheWay':
        return {
          icon: '🚗',
          title: 'Worker On The Way',
          subtitle: `${mainApp.workerName} is heading to location`,
          color: colors.warning,
          action: 'Track',
        };
      case 'reached':
        return {
          icon: '📍',
          title: 'Worker Arrived',
          subtitle: `${mainApp.workerName} has reached location`,
          color: colors.success,
          action: 'Track',
        };
      case 'started':
        return {
          icon: '▶️',
          title: 'Work In Progress',
          subtitle: `${mainApp.workerName} is working now`,
          color: colors.primary,
          action: 'Track',
        };
      case 'completed':
        return {
          icon: '✅',
          title: 'Work Completed!',
          subtitle: `${mainApp.workerName} finished the job`,
          color: colors.success,
          action: 'Rate',
        };
      default:
        return {
          icon: '💼',
          title: 'Job Active',
          subtitle: 'View job details',
          color: colors.primary,
          action: 'View',
        };
    }
  };

  const statusInfo = getStatusInfo();
  
  // Calculate active applications excluding completed ones for the badge
  const activeApplicationsCount = activeJobs.reduce((sum, jobData) => {
    const nonCompletedApps = jobData.applications.filter(app => 
      app.journeyStatus !== 'completed'
    );
    return sum + nonCompletedApps.length;
  }, 0);

  const handleBannerPress = () => {
    if (mainApp.journeyStatus === 'completed') {
      setShowRatingModal(true);
    } else {
      navigation.navigate('EmployerJobTracking', { applicationId: mainApp.id });
    }
  };

  const handleCloseBanner = () => {
    setManuallyClosed(true);
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      alert('Please select a rating');
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
      });

      setRatingLoading(false);

      if (result.success) {
        alert('Rating submitted successfully! 🎉');
        setShowRatingModal(false);
        setRating(0);
        setComment('');
        // Close the banner after successful rating
        setManuallyClosed(true);
        // Reload data to update the banner state
        await loadInitialData();
      } else {
        alert(result.error || 'Failed to submit rating');
      }
    } catch (error) {
      setRatingLoading(false);
      alert('An error occurred. Please try again.');
      console.error('Rating submission error:', error);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Text style={[
              styles.star,
              star <= rating && styles.starSelected
            ]}>
              {star <= rating ? '⭐' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingLabel = () => {
    switch(rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Tap a star to rate';
    }
  };

  return (
    <>
      <View style={styles.bannerContainer}>
        <View style={[styles.banner, { borderLeftColor: statusInfo.color }]}>
          {/* Left Side - Icon & Status */}
          <TouchableOpacity
            style={styles.leftSection}
            onPress={handleBannerPress}
            activeOpacity={0.7}
          >
            <View style={[styles.statusIcon, { backgroundColor: statusInfo.color + '20' }]}>
              <Text style={styles.statusIconText}>{statusInfo.icon}</Text>
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle} numberOfLines={1}>
                {statusInfo.title}
              </Text>
              <Text style={styles.statusSubtitle} numberOfLines={1}>
                {statusInfo.subtitle}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Right Side - Action & Badge */}
          <View style={styles.rightSection}>
            {/* Only show badge if there are multiple active (non-completed) applications */}
            {activeApplicationsCount > 1 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeApplicationsCount}</Text>
              </View>
            )}
            
            {/* Action Button */}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: statusInfo.color }]}
              onPress={handleBannerPress}
              activeOpacity={0.7}
            >
              <Text style={styles.actionText}>{statusInfo.action}</Text>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>

            {/* Close Button - Only show for completed jobs */}
            {mainApp.journeyStatus === 'completed' && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseBanner}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Progress Indicator Dots */}
        {mainApp.journeyStatus && (
          <View style={styles.progressDots}>
            {['accepted', 'onTheWay', 'reached', 'started', 'completed'].map((status, idx) => {
              const isActive = ['accepted', 'onTheWay', 'reached', 'started', 'completed'].indexOf(mainApp.journeyStatus) >= idx;
              const isCurrent = mainApp.journeyStatus === status;

              return (
                <View
                  key={status}
                  style={[
                    styles.dot,
                    isActive && styles.dotActive,
                    isCurrent && styles.dotCurrent,
                  ]}
                >
                  {isCurrent && <View style={styles.dotPulse} />}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate Worker Performance</Text>
              <TouchableOpacity 
                onPress={() => setShowRatingModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.modalContent}>
              {/* Worker Info */}
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

              {/* Rating Question */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingQuestion}>
                  How was the work quality?
                </Text>
                {renderStars()}
                <Text style={styles.ratingLabel}>{getRatingLabel()}</Text>
              </View>

              {/* Comment Input */}
              <View style={styles.commentSection}>
                <Text style={styles.commentLabel}>
                  Share your feedback (optional)
                </Text>
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

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.skipButton]}
                  onPress={() => {
                    setShowRatingModal(false);
                    setRating(0);
                    setComment('');
                  }}
                  disabled={ratingLoading}
                >
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.submitButton,
                    (rating === 0 || ratingLoading) && styles.submitButtonDisabled
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
  badge: {
    backgroundColor: colors.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  actionButton: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
    justifyContent: 'center',
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
    marginLeft: 4,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotCurrent: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'relative',
  },
  dotPulse: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    opacity: 0.5,
  },

  // Modal Styles
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
    fontWeight: '300',
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
    backgroundColor: colors.success,
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