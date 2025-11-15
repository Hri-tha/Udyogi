// src/screens/employer/EmployerJobTrackingScreen.js
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

const EmployerJobTrackingScreen = ({ route, navigation }) => {
  const { applicationId } = route.params;

  const [application, setApplication] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workDuration, setWorkDuration] = useState(0);

  // Load initial data
  useEffect(() => {
    loadInitialData();

    // Real-time listener for application updates
    const unsubscribe = onApplicationUpdate(applicationId, (updatedApp) => {
      setApplication(updatedApp);
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

  const getStatusInfo = () => {
    switch (application?.journeyStatus) {
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
          message: 'Worker has completed the job. Process payment to finalize.',
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
    if (application?.journeyStatus !== 'completed') {
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
          <Text style={styles.infoValue}>Rate: ₹{job.rate}/hour</Text>
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
          </View>
        )}

        {/* Payment Information */}
        {(application.journeyStatus === 'completed' || application.paymentStatus) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Details</Text>
            <Text style={styles.infoLabel}>Hourly Rate: <Text style={styles.infoValue}>₹{job.rate}/hour</Text></Text>
            <Text style={styles.infoLabel}>Expected Payment: <Text style={styles.infoValue}>₹{application.expectedPayment || job.totalPayment || 0}</Text></Text>
            {application.calculatedPayment && (
              <Text style={styles.infoLabel}>Calculated Payment: <Text style={[styles.infoValue, styles.highlight]}>₹{application.calculatedPayment}</Text></Text>
            )}
            {application.paymentStatus && (
              <View style={styles.paymentStatus}>
                <Text style={styles.paymentStatusText}>
                  Status: {application.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {application.journeyStatus === 'completed' && application.paymentStatus !== 'paid' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={handleProcessPayment}
            >
              <Text style={styles.actionButtonIcon}>💰</Text>
              <Text style={styles.actionButtonText}>Process Payment</Text>
            </TouchableOpacity>
          )}

          {application.paymentStatus === 'paid' && application.status !== 'completed' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleCompleteJob}
            >
              <Text style={styles.actionButtonIcon}>✓</Text>
              <Text style={styles.actionButtonText}>Complete & Rate Job</Text>
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
  paymentStatus: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.success + '20',
    borderRadius: 8,
    alignItems: 'center',
  },
  paymentStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
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