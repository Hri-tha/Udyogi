// src/screens/employer/EmployerJobTrackingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { onApplicationUpdate } from '../../services/database';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import RatingModal from '../../components/RatingModal';

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

const JOURNEY_STEPS = [
  { key: 'accepted',  icon: '✓',  label: 'Accepted',         color: ACCENT },
  { key: 'onTheWay',  icon: '🚗', label: 'On the way',       color: WARNING },
  { key: 'reached',   icon: '📍', label: 'Arrived',          color: INFO },
  { key: 'started',   icon: '⚡', label: 'Working',          color: ACCENT },
  { key: 'completed', icon: '✅', label: 'Work done',        color: SUCCESS },
];
const STEP_INDEX = Object.fromEntries(JOURNEY_STEPS.map((s, i) => [s.key, i]));

const EmployerJobTrackingScreen = ({ route, navigation }) => {
  const { applicationId } = route.params;
  const { locale } = useLanguage();

  // ── FIX: resolve UID from all available sources ────────────────────────
  const { user, userProfile, resolvedUid } = useAuth();

  const [application,     setApplication]     = useState(null);
  const [job,             setJob]             = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [workDuration,    setWorkDuration]    = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [actualPayment,   setActualPayment]   = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const tr = {
    back: '‹',
    jobTracking: 'Job Tracking',
    loadingTracking: 'Loading details…',
    noTracking: 'Tracking not available',
    jobCompleted: 'Job Completed',
    rateWorker: 'Rate Worker',
    paymentRequired: 'Payment Required',
    accepted: 'Waiting for worker to start journey',
    onTheWay: 'Worker is heading to you',
    arrived: 'Worker has arrived',
    working: 'Work is in progress',
    workDone: 'Work completed',
    jobDetails: 'Job Details',
    workerInfo: 'Worker',
    schedule: 'Schedule',
    date: 'Date',
    time: 'Time',
    notSpecified: 'Not specified',
    liveTimer: 'Live Work Timer',
    timeSpent: 'Time spent working',
    actualDuration: 'Actual Duration',
    started: 'Started',
    completed: 'Completed',
    paymentDetails: 'Payment Summary',
    hourlyRate: 'Hourly rate',
    duration: 'Duration worked',
    calculated: 'Amount due',
    estimate: 'Original estimate',
    calculation: 'Calculation',
    hours: 'hrs',
    statusLabel: 'Status',
    paid: 'Paid',
    pending: 'Pending',
    amountPaid: 'Amount paid',
    yourRating: 'Your Rating',
    stars: 'stars',
    processPayment: 'Process Payment',
    ratePerformance: 'Rate Worker Performance',
    viewHistory: 'View Job History',
    viewLocation: 'View Location',
    chatWorker: 'Chat with Worker',
    waitForWorker: 'Please wait for the worker to complete the job first.',
    processFirst: 'Please process the payment before completing the job.',
    thankYou: 'Thank You! 🙏',
    ratingDone: 'Rating submitted successfully.',
    ok: 'OK',
    error: 'Error',
    notFound: 'Application not found',
    failedLoad: 'Failed to load job tracking',
    perHour: '/hr',
    minutes: 'min',
    na: 'N/A',
    expectedPayment: 'Expected Payment',
    name: 'Name',
    phone: 'Phone',
  };

  useEffect(() => {
    loadInitialData();
    const unsub = onApplicationUpdate(applicationId, (updatedApp) => {
      setApplication(updatedApp);
      calcPayment(updatedApp);
    });
    return () => unsub();
  }, [applicationId]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [loading]);

  useEffect(() => {
    let interval;
    if (application?.journeyStatus === 'started' && application?.workStartedTimestamp) {
      interval = setInterval(() => {
        setWorkDuration((Date.now() - application.workStartedTimestamp) / 1000);
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [application?.journeyStatus, application?.workStartedTimestamp]);

  const calcPayment = (appData) => {
    try {
      if (appData.calculatedPayment > 0) {
        setActualPayment(appData.calculatedPayment);
        return;
      }
      if (appData.workStartedTimestamp && appData.workCompletedTimestamp) {
        const mins  = (appData.workCompletedTimestamp - appData.workStartedTimestamp) / (1000 * 60);
        const rate  = appData.hourlyRate || 0;
        setActualPayment(Math.max(1, Math.round(mins * (rate / 60))));
      } else {
        setActualPayment(appData.expectedPayment || 0);
      }
    } catch {
      setActualPayment(appData.expectedPayment || 0);
    }
  };

  const loadInitialData = async () => {
    try {
      const appRef  = doc(db, 'applications', applicationId);
      const appSnap = await getDoc(appRef);
      if (!appSnap.exists()) {
        Alert.alert(tr.error, tr.notFound);
        setLoading(false);
        return;
      }
      const appData = { id: appSnap.id, ...appSnap.data() };
      setApplication(appData);
      calcPayment(appData);
      if (appData.jobId) {
        const jobSnap = await getDoc(doc(db, 'jobs', appData.jobId));
        if (jobSnap.exists()) setJob({ id: jobSnap.id, ...jobSnap.data() });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(tr.error, tr.failedLoad);
    } finally {
      setLoading(false);
    }
  };

  const formatClock = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatHours = (ms) => {
    if (!ms) return '0 min';
    const mins = Math.round(ms / (1000 * 60));
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
  };

  const getStatusInfo = () => {
    const { status, journeyStatus, paymentStatus } = application || {};
    if (status === 'completed')                 return { icon: '✅', color: SUCCESS, text: tr.jobCompleted };
    if (status === 'awaiting_payment' || (journeyStatus === 'completed' && paymentStatus !== 'paid'))
                                                return { icon: '💰', color: WARNING, text: `${tr.paymentRequired} — ₹${actualPayment}` };
    switch (journeyStatus) {
      case 'accepted':  return { icon: '✓',  color: ACCENT,  text: tr.accepted };
      case 'onTheWay':  return { icon: '🚗', color: WARNING,  text: tr.onTheWay };
      case 'reached':   return { icon: '📍', color: INFO,     text: tr.arrived };
      case 'started':   return { icon: '⚡', color: ACCENT,   text: tr.working };
      case 'completed': return { icon: '✅', color: SUCCESS,  text: tr.workDone };
      default:          return { icon: 'ℹ️', color: MUTED,   text: 'Tracking…' };
    }
  };

  const handleProcessPayment = () => {
    if (application?.journeyStatus !== 'completed' && application?.status !== 'awaiting_payment') {
      Alert.alert(tr.error, tr.waitForWorker);
      return;
    }
    navigation.navigate('PaymentProcessing', { applicationId: application.id });
  };

  const handleCompleteJob = () => {
    if (application?.paymentStatus !== 'paid') {
      Alert.alert(tr.error, tr.processFirst);
      return;
    }
    navigation.navigate('CompleteJob', {
      applicationId: application.id,
      jobId:         application.jobId,
      workerId:      application.workerId,
      workerName:    application.workerName,
    });
  };

  // ── FIX: resolve UID before navigating to chat ────────────────────────
  const handleChatWithWorker = () => {
    const currentUserId = resolvedUid || user?.uid || userProfile?.uid;
    if (!currentUserId) {
      Alert.alert(tr.error, 'Unable to open chat. Please log in again.');
      return;
    }
    navigation.navigate('ChatScreen', {
      applicationId,
      otherUser:     application.workerId,
      jobTitle:      job?.title,
      otherUserName: application.workerName,
      currentUserId,
    });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.fullCenter}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>{tr.loadingTracking}</Text>
      </View>
    );
  }

  if (!application || !job) {
    return (
      <View style={styles.screen}>
        <Header title={tr.jobTracking} back={tr.back} onBack={() => navigation.goBack()} />
        <View style={styles.fullCenter}>
          <Text style={styles.errorText}>{tr.noTracking}</Text>
        </View>
      </View>
    );
  }

  const journeyStatus    = application.journeyStatus || 'accepted';
  const stepIdx          = STEP_INDEX[journeyStatus] ?? 0;
  const statusInfo       = getStatusInfo();
  const isCompleted      = application.status === 'completed';
  const isAwaitingRating = application.status === 'awaiting_rating';
  const isAwaitingPay    = application.status === 'awaiting_payment';
  const hasPaid          = application.paymentStatus === 'paid';
  const hasWorkData      = application.workStartedTimestamp && application.workCompletedTimestamp;
  const hourlyRate       = application.hourlyRate || job.rate || 0;
  const workMs           = hasWorkData
    ? application.workCompletedTimestamp - application.workStartedTimestamp
    : 0;

  return (
    <View style={styles.screen}>
      <Header title={tr.jobTracking} back={tr.back} onBack={() => navigation.goBack()} />

      <Animated.ScrollView
        style={[styles.scroll, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Status banner ── */}
        <View style={[styles.statusBanner, { borderLeftColor: statusInfo.color }]}>
          <View style={[styles.statusIconWrap, { backgroundColor: statusInfo.color + '20' }]}>
            <Text style={styles.statusIconText}>{statusInfo.icon}</Text>
          </View>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
        </View>

        {/* ── Journey stepper ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Journey</Text>
          <View style={styles.stepper}>
            {JOURNEY_STEPS.map((step, i) => {
              const done    = i <= stepIdx;
              const current = i === stepIdx;
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={styles.stepLeft}>
                    <View style={[
                      styles.stepDot,
                      done ? { backgroundColor: step.color, borderColor: step.color } : styles.stepDotEmpty,
                      current && styles.stepDotCurrent,
                    ]}>
                      {done && <Text style={styles.stepDotIcon}>{i < stepIdx ? '✓' : step.icon}</Text>}
                    </View>
                    {i < JOURNEY_STEPS.length - 1 && (
                      <View style={[styles.stepLine, { backgroundColor: i < stepIdx ? step.color : BORDER }]} />
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

        {/* ── Live timer ── */}
        {journeyStatus === 'started' && (
          <View style={[styles.timerCard, { backgroundColor: ACCENT }]}>
            <Text style={styles.timerLabel}>{tr.liveTimer}</Text>
            <Text style={styles.timerValue}>{formatClock(workDuration)}</Text>
            <Text style={styles.timerSub}>{tr.timeSpent}</Text>
          </View>
        )}

        {/* ── Actual work duration ── */}
        {hasWorkData && (
          <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: SUCCESS }]}>
            <Text style={styles.cardTitle}>{tr.actualDuration}</Text>
            <Text style={styles.durationValue}>{formatHours(workMs)}</Text>
            <View style={styles.durationTimes}>
              <View style={styles.durationTimeItem}>
                <Text style={styles.durationTimeLabel}>{tr.started}</Text>
                <Text style={styles.durationTimeValue}>
                  {new Date(application.workStartedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.durationSep} />
              <View style={styles.durationTimeItem}>
                <Text style={styles.durationTimeLabel}>{tr.completed}</Text>
                <Text style={styles.durationTimeValue}>
                  {new Date(application.workCompletedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Job details ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr.jobDetails}</Text>
          <InfoRow label="Title"    value={job.title    || '—'} />
          <InfoRow label="Location" value={job.location || '—'} />
          <InfoRow label="Rate"     value={`₹${hourlyRate}${tr.perHour}`} accent />
        </View>

        {/* ── Worker info ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr.workerInfo}</Text>
          <InfoRow label={tr.name}  value={application.workerName  || '—'} />
          <InfoRow label={tr.phone} value={application.workerPhone || '—'} />
        </View>

        {/* ── Schedule ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr.schedule}</Text>
          <InfoRow label={tr.date} value={job.jobDate || tr.notSpecified} />
          <InfoRow label={tr.time} value={
            job.startTime && job.endTime
              ? `${job.startTime} – ${job.endTime}`
              : tr.notSpecified
          } />
        </View>

        {/* ── Payment summary ── */}
        {(hasPaid || isAwaitingPay || isCompleted || journeyStatus === 'completed') && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{tr.paymentDetails}</Text>
            <InfoRow label={tr.hourlyRate} value={`₹${hourlyRate}${tr.perHour}`} />
            {hasWorkData && <InfoRow label={tr.duration} value={formatHours(workMs)} />}
            <View style={styles.paymentHighlight}>
              <Text style={styles.paymentHighlightLabel}>
                {hasWorkData ? tr.calculated : tr.expectedPayment}
              </Text>
              <Text style={styles.paymentHighlightValue}>₹{actualPayment}</Text>
            </View>
            {hasWorkData && application.expectedPayment && application.expectedPayment !== actualPayment && (
              <InfoRow label={tr.estimate} value={`₹${application.expectedPayment}`} strikethrough />
            )}
            {hasWorkData && (
              <View style={styles.calcBox}>
                <Text style={styles.calcText}>
                  {formatHours(workMs)} × ₹{hourlyRate}{tr.perHour}
                </Text>
              </View>
            )}
            {/* Payment status pill */}
            <View style={[styles.statusPill, hasPaid ? styles.statusPillPaid : styles.statusPillPending]}>
              <Text style={[styles.statusPillText, { color: hasPaid ? SUCCESS : WARNING }]}>
                {hasPaid ? `✅  ${tr.paid}` : `⏳  ${tr.pending}`}
              </Text>
            </View>
            {application.paymentAmount && hasPaid && (
              <InfoRow label={tr.amountPaid} value={`₹${application.paymentAmount}`} accent />
            )}
          </View>
        )}

        {/* ── Rating received ── */}
        {isCompleted && application.hasRating && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{tr.yourRating}</Text>
            <View style={styles.ratingDisplay}>
              <Text style={styles.ratingStars}>
                {'★'.repeat(application.employerRating)}{'☆'.repeat(5 - application.employerRating)}
              </Text>
              <Text style={styles.ratingScore}>{application.employerRating}/5 {tr.stars}</Text>
              {application.employerComment && (
                <Text style={styles.ratingComment}>"{application.employerComment}"</Text>
              )}
            </View>
          </View>
        )}

        {/* ── Primary actions ── */}
        <View style={styles.ctaBlock}>
          {(journeyStatus === 'completed' || isAwaitingPay) && !hasPaid && (
            <PrimaryBtn
              icon="💰"
              label={`${tr.processPayment} — ₹${actualPayment}`}
              color={SUCCESS}
              onPress={handleProcessPayment}
            />
          )}
          {hasPaid && !isCompleted && !isAwaitingRating && (
            <PrimaryBtn icon="✓" label={tr.ratePerformance} color={ACCENT} onPress={handleCompleteJob} />
          )}
          {(isAwaitingRating || (isCompleted && !application.hasRating)) && (
            <PrimaryBtn icon="⭐" label={tr.ratePerformance} color={WARNING} onPress={() => setShowRatingModal(true)} />
          )}
          {isCompleted && (
            <PrimaryBtn icon="📋" label={tr.viewHistory} color={INFO} onPress={() => navigation.navigate('ApplicationsScreen')} />
          )}
        </View>

        {/* ── Secondary actions ── */}
        <View style={styles.secondaryRow}>
          <SecondaryBtn
            label={tr.viewLocation}
            icon="📍"
            onPress={() => navigation.navigate('JobLocation', { application, isEmployer: true })}
          />
          <SecondaryBtn
            label={tr.chatWorker}
            icon="💬"
            onPress={handleChatWithWorker}
          />
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={() => {
          Alert.alert(tr.thankYou, tr.ratingDone, [
            { text: tr.ok, onPress: () => { setShowRatingModal(false); navigation.navigate('EmployerHome'); } },
          ]);
        }}
        ratingType="worker"
        ratingData={{
          jobId:        job.id,
          jobTitle:     job.title,
          workerId:     application.workerId,
          workerName:   application.workerName,
          employerId:   application.employerId,
          employerName: job.companyName,
          applicationId: application.id,
        }}
      />
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

const InfoRow = ({ label, value, accent, strikethrough }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[
      styles.infoValue,
      accent       && { color: ACCENT, fontWeight: '700' },
      strikethrough && { textDecorationLine: 'line-through', color: MUTED },
    ]}>
      {value}
    </Text>
  </View>
);

const PrimaryBtn = ({ icon, label, color, onPress }) => (
  <TouchableOpacity
    style={[styles.primaryBtn, { backgroundColor: color }]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Text style={styles.primaryBtnIcon}>{icon}</Text>
    <Text style={styles.primaryBtnText}>{label}</Text>
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
  screen:       { flex: 1, backgroundColor: BG },
  scroll:       { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  fullCenter:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText:  { marginTop: 12, fontSize: 15, color: MUTED },
  errorText:    { fontSize: 16, color: MUTED, textAlign: 'center' },

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
  statusText:     { fontSize: 15, fontWeight: '700', flex: 1 },

  // Cards
  card: {
    backgroundColor: WHITE,
    borderRadius:    16,
    padding:         18,
    marginBottom:    14,
    ...CARD_SH,
  },
  cardTitle: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14,
  },

  // Stepper
  stepper:      { marginTop: 4 },
  stepRow:      { flexDirection: 'row', alignItems: 'flex-start' },
  stepLeft:     { alignItems: 'center', width: 28, marginRight: 12 },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: BORDER, backgroundColor: WHITE,
  },
  stepDotEmpty:   {},
  stepDotCurrent: { borderWidth: 2.5 },
  stepDotIcon:    { fontSize: 11, color: WHITE },
  stepLine:       { width: 2, height: 24, borderRadius: 1, marginVertical: 2 },
  stepLabel:      { fontSize: 14, paddingTop: 3, paddingBottom: 24, flex: 1 },

  // Timer
  timerCard: {
    borderRadius: 16, padding: 22, alignItems: 'center', marginBottom: 14, ...CARD_SH,
  },
  timerLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  timerValue: {
    fontSize: 46, color: WHITE, fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 3,
  },
  timerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 6 },

  // Actual duration card
  durationValue:    { fontSize: 28, fontWeight: '800', color: SUCCESS, marginBottom: 12 },
  durationTimes:    { flexDirection: 'row', alignItems: 'center' },
  durationTimeItem: { flex: 1, alignItems: 'center' },
  durationTimeLabel:{ fontSize: 11, color: MUTED, marginBottom: 2, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  durationTimeValue:{ fontSize: 16, fontWeight: '700', color: TEXT },
  durationSep:      { width: 1, height: 32, backgroundColor: BORDER, marginHorizontal: 16 },

  // Info rows
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  infoLabel: { fontSize: 14, color: MUTED, flex: 1 },
  infoValue: { fontSize: 14, color: TEXT, fontWeight: '500', textAlign: 'right', flex: 2 },

  // Payment
  paymentHighlight: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    backgroundColor: ACCENT + '10',
    borderRadius:    10,
    padding:         14,
    marginVertical:  8,
  },
  paymentHighlightLabel: { fontSize: 14, fontWeight: '600', color: ACCENT },
  paymentHighlightValue: { fontSize: 22, fontWeight: '800', color: ACCENT },
  calcBox:   { backgroundColor: INFO + '10', borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 8 },
  calcText:  { fontSize: 12, color: INFO, fontStyle: 'italic' },
  statusPill: { borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 6 },
  statusPillPaid:    { backgroundColor: SUCCESS + '15' },
  statusPillPending: { backgroundColor: WARNING + '15' },
  statusPillText:    { fontSize: 14, fontWeight: '700' },

  // Rating
  ratingDisplay: { alignItems: 'center', paddingVertical: 8 },
  ratingStars:   { fontSize: 28, color: WARNING, letterSpacing: 2, marginBottom: 6 },
  ratingScore:   { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 6 },
  ratingComment: { fontSize: 13, color: MUTED, fontStyle: 'italic', textAlign: 'center', lineHeight: 18 },

  // CTAs
  ctaBlock:    { marginBottom: 12 },
  primaryBtn:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, paddingVertical: 18, marginBottom: 10, ...CARD_SH,
  },
  primaryBtnIcon: { fontSize: 18, marginRight: 8 },
  primaryBtnText: { color: WHITE, fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },

  secondaryRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  secondaryBtn: {
    flex: 1, backgroundColor: WHITE, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', ...CARD_SH,
  },
  secondaryBtnIcon: { fontSize: 20, marginBottom: 4 },
  secondaryBtnText: { fontSize: 12, fontWeight: '600', color: TEXT },
});

export default EmployerJobTrackingScreen;