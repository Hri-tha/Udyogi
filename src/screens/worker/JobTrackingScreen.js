// src/screens/worker/JobTrackingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Platform, ActivityIndicator, Animated,
} from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/colors';
import {
  updateWorkerJourneyStatus,
  checkCanStartWork,
  onApplicationUpdate,
} from '../../services/database';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

// ─── Theme ─────────────────────────────────────────────────────────────────
const ACCENT   = '#4F63D2';
const SUCCESS  = '#22C55E';
const WARNING  = '#F59E0B';
const INFO     = '#3B82F6';
const DANGER   = '#EF4444';
const BG       = '#F7F8FC';
const WHITE    = '#FFFFFF';
const BORDER   = '#ECEEF5';
const TEXT     = '#1A1D2E';
const MUTED    = '#8A8FA8';
const CARD_SH  = { shadowColor: '#1A1D2E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 };

const STEPS = [
  { key: 'accepted',  icon: '✓',  label: 'Job accepted',       color: ACCENT },
  { key: 'onTheWay',  icon: '🚗', label: 'On the way',         color: WARNING },
  { key: 'reached',   icon: '📍', label: 'Reached location',   color: INFO },
  { key: 'started',   icon: '⚡', label: 'Work started',       color: ACCENT },
  { key: 'completed', icon: '✅', label: 'Work completed',     color: SUCCESS },
];

const STEP_INDEX = Object.fromEntries(STEPS.map((s, i) => [s.key, i]));

const JobTrackingScreen = ({ route, navigation }) => {
  const { applicationId } = route.params;
  const { locale } = useLanguage();

  // ── FIX: resolve UID from all available sources ────────────────────────
  const { user, userProfile, resolvedUid } = useAuth();

  const [application, setApplication] = useState(null);
  const [job,         setJob]          = useState(null);
  const [loading,     setLoading]      = useState(true);
  const [updating,    setUpdating]     = useState(false);
  const [workDuration,setWorkDuration] = useState(0);

  const workTimerRef = useRef(null);
  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const translations = {
    en: {
      headerTitle: 'Job Tracking',
      back: '‹',
      loadingText: 'Loading job details…',
      error: 'Error',
      failedToLoad: 'Failed to load job details',
      jobNotFound: 'Job not found',
      retry: 'Retry',
      jobDetails: 'Job Details',
      schedule: 'Schedule',
      date: 'Date',
      time: 'Time',
      expectedDuration: 'Expected Duration',
      hours: 'hrs',
      notSpecified: 'Not specified',
      workTimer: 'Work Timer',
      payment: 'Payment',
      hourlyRate: 'Hourly Rate',
      expectedPayment: 'Expected Payment',
      perHour: '/hr',
      onTheWayAction: "I'm On the Way",
      reachedAction: 'I Have Reached',
      startWork: 'Start Working',
      completeWork: 'Complete Work',
      viewLocation: 'View Location',
      chatEmployer: 'Chat with Employer',
      startJourney: 'Start Journey',
      confirmOnTheWay: 'Confirm you are heading to the job location?',
      cancel: 'Cancel',
      confirmOnTheWayYes: "Yes, On My Way",
      employerNotified: 'Employer notified — you are on the way!',
      reachedLocationAlert: 'Reached Location',
      confirmReached: 'Have you arrived at the job site?',
      confirmReachedYes: 'Yes, I Arrived',
      reachedNotification: 'Employer notified — you have arrived!',
      startWorking: 'Start Working',
      readyToBegin: 'Ready to begin work?',
      startWorkButton: 'Start Work',
      workTimerStarted: 'Work timer started!',
      completeWorkAlert: 'Complete Work',
      completeWorkConfirm: 'Mark this work as completed? This will stop the timer and notify the employer for payment.',
      completeWorkButton: 'Yes, Complete',
      workCompleteSuccess: 'Work completed! Employer has been notified for payment.',
      ok: 'OK',
      cannotStartYet: 'Cannot Start Yet',
      cannotStartMessage: 'You can start in {minutes} minutes.',
      reachFirst: 'Please reach the location before starting.',
      success: 'Success',
      updateError: 'Failed to update status.',
      progress: 'Journey Progress',
    },
    hi: {
      headerTitle: 'नौकरी ट्रैकिंग',
      back: '‹',
      loadingText: 'लोड हो रहा है…',
      error: 'त्रुटि',
      failedToLoad: 'लोड करने में विफल',
      jobNotFound: 'नौकरी नहीं मिली',
      retry: 'पुनः प्रयास',
      jobDetails: 'नौकरी विवरण',
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
      reachedAction: 'मैं पहुंच गया',
      startWork: 'काम शुरू करें',
      completeWork: 'काम पूरा करें',
      viewLocation: 'स्थान देखें',
      chatEmployer: 'नियोक्ता से चैट',
      startJourney: 'यात्रा शुरू',
      confirmOnTheWay: 'क्या आप नौकरी स्थान की ओर जा रहे हैं?',
      cancel: 'रद्द करें',
      confirmOnTheWayYes: 'हां, रास्ते में',
      employerNotified: 'नियोक्ता को सूचित किया गया!',
      reachedLocationAlert: 'स्थान पर पहुंचे',
      confirmReached: 'क्या आप पहुंच गए हैं?',
      confirmReachedYes: 'हां, पहुंच गया',
      reachedNotification: 'नियोक्ता को सूचित किया गया!',
      startWorking: 'काम शुरू',
      readyToBegin: 'शुरू करने के लिए तैयार?',
      startWorkButton: 'शुरू करें',
      workTimerStarted: 'टाइमर शुरू!',
      completeWorkAlert: 'काम पूरा करें',
      completeWorkConfirm: 'काम को पूर्ण के रूप में चिह्नित करें?',
      completeWorkButton: 'हां, पूरा करें',
      workCompleteSuccess: 'काम पूरा! नियोक्ता को सूचित किया गया।',
      ok: 'ठीक है',
      cannotStartYet: 'अभी नहीं',
      cannotStartMessage: '{minutes} मिनट में शुरू कर सकते हैं।',
      reachFirst: 'पहले स्थान पर पहुंचें।',
      success: 'सफलता',
      updateError: 'अपडेट विफल।',
      progress: 'यात्रा प्रगति',
    },
  };

  const tr = translations[locale] || translations.en;

  useEffect(() => {
    loadInitialData();
    const unsubscribe = onApplicationUpdate(applicationId, (updatedApp) => {
      setApplication(updatedApp);
    });
    return () => {
      unsubscribe();
      clearInterval(workTimerRef.current);
    };
  }, [applicationId]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [loading]);

  useEffect(() => {
    if (application) {
      const idx = STEP_INDEX[application.journeyStatus] ?? 0;
      Animated.spring(progressAnim, {
        toValue:        idx / (STEPS.length - 1),
        useNativeDriver: false,
        tension:        40,
        friction:       8,
      }).start();
    }
  }, [application?.journeyStatus]);

  const loadInitialData = async () => {
    try {
      const appRef  = doc(db, 'applications', applicationId);
      const appSnap = await getDoc(appRef);
      if (!appSnap.exists()) { setLoading(false); return; }
      const appData = { id: appSnap.id, ...appSnap.data() };
      setApplication(appData);
      if (appData.jobId) {
        const jobRef  = doc(db, 'jobs', appData.jobId);
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

  useEffect(() => {
    clearInterval(workTimerRef.current);
    if (application?.journeyStatus === 'started' && application?.workStartedTimestamp) {
      workTimerRef.current = setInterval(() => {
        setWorkDuration((Date.now() - application.workStartedTimestamp) / 1000);
      }, 1000);
    }
    return () => clearInterval(workTimerRef.current);
  }, [application?.journeyStatus, application?.workStartedTimestamp]);

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

  const handleOnTheWay = () =>
    Alert.alert(tr.startJourney, tr.confirmOnTheWay, [
      { text: tr.cancel, style: 'cancel' },
      { text: tr.confirmOnTheWayYes, onPress: () => updateStatus('onTheWay', tr.employerNotified) },
    ]);

  const handleReached = () =>
    Alert.alert(tr.reachedLocationAlert, tr.confirmReached, [
      { text: tr.cancel, style: 'cancel' },
      { text: tr.confirmReachedYes, onPress: () => updateStatus('reached', tr.reachedNotification) },
    ]);

  const handleStartWork = async () => {
    setUpdating(true);
    try {
      const check = await checkCanStartWork(applicationId);
      if (!check.success) { Alert.alert(tr.error, check.error); return; }
      if (!check.canStart) {
        const msg = check.minutesUntilStart > 0
          ? tr.cannotStartMessage.replace('{minutes}', check.minutesUntilStart)
          : tr.reachFirst;
        Alert.alert(tr.cannotStartYet, msg);
        return;
      }
      Alert.alert(tr.startWorking, tr.readyToBegin, [
        { text: tr.cancel, onPress: () => setUpdating(false) },
        { text: tr.startWorkButton, onPress: async () => { await updateStatus('started', tr.workTimerStarted); } },
      ]);
    } catch (err) {
      Alert.alert(tr.error, err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteWork = () =>
    Alert.alert(tr.completeWorkAlert, tr.completeWorkConfirm, [
      { text: tr.cancel, style: 'cancel' },
      {
        text: tr.completeWorkButton,
        onPress: async () => {
          setUpdating(true);
          try {
            const result = await updateWorkerJourneyStatus(applicationId, 'completed');
            if (result.success) {
              Alert.alert(tr.success, tr.workCompleteSuccess, [
                { text: tr.ok, onPress: () => navigation.goBack() },
              ]);
            } else {
              Alert.alert(tr.error, result.error || tr.failedToLoad);
            }
          } catch (error) {
            Alert.alert(tr.error, error.message || tr.failedToLoad);
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);

  // ── FIX: resolve UID before navigating to chat ────────────────────────
  const handleChatWithEmployer = () => {
    const currentUserId = resolvedUid || user?.uid || userProfile?.uid;
    if (!currentUserId) {
      Alert.alert(tr.error, 'Unable to open chat. Please log in again.');
      return;
    }
    navigation.navigate('ChatScreen', {
      applicationId,
      otherUser:     application.employerId,
      jobTitle:      job?.title,
      otherUserName: job?.companyName,
      currentUserId,
    });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.fullCenter}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>{tr.loadingText}</Text>
      </View>
    );
  }

  if (!application || !job) {
    return (
      <View style={styles.screen}>
        <Header title={tr.headerTitle} back={tr.back} onBack={() => navigation.goBack()} />
        <View style={styles.fullCenter}>
          <Text style={styles.errorText}>{tr.jobNotFound}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadInitialData}>
            <Text style={styles.retryBtnText}>{tr.retry}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const status   = application.journeyStatus || 'accepted';
  const stepIdx  = STEP_INDEX[status] ?? 0;
  const curStep  = STEPS[stepIdx];

  return (
    <View style={styles.screen}>
      <Header title={tr.headerTitle} back={tr.back} onBack={() => navigation.goBack()} />

      <Animated.ScrollView
        style={[styles.scroll, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Status banner ── */}
        <View style={[styles.statusBanner, { borderLeftColor: curStep.color }]}>
          <View style={[styles.statusIconWrap, { backgroundColor: curStep.color + '20' }]}>
            <Text style={styles.statusIconText}>{curStep.icon}</Text>
          </View>
          <Text style={[styles.statusLabel, { color: curStep.color }]}>{curStep.label}</Text>
        </View>

        {/* ── Progress stepper ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr.progress}</Text>
          <View style={styles.stepper}>
            {STEPS.map((step, i) => {
              const done    = i <= stepIdx;
              const current = i === stepIdx;
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={styles.stepLeft}>
                    <View style={[
                      styles.stepDot,
                      done    ? { backgroundColor: step.color, borderColor: step.color } : styles.stepDotEmpty,
                      current ? styles.stepDotCurrent : null,
                    ]}>
                      {done && <Text style={styles.stepDotIcon}>{i < stepIdx ? '✓' : step.icon}</Text>}
                    </View>
                    {i < STEPS.length - 1 && (
                      <View style={[styles.stepLine, { backgroundColor: i < stepIdx ? curStep.color : BORDER }]} />
                    )}
                  </View>
                  <Text style={[styles.stepLabel, { color: done ? TEXT : MUTED, fontWeight: current ? '700' : '400' }]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Work timer ── */}
        {status === 'started' && (
          <View style={[styles.timerCard, { backgroundColor: ACCENT }]}>
            <Text style={styles.timerLabel}>{tr.workTimer}</Text>
            <Text style={styles.timerValue}>{formatDuration(workDuration)}</Text>
          </View>
        )}

        {/* ── Job info ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr.jobDetails}</Text>
          <InfoRow label="Job"      value={job.title || '—'} />
          <InfoRow label="Company"  value={job.companyName || '—'} />
          <InfoRow label="Location" value={job.location || '—'} />
        </View>

        {/* ── Schedule ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr.schedule}</Text>
          <InfoRow label={tr.date} value={job.jobDate   || tr.notSpecified} />
          <InfoRow label={tr.time} value={job.startTime && job.endTime ? `${job.startTime} – ${job.endTime}` : tr.notSpecified} />
          {job.expectedDuration ? (
            <InfoRow label={tr.expectedDuration} value={`${job.expectedDuration} ${tr.hours}`} />
          ) : null}
        </View>

        {/* ── Payment ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr.payment}</Text>
          <InfoRow label={tr.hourlyRate}     value={`₹${job.rate || 0}${tr.perHour}`} accent />
          {job.totalPayment ? (
            <InfoRow label={tr.expectedPayment} value={`₹${job.totalPayment}`} accent />
          ) : null}
        </View>

        {/* ── Primary CTA ── */}
        <View style={styles.ctaBlock}>
          {status === 'accepted'  && <PrimaryBtn label={tr.onTheWayAction} onPress={handleOnTheWay} loading={updating} color={WARNING} />}
          {status === 'onTheWay'  && <PrimaryBtn label={tr.reachedAction}  onPress={handleReached}  loading={updating} color={INFO} />}
          {status === 'reached'   && <PrimaryBtn label={tr.startWork}      onPress={handleStartWork} loading={updating} color={ACCENT} />}
          {status === 'started'   && <PrimaryBtn label={tr.completeWork}   onPress={handleCompleteWork} loading={updating} color={SUCCESS} />}
        </View>

        {/* ── Secondary actions ── */}
        <View style={styles.secondaryRow}>
          <SecondaryBtn
            label={tr.viewLocation}
            icon="📍"
            onPress={() => navigation.navigate('JobLocation', { application })}
          />
          <SecondaryBtn
            label={tr.chatEmployer}
            icon="💬"
            onPress={handleChatWithEmployer}
          />
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const Header = ({ title, back, onBack }) => (
  <View style={styles.header}>
    <TouchableOpacity style={styles.backBtn} onPress={onBack}>
      <Text style={styles.backBtnText}>{back}</Text>
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={{ width: 44 }} />
  </View>
);

const InfoRow = ({ label, value, accent }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, accent && { color: ACCENT, fontWeight: '700' }]}>{value}</Text>
  </View>
);

const PrimaryBtn = ({ label, onPress, loading, color }) => (
  <TouchableOpacity
    style={[styles.primaryBtn, { backgroundColor: color }]}
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.85}
  >
    {loading
      ? <ActivityIndicator color="#fff" />
      : <Text style={styles.primaryBtnText}>{label}</Text>}
  </TouchableOpacity>
);

const SecondaryBtn = ({ label, icon, onPress }) => (
  <TouchableOpacity style={styles.secondaryBtn} onPress={onPress} activeOpacity={0.8}>
    <Text style={styles.secondaryBtnIcon}>{icon}</Text>
    <Text style={styles.secondaryBtnText}>{label}</Text>
  </TouchableOpacity>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: BG },
  scroll:      { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  fullCenter:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 15, color: MUTED },
  errorText:   { fontSize: 16, color: MUTED, marginBottom: 16, textAlign: 'center' },

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 12,
    paddingTop:        Platform.OS === 'ios' ? 54 : 16,
    paddingBottom:     12,
    backgroundColor:   WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn:      { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: BG },
  backBtnText:  { fontSize: 26, color: ACCENT, lineHeight: 30, marginTop: -2 },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: TEXT },

  // Status banner
  statusBanner: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: WHITE,
    borderRadius:    14,
    padding:         16,
    marginBottom:    14,
    borderLeftWidth: 4,
    ...CARD_SH,
  },
  statusIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  statusIconText: { fontSize: 20 },
  statusLabel:    { fontSize: 16, fontWeight: '700' },

  // Progress stepper
  stepper:  { marginTop: 4 },
  stepRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  stepLeft: { alignItems: 'center', width: 28, marginRight: 12 },
  stepDot:  {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: BORDER, backgroundColor: WHITE,
  },
  stepDotEmpty:   { backgroundColor: WHITE },
  stepDotCurrent: { borderWidth: 2.5 },
  stepDotIcon:    { fontSize: 12, color: WHITE },
  stepLine:       { width: 2, height: 24, borderRadius: 1, marginVertical: 2 },
  stepLabel:      { fontSize: 14, paddingTop: 3, paddingBottom: 24, flex: 1 },

  // Cards
  card: {
    backgroundColor: WHITE,
    borderRadius:    16,
    padding:         18,
    marginBottom:    14,
    ...CARD_SH,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 },

  // Info rows
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  infoLabel: { fontSize: 14, color: MUTED, flex: 1 },
  infoValue: { fontSize: 14, color: TEXT, fontWeight: '500', textAlign: 'right', flex: 2 },

  // Timer
  timerCard: {
    borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 14, ...CARD_SH,
  },
  timerLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
  timerValue: {
    fontSize:   44,
    color:      WHITE,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 3,
  },

  // CTAs
  ctaBlock:    { marginBottom: 12 },
  primaryBtn:  {
    borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center',
    ...CARD_SH,
  },
  primaryBtnText: { color: WHITE, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  secondaryRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  secondaryBtn: {
    flex: 1, backgroundColor: WHITE, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', ...CARD_SH,
  },
  secondaryBtnIcon: { fontSize: 20, marginBottom: 4 },
  secondaryBtnText: { fontSize: 13, fontWeight: '600', color: TEXT },

  retryBtn:     { backgroundColor: ACCENT, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  retryBtnText: { color: WHITE, fontWeight: '600', fontSize: 15 },
});

export default JobTrackingScreen;