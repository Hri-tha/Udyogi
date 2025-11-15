// src/screens/worker/JobTrackingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../constants/colors';
import {
  updateWorkerJourneyStatus,
  checkCanStartWork,
  onApplicationUpdate,
} from '../../services/database';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const JobTrackingScreen = ({ route, navigation }) => {
  const { applicationId } = route.params;

  const [application, setApplication] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [workDuration, setWorkDuration] = useState(0);

  const workTimerRef = useRef(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();

    // Real-time listener
    const unsubscribe = onApplicationUpdate(applicationId, (updatedApp) => {
      setApplication(updatedApp);
    });

    return () => {
      unsubscribe();
      clearInterval(workTimerRef.current);
    };
  }, [applicationId]);

  const loadInitialData = async () => {
    try {
      const appRef = doc(db, 'applications', applicationId);
      const appSnap = await getDoc(appRef);

      if (!appSnap.exists()) {
        setLoading(false);
        return;
      }

      const appData = { id: appSnap.id, ...appSnap.data() };
      setApplication(appData);

      if (appData.jobId) {
        const jobRef = doc(db, 'jobs', appData.jobId);
        const jobSnap = await getDoc(jobRef);
        if (jobSnap.exists()) setJob({ id: jobSnap.id, ...jobSnap.data() });
      }
    } catch (err) {
      console.error('Load error:', err);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  // Timer start when "started"
  useEffect(() => {
    clearInterval(workTimerRef.current);

    if (application?.journeyStatus === 'started' && application?.workStartedTimestamp) {
      workTimerRef.current = setInterval(() => {
        const now = Date.now();
        const start = application.workStartedTimestamp;
        setWorkDuration((now - start) / 1000);
      }, 1000);
    }

    return () => clearInterval(workTimerRef.current);
  }, [application?.journeyStatus, application?.workStartedTimestamp]);

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}`;
  };

  const parseTimeString = (timeStr) => {
    if (!timeStr) return 'Not specified';
    return String(timeStr);
  };

  const updateStatus = async (status, successMsg) => {
    setUpdating(true);
    try {
      const result = await updateWorkerJourneyStatus(applicationId, status);
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to update status.');
        return;
      }
      Alert.alert('Success', successMsg);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleOnTheWay = () => {
    Alert.alert('Start Journey', 'Are you heading to the job location?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, On My Way',
        onPress: () => updateStatus('onTheWay', 'Employer notified that you are on the way!'),
      },
    ]);
  };

  const handleReached = () => {
    Alert.alert('Reached Location', 'Have you arrived at the job site?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, I Reached',
        onPress: () => updateStatus('reached', 'Employer notified that you have arrived!'),
      },
    ]);
  };

  const handleStartWork = async () => {
    setUpdating(true);
    try {
      const check = await checkCanStartWork(applicationId);

      if (!check.success) {
        setUpdating(false);
        Alert.alert('Error', check.error);
        return;
      }

      if (!check.canStart) {
        setUpdating(false);
        const msg =
          check.minutesUntilStart > 0
            ? `You can start work in ${check.minutesUntilStart} minutes.`
            : 'Please reach the location before starting work.';
        Alert.alert('Cannot Start Yet', msg);
        return;
      }

      Alert.alert('Start Working', 'Ready to begin?', [
        { text: 'Cancel', onPress: () => setUpdating(false) },
        {
          text: 'Start Work',
          onPress: async () => {
            await updateStatus('started', 'Work timer started!');
          },
        },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteWork = () => {
    Alert.alert(
      'Complete Work',
      'Confirm you completed all tasks. Employer will process payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Work',
          onPress: async () => {
            await updateStatus('completed', 'Work completed! Await payment.');
            navigation.goBack();
          },
        },
      ]
    );
  };

  const getStatusMessage = () => {
    if (!application?.journeyStatus) return 'Job details';
    
    switch (application.journeyStatus) {
      case 'accepted':
        return 'Job accepted! Ready to start your journey?';
      case 'onTheWay':
        return 'On the way to job location';
      case 'reached':
        return 'Reached location! Ready to start work?';
      case 'started':
        return 'Work in progress...';
      case 'completed':
        return 'Work completed! Awaiting payment';
      default:
        return 'Job details';
    }
  };

  // UI render
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading job details...</Text>
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
          <Text style={styles.errorText}>Job not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadInitialData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const status = application.journeyStatus || 'accepted';

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
        <View style={[styles.statusBanner, styles[`status_${status}`] || styles.status_accepted]}>
          <Text style={styles.statusMessage}>{getStatusMessage()}</Text>
        </View>

        {/* Job Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Job Information</Text>
          <Text style={styles.infoValue}>{String(job.title || 'Job Title')}</Text>
          <Text style={styles.infoValue}>{String(job.companyName || 'Company Name')}</Text>
          <Text style={styles.infoValue}>{String(job.location || 'Location')}</Text>
        </View>

        {/* Schedule */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Schedule</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date: </Text>
            <Text style={styles.infoValue}>{String(job.jobDate || 'Not specified')}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Time: </Text>
            <Text style={styles.infoValue}>
              {parseTimeString(job.startTime)} - {parseTimeString(job.endTime)}
            </Text>
          </View>
          
          {job.expectedDuration ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Expected Duration: </Text>
              <Text style={styles.infoValue}>{String(job.expectedDuration)} hours</Text>
            </View>
          ) : null}
        </View>

        {/* Timer */}
        {status === 'started' && (
          <View style={styles.timerCard}>
            <Text style={styles.timerTitle}>Work Timer</Text>
            <Text style={styles.timerValue}>{formatDuration(workDuration)}</Text>
          </View>
        )}

        {/* Payment */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hourly Rate: </Text>
            <Text style={styles.infoValue}>₹{String(job.rate || '0')}/hour</Text>
          </View>
          
          {job.totalPayment ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Expected Payment: </Text>
              <Text style={styles.infoValue}>₹{String(job.totalPayment)}</Text>
            </View>
          ) : null}
        </View>

        {/* ACTIONS */}
        <View style={styles.actionsContainer}>
          {status === 'accepted' && (
            <ActionBtn title="I'm On the Way" onPress={handleOnTheWay} loading={updating} color={colors.warning} />
          )}
          {status === 'onTheWay' && (
            <ActionBtn title="I Have Reached" onPress={handleReached} loading={updating} color={colors.info} />
          )}
          {status === 'reached' && (
            <ActionBtn title="Start Working" onPress={handleStartWork} loading={updating} color={colors.primary} />
          )}
          {status === 'started' && (
            <ActionBtn title="Complete Work" onPress={handleCompleteWork} loading={updating} color={colors.success} />
          )}
        </View>

        {/* Secondary Actions */}
        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={[styles.secondaryButton, { marginRight: 5 }]}
            onPress={() => navigation.navigate('JobLocation', { application })}
          >
            <Text style={styles.secondaryText}>📍 View Location</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { marginLeft: 5 }]}
            onPress={() =>
              navigation.navigate('ChatScreen', {
                applicationId: application.id,
                otherUser: application.employerId,
                jobTitle: job.title,
                otherUserName: job.companyName,
              })
            }
          >
            <Text style={styles.secondaryText}>💬 Chat with Employer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const ActionBtn = ({ title, onPress, loading, color }) => (
  <TouchableOpacity 
    style={[styles.actionButton, { backgroundColor: color }]} 
    onPress={onPress} 
    disabled={loading}
  >
    {loading ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Text style={styles.actionText}>{title}</Text>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background || '#f5f5f5'
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: colors.background || '#f5f5f5'
  },
  loadingText: { 
    marginTop: 10, 
    color: colors.textSecondary || '#666',
    fontSize: 16
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: colors.white || '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: { 
    color: colors.primary || '#007AFF', 
    fontWeight: '600', 
    fontSize: 16 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: colors.text || '#000'
  },
  content: { 
    padding: 20 
  },
  statusBanner: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  status_accepted: { backgroundColor: '#3498db30' },
  status_onTheWay: { backgroundColor: '#f39c1230' },
  status_reached: { backgroundColor: '#27ae6030' },
  status_started: { backgroundColor: '#007AFF30' },
  status_completed: { backgroundColor: '#27ae6030' },

  statusMessage: { 
    fontSize: 16, 
    fontWeight: '600', 
    textAlign: 'center', 
    color: colors.text || '#000'
  },

  card: {
    backgroundColor: colors.white || '#fff',
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
    color: colors.text || '#000',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap'
  },
  infoLabel: {
    fontSize: 15,
    color: colors.textSecondary || '#666',
  },
  infoValue: { 
    fontSize: 16, 
    color: colors.text || '#000',
    fontWeight: '500',
    flex: 1
  },

  timerCard: {
    backgroundColor: colors.primary || '#007AFF',
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
  },

  actionsContainer: {
    marginTop: 10,
  },
  actionButton: {
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionText: { 
    color: '#fff', 
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
    backgroundColor: colors.white || '#fff',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryText: { 
    fontWeight: '600',
    color: colors.text || '#000',
    fontSize: 14,
  },

  retryButton: {
    backgroundColor: colors.primary || '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: { 
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  errorText: { 
    textAlign: 'center', 
    fontSize: 18,
    color: colors.textSecondary || '#666',
    marginBottom: 20
  },
});

export default JobTrackingScreen;