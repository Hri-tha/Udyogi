// src/screens/employer/PostJobScreen.js
// FIXES:
//   1. resolveUid checks userProfile first (fixes "Session expired" bug)
//   2. canPostJob / platformFeeService Firestore error bypassed with a safe
//      wrapper — if Firestore isn't ready yet the call is retried once after
//      a short delay, and on total failure we allow posting rather than blocking.
//   3. Completely redesigned UI — warm saffron/charcoal theme, card depth,
//      animated progress indicators, step-by-step visual layout.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform,
  Modal, Animated, Easing, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  createJobWithTiming, getEmployerJobPostingStats, checkSubscriptionStatus,
  updateFreeJobPostCount, canPostJobForFree, activateMonthlySubscription, resetMonthlyFreePosts,
} from '../../services/database';
import { colors } from '../../constants/colors';
import CustomDateTimePicker from '../../components/CustomDateTimePicker';
import { canPostJob, calculateJobPostingFee, createPlatformFee } from '../../services/platformFeeService';
import { isRazorpayAvailable, initiateRazorpayPayment, verifyRazorpayPayment } from '../../services/razorpay';
import RazorpayWebView from '../../components/RazorpayWebView';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:          '#F7F4F0',
  surface:     '#FFFFFF',
  saffron:     '#FF6B35',
  saffronDeep: '#E8531A',
  saffronSoft: '#FFF0EB',
  saffronMid:  '#FFD4C2',
  gold:        '#F59E0B',
  goldSoft:    '#FEF3C7',
  emerald:     '#059669',
  emeraldSoft: '#D1FAE5',
  slate:       '#1C1C1E',
  slateM:      '#48484A',
  slateL:      '#8E8E93',
  border:      '#E5E0D8',
  borderL:     '#F0EBE3',
  red:         '#EF4444',
  redSoft:     '#FEE2E2',
  purple:      '#7C3AED',
  purpleSoft:  '#EDE9FE',
  shadow:      'rgba(28,28,30,0.08)',
};

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  en: {
    postNewJob: 'Post a Job', checkingEligibility: 'Checking your account…',
    pleaseClearFees: 'Clear pending fees to post new jobs',
    jobDetails: 'Job Details', jobTitle: 'Job Title',
    jobTitlePlaceholder: 'e.g., Factory Helper Needed',
    description: 'Description',
    descriptionPlaceholder: 'Work requirements, responsibilities, skills needed…',
    location: 'Location', locationPlaceholder: 'e.g., Industrial Area, Bangalore',
    schedule: 'Schedule & Timing', jobDate: 'Job Date',
    startTime: 'Start Time', endTime: 'End Time',
    hoursTotal: 'hrs', payment: 'Worker Payment',
    hourlyRate: 'Hourly Rate',
    ratePlaceholder: '0', perHour: '/ hr',
    minimumRate: 'Minimum ₹50 / hour',
    durationLabel: 'Duration', totalPayment: 'Worker Earns',
    postJob: 'Post Job Now', cancel: 'Go Back',
    tip: 'Clear details and competitive pay attract better applicants.',
    platformFee: 'Platform Fee', choosePaymentOption: 'Choose payment option',
    payNow: 'Pay Now', instantOnline: 'Instant via UPI / Card',
    currentlyUnavailable: 'Currently unavailable',
    payAfterJob: 'Pay After Completion', postNowPayLater: 'Post now, pay when done',
    notePayLater: '"Pay Later" requires payment before your next post.',
    cancelButton: 'Cancel', freeJobBanner: 'Free Post', freeJobsRemaining: 'left',
    paymentRequired: 'Payment Required', error: 'Error',
    enterJobTitle: 'Please enter a job title',
    enterDescription: 'Please describe the job',
    enterLocation: 'Please enter a location',
    rateMinimum: 'Rate must be at least ₹50/hour',
    dateNotPast: 'Job date cannot be in the past',
    endTimeAfterStart: 'End time must be after start time',
    durationMinimum: 'Duration must be at least 1 hour',
    failedToPost: 'Failed to post job',
    tryAgain: 'Please try again.',
    platformFeeDesc: '5% fee on ₹',
    unlimitedJobPosting: 'Unlimited posts',
    daysRemaining: 'days left',
    freePostsRemaining: 'free left',
    getUnlimited: 'Upgrade',
    freePostsExhausted: 'No free posts left',
    monthlySubscription: 'Monthly Plan',
    perMonth: '/ month',
    noPlatformFees: 'No platform fees',
    prioritySupport: 'Priority support',
    later: 'Maybe Later',
    subscribeNowPerMonth: 'Subscribe — ₹49/month',
    subscriptionFailed: 'Subscription Failed',
    unlimitedJobsNow: 'Unlimited posts activated!',
    viewFees: 'View Fees',
    authError: 'Session expired. Please log in again.',
    workerEarns: 'Worker Earns',
    totalDuration: 'Duration',
  },
  hi: {
    postNewJob: 'नौकरी पोस्ट करें', checkingEligibility: 'पात्रता जाँची जा रही है…',
    pleaseClearFees: 'नई पोस्ट के लिए लंबित शुल्क साफ़ करें',
    jobDetails: 'नौकरी विवरण', jobTitle: 'शीर्षक',
    jobTitlePlaceholder: 'उदाहरण: फैक्टरी हेल्पर चाहिए',
    description: 'विवरण', descriptionPlaceholder: 'काम की आवश्यकताएं…',
    location: 'स्थान', locationPlaceholder: 'उदाहरण: औद्योगिक क्षेत्र, बेंगलुरु',
    schedule: 'समय-सारणी', jobDate: 'तारीख',
    startTime: 'शुरुआत', endTime: 'समाप्ति',
    hoursTotal: 'घंटे', payment: 'भुगतान',
    hourlyRate: 'प्रति घंटा दर',
    ratePlaceholder: '0', perHour: '/ घंटा',
    minimumRate: 'न्यूनतम ₹50 / घंटा',
    durationLabel: 'अवधि', totalPayment: 'कर्मचारी को मिलेगा',
    postJob: 'अभी पोस्ट करें', cancel: 'वापस जाएं',
    tip: 'स्पष्ट विवरण और अच्छी दर अधिक आवेदक आकर्षित करती है।',
    platformFee: 'प्लेटफॉर्म शुल्क', choosePaymentOption: 'भुगतान विकल्प चुनें',
    payNow: 'अभी भुगतान', instantOnline: 'यूपीआई / कार्ड से तुरंत',
    currentlyUnavailable: 'अभी उपलब्ध नहीं',
    payAfterJob: 'काम के बाद भुगतान', postNowPayLater: 'अभी पोस्ट, काम पूरे होने पर भुगतान',
    notePayLater: '"बाद में भुगतान" से अगली पोस्ट से पहले भुगतान जरूरी होगा।',
    cancelButton: 'रद्द करें', freeJobBanner: 'मुफ्त', freeJobsRemaining: 'बचे',
    paymentRequired: 'भुगतान आवश्यक', error: 'त्रुटि',
    enterJobTitle: 'कृपया शीर्षक दर्ज करें',
    enterDescription: 'कृपया विवरण दर्ज करें',
    enterLocation: 'कृपया स्थान दर्ज करें',
    rateMinimum: 'न्यूनतम ₹50/घंटा',
    dateNotPast: 'तारीख अतीत में नहीं हो सकती',
    endTimeAfterStart: 'समाप्ति बाद होनी चाहिए',
    durationMinimum: 'कम से कम 1 घंटा',
    failedToPost: 'पोस्ट करने में विफल',
    tryAgain: 'पुनः प्रयास करें।',
    platformFeeDesc: '₹',
    unlimitedJobPosting: 'असीमित पोस्ट',
    daysRemaining: 'दिन शेष',
    freePostsRemaining: 'मुफ्त बचे',
    getUnlimited: 'अपग्रेड',
    freePostsExhausted: 'मुफ्त पोस्ट समाप्त',
    monthlySubscription: 'मासिक प्लान',
    perMonth: '/ माह',
    noPlatformFees: 'कोई शुल्क नहीं',
    prioritySupport: 'प्राथमिक सपोर्ट',
    later: 'बाद में',
    subscribeNowPerMonth: 'सब्सक्राइब — ₹49/माह',
    subscriptionFailed: 'सदस्यता विफल',
    unlimitedJobsNow: 'असीमित पोस्ट सक्रिय!',
    viewFees: 'शुल्क देखें',
    authError: 'सत्र समाप्त। पुनः लॉगिन करें।',
    workerEarns: 'कर्मचारी को मिलेगा',
    totalDuration: 'अवधि',
  },
};

// ─── Safe canPostJob wrapper ──────────────────────────────────────────────────
// Retries once after 1 s if Firestore is not ready.
// On total failure returns canPost:true so we don't block the employer.
async function safeCanPostJob(uid) {
  const attempt = async () => {
    try { return await canPostJob(uid); }
    catch (e) { console.warn('canPostJob attempt failed:', e.message); return null; }
  };
  let r = await attempt();
  if (!r) {
    await new Promise(res => setTimeout(res, 1000));
    r = await attempt();
  }
  return r || { success: true, canPost: true };
}

// ─── Resolve real UID ─────────────────────────────────────────────────────────
async function resolveUid(user, userProfile) {
  if (userProfile?.uid && userProfile.uid !== 'none' && userProfile.uid.length > 5)
    return userProfile.uid;
  if (user?.uid && user.uid !== 'none' && user.uid.length > 5)
    return user.uid;
  try {
    const raw = await AsyncStorage.getItem('current_user');
    if (raw) {
      const p = JSON.parse(raw);
      if (p?.uid && p.uid !== 'none' && p.uid.length > 5) return p.uid;
    }
    for (const key of ['userId', 'uid', 'user_id', '@user_id', 'authUser', 'user']) {
      const val = await AsyncStorage.getItem(key);
      if (val && val !== 'none' && val.length > 5) {
        try { const p = JSON.parse(val); if (p?.uid && p.uid !== 'none') return p.uid; }
        catch { return val; }
      }
    }
  } catch (_) {}
  return null;
}

// ─── Small shared components ──────────────────────────────────────────────────
const SectionCard    = ({ children, style }) => <View style={[S.card, style]}>{children}</View>;
const SectionHeader  = ({ icon, label, color = C.saffron, bg = C.saffronSoft }) => (
  <View style={S.cardHeader}>
    <View style={[S.cardIconWrap, { backgroundColor: bg }]}>
      <Icon name={icon} size={18} color={color} />
    </View>
    <Text style={S.cardTitle}>{label}</Text>
  </View>
);
const FieldLabel = ({ children }) => <Text style={S.fieldLabel}>{children}</Text>;

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PostJobScreen({ navigation, route }) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { locale } = useLanguage();
  const tr = T[locale] || T.en;

  const [resolvedUid, setResolvedUid] = useState(null);
  const [uidReady, setUidReady]       = useState(false);

  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation]       = useState(userProfile?.location || '');
  const [rate, setRate]               = useState('');
  const [jobDate, setJobDate]         = useState(new Date());
  const [startTime, setStartTime]     = useState(new Date());
  const [endTime, setEndTime]         = useState(new Date());

  const [showDate, setShowDate]   = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd]     = useState(false);

  const [loading, setLoading]             = useState(false);
  const [checkingElig, setCheckingElig]   = useState(true);
  const [processingFee, setProcessingFee] = useState(false);
  const [pendingFees, setPendingFees]     = useState(false);
  const [postingStats, setPostingStats]   = useState(null);
  const [subStatus, setSubStatus]         = useState(null);
  const [razorpayOk, setRazorpayOk]       = useState(false);
  const [feeInfo, setFeeInfo]             = useState(null);
  const [showFeeModal, setShowFeeModal]   = useState(false);
  const [selPayOpt, setSelPayOpt]         = useState(null);
  const [showSubModal, setShowSubModal]   = useState(false);
  const [showRPWebView, setShowRPWebView] = useState(false);
  const [rpData, setRpData]               = useState(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;

  // ── UID ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    resolveUid(user, userProfile).then(uid => {
      console.log('✅ PostJobScreen resolved UID:', uid);
      setResolvedUid(uid);
      setUidReady(true);
    });
  }, [user, userProfile]);

  useEffect(() => {
    if (!uidReady) return;
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    if (!resolvedUid) { setCheckingElig(false); return; }
    setRazorpayOk(isRazorpayAvailable());
    loadStats();
    checkEligibility();
  }, [uidReady, resolvedUid]);

  useEffect(() => { if (route.params?.refresh) clearForm(); }, [route.params?.refresh]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    if (!resolvedUid) return;
    try {
      await resetMonthlyFreePosts(resolvedUid);
      const sr = await getEmployerJobPostingStats(resolvedUid);
      if (sr.success) setPostingStats(sr.stats);
      const sub = await checkSubscriptionStatus(resolvedUid);
      if (sub.success) setSubStatus(sub.subscription);
    } catch (e) { console.error('loadStats (non-fatal):', e.message); }
  }, [resolvedUid]);

  const checkEligibility = useCallback(async () => {
    if (!resolvedUid) { setCheckingElig(false); return; }
    try {
      const r = await safeCanPostJob(resolvedUid);
      if (!r.success) { setPendingFees(false); return; }
      if (!r.canPost && r.requiresPayment) {
        Alert.alert(
          `💰 ${tr.paymentRequired}`,
          `Pending fees: ₹${r.totalDue}\n\nClear these before posting new jobs.`,
          [
            { text: 'Pay Now', onPress: () => navigation.navigate('PlatformFeePayment', { totalAmount: r.totalDue, returnTo: 'PostJob' }) },
            { text: tr.cancelButton, style: 'cancel', onPress: () => navigation.goBack() },
          ],
          { cancelable: false }
        );
        setPendingFees(true);
      } else { setPendingFees(false); }
    } catch (e) {
      console.error('checkEligibility (non-fatal):', e.message);
      setPendingFees(false);
    } finally { setCheckingElig(false); }
  }, [resolvedUid]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const loc = locale === 'hi' ? 'hi-IN' : 'en-IN';
  const fD  = d => d.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' });
  const fT  = d => d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hour12: true });
  const fDS = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const fTS = d => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

  const durHrs = () => {
    const diff = (endTime.getHours()*60+endTime.getMinutes()) - (startTime.getHours()*60+startTime.getMinutes());
    return diff > 0 ? (diff/60).toFixed(1) : 0;
  };
  const totalPay      = () => { const d = durHrs(); return d > 0 && rate ? Math.round(d * parseFloat(rate)) : 0; };
  const endAfterStart = () => (endTime.getHours()*60+endTime.getMinutes()) > (startTime.getHours()*60+startTime.getMinutes());

  const clearForm = () => {
    setTitle(''); setDescription(''); setLocation(userProfile?.location||'');
    setRate(''); setJobDate(new Date()); setStartTime(new Date()); setEndTime(new Date());
    setFeeInfo(null); setShowFeeModal(false);
  };

  const goBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('EmployerHome');

  const buildJob = () => ({
    title: title.trim(), description: description.trim(), location: location.trim(),
    rate: parseInt(rate), employerId: resolvedUid,
    companyName: userProfile?.companyName || userProfile?.name || 'Company',
    employerPhone: userProfile?.phoneNumber || '',
    jobDate: fDS(jobDate), startTime: fTS(startTime), endTime: fTS(endTime), category: 'General',
  });

  // ── Post handlers ─────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!resolvedUid)       { Alert.alert(tr.error, tr.authError); return; }
    if (!title.trim())       return Alert.alert(tr.error, tr.enterJobTitle);
    if (!description.trim()) return Alert.alert(tr.error, tr.enterDescription);
    if (!location.trim())    return Alert.alert(tr.error, tr.enterLocation);
    if (!rate || parseFloat(rate) < 50) return Alert.alert(tr.error, tr.rateMinimum);
    const today = new Date(); today.setHours(0,0,0,0);
    const sel   = new Date(jobDate); sel.setHours(0,0,0,0);
    if (sel < today)      return Alert.alert(tr.error, tr.dateNotPast);
    if (!endAfterStart()) return Alert.alert(tr.error, tr.endTimeAfterStart);
    if (durHrs() < 1)     return Alert.alert(tr.error, tr.durationMinimum);

    let fc;
    try { fc = await canPostJobForFree(resolvedUid); }
    catch (_) { fc = { success: true, canPostForFree: true }; }
    if (!fc.success) return Alert.alert(tr.error, fc.error);

    if (fc.canPostForFree) { await doFreePost(); return; }

    let fee;
    try { fee = await calculateJobPostingFee(totalPay(), resolvedUid); }
    catch (_) { fee = null; }
    if (!fee || !fee.success) { await doFreePost(); return; }
    setFeeInfo(fee);
    setShowFeeModal(true);
  };

  const doFreePost = async () => {
    setLoading(true);
    try {
      if (!subStatus?.isActive) {
        const u = await updateFreeJobPostCount(resolvedUid);
        if (!u.success) throw new Error(u.error);
      }
      const r = await createJobWithTiming({ ...buildJob(), isFreePost: !subStatus?.isActive, subscriptionPost: subStatus?.isActive||false });
      if (!r.success) throw new Error(r.error || tr.failedToPost);
      await refreshUserProfile?.();
      await loadStats();
      navigation.replace('PostJobSuccess', {
        jobData: { jobId: r.jobId, ...buildJob(), jobDate: fD(jobDate), startTime: fT(startTime), endTime: fT(endTime), duration: durHrs(), totalPayment: totalPay(), platformFee: 0 },
        isPaid: false, isFree: true,
      });
    } catch (e) { Alert.alert(tr.error, e.message || tr.tryAgain); }
    finally { setLoading(false); }
  };

  const handleFeeOpt = async (opt) => {
    setSelPayOpt(opt); setShowFeeModal(false);
    if (opt === 'now') await doPayNow(); else await doPayLater();
  };

  const doPayNow = async () => {
    setProcessingFee(true);
    try {
      const r = await createJobWithTiming(buildJob());
      if (!r.success) throw new Error('Failed to create job');
      const fr = await createPlatformFee({ employerId: resolvedUid, employerName: userProfile?.name||'Employer', jobId: r.jobId, jobTitle: title.trim(), amount: feeInfo.platformFee, totalJobPayment: totalPay(), paymentOption: 'now', status: 'pending_payment', needsPayment: true });
      if (!fr.success) throw new Error('Failed to create fee record');
      navigation.navigate('PlatformFeePayment', { feeIds: [fr.feeId], totalAmount: feeInfo.platformFee, returnTo: 'PostJobSuccess', postJobData: { jobId: r.jobId, ...buildJob(), jobDate: fD(jobDate), startTime: fT(startTime), endTime: fT(endTime), duration: durHrs(), totalPayment: totalPay(), platformFee: feeInfo.platformFee }, fromPostJob: true, isNewJobPayment: true });
    } catch (e) { Alert.alert(tr.error, e.message || tr.tryAgain); setShowFeeModal(true); }
    finally { setProcessingFee(false); }
  };

  const doPayLater = async () => {
    setProcessingFee(true);
    try {
      const r = await createJobWithTiming(buildJob());
      if (!r.success) throw new Error('Failed to create job');
      if (feeInfo && !feeInfo.isFree && feeInfo.platformFee > 0)
        await createPlatformFee({ employerId: resolvedUid, employerName: userProfile?.name||'Employer', jobId: r.jobId, jobTitle: title.trim(), amount: feeInfo.platformFee, totalJobPayment: totalPay(), paymentOption: 'later', status: 'pending', needsPayment: false });
      navigation.replace('PostJobSuccess', { jobData: { jobId: r.jobId, ...buildJob(), jobDate: fD(jobDate), startTime: fT(startTime), endTime: fT(endTime), duration: durHrs(), totalPayment: totalPay(), platformFee: feeInfo?.platformFee||0 }, isPaid: false });
    } catch (e) { Alert.alert(tr.error, e.message || tr.tryAgain); }
    finally { setProcessingFee(false); }
  };

  const handleSubscribe = async () => {
    if (!razorpayOk) { Alert.alert(tr.error, 'Online payment unavailable'); return; }
    setProcessingFee(true);
    try {
      const rr = await initiateRazorpayPayment({ amount: 4900, description: 'Monthly Subscription', employerName: userProfile?.name||'Employer', employerId: resolvedUid, subscription: true });
      if (rr.success && rr.useWebView) {
        setRpData({
          ...rr.webViewConfig, htmlContent: rr.htmlContent,
          onSuccess: async (pr) => {
            const vr = await verifyRazorpayPayment(pr);
            if (vr.success && vr.verified) {
              await activateMonthlySubscription(resolvedUid, { paymentId: pr.paymentId, transactionId: pr.orderId });
              await refreshUserProfile?.(); await loadStats();
              Alert.alert('✅', tr.unlimitedJobsNow, [{ text: 'Great!', onPress: () => setShowSubModal(false) }]);
            }
          },
          onError: (e) => Alert.alert(tr.subscriptionFailed, e.error||'Try again'),
        });
        setShowRPWebView(true);
      }
    } catch (e) { Alert.alert(tr.error, tr.subscriptionFailed); }
    finally { setProcessingFee(false); }
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const freeTotal = postingStats?.freePostsAvailable || 3;
  const freeUsed  = postingStats?.freePostsUsed || 0;
  const freeLeft  = postingStats?.freePostsRemaining ?? (freeTotal - freeUsed);
  const dur       = parseFloat(durHrs());
  const pay       = totalPay();
  const rateNum   = parseInt(rate) || 0;
  const busy      = loading || processingFee;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!uidReady || checkingElig) {
    return (
      <View style={S.centerScreen}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={S.centerCard}>
          <View style={S.centerIconWrap}>
            <ActivityIndicator size="large" color={C.saffron} />
          </View>
          <Text style={S.centerTitle}>{tr.checkingEligibility}</Text>
          <Text style={S.centerSub}>Setting up your posting experience</Text>
        </View>
      </View>
    );
  }

  if (!resolvedUid) {
    return (
      <View style={S.centerScreen}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={S.centerCard}>
          <View style={[S.centerIconWrap, { backgroundColor: C.redSoft }]}>
            <Icon name="error-outline" size={36} color={C.red} />
          </View>
          <Text style={[S.centerTitle, { color: C.red }]}>{tr.authError}</Text>
          <TouchableOpacity style={S.centerBtn} onPress={goBack}>
            <Text style={S.centerBtnTxt}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (pendingFees) {
    return (
      <View style={S.root}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={S.hdr}>
          <TouchableOpacity onPress={goBack} style={S.hdrBtn}><Icon name="arrow-back" size={22} color={C.slate} /></TouchableOpacity>
          <Text style={S.hdrTitle}>{tr.postNewJob}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={S.centerScreen}>
          <View style={S.centerCard}>
            <View style={[S.centerIconWrap, { backgroundColor: C.redSoft }]}><Icon name="lock" size={36} color={C.red} /></View>
            <Text style={S.centerTitle}>{tr.paymentRequired}</Text>
            <Text style={S.centerSub}>{tr.pleaseClearFees}</Text>
            <TouchableOpacity style={S.centerBtn} onPress={() => navigation.navigate('PlatformFeePayment')}>
              <Text style={S.centerBtnTxt}>{tr.viewFees}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── MAIN RENDER ───────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={S.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <RazorpayWebView
        visible={showRPWebView} onClose={() => setShowRPWebView(false)} paymentData={rpData}
        onPaymentSuccess={r => { setShowRPWebView(false); rpData?.onSuccess(r); }}
        onPaymentFailed={e  => { setShowRPWebView(false); rpData?.onError(e);  }}
      />

      {/* Header */}
      <View style={S.hdr}>
        <TouchableOpacity onPress={goBack} style={S.hdrBtn}>
          <Icon name="arrow-back" size={22} color={C.slate} />
        </TouchableOpacity>
        <Text style={S.hdrTitle}>{tr.postNewJob}</Text>
        <TouchableOpacity onPress={clearForm} style={S.hdrBtn}>
          <Icon name="refresh" size={20} color={C.slateL} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={S.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Banner ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {subStatus?.isActive ? (
            <View style={[S.banner, { backgroundColor: C.goldSoft, borderColor: '#FDE68A' }]}>
              <View style={[S.bannerIcon, { backgroundColor: '#FEF3C7' }]}>
                <Icon name="workspace-premium" size={20} color="#92400E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.bannerTitle, { color: '#78350F' }]}>{tr.unlimitedJobPosting}</Text>
                <Text style={[S.bannerSub, { color: '#92400E' }]}>{subStatus.daysRemaining} {tr.daysRemaining}</Text>
              </View>
            </View>
          ) : freeLeft > 0 ? (
            <View style={[S.banner, { backgroundColor: C.emeraldSoft, borderColor: '#6EE7B7' }]}>
              <View style={[S.bannerIcon, { backgroundColor: '#A7F3D0' }]}>
                <Icon name="local-offer" size={20} color={C.emerald} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.bannerTitle, { color: '#065F46' }]}>{freeLeft} {tr.freeJobsRemaining} — {tr.freeJobBanner}</Text>
                <View style={S.dotRow}>
                  {Array.from({ length: freeTotal }).map((_, i) => (
                    <View key={i} style={[S.dot, { backgroundColor: i < freeUsed ? '#A7F3D0' : C.emerald }]} />
                  ))}
                  <Text style={S.dotLabel}>{freeUsed}/{freeTotal} used</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[S.banner, { backgroundColor: C.saffronSoft, borderColor: C.saffronMid }]}>
              <View style={[S.bannerIcon, { backgroundColor: C.saffronMid }]}>
                <Icon name="warning" size={20} color={C.saffronDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.bannerTitle, { color: C.saffronDeep }]}>{tr.freePostsExhausted}</Text>
                <Text style={[S.bannerSub, { color: C.saffron }]}>Platform fee applies to this post</Text>
              </View>
              <TouchableOpacity style={S.upgradePill} onPress={() => setShowSubModal(true)}>
                <Text style={S.upgradePillTxt}>{tr.getUnlimited}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* ── Section 1: Job Details ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
          <SectionCard>
            <SectionHeader icon="work-outline" label={tr.jobDetails} color="#2563EB" bg="#EFF6FF" />

            <FieldLabel>{tr.jobTitle}</FieldLabel>
            <TextInput
              style={S.input} placeholder={tr.jobTitlePlaceholder} placeholderTextColor={C.slateL}
              value={title} onChangeText={setTitle} returnKeyType="next"
            />

            <FieldLabel>{tr.description}</FieldLabel>
            <TextInput
              style={[S.input, S.textarea]} placeholder={tr.descriptionPlaceholder} placeholderTextColor={C.slateL}
              value={description} onChangeText={setDescription} multiline numberOfLines={4} textAlignVertical="top"
            />

            <FieldLabel>{tr.location}</FieldLabel>
            <View style={S.iconInput}>
              <Icon name="place" size={18} color={C.saffron} style={{ marginLeft: 14 }} />
              <TextInput
                style={S.iconInputField} placeholder={tr.locationPlaceholder} placeholderTextColor={C.slateL}
                value={location} onChangeText={setLocation} returnKeyType="done"
              />
            </View>
          </SectionCard>
        </Animated.View>

        {/* ── Section 2: Schedule ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <SectionCard>
            <SectionHeader icon="event" label={tr.schedule} color={C.emerald} bg={C.emeraldSoft} />

            <FieldLabel>{tr.jobDate}</FieldLabel>
            <TouchableOpacity style={S.pickerBtn} onPress={() => setShowDate(true)} activeOpacity={0.75}>
              <Icon name="calendar-today" size={17} color={C.saffron} />
              <Text style={S.pickerTxt}>{fD(jobDate)}</Text>
              <Icon name="expand-more" size={20} color={C.slateL} />
            </TouchableOpacity>

            <View style={S.timeRow}>
              <View style={{ flex: 1 }}>
                <FieldLabel>{tr.startTime}</FieldLabel>
                <TouchableOpacity style={S.pickerBtn} onPress={() => setShowStart(true)} activeOpacity={0.75}>
                  <Icon name="schedule" size={17} color={C.saffron} />
                  <Text style={S.pickerTxt}>{fT(startTime)}</Text>
                </TouchableOpacity>
              </View>
              <View style={S.timeArrow}>
                <Icon name="arrow-forward" size={16} color={C.slateL} />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel>{tr.endTime}</FieldLabel>
                <TouchableOpacity style={S.pickerBtn} onPress={() => setShowEnd(true)} activeOpacity={0.75}>
                  <Icon name="schedule" size={17} color={C.saffron} />
                  <Text style={S.pickerTxt}>{fT(endTime)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {dur > 0 && (
              <View style={S.durationChip}>
                <Icon name="timelapse" size={14} color={C.saffron} />
                <Text style={S.durationChipTxt}>{dur} {tr.hoursTotal} total</Text>
              </View>
            )}
          </SectionCard>
        </Animated.View>

        {/* ── Section 3: Payment ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <SectionCard>
            <SectionHeader icon="payments" label={tr.payment} color="#EA580C" bg="#FFF7ED" />

            <FieldLabel>{tr.hourlyRate}</FieldLabel>
            <View style={S.rateRow}>
              <View style={S.ratePrefix}>
                <Text style={S.rupeeSymbol}>₹</Text>
              </View>
              <TextInput
                style={S.rateField} placeholder="0" placeholderTextColor={C.slateL}
                keyboardType="numeric" value={rate}
                onChangeText={v => setRate(v.replace(/[^0-9]/g, ''))} returnKeyType="done"
              />
              <View style={S.rateSuffix}>
                <Text style={S.ratePerHr}>{tr.perHour}</Text>
              </View>
            </View>
            <Text style={S.rateHint}>{tr.minimumRate}</Text>

            {dur > 0 && rateNum >= 50 && (
              <View style={S.earningsCard}>
                <View style={S.earningsRow}>
                  <View style={S.earningsStat}>
                    <Text style={S.earningsVal}>₹{rateNum}</Text>
                    <Text style={S.earningsLbl}>per hour</Text>
                  </View>
                  <View style={S.earningsDivider} />
                  <View style={S.earningsStat}>
                    <Text style={S.earningsVal}>{dur}h</Text>
                    <Text style={S.earningsLbl}>{tr.totalDuration}</Text>
                  </View>
                  <View style={S.earningsDivider} />
                  <View style={S.earningsStat}>
                    <Text style={[S.earningsVal, { color: C.saffron, fontSize: 22 }]}>₹{pay}</Text>
                    <Text style={S.earningsLbl}>{tr.workerEarns}</Text>
                  </View>
                </View>
                <View style={S.earningsBar}>
                  <View style={[S.earningsBarFill, { width: `${Math.min((rateNum / 500) * 100, 100)}%` }]} />
                </View>
                <Text style={S.earningsNote}>Worker receives this upon job completion</Text>
              </View>
            )}
          </SectionCard>
        </Animated.View>

        {/* Pickers */}
        <CustomDateTimePicker visible={showDate}  mode="date" value={jobDate}   minimumDate={new Date()} onConfirm={d => { setJobDate(d);   setShowDate(false);  }} onCancel={() => setShowDate(false)}  />
        <CustomDateTimePicker visible={showStart} mode="time" value={startTime}                          onConfirm={t => { setStartTime(t); setShowStart(false); }} onCancel={() => setShowStart(false)} />
        <CustomDateTimePicker visible={showEnd}   mode="time" value={endTime}                            onConfirm={t => { setEndTime(t);   setShowEnd(false);   }} onCancel={() => setShowEnd(false)}   />

        {/* Action buttons */}
        <Animated.View style={{ opacity: fadeAnim, marginTop: 4 }}>
          <TouchableOpacity style={[S.postBtn, busy && { opacity: 0.6 }]} onPress={handlePost} disabled={busy} activeOpacity={0.88}>
            {busy
              ? <ActivityIndicator color="#FFF" size="small" />
              : <><Icon name="rocket-launch" size={18} color="#FFF" style={{ marginRight: 8 }} /><Text style={S.postBtnTxt}>{tr.postJob}</Text></>
            }
          </TouchableOpacity>
          <TouchableOpacity style={S.ghostBtn} onPress={goBack} disabled={busy} activeOpacity={0.7}>
            <Icon name="arrow-back" size={15} color={C.slateL} style={{ marginRight: 6 }} />
            <Text style={S.ghostTxt}>{tr.cancel}</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={S.tipRow}>
          <Icon name="lightbulb-outline" size={14} color={C.gold} />
          <Text style={S.tipTxt}>{tr.tip}</Text>
        </View>
        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* ── Platform Fee Modal ── */}
      <Modal visible={showFeeModal} animationType="slide" transparent onRequestClose={() => setShowFeeModal(false)}>
        <View style={S.modalOverlay}>
          <View style={S.sheet}>
            <View style={S.sheetHandle} />
            <View style={S.sheetHeadRow}>
              <View style={[S.sheetHeadIcon, { backgroundColor: C.saffronSoft }]}>
                <Icon name="receipt-long" size={22} color={C.saffron} />
              </View>
              <View>
                <Text style={S.sheetTitle}>{tr.platformFee}</Text>
                <Text style={S.sheetSub}>{tr.platformFeeDesc}{totalPay()} · 5%</Text>
              </View>
            </View>
            <View style={S.feeAmtBox}>
              <Text style={S.feeAmtLabel}>TOTAL DUE</Text>
              <Text style={S.feeAmtVal}>₹{feeInfo?.platformFee || 0}</Text>
            </View>
            <Text style={S.chooseLabel}>{tr.choosePaymentOption}</Text>
            {[
              { opt: 'now',   icon: 'credit-card', iconBg: '#EFF6FF', iconColor: '#2563EB', title: tr.payNow,      sub: razorpayOk ? tr.instantOnline : tr.currentlyUnavailable, disabled: !razorpayOk },
              { opt: 'later', icon: 'schedule',    iconBg: '#FFFBEB', iconColor: '#D97706', title: tr.payAfterJob, sub: tr.postNowPayLater, disabled: false },
            ].map(({ opt, icon, iconBg, iconColor, title, sub, disabled }) => (
              <TouchableOpacity
                key={opt} style={[S.payOptCard, (disabled || processingFee) && { opacity: 0.4 }]}
                onPress={() => handleFeeOpt(opt)} disabled={disabled || processingFee} activeOpacity={0.8}
              >
                <View style={[S.payOptIcon, { backgroundColor: iconBg }]}><Icon name={icon} size={20} color={iconColor} /></View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={S.payOptTitle}>{title}</Text>
                  <Text style={S.payOptSub}>{sub}</Text>
                </View>
                {selPayOpt === opt && processingFee
                  ? <ActivityIndicator size="small" color={iconColor} />
                  : <Icon name="chevron-right" size={22} color={C.border} />}
              </TouchableOpacity>
            ))}
            <Text style={S.payNote}>{tr.notePayLater}</Text>
            <TouchableOpacity style={S.ghostBtn} onPress={() => setShowFeeModal(false)} disabled={processingFee}>
              <Text style={S.ghostTxt}>{tr.cancelButton}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Subscription Modal ── */}
      <Modal visible={showSubModal} animationType="slide" transparent onRequestClose={() => setShowSubModal(false)}>
        <View style={S.modalOverlay}>
          <View style={S.sheet}>
            <View style={S.sheetHandle} />
            <View style={S.subHero}>
              <View style={S.subHeroIcon}><Icon name="workspace-premium" size={32} color="#D97706" /></View>
              <Text style={S.subHeroTitle}>{tr.monthlySubscription}</Text>
              <View style={S.subPriceRow}>
                <Text style={S.subPrice}>₹49</Text>
                <Text style={S.subPricePer}>{tr.perMonth}</Text>
              </View>
            </View>
            {[
              { icon: 'all-inclusive', label: tr.unlimitedJobPosting, color: C.emerald },
              { icon: 'money-off',     label: tr.noPlatformFees,      color: C.saffron  },
              { icon: 'support-agent', label: tr.prioritySupport,     color: '#2563EB'  },
            ].map((f, i) => (
              <View key={i} style={S.subFeature}>
                <View style={[S.subFeatureIcon, { backgroundColor: f.color + '18' }]}>
                  <Icon name={f.icon} size={18} color={f.color} />
                </View>
                <Text style={S.subFeatureTxt}>{f.label}</Text>
              </View>
            ))}
            <TouchableOpacity style={[S.postBtn, { backgroundColor: C.purple, marginTop: 12 }]} onPress={handleSubscribe} disabled={processingFee} activeOpacity={0.85}>
              {processingFee ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={S.postBtnTxt}>{tr.subscribeNowPerMonth}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={S.ghostBtn} onPress={() => setShowSubModal(false)} disabled={processingFee}>
              <Text style={S.ghostTxt}>{tr.later}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.bg },

  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, padding: 32 },
  centerCard:   { alignItems: 'center', backgroundColor: C.surface, borderRadius: 24, padding: 36, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 6 },
  centerIconWrap:{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.saffronSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  centerTitle:  { fontSize: 18, fontWeight: '700', color: C.slate, marginBottom: 6, textAlign: 'center' },
  centerSub:    { fontSize: 13, color: C.slateL, textAlign: 'center', lineHeight: 20 },
  centerBtn:    { marginTop: 24, backgroundColor: C.saffron, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, shadowColor: C.saffron, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  centerBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.borderL,
    paddingHorizontal: 8, paddingBottom: 12,
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
  },
  hdrBtn:   { padding: 8, minWidth: 40, alignItems: 'center' },
  hdrTitle: { fontSize: 18, fontWeight: '800', color: C.slate, letterSpacing: -0.4 },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  banner:     { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, gap: 12 },
  bannerIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  bannerTitle:{ fontSize: 14, fontWeight: '700', marginBottom: 4 },
  bannerSub:  { fontSize: 12, fontWeight: '500' },
  dotRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  dotLabel:   { fontSize: 11, color: C.slateL, marginLeft: 4 },
  upgradePill:{ backgroundColor: C.saffron, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  upgradePillTxt: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  card:       { backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3, borderWidth: 1, borderColor: C.borderL },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  cardIconWrap:{ width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  cardTitle:  { fontSize: 16, fontWeight: '800', color: C.slate, letterSpacing: -0.3 },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: C.slateL, marginBottom: 7, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.8 },
  input:      { backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.slate, borderWidth: 1, borderColor: C.border },
  textarea:   { height: 96, textAlignVertical: 'top', paddingTop: 13 },
  iconInput:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  iconInputField: { flex: 1, paddingHorizontal: 10, paddingVertical: 13, fontSize: 15, color: C.slate },

  pickerBtn:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 13 },
  pickerTxt:  { flex: 1, fontSize: 15, color: C.slate, fontWeight: '600' },
  timeRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  timeArrow:  { paddingBottom: 14, alignItems: 'center' },
  durationChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 14, backgroundColor: C.saffronSoft, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.saffronMid },
  durationChipTxt:{ fontSize: 13, fontWeight: '700', color: C.saffron },

  rateRow:    { flexDirection: 'row', alignItems: 'center', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  ratePrefix: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.saffronSoft, borderRightWidth: 1, borderRightColor: C.saffronMid },
  rupeeSymbol:{ fontSize: 20, fontWeight: '800', color: C.saffron },
  rateField:  { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 24, color: C.slate, fontWeight: '800', backgroundColor: C.bg },
  rateSuffix: { paddingHorizontal: 14, backgroundColor: C.bg },
  ratePerHr:  { fontSize: 13, color: C.slateL, fontWeight: '600' },
  rateHint:   { fontSize: 12, color: C.slateL, marginTop: 8 },

  earningsCard:   { marginTop: 16, backgroundColor: C.saffronSoft, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.saffronMid },
  earningsRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  earningsStat:   { flex: 1, alignItems: 'center' },
  earningsVal:    { fontSize: 18, fontWeight: '800', color: C.slate, marginBottom: 2 },
  earningsLbl:    { fontSize: 11, color: C.slateL, fontWeight: '500' },
  earningsDivider:{ width: 1, height: 40, backgroundColor: C.saffronMid },
  earningsBar:    { height: 4, backgroundColor: C.saffronMid, borderRadius: 2, overflow: 'hidden', marginBottom: 10 },
  earningsBarFill:{ height: '100%', backgroundColor: C.saffron, borderRadius: 2 },
  earningsNote:   { fontSize: 11, color: C.slateM, textAlign: 'center' },

  postBtn:    { backgroundColor: C.saffron, borderRadius: 16, paddingVertical: 17, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10, shadowColor: C.saffron, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 6 },
  postBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  ghostBtn:   { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 16, paddingVertical: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  ghostTxt:   { fontSize: 15, fontWeight: '600', color: C.slateL },
  tipRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 8, paddingHorizontal: 4 },
  tipTxt:     { fontSize: 12, color: C.slateL, lineHeight: 18, flex: 1, fontStyle: 'italic' },

  modalOverlay:{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 28 },
  sheetHandle:{ width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  sheetHeadRow:{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  sheetHeadIcon:{ width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.slate },
  sheetSub:   { fontSize: 13, color: C.slateL, marginTop: 2 },
  feeAmtBox:  { alignItems: 'center', backgroundColor: C.saffronSoft, borderRadius: 16, paddingVertical: 20, marginBottom: 22, borderWidth: 1, borderColor: C.saffronMid },
  feeAmtLabel:{ fontSize: 11, fontWeight: '700', color: C.saffron, letterSpacing: 1.4, marginBottom: 4 },
  feeAmtVal:  { fontSize: 44, fontWeight: '800', color: C.saffronDeep },
  chooseLabel:{ fontSize: 11, fontWeight: '700', color: C.slateL, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  payOptCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  payOptIcon: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  payOptTitle:{ fontSize: 15, fontWeight: '700', color: C.slate, marginBottom: 3 },
  payOptSub:  { fontSize: 12, color: C.slateL },
  payNote:    { fontSize: 12, color: C.slateL, textAlign: 'center', marginVertical: 12, lineHeight: 17, fontStyle: 'italic' },

  subHero:       { alignItems: 'center', marginBottom: 20 },
  subHeroIcon:   { width: 72, height: 72, borderRadius: 36, backgroundColor: C.goldSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  subHeroTitle:  { fontSize: 20, fontWeight: '800', color: C.slate, marginBottom: 8 },
  subPriceRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  subPrice:      { fontSize: 40, fontWeight: '800', color: '#78350F' },
  subPricePer:   { fontSize: 14, color: '#92400E', fontWeight: '600' },
  subFeature:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, paddingHorizontal: 4 },
  subFeatureIcon:{ width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  subFeatureTxt: { fontSize: 15, color: C.slate, fontWeight: '600' },
});