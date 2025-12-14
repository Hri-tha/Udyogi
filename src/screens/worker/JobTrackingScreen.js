// src/screens/worker/JobTrackingScreen.js - HINDI VERSION
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
import { useLanguage } from '../../context/LanguageContext';
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
  const { locale, t } = useLanguage();

  const [application, setApplication] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [workDuration, setWorkDuration] = useState(0);

  const workTimerRef = useRef(null);

  // Translations for this screen
  const translations = {
    en: {
      headerTitle: 'Job Tracking',
      backButton: '← Back',
      loadingText: 'Loading job details...',
      error: 'Error',
      failedToLoad: 'Failed to load job details',
      jobNotFound: 'Job not found',
      retry: 'Retry',
      jobAccepted: 'Job accepted! Ready to start your journey?',
      onTheWay: 'On the way to job location',
      reachedLocation: 'Reached location! Ready to start work?',
      workInProgress: 'Work in progress...',
      workCompleted: 'Work completed! Awaiting payment',
      jobDetails: 'Job details',
      jobInformation: 'Job Information',
      jobTitle: 'Job Title',
      companyName: 'Company Name',
      location: 'Location',
      schedule: 'Schedule',
      date: 'Date',
      time: 'Time',
      expectedDuration: 'Expected Duration',
      hours: 'hours',
      notSpecified: 'Not specified',
      workTimer: 'Work Timer',
      payment: 'Payment',
      hourlyRate: 'Hourly Rate',
      expectedPayment: 'Expected Payment',
      perHour: '/hour',
      onTheWayAction: "I'm On the Way",
      reachedAction: 'I Have Reached',
      startWork: 'Start Working',
      completeWork: 'Complete Work',
      viewLocation: '📍 View Location',
      chatEmployer: '💬 Chat with Employer',
      startJourney: 'Start Journey',
      confirmOnTheWay: 'Are you heading to the job location?',
      cancel: 'Cancel',
      confirmOnTheWayYes: 'Yes, On My Way',
      employerNotified: 'Employer notified that you are on the way!',
      reachedLocationAlert: 'Reached Location',
      confirmReached: 'Have you arrived at the job site?',
      confirmReachedYes: 'Yes, I Reached',
      reachedNotification: 'Employer notified that you have arrived!',
      startWorking: 'Start Working',
      readyToBegin: 'Ready to begin?',
      startWorkButton: 'Start Work',
      workTimerStarted: 'Work timer started!',
      completeWorkAlert: 'Complete Work',
      completeWorkConfirm: 'Are you sure you want to mark this work as completed? This will stop the timer and notify the employer for payment.',
      completeWorkButton: 'Complete Work',
      workCompleteSuccess: 'Work completed! Employer has been notified for payment processing.',
      ok: 'OK',
      cannotStartYet: 'Cannot Start Yet',
      cannotStartMessage: 'You can start work in {minutes} minutes.',
      reachFirst: 'Please reach the location before starting work.',
      success: 'Success',
      failed: 'Failed',
      chat: 'Chat',
      navigate: 'Navigate',
      updateError: 'Failed to update status.',
      processing: 'Processing...',
      waiting: 'Waiting...',
      estimated: 'Estimated',
      currentStatus: 'Current Status',
      progress: 'Progress',
      nextStep: 'Next Step',
      instructions: 'Instructions',
      update: 'Update',
      track: 'Track',
      monitor: 'Monitor',
      journey: 'Journey',
      work: 'Work',
      complete: 'Complete',
      status: 'Status',
      updateStatus: 'Update Status',
      current: 'Current',
      upcoming: 'Upcoming',
      completed: 'Completed',
      pending: 'Pending',
      inProgress: 'In Progress',
    },
    hi: {
      headerTitle: 'नौकरी ट्रैकिंग',
      backButton: '← वापस',
      loadingText: 'नौकरी विवरण लोड हो रहा है...',
      error: 'त्रुटि',
      failedToLoad: 'नौकरी विवरण लोड करने में विफल',
      jobNotFound: 'नौकरी नहीं मिली',
      retry: 'पुनः प्रयास करें',
      jobAccepted: 'नौकरी स्वीकृत! अपनी यात्रा शुरू करने के लिए तैयार?',
      onTheWay: 'नौकरी स्थान की ओर जा रहे हैं',
      reachedLocation: 'स्थान पर पहुंच गए! काम शुरू करने के लिए तैयार?',
      workInProgress: 'काम चल रहा है...',
      workCompleted: 'काम पूरा हुआ! भुगतान की प्रतीक्षा',
      jobDetails: 'नौकरी विवरण',
      jobInformation: 'नौकरी जानकारी',
      jobTitle: 'नौकरी शीर्षक',
      companyName: 'कंपनी का नाम',
      location: 'स्थान',
      schedule: 'शेड्यूल',
      date: 'तारीख',
      time: 'समय',
      expectedDuration: 'अनुमानित अवधि',
      hours: 'घंटे',
      notSpecified: 'निर्दिष्ट नहीं',
      workTimer: 'काम का टाइमर',
      payment: 'भुगतान',
      hourlyRate: 'प्रति घंटा दर',
      expectedPayment: 'अनुमानित भुगतान',
      perHour: '/घंटा',
      onTheWayAction: 'मैं रास्ते में हूं',
      reachedAction: 'मैं पहुंच गया हूं',
      startWork: 'काम शुरू करें',
      completeWork: 'काम पूरा करें',
      viewLocation: '📍 स्थान देखें',
      chatEmployer: '💬 नियोक्ता से चैट करें',
      startJourney: 'यात्रा शुरू करें',
      confirmOnTheWay: 'क्या आप नौकरी स्थान की ओर जा रहे हैं?',
      cancel: 'रद्द करें',
      confirmOnTheWayYes: 'हां, मैं रास्ते में हूं',
      employerNotified: 'नियोक्ता को सूचित किया गया कि आप रास्ते में हैं!',
      reachedLocationAlert: 'स्थान पर पहुंचे',
      confirmReached: 'क्या आप नौकरी स्थल पर पहुंच गए हैं?',
      confirmReachedYes: 'हां, मैं पहुंच गया हूं',
      reachedNotification: 'नियोक्ता को सूचित किया गया कि आप पहुंच गए हैं!',
      startWorking: 'काम शुरू करें',
      readyToBegin: 'शुरुआत के लिए तैयार?',
      startWorkButton: 'काम शुरू करें',
      workTimerStarted: 'काम का टाइमर शुरू हुआ!',
      completeWorkAlert: 'काम पूरा करें',
      completeWorkConfirm: 'क्या आप वाकई इस काम को पूरा के रूप में चिह्नित करना चाहते हैं? यह टाइमर बंद कर देगा और भुगतान के लिए नियोक्ता को सूचित करेगा।',
      completeWorkButton: 'काम पूरा करें',
      workCompleteSuccess: 'काम पूरा हुआ! भुगतान प्रसंस्करण के लिए नियोक्ता को सूचित किया गया है।',
      ok: 'ठीक है',
      cannotStartYet: 'अभी तक शुरू नहीं कर सकते',
      cannotStartMessage: 'आप {minutes} मिनट में काम शुरू कर सकते हैं।',
      reachFirst: 'कृपया काम शुरू करने से पहले स्थान पर पहुंचें।',
      success: 'सफलता',
      failed: 'विफल',
      chat: 'चैट',
      navigate: 'नेविगेट करें',
      updateError: 'स्थिति अपडेट करने में विफल।',
      processing: 'प्रसंस्करण...',
      waiting: 'प्रतीक्षा...',
      estimated: 'अनुमानित',
      currentStatus: 'वर्तमान स्थिति',
      progress: 'प्रगति',
      nextStep: 'अगला कदम',
      instructions: 'निर्देश',
      update: 'अपडेट',
      track: 'ट्रैक करें',
      monitor: 'मॉनिटर करें',
      journey: 'यात्रा',
      work: 'काम',
      complete: 'पूरा',
      status: 'स्थिति',
      updateStatus: 'स्थिति अपडेट करें',
      current: 'वर्तमान',
      upcoming: 'आगामी',
      completed: 'पूरा हुआ',
      pending: 'लंबित',
      inProgress: 'प्रगति में',
    }
  };

  const tr = translations[locale] || translations.en;

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
      Alert.alert(tr.error, tr.failedToLoad);
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
    if (!timeStr) return tr.notSpecified;
    return String(timeStr);
  };

  const updateStatus = async (status, successMsg) => {
    setUpdating(true);
    try {
      const result = await updateWorkerJourneyStatus(applicationId, status);
      if (!result.success) {
        Alert.alert(tr.error, result.error || tr.updateError);
        return;
      }
      Alert.alert(tr.success, successMsg);
    } catch (err) {
      Alert.alert(tr.error, err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleOnTheWay = () => {
    Alert.alert(tr.startJourney, tr.confirmOnTheWay, [
      { text: tr.cancel, style: 'cancel' },
      {
        text: tr.confirmOnTheWayYes,
        onPress: () => updateStatus('onTheWay', tr.employerNotified),
      },
    ]);
  };

  const handleReached = () => {
    Alert.alert(tr.reachedLocationAlert, tr.confirmReached, [
      { text: tr.cancel, style: 'cancel' },
      {
        text: tr.confirmReachedYes,
        onPress: () => updateStatus('reached', tr.reachedNotification),
      },
    ]);
  };

  const handleStartWork = async () => {
    setUpdating(true);
    try {
      const check = await checkCanStartWork(applicationId);

      if (!check.success) {
        setUpdating(false);
        Alert.alert(tr.error, check.error);
        return;
      }

      if (!check.canStart) {
        setUpdating(false);
        const msg =
          check.minutesUntilStart > 0
            ? tr.cannotStartMessage.replace('{minutes}', check.minutesUntilStart)
            : tr.reachFirst;
        Alert.alert(tr.cannotStartYet, msg);
        return;
      }

      Alert.alert(tr.startWorking, tr.readyToBegin, [
        { text: tr.cancel, onPress: () => setUpdating(false) },
        {
          text: tr.startWorkButton,
          onPress: async () => {
            await updateStatus('started', tr.workTimerStarted);
          },
        },
      ]);
    } catch (err) {
      Alert.alert(tr.error, err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteWork = () => {
    Alert.alert(
      tr.completeWorkAlert,
      tr.completeWorkConfirm,
      [
        { text: tr.cancel, style: 'cancel' },
        {
          text: tr.completeWorkButton,
          onPress: async () => {
            setUpdating(true);
            try {
              // Use updateWorkerJourneyStatus to properly set completion timestamp
              const result = await updateWorkerJourneyStatus(applicationId, 'completed');
              
              if (result.success) {
                Alert.alert(
                  tr.success, 
                  tr.workCompleteSuccess,
                  [
                    {
                      text: tr.ok,
                      onPress: () => navigation.goBack()
                    }
                  ]
                );
              } else {
                Alert.alert(tr.error, result.error || tr.failedToLoad);
              }
            } catch (error) {
              console.error('Complete work error:', error);
              Alert.alert(tr.error, error.message || tr.failedToLoad);
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const getStatusMessage = () => {
    if (!application?.journeyStatus) return tr.jobDetails;
    
    switch (application.journeyStatus) {
      case 'accepted':
        return tr.jobAccepted;
      case 'onTheWay':
        return tr.onTheWay;
      case 'reached':
        return tr.reachedLocation;
      case 'started':
        return tr.workInProgress;
      case 'completed':
        return tr.workCompleted;
      default:
        return tr.jobDetails;
    }
  };

  const getStatusColor = () => {
    switch (application?.journeyStatus) {
      case 'accepted': return '#3498db30';
      case 'onTheWay': return '#f39c1230';
      case 'reached': return '#27ae6030';
      case 'started': return '#007AFF30';
      case 'completed': return '#27ae6030';
      default: return '#3498db30';
    }
  };

  // UI render
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{tr.loadingText}</Text>
      </View>
    );
  }

  if (!application || !job) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>{tr.backButton}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{tr.headerTitle}</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{tr.jobNotFound}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadInitialData}>
            <Text style={styles.retryButtonText}>{tr.retry}</Text>
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
          <Text style={styles.backButton}>{tr.backButton}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tr.headerTitle}</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusMessage}>{getStatusMessage()}</Text>
        </View>

        {/* Job Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr.jobInformation}</Text>
          <Text style={styles.infoValue}>{String(job.title || tr.jobTitle)}</Text>
          <Text style={styles.infoValue}>{String(job.companyName || tr.companyName)}</Text>
          <Text style={styles.infoValue}>{String(job.location || tr.location)}</Text>
        </View>

        {/* Schedule */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr.schedule}</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{tr.date}: </Text>
            <Text style={styles.infoValue}>{String(job.jobDate || tr.notSpecified)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{tr.time}: </Text>
            <Text style={styles.infoValue}>
              {parseTimeString(job.startTime)} - {parseTimeString(job.endTime)}
            </Text>
          </View>
          
          {job.expectedDuration ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{tr.expectedDuration}: </Text>
              <Text style={styles.infoValue}>{String(job.expectedDuration)} {tr.hours}</Text>
            </View>
          ) : null}
        </View>

        {/* Timer */}
        {status === 'started' && (
          <View style={styles.timerCard}>
            <Text style={styles.timerTitle}>{tr.workTimer}</Text>
            <Text style={styles.timerValue}>{formatDuration(workDuration)}</Text>
          </View>
        )}

        {/* Payment */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr.payment}</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{tr.hourlyRate}: </Text>
            <Text style={styles.infoValue}>₹{String(job.rate || '0')}{tr.perHour}</Text>
          </View>
          
          {job.totalPayment ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{tr.expectedPayment}: </Text>
              <Text style={styles.infoValue}>₹{String(job.totalPayment)}</Text>
            </View>
          ) : null}
        </View>

        {/* Progress Steps */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr.progress}</Text>
          
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, { backgroundColor: status === 'accepted' ? colors.primary : colors.border }]} />
            <Text style={styles.progressText}>{tr.jobAccepted}</Text>
          </View>
          
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, { backgroundColor: status === 'onTheWay' ? colors.warning : colors.border }]} />
            <Text style={styles.progressText}>{tr.onTheWay}</Text>
          </View>
          
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, { backgroundColor: status === 'reached' ? colors.info : colors.border }]} />
            <Text style={styles.progressText}>{tr.reachedLocation}</Text>
          </View>
          
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, { backgroundColor: status === 'started' ? colors.primary : colors.border }]} />
            <Text style={styles.progressText}>{tr.workInProgress}</Text>
          </View>
          
          <View style={styles.progressStep}>
            <View style={[styles.progressDot, { backgroundColor: status === 'completed' ? colors.success : colors.border }]} />
            <Text style={styles.progressText}>{tr.workCompleted}</Text>
          </View>
        </View>

        {/* ACTIONS */}
        <View style={styles.actionsContainer}>
          {status === 'accepted' && (
            <ActionBtn 
              title={tr.onTheWayAction} 
              onPress={handleOnTheWay} 
              loading={updating} 
              color={colors.warning} 
            />
          )}
          {status === 'onTheWay' && (
            <ActionBtn 
              title={tr.reachedAction} 
              onPress={handleReached} 
              loading={updating} 
              color={colors.info} 
            />
          )}
          {status === 'reached' && (
            <ActionBtn 
              title={tr.startWork} 
              onPress={handleStartWork} 
              loading={updating} 
              color={colors.primary} 
            />
          )}
          {status === 'started' && (
            <ActionBtn 
              title={tr.completeWork} 
              onPress={handleCompleteWork} 
              loading={updating} 
              color={colors.success} 
            />
          )}
        </View>

        {/* Secondary Actions */}
        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={[styles.secondaryButton, { marginRight: 5 }]}
            onPress={() => navigation.navigate('JobLocation', { application })}
          >
            <Text style={styles.secondaryText}>{tr.viewLocation}</Text>
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
            <Text style={styles.secondaryText}>{tr.chatEmployer}</Text>
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
    borderBottomColor: colors.border || '#e0e0e0',
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
    marginBottom: 16,
    color: colors.text || '#000',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    flexWrap: 'wrap'
  },
  infoLabel: {
    fontSize: 15,
    color: colors.textSecondary || '#666',
    fontWeight: '600',
    minWidth: 120,
  },
  infoValue: { 
    fontSize: 16, 
    color: colors.text || '#000',
    fontWeight: '500',
    flex: 1,
    marginBottom: 8,
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

  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  progressText: {
    fontSize: 14,
    color: colors.text || '#000',
    fontWeight: '500',
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
    paddingHorizontal: 24,
    paddingVertical: 12,
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