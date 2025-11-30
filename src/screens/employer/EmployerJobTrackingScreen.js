// src/screens/employer/EmployerJobTrackingScreen.js - COMPLETE UPDATED VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../constants/colors';
import { onApplicationUpdate } from '../../services/database';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import RatingModal from '../../components/RatingModal';

const EmployerJobTrackingScreen = ({ route, navigation }) => {
  const { applicationId } = route.params;

  const [application, setApplication] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workDuration, setWorkDuration] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [actualPayment, setActualPayment] = useState(0);

  // Load initial data
  useEffect(() => {
    loadInitialData();

    // Real-time listener for application updates
    const unsubscribe = onApplicationUpdate(applicationId, (updatedApp) => {
      setApplication(updatedApp);
      calculateActualPayment(updatedApp);
    });

    return () => {
      unsubscribe();
    };
  }, [applicationId]);

  // Timer for work duration
  useEffect(() => {
    let interval;
    if (application?.journeyStatus === 'started' && application?.workStartedTimestamp) {
      interval = setInterval(() => {
        const now = Date.now();
        const start = application.workStartedTimestamp;
        setWorkDuration((now - start) / 1000);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [application?.journeyStatus, application?.workStartedTimestamp]);

  const calculateActualPayment = (appData) => {
    try {
      // If we have calculated payment from database, use that
      if (appData.calculatedPayment) {
        setActualPayment(appData.calculatedPayment);
        return;
      }
      
      // Calculate based on actual work timestamps
      if (appData.workStartedTimestamp && appData.workCompletedTimestamp) {
        const durationMs = appData.workCompletedTimestamp - appData.workStartedTimestamp;
        const durationHours = durationMs / (1000 * 60 * 60);
        const hourlyRate = appData.hourlyRate || 0;
        const calculatedPayment = Math.round(durationHours * hourlyRate);
        setActualPayment(calculatedPayment);
        
        console.log('Payment Calculation in Tracking:', {
          durationHours: durationHours.toFixed(2),
          hourlyRate: hourlyRate,
          calculatedPayment: calculatedPayment
        });
      } else {
        // Fallback to expected payment
        setActualPayment(appData.expectedPayment || 0);
      }
    } catch (error) {
      console.error('Payment calculation error in tracking:', error);
      setActualPayment(appData.expectedPayment || 0);
    }
  };

  const loadInitialData = async () => {
    try {
      const appRef = doc(db, 'applications', applicationId);
      const appSnap = await getDoc(appRef);

      if (!appSnap.exists()) {
        Alert.alert('Error', 'Application not found');
        setLoading(false);
        return;
      }

      const appData = { id: appSnap.id, ...appSnap.data() };
      setApplication(appData);
      calculateActualPayment(appData);

      if (appData.jobId) {
        const jobRef = doc(db, 'jobs', appData.jobId);
        const jobSnap = await getDoc(jobRef);
        if (jobSnap.exists()) {
          setJob({ id: jobSnap.id, ...jobSnap.data() });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load job tracking details');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatWorkDuration = (hours) => {
    if (!hours) return '0 hours';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    if (wholeHours === 0) {
      return `${minutes} minutes`;
    } else if (minutes === 0) {
      return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
    } else {
      return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''} ${minutes} minutes`;
    }
  };

  const getStatusInfo = () => {
    const status = application?.status;
    const journeyStatus = application?.journeyStatus;

    // Handle completed job status
    if (status === 'completed') {
      return {
        icon: '✅',
        color: colors.success,
        title: 'Job Completed',
        message: 'The job has been successfully completed.',
      };
    }

    // Handle awaiting rating status
    if (status === 'awaiting_rating') {
      return {
        icon: '⭐',
        color: colors.warning,
        title: 'Rate Worker Performance',
        message: 'Please rate the worker to complete the job process.',
      };
    }

    // Handle awaiting payment status
    if (status === 'awaiting_payment') {
      return {
        icon: '💰',
        color: colors.warning,
        title: 'Payment Required',
        message: `Please process payment of ₹${actualPayment} to complete the job.`,
      };
    }

    // Handle journey status for active jobs
    switch (journeyStatus) {
      case 'accepted':
        return {
          icon: '✓',
          color: colors.info,
          title: 'Application Accepted',
          message: 'Worker has accepted the job. Waiting for them to start journey.',
        };
      case 'onTheWay':
        return {
          icon: '🚗',
          color: colors.warning,
          title: 'Worker On The Way',
          message: 'Worker is traveling to your location.',
        };
      case 'reached':
        return {
          icon: '📍',
          color: colors.success,
          title: 'Worker Has Arrived',
          message: 'Worker has reached the location and will start work soon.',
        };
      case 'started':
        return {
          icon: '⚡',
          color: colors.primary,
          title: 'Work In Progress',
          message: 'Worker is currently working on the job.',
        };
      case 'completed':
        return {
          icon: '✅',
          color: colors.success,
          title: 'Work Completed',
          message: `Worker has completed the job. Payment due: ₹${actualPayment}`,
        };
      default:
        return {
          icon: 'ℹ️',
          color: colors.textSecondary,
          title: 'Job Status',
          message: 'Tracking worker progress...',
        };
    }
  };

  const handleProcessPayment = () => {
    if (application?.journeyStatus !== 'completed' && application?.status !== 'awaiting_payment') {
      Alert.alert('Cannot Process Payment', 'Please wait for the worker to complete the job first.');
      return;
    }

    navigation.navigate('PaymentProcessing', {
      applicationId: application.id,
    });
  };

  const handleCompleteJob = () => {
    if (application?.paymentStatus !== 'paid') {
      Alert.alert('Payment Required', 'Please process the payment before completing the job.');
      return;
    }

    navigation.navigate('CompleteJob', {
      applicationId: application.id,
      jobId: application.jobId,
      workerId: application.workerId,
      workerName: application.workerName,
    });
  };

  const handleRateWorker = () => {
    setShowRatingModal(true);
  };

  const handleRatingSubmitted = () => {
    Alert.alert(
      'Thank You! 🙏',
      'Your rating has been submitted successfully.',
      [{ 
        text: 'OK', 
        onPress: () => {
          setShowRatingModal(false);
          navigation.navigate('EmployerHome');
        }
      }]
    );
  };

  const handleViewJobHistory = () => {
    navigation.navigate('ApplicationsScreen');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading tracking details...</Text>
      </View>
    );
  }

  if (!application || !job) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Tracking</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Job tracking not available</Text>
        </View>
      </View>
    );
  }

  const statusInfo = getStatusInfo();
  const isJobCompleted = application.status === 'completed';
  const isAwaitingRating = application.status === 'awaiting_rating';
  const isAwaitingPayment = application.status === 'awaiting_payment';
  const hasActualWorkData = application.workStartedTimestamp && application.workCompletedTimestamp;
  const hourlyRate = application.hourlyRate || job.rate || 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Tracking</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusInfo.color + '20', borderLeftColor: statusInfo.color }]}>
          <Text style={styles.statusIcon}>{statusInfo.icon}</Text>
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>{statusInfo.title}</Text>
            <Text style={styles.statusMessage}>{statusInfo.message}</Text>
          </View>
        </View>

        {/* Job Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Job Details</Text>
          <Text style={styles.infoValue}>{job.title}</Text>
          <Text style={styles.infoValue}>{job.location}</Text>
          <Text style={styles.infoValue}>Rate: ₹{hourlyRate}/hour</Text>
        </View>

        {/* Worker Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Worker Information</Text>
          <Text style={styles.infoLabel}>Name: <Text style={styles.infoValue}>{application.workerName}</Text></Text>
          <Text style={styles.infoLabel}>Phone: <Text style={styles.infoValue}>{application.workerPhone}</Text></Text>
        </View>

        {/* Schedule */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Schedule</Text>
          <Text style={styles.infoLabel}>Date: <Text style={styles.infoValue}>{job.jobDate || 'Not specified'}</Text></Text>
          <Text style={styles.infoLabel}>Time: <Text style={styles.infoValue}>{job.startTime || 'N/A'} - {job.endTime || 'N/A'}</Text></Text>
        </View>

        {/* Work Timer (if started) */}
        {application.journeyStatus === 'started' && (
          <View style={styles.timerCard}>
            <Text style={styles.timerTitle}>Work Duration</Text>
            <Text style={styles.timerValue}>{formatDuration(workDuration)}</Text>
            <Text style={styles.timerSubtitle}>Time spent working</Text>
          </View>
        )}

        {/* Actual Work Duration (if completed) */}
        {hasActualWorkData && (
          <View style={[styles.card, styles.workDurationCard]}>
            <Text style={styles.cardTitle}>Actual Work Duration</Text>
            <Text style={styles.workDurationValue}>
              {formatWorkDuration((application.workCompletedTimestamp - application.workStartedTimestamp) / (1000 * 60 * 60))}
            </Text>
            <Text style={styles.workDurationNote}>
              Work started: {new Date(application.workStartedTimestamp).toLocaleTimeString()}
              {'\n'}
              Work completed: {new Date(application.workCompletedTimestamp).toLocaleTimeString()}
            </Text>
          </View>
        )}

        {/* Payment Information - UPDATED WITH ACTUAL CALCULATION */}
        {(application.paymentStatus || isAwaitingPayment || isJobCompleted) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Details</Text>
            
            {/* Hourly Rate */}
            <Text style={styles.infoLabel}>Hourly Rate: <Text style={styles.infoValue}>₹{hourlyRate}/hour</Text></Text>
            
            {/* Actual Work Duration */}
            {hasActualWorkData && (
              <Text style={styles.infoLabel}>
                Actual Duration: <Text style={styles.infoValue}>
                  {formatWorkDuration((application.workCompletedTimestamp - application.workStartedTimestamp) / (1000 * 60 * 60))}
                </Text>
              </Text>
            )}
            
            {/* Payment Amount */}
            <Text style={styles.infoLabel}>
              {hasActualWorkData ? 'Calculated Payment:' : 'Expected Payment:'} 
              <Text style={[styles.infoValue, styles.highlight]}> ₹{actualPayment}</Text>
            </Text>
            
            {/* Show original estimate for comparison */}
            {hasActualWorkData && application.expectedPayment && application.expectedPayment !== actualPayment && (
              <Text style={styles.infoLabel}>
                Original Estimate: <Text style={[styles.infoValue, styles.originalEstimate]}>
                  ₹{application.expectedPayment}
                </Text>
              </Text>
            )}
            
            {/* Payment Calculation Details */}
            {hasActualWorkData && (
              <View style={styles.calculationBox}>
                <Text style={styles.calculationText}>
                  Calculation: {((application.workCompletedTimestamp - application.workStartedTimestamp) / (1000 * 60 * 60)).toFixed(2)} hours × ₹{hourlyRate}/hour
                </Text>
              </View>
            )}
            
            {/* Payment Status */}
            {application.paymentStatus && (
              <View style={[
                styles.paymentStatus,
                application.paymentStatus === 'paid' ? styles.paymentStatusPaid : styles.paymentStatusPending
              ]}>
                <Text style={styles.paymentStatusText}>
                  Status: {application.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                </Text>
              </View>
            )}
            
            {/* Amount Paid */}
            {application.paymentAmount && (
              <Text style={styles.infoLabel}>Amount Paid: <Text style={[styles.infoValue, styles.highlight]}>₹{application.paymentAmount}</Text></Text>
            )}
          </View>
        )}

        {/* Rating Information (for completed jobs) */}
        {isJobCompleted && application.hasRating && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Rating</Text>
            <View style={styles.ratingDisplay}>
              <Text style={styles.ratingStars}>
                {'⭐'.repeat(application.employerRating)}{'☆'.repeat(5 - application.employerRating)}
              </Text>
              <Text style={styles.ratingValue}>{application.employerRating}/5 stars</Text>
              {application.employerComment && (
                <Text style={styles.ratingComment}>"{application.employerComment}"</Text>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Payment Button - Show for completed work awaiting payment */}
          {(application.journeyStatus === 'completed' || isAwaitingPayment) && application.paymentStatus !== 'paid' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={handleProcessPayment}
            >
              <Text style={styles.actionButtonIcon}>💰</Text>
              <Text style={styles.actionButtonText}>Process Payment - ₹{actualPayment}</Text>
            </TouchableOpacity>
          )}

          {/* Complete Job Button - Show after payment */}
          {application.paymentStatus === 'paid' && application.status !== 'completed' && !isAwaitingRating && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleCompleteJob}
            >
              <Text style={styles.actionButtonIcon}>✓</Text>
              <Text style={styles.actionButtonText}>Complete & Rate Job</Text>
            </TouchableOpacity>
          )}

          {/* Rate Worker Button - Show for awaiting rating or completed jobs without rating */}
          {(isAwaitingRating || (isJobCompleted && !application.hasRating)) && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.warning }]}
              onPress={handleRateWorker}
            >
              <Text style={styles.actionButtonIcon}>⭐</Text>
              <Text style={styles.actionButtonText}>Rate Worker Performance</Text>
            </TouchableOpacity>
          )}

          {/* View Job History Button - For completed jobs */}
          {isJobCompleted && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.info }]}
              onPress={handleViewJobHistory}
            >
              <Text style={styles.actionButtonIcon}>📋</Text>
              <Text style={styles.actionButtonText}>View Job History</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Secondary Actions */}
        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('JobLocation', { application, isEmployer: true })}
          >
            <Text style={styles.secondaryButtonText}>📍 View Location</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              navigation.navigate('ChatScreen', {
                applicationId: application.id,
                otherUser: application.workerId,
                jobTitle: job.title,
                otherUserName: application.workerName,
              })
            }
          >
            <Text style={styles.secondaryButtonText}>💬 Chat with Worker</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Rating Modal */}
      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleRatingSubmitted}
        ratingType="worker"
        ratingData={{
          jobId: job.id,
          jobTitle: job.title,
          workerId: application.workerId,
          workerName: application.workerName,
          employerId: application.employerId,
          employerName: job.companyName,
          applicationId: application.id,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusBanner: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
  },
  statusIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workDurationCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.text,
  },
  infoLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  highlight: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  originalEstimate: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  timerCard: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  timerTitle: {
    color: '#fff',
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  timerValue: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  timerSubtitle: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  workDurationValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.success,
    textAlign: 'center',
    marginBottom: 8,
  },
  workDurationNote: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  calculationBox: {
    backgroundColor: colors.info + '10',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  calculationText: {
    fontSize: 12,
    color: colors.info,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  paymentStatus: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  paymentStatusPaid: {
    backgroundColor: colors.success + '20',
  },
  paymentStatusPending: {
    backgroundColor: colors.warning + '20',
  },
  paymentStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  ratingDisplay: {
    alignItems: 'center',
    padding: 16,
  },
  ratingStars: {
    fontSize: 24,
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  ratingComment: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionsContainer: {
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonIcon: {
    fontSize: 20,
    marginRight: 8,
    color: colors.white,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryActions: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 30,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButtonText: {
    fontWeight: '600',
    color: colors.text,
    fontSize: 14,
  },
});

export default EmployerJobTrackingScreen;