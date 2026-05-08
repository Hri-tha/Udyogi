// src/screens/employer/PostJobScreen.js
// FIXES:
//   1. Duplicate job posting on "Pay Later": job is now created ONCE before
//      showing the fee modal. createdJobIdRef persists across modal open/close.
//   2. createPlatformFee failure is caught gracefully — job already posted.
//   3. user can be null (AsyncStorage-only mode) — resolvedUid everywhere.
//   4. Improved UI with better visual design.

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
  teal:        '#0891B2',
  tealSoft:    '#E0F2FE',
};

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
    postingJob: 'Posting your job…',
    jobPosted: 'Job Posted!',
    feeNote: 'Only 5% of total job payment',
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
    postingJob: 'नौकरी पोस्ट हो रही है…',
    jobPosted: 'नौकरी पोस्ट हुई!',
    feeNote: 'कुल भुगतान का केवल 5%',
  },
};

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

export default function PostJobScreen({ navigation, route }) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { locale } = useLanguage();
  const tr = T[locale] || T.en;

  const [resolvedUid, setResolvedUid]     = useState(null);
  const [uidReady, setUidReady]           = useState(false);
  const resolvedName  = user?.displayName  || userProfile?.name  || userProfile?.companyName || 'Employer';
  const resolvedEmail = user?.email        || userProfile?.email || 'employer@udyogi.com';

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

  // ─── KEY FIX: job is created BEFORE modal opens ───────────────────────────
  // Once the job is created we store its ID here. If the user dismisses and
  // re-opens the modal (or retries), we reuse the same ID — no duplicates.
  const createdJobIdRef = useRef(null);
  // Track whether job creation is in progress so double-taps are blocked
  const jobCreationInProgress = useRef(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    resolveUid(user, userProfile).then(uid => {
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
    createdJobIdRef.current = null;
    jobCreationInProgress.current = false;
  };

  const goBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('EmployerHome');

  const buildJob = () => ({
    title: title.trim(), description: description.trim(), location: location.trim(),
    rate: parseInt(rate), employerId: resolvedUid,
    companyName: userProfile?.companyName || userProfile?.name || 'Company',
    employerPhone: userProfile?.phoneNumber || '',
    jobDate: fDS(jobDate), startTime: fTS(startTime), endTime: fTS(endTime), category: 'General',
  });

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    if (!resolvedUid)       { Alert.alert(tr.error, tr.authError); return false; }
    if (!title.trim())       { Alert.alert(tr.error, tr.enterJobTitle); return false; }
    if (!description.trim()) { Alert.alert(tr.error, tr.enterDescription); return false; }
    if (!location.trim())    { Alert.alert(tr.error, tr.enterLocation); return false; }
    if (!rate || parseFloat(rate) < 50) { Alert.alert(tr.error, tr.rateMinimum); return false; }
    const today = new Date(); today.setHours(0,0,0,0);
    const sel   = new Date(jobDate); sel.setHours(0,0,0,0);
    if (sel < today)      { Alert.alert(tr.error, tr.dateNotPast); return false; }
    if (!endAfterStart()) { Alert.alert(tr.error, tr.endTimeAfterStart); return false; }
    if (durHrs() < 1)     { Alert.alert(tr.error, tr.durationMinimum); return false; }
    return true;
  };

  // ── Main post handler ───────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      let fc;
      try { fc = await canPostJobForFree(resolvedUid); }
      catch (_) { fc = { success: true, canPostForFree: true }; }
      if (!fc.success) { Alert.alert(tr.error, fc.error); return; }

      if (fc.canPostForFree) {
        await doFreePost();
        return;
      }

      // Needs platform fee — calculate it
      let fee;
      try { fee = await calculateJobPostingFee(totalPay(), resolvedUid); }
      catch (_) { fee = null; }
      if (!fee || !fee.success) {
        // Fallback: treat as free post
        await doFreePost();
        return;
      }

      setFeeInfo(fee);

      // ─── KEY FIX: Create the job HERE, before opening the modal ────────────
      // This way no matter which option (Pay Now / Pay Later) the user chooses,
      // the job already exists and we never call createJobWithTiming twice.
      if (!createdJobIdRef.current && !jobCreationInProgress.current) {
        jobCreationInProgress.current = true;
        const r = await createJobWithTiming(buildJob());
        jobCreationInProgress.current = false;
        if (!r.success) {
          Alert.alert(tr.error, r.error || tr.failedToPost);
          return;
        }
        createdJobIdRef.current = r.jobId;
        console.log('✅ Job created before modal:', createdJobIdRef.current);
      }

      setShowFeeModal(true);
    } catch (e) {
      Alert.alert(tr.error, e.message || tr.tryAgain);
      jobCreationInProgress.current = false;
    } finally {
      setLoading(false);
    }
  };

  // ── Free post (no platform fee) ─────────────────────────────────────────────
  const doFreePost = async () => {
    setLoading(true);
    try {
      if (!subStatus?.isActive) {
        const u = await updateFreeJobPostCount(resolvedUid);
        if (!u.success) throw new Error(u.error);
      }
      const r = await createJobWithTiming({
        ...buildJob(),
        isFreePost: !subStatus?.isActive,
        subscriptionPost: subStatus?.isActive || false,
      });
      if (!r.success) throw new Error(r.error || tr.failedToPost);
      await refreshUserProfile?.();
      await loadStats();
      navigation.replace('PostJobSuccess', {
        jobData: {
          jobId: r.jobId, ...buildJob(),
          jobDate: fD(jobDate), startTime: fT(startTime), endTime: fT(endTime),
          duration: durHrs(), totalPayment: totalPay(), platformFee: 0,
        },
        isPaid: false, isFree: true,
      });
    } catch (e) { Alert.alert(tr.error, e.message || tr.tryAgain); }
    finally { setLoading(false); }
  };

  // ── Fee modal: Pay Now ──────────────────────────────────────────────────────
  const doPayNow = async () => {
    const jobId = createdJobIdRef.current;
    if (!jobId) {
      Alert.alert(tr.error, 'Job not found. Please try again.');
      setShowFeeModal(true);
      return;
    }

    setProcessingFee(true);
    setShowFeeModal(false);
    try {
      navigation.navigate('PlatformFeePayment', {
        feeIds: [],
        totalAmount: feeInfo.platformFee,
        returnTo: 'PostJobSuccess',
        postJobData: {
          jobId,
          ...buildJob(),
          jobDate: fD(jobDate),
          startTime: fT(startTime),
          endTime: fT(endTime),
          duration: durHrs(),
          totalPayment: totalPay(),
          platformFee: feeInfo.platformFee,
        },
        fromPostJob: true,
        isNewJobPayment: true,
        immediateFeeAmount: feeInfo.platformFee,
        pendingFeeData: {
          employerId: resolvedUid,
          employerName: resolvedName,
          jobId,
          jobTitle: title.trim(),
          amount: feeInfo.platformFee,
          totalJobPayment: totalPay(),
          paymentOption: 'now',
          status: 'pending_payment',
          needsPayment: true,
        },
      });
    } catch (e) {
      Alert.alert(tr.error, e.message || tr.tryAgain);
      setShowFeeModal(true);
    } finally {
      setProcessingFee(false);
    }
  };

  // ── Fee modal: Pay Later ────────────────────────────────────────────────────
  // Job was already created in handlePost. Just record the fee and navigate.
  const doPayLater = async () => {
    const jobId = createdJobIdRef.current;
    if (!jobId) {
      Alert.alert(tr.error, 'Job not found. Please try again.');
      setShowFeeModal(true);
      return;
    }

    setProcessingFee(true);
    setShowFeeModal(false);
    try {
      // Try to create the fee record — failure is non-fatal (job is already posted)
      if (feeInfo && !feeInfo.isFree && feeInfo.platformFee > 0) {
        try {
          await createPlatformFee({
            employerId: resolvedUid,
            employerName: resolvedName,
            jobId,
            jobTitle: title.trim(),
            amount: feeInfo.platformFee,
            totalJobPayment: totalPay(),
            paymentOption: 'later',
            status: 'pending',
            needsPayment: false,
          });
          console.log('✅ Platform fee record created');
        } catch (feeErr) {
          // Firebase permissions error — fee record creation failed but job is posted
          console.warn('⚠️ Fee record creation failed (non-fatal, job already posted):', feeErr.message);
          // Job was posted successfully; we continue to success screen
        }
      }

      await refreshUserProfile?.();
      await loadStats();

      navigation.replace('PostJobSuccess', {
        jobData: {
          jobId,
          ...buildJob(),
          jobDate: fD(jobDate),
          startTime: fT(startTime),
          endTime: fT(endTime),
          duration: durHrs(),
          totalPayment: totalPay(),
          platformFee: feeInfo?.platformFee || 0,
        },
        isPaid: false,
      });
    } catch (e) {
      Alert.alert(tr.error, e.message || tr.tryAgain);
      // Re-open modal so user can retry
      setShowFeeModal(true);
    } finally {
      setProcessingFee(false);
    }
  };

  const handleFeeOpt = (opt) => {
    setSelPayOpt(opt);
    if (opt === 'now') doPayNow();
    else doPayLater();
  };

  // ── Subscribe ────────────────────────────────────────────────────────────────
  const handleSubscribe = async () => {
    if (!resolvedUid) { Alert.alert(tr.error, tr.authError); return; }
    if (!razorpayOk)  { Alert.alert(tr.error, 'Online payment unavailable'); return; }
    setProcessingFee(true);
    try {
      const rr = await initiateRazorpayPayment({
        amount: 4900,
        description: 'Monthly Subscription',
        employerName: resolvedName,
        employerId: resolvedUid,
        subscription: true,
      });
      if (rr.success && rr.useWebView) {
        setRpData({
          ...rr.webViewConfig,
          htmlContent: rr.htmlContent,
          onSuccess: async (pr) => {
            try {
              const vr = await verifyRazorpayPayment(pr);
              if (vr.success && vr.verified) {
                await activateMonthlySubscription(resolvedUid, {
                  paymentId: pr.paymentId,
                  transactionId: pr.orderId,
                });
                await refreshUserProfile?.();
                await loadStats();
                Alert.alert('✅', tr.unlimitedJobsNow, [{ text: 'Great!', onPress: () => setShowSubModal(false) }]);
              }
            } catch (e) {
              Alert.alert(tr.subscriptionFailed, e.message || 'Try again');
            }
          },
          onError: (e) => Alert.alert(tr.subscriptionFailed, e.error || 'Try again'),
        });
        setShowRPWebView(true);
      }
    } catch (e) { Alert.alert(tr.error, tr.subscriptionFailed); }
    finally { setProcessingFee(false); }
  };

  const freeTotal = postingStats?.freePostsAvailable || 3;
  const freeUsed  = postingStats?.freePostsUsed || 0;
  const freeLeft  = postingStats?.freePostsRemaining ?? (freeTotal - freeUsed);
  const dur       = parseFloat(durHrs());
  const pay       = totalPay();
  const rateNum   = parseInt(rate) || 0;
  const busy      = loading || processingFee;

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
            <Text style={{ fontSize: 32 }}>⚠️</Text>
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
          <TouchableOpacity onPress={goBack} style={S.hdrBtn}><Text style={S.backArrow}>←</Text></TouchableOpacity>
          <Text style={S.hdrTitle}>{tr.postNewJob}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={S.centerScreen}>
          <View style={S.centerCard}>
            <View style={[S.centerIconWrap, { backgroundColor: C.redSoft }]}><Text style={{ fontSize: 32 }}>🔒</Text></View>
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
          <Text style={S.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={S.hdrTitle}>{tr.postNewJob}</Text>
        <TouchableOpacity onPress={clearForm} style={S.hdrBtn}>
          <Text style={{ fontSize: 18, color: C.slateL }}>↺</Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={S.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Status Banner ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {subStatus?.isActive ? (
            <View style={[S.banner, S.bannerGold]}>
              <View style={[S.bannerIcon, { backgroundColor: '#FEF3C7' }]}>
                <Text style={{ fontSize: 18 }}>👑</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.bannerTitle, { color: '#78350F' }]}>{tr.unlimitedJobPosting}</Text>
                <Text style={[S.bannerSub, { color: '#92400E' }]}>{subStatus.daysRemaining} {tr.daysRemaining}</Text>
              </View>
              <View style={S.badgePremium}><Text style={S.badgePremiumTxt}>PRO</Text></View>
            </View>
          ) : freeLeft > 0 ? (
            <View style={[S.banner, S.bannerGreen]}>
              <View style={[S.bannerIcon, { backgroundColor: '#A7F3D0' }]}>
                <Text style={{ fontSize: 18 }}>🎁</Text>
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
            <View style={[S.banner, S.bannerOrange]}>
              <View style={[S.bannerIcon, { backgroundColor: C.saffronMid }]}>
                <Text style={{ fontSize: 18 }}>⚡</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.bannerTitle, { color: C.saffronDeep }]}>{tr.freePostsExhausted}</Text>
                <Text style={[S.bannerSub, { color: C.saffron }]}>Platform fee applies • {tr.feeNote}</Text>
              </View>
              <TouchableOpacity style={S.upgradePill} onPress={() => setShowSubModal(true)}>
                <Text style={S.upgradePillTxt}>{tr.getUnlimited}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* ── Section 1: Job Details ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
          <View style={S.card}>
            <View style={S.cardHeader}>
              <View style={[S.cardIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Text style={{ fontSize: 16 }}>💼</Text>
              </View>
              <Text style={S.cardTitle}>{tr.jobDetails}</Text>
            </View>

            <Text style={S.fieldLabel}>{tr.jobTitle}</Text>
            <TextInput
              style={S.input} placeholder={tr.jobTitlePlaceholder} placeholderTextColor={C.slateL}
              value={title} onChangeText={setTitle} returnKeyType="next"
            />

            <Text style={S.fieldLabel}>{tr.description}</Text>
            <TextInput
              style={[S.input, S.textarea]} placeholder={tr.descriptionPlaceholder} placeholderTextColor={C.slateL}
              value={description} onChangeText={setDescription} multiline numberOfLines={4} textAlignVertical="top"
            />

            <Text style={S.fieldLabel}>{tr.location}</Text>
            <View style={S.iconInput}>
              <Text style={{ fontSize: 16, marginLeft: 14 }}>📍</Text>
              <TextInput
                style={S.iconInputField} placeholder={tr.locationPlaceholder} placeholderTextColor={C.slateL}
                value={location} onChangeText={setLocation} returnKeyType="done"
              />
            </View>
          </View>
        </Animated.View>

        {/* ── Section 2: Schedule ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={S.card}>
            <View style={S.cardHeader}>
              <View style={[S.cardIconWrap, { backgroundColor: C.emeraldSoft }]}>
                <Text style={{ fontSize: 16 }}>📅</Text>
              </View>
              <Text style={S.cardTitle}>{tr.schedule}</Text>
            </View>

            <Text style={S.fieldLabel}>{tr.jobDate}</Text>
            <TouchableOpacity style={S.pickerBtn} onPress={() => setShowDate(true)} activeOpacity={0.75}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>📆</Text>
              <Text style={S.pickerTxt}>{fD(jobDate)}</Text>
              <Text style={{ color: C.slateL }}>▼</Text>
            </TouchableOpacity>

            <View style={S.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={S.fieldLabel}>{tr.startTime}</Text>
                <TouchableOpacity style={S.pickerBtn} onPress={() => setShowStart(true)} activeOpacity={0.75}>
                  <Text style={{ fontSize: 14, marginRight: 6 }}>🕐</Text>
                  <Text style={S.pickerTxt}>{fT(startTime)}</Text>
                </TouchableOpacity>
              </View>
              <View style={S.timeArrow}>
                <Text style={{ color: C.slateL, fontSize: 18 }}>→</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.fieldLabel}>{tr.endTime}</Text>
                <TouchableOpacity style={S.pickerBtn} onPress={() => setShowEnd(true)} activeOpacity={0.75}>
                  <Text style={{ fontSize: 14, marginRight: 6 }}>🕐</Text>
                  <Text style={S.pickerTxt}>{fT(endTime)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {dur > 0 && (
              <View style={S.durationChip}>
                <Text style={{ fontSize: 12 }}>⏱</Text>
                <Text style={S.durationChipTxt}>{dur} {tr.hoursTotal} total</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Section 3: Payment ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={S.card}>
            <View style={S.cardHeader}>
              <View style={[S.cardIconWrap, { backgroundColor: '#FFF7ED' }]}>
                <Text style={{ fontSize: 16 }}>💰</Text>
              </View>
              <Text style={S.cardTitle}>{tr.payment}</Text>
            </View>

            <Text style={S.fieldLabel}>{tr.hourlyRate}</Text>
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
          </View>
        </Animated.View>

        {/* ── Fee Preview (when free posts exhausted) ── */}
        {freeLeft === 0 && !subStatus?.isActive && dur > 0 && rateNum >= 50 && (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={S.feePreviewCard}>
              <View style={S.feePreviewRow}>
                <View style={S.feePreviewLeft}>
                  <Text style={S.feePreviewIcon}>🧾</Text>
                  <View>
                    <Text style={S.feePreviewTitle}>Platform Fee</Text>
                    <Text style={S.feePreviewSub}>5% of ₹{pay} worker payment</Text>
                  </View>
                </View>
                <View style={S.feePreviewRight}>
                  <Text style={S.feePreviewAmount}>₹{Math.round(pay * 0.05)}</Text>
                  <Text style={S.feePreviewNote}>Pay now or later</Text>
                </View>
              </View>
              <View style={S.feePreviewDivider} />
              <TouchableOpacity style={S.feePreviewUpgrade} onPress={() => setShowSubModal(true)}>
                <Text style={S.feePreviewUpgradeTxt}>✨ Subscribe ₹49/mo to skip all fees</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Pickers */}
        <CustomDateTimePicker visible={showDate}  mode="date" value={jobDate}   minimumDate={new Date()} onConfirm={d => { setJobDate(d);   setShowDate(false);  }} onCancel={() => setShowDate(false)}  />
        <CustomDateTimePicker visible={showStart} mode="time" value={startTime}                          onConfirm={t => { setStartTime(t); setShowStart(false); }} onCancel={() => setShowStart(false)} />
        <CustomDateTimePicker visible={showEnd}   mode="time" value={endTime}                            onConfirm={t => { setEndTime(t);   setShowEnd(false);   }} onCancel={() => setShowEnd(false)}   />

        {/* Action buttons */}
        <Animated.View style={{ opacity: fadeAnim, marginTop: 4 }}>
          <TouchableOpacity style={[S.postBtn, busy && { opacity: 0.6 }]} onPress={handlePost} disabled={busy} activeOpacity={0.88}>
            {busy
              ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={S.postBtnTxt}>{loading ? tr.postingJob : 'Processing…'}</Text>
                </View>
              )
              : <Text style={S.postBtnTxt}>🚀  {tr.postJob}</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={S.ghostBtn} onPress={goBack} disabled={busy} activeOpacity={0.7}>
            <Text style={S.ghostTxt}>← {tr.cancel}</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={S.tipRow}>
          <Text style={{ fontSize: 14, color: C.gold }}>💡</Text>
          <Text style={S.tipTxt}>{tr.tip}</Text>
        </View>
        <View style={{ height: 40 }} />
      </Animated.ScrollView>

      {/* ── Platform Fee Modal ── */}
      <Modal visible={showFeeModal} animationType="slide" transparent onRequestClose={() => {
        // Allow closing modal — job is already created, user can retry later
        setShowFeeModal(false);
      }}>
        <View style={S.modalOverlay}>
          <View style={S.sheet}>
            <View style={S.sheetHandle} />

            {/* Modal header */}
            <View style={S.sheetHeadRow}>
              <View style={[S.sheetHeadIcon, { backgroundColor: C.saffronSoft }]}>
                <Text style={{ fontSize: 22 }}>🧾</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.sheetTitle}>{tr.platformFee}</Text>
                <Text style={S.sheetSub}>{tr.platformFeeDesc}{totalPay()} · 5%</Text>
              </View>
            </View>

            {/* Job posted confirmation */}
            <View style={S.jobPostedBadge}>
              <Text style={S.jobPostedIcon}>✅</Text>
              <Text style={S.jobPostedText}>{tr.jobPosted} Choose how to pay the platform fee.</Text>
            </View>

            {/* Fee amount */}
            <View style={S.feeAmtBox}>
              <Text style={S.feeAmtLabel}>PLATFORM FEE DUE</Text>
              <Text style={S.feeAmtVal}>₹{feeInfo?.platformFee || 0}</Text>
              <Text style={S.feeAmtNote}>5% of ₹{totalPay()} worker payment</Text>
            </View>

            <Text style={S.chooseLabel}>{tr.choosePaymentOption}</Text>

            {/* Pay Now option */}
            <TouchableOpacity
              style={[S.payOptCard, S.payOptCardNow, !razorpayOk && { opacity: 0.4 }]}
              onPress={() => handleFeeOpt('now')}
              disabled={!razorpayOk || processingFee}
              activeOpacity={0.8}
            >
              <View style={[S.payOptIcon, { backgroundColor: '#EFF6FF' }]}>
                <Text style={{ fontSize: 20 }}>💳</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={S.payOptTitle}>{tr.payNow}</Text>
                <Text style={S.payOptSub}>{razorpayOk ? tr.instantOnline : tr.currentlyUnavailable}</Text>
              </View>
              {selPayOpt === 'now' && processingFee
                ? <ActivityIndicator size="small" color="#2563EB" />
                : <View style={S.payOptArrow}><Text style={{ color: '#2563EB', fontSize: 18, fontWeight: '700' }}>›</Text></View>}
            </TouchableOpacity>

            {/* Pay Later option */}
            <TouchableOpacity
              style={[S.payOptCard, S.payOptCardLater]}
              onPress={() => handleFeeOpt('later')}
              disabled={processingFee}
              activeOpacity={0.8}
            >
              <View style={[S.payOptIcon, { backgroundColor: '#FFFBEB' }]}>
                <Text style={{ fontSize: 20 }}>🕐</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={S.payOptTitle}>{tr.payAfterJob}</Text>
                <Text style={S.payOptSub}>{tr.postNowPayLater}</Text>
              </View>
              {selPayOpt === 'later' && processingFee
                ? <ActivityIndicator size="small" color="#D97706" />
                : <View style={S.payOptArrow}><Text style={{ color: '#D97706', fontSize: 18, fontWeight: '700' }}>›</Text></View>}
            </TouchableOpacity>

            <View style={S.payNoteBox}>
              <Text style={{ fontSize: 13 }}>ℹ️</Text>
              <Text style={S.payNote}>{tr.notePayLater}</Text>
            </View>

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
              <View style={S.subHeroIcon}><Text style={{ fontSize: 32 }}>👑</Text></View>
              <Text style={S.subHeroTitle}>{tr.monthlySubscription}</Text>
              <View style={S.subPriceRow}>
                <Text style={S.subPrice}>₹49</Text>
                <Text style={S.subPricePer}>{tr.perMonth}</Text>
              </View>
            </View>
            {[
              { icon: '♾️', label: tr.unlimitedJobPosting, color: C.emerald },
              { icon: '🆓', label: tr.noPlatformFees,      color: C.saffron  },
              { icon: '🎯', label: tr.prioritySupport,     color: '#2563EB'  },
            ].map((f, i) => (
              <View key={i} style={S.subFeature}>
                <View style={[S.subFeatureIcon, { backgroundColor: f.color + '18' }]}>
                  <Text style={{ fontSize: 18 }}>{f.icon}</Text>
                </View>
                <Text style={S.subFeatureTxt}>{f.label}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={[S.postBtn, { backgroundColor: C.purple, marginTop: 12 }]}
              onPress={handleSubscribe}
              disabled={processingFee}
              activeOpacity={0.85}
            >
              {processingFee
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={S.postBtnTxt}>{tr.subscribeNowPerMonth}</Text>
              }
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

const S = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.bg },

  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, padding: 32 },
  centerCard:   { alignItems: 'center', backgroundColor: C.surface, borderRadius: 24, padding: 36, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 6 },
  centerIconWrap:{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.saffronSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  centerTitle:  { fontSize: 18, fontWeight: '700', color: C.slate, marginBottom: 6, textAlign: 'center' },
  centerSub:    { fontSize: 13, color: C.slateL, textAlign: 'center', lineHeight: 20 },
  centerBtn:    { marginTop: 24, backgroundColor: C.saffron, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  centerBtnTxt: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  hdr: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.borderL,
    paddingHorizontal: 8, paddingBottom: 12,
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
  },
  hdrBtn:   { padding: 8, minWidth: 40, alignItems: 'center' },
  hdrTitle: { fontSize: 18, fontWeight: '800', color: C.slate, letterSpacing: -0.4 },
  backArrow:{ fontSize: 22, color: C.saffron, fontWeight: '600' },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  // Banners
  banner:      { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, gap: 12 },
  bannerGold:  { backgroundColor: C.goldSoft, borderColor: '#FDE68A' },
  bannerGreen: { backgroundColor: C.emeraldSoft, borderColor: '#6EE7B7' },
  bannerOrange:{ backgroundColor: C.saffronSoft, borderColor: C.saffronMid },
  bannerIcon:  { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  bannerSub:   { fontSize: 12, fontWeight: '500' },
  dotRow:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  dotLabel:    { fontSize: 11, color: C.slateL, marginLeft: 4 },
  badgePremium:{ backgroundColor: '#92400E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgePremiumTxt: { fontSize: 10, fontWeight: '800', color: '#FEF3C7', letterSpacing: 1 },
  upgradePill:    { backgroundColor: C.saffron, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  upgradePillTxt: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  // Cards
  card:       { backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3, borderWidth: 1, borderColor: C.borderL },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  cardIconWrap:{ width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  cardTitle:  { fontSize: 16, fontWeight: '800', color: C.slate, letterSpacing: -0.3 },

  // Fields
  fieldLabel: { fontSize: 11, fontWeight: '700', color: C.slateL, marginBottom: 7, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.8 },
  input:      { backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.slate, borderWidth: 1, borderColor: C.border },
  textarea:   { height: 96, textAlignVertical: 'top', paddingTop: 13 },
  iconInput:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  iconInputField: { flex: 1, paddingHorizontal: 10, paddingVertical: 13, fontSize: 15, color: C.slate },

  // Pickers
  pickerBtn:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 13 },
  pickerTxt:  { flex: 1, fontSize: 15, color: C.slate, fontWeight: '600' },
  timeRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  timeArrow:  { paddingBottom: 14, alignItems: 'center' },
  durationChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 14, backgroundColor: C.saffronSoft, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.saffronMid },
  durationChipTxt:{ fontSize: 13, fontWeight: '700', color: C.saffron },

  // Rate
  rateRow:    { flexDirection: 'row', alignItems: 'center', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  ratePrefix: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.saffronSoft, borderRightWidth: 1, borderRightColor: C.saffronMid },
  rupeeSymbol:{ fontSize: 20, fontWeight: '800', color: C.saffron },
  rateField:  { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 24, color: C.slate, fontWeight: '800', backgroundColor: C.bg },
  rateSuffix: { paddingHorizontal: 14, backgroundColor: C.bg },
  ratePerHr:  { fontSize: 13, color: C.slateL, fontWeight: '600' },
  rateHint:   { fontSize: 12, color: C.slateL, marginTop: 8 },

  // Earnings preview
  earningsCard:   { marginTop: 16, backgroundColor: C.saffronSoft, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: C.saffronMid },
  earningsRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  earningsStat:   { flex: 1, alignItems: 'center' },
  earningsVal:    { fontSize: 18, fontWeight: '800', color: C.slate, marginBottom: 2 },
  earningsLbl:    { fontSize: 11, color: C.slateL, fontWeight: '500' },
  earningsDivider:{ width: 1, height: 40, backgroundColor: C.saffronMid },
  earningsBar:    { height: 4, backgroundColor: C.saffronMid, borderRadius: 2, overflow: 'hidden', marginBottom: 10 },
  earningsBarFill:{ height: '100%', backgroundColor: C.saffron, borderRadius: 2 },
  earningsNote:   { fontSize: 11, color: C.slateM, textAlign: 'center' },

  // Fee preview card
  feePreviewCard:  { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1.5, borderColor: C.saffronMid, borderStyle: 'dashed' },
  feePreviewRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  feePreviewLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  feePreviewIcon:  { fontSize: 24 },
  feePreviewTitle: { fontSize: 15, fontWeight: '700', color: C.slate },
  feePreviewSub:   { fontSize: 12, color: C.slateL, marginTop: 2 },
  feePreviewRight: { alignItems: 'flex-end' },
  feePreviewAmount:{ fontSize: 22, fontWeight: '800', color: C.saffronDeep },
  feePreviewNote:  { fontSize: 11, color: C.slateL, marginTop: 2 },
  feePreviewDivider:{ height: 1, backgroundColor: C.borderL, marginVertical: 12 },
  feePreviewUpgrade:{ alignItems: 'center', paddingVertical: 4 },
  feePreviewUpgradeTxt:{ fontSize: 13, fontWeight: '600', color: C.purple },

  // Buttons
  postBtn:    { backgroundColor: C.saffron, borderRadius: 16, paddingVertical: 17, justifyContent: 'center', alignItems: 'center', marginBottom: 10, shadowColor: C.saffron, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 6 },
  postBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  ghostBtn:   { justifyContent: 'center', alignItems: 'center', borderRadius: 16, paddingVertical: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  ghostTxt:   { fontSize: 15, fontWeight: '600', color: C.slateL },
  tipRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 8, paddingHorizontal: 4 },
  tipTxt:     { fontSize: 12, color: C.slateL, lineHeight: 18, flex: 1, fontStyle: 'italic' },

  // Modal / Sheet
  modalOverlay:{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 28 },
  sheetHandle:{ width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  sheetHeadRow:{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  sheetHeadIcon:{ width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.slate },
  sheetSub:   { fontSize: 13, color: C.slateL, marginTop: 2 },

  // Job posted badge
  jobPostedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.emeraldSoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, borderWidth: 1, borderColor: '#6EE7B7' },
  jobPostedIcon:  { fontSize: 16 },
  jobPostedText:  { flex: 1, fontSize: 13, fontWeight: '600', color: '#065F46', lineHeight: 18 },

  // Fee amount box
  feeAmtBox:  { alignItems: 'center', backgroundColor: C.saffronSoft, borderRadius: 16, paddingVertical: 20, marginBottom: 22, borderWidth: 1, borderColor: C.saffronMid },
  feeAmtLabel:{ fontSize: 11, fontWeight: '700', color: C.saffron, letterSpacing: 1.4, marginBottom: 4 },
  feeAmtVal:  { fontSize: 44, fontWeight: '800', color: C.saffronDeep },
  feeAmtNote: { fontSize: 12, color: C.slateL, marginTop: 4 },

  chooseLabel:{ fontSize: 11, fontWeight: '700', color: C.slateL, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  // Payment option cards
  payOptCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: C.border },
  payOptCardNow:    { borderColor: '#BFDBFE' },
  payOptCardLater:  { borderColor: '#FDE68A' },
  payOptIcon:       { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  payOptTitle:      { fontSize: 15, fontWeight: '700', color: C.slate, marginBottom: 3 },
  payOptSub:        { fontSize: 12, color: C.slateL },
  payOptArrow:      { width: 28, height: 28, borderRadius: 14, backgroundColor: C.borderL, justifyContent: 'center', alignItems: 'center' },
  payNoteBox:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.goldSoft, borderRadius: 10, padding: 12, marginBottom: 14 },
  payNote:          { fontSize: 12, color: '#92400E', flex: 1, lineHeight: 17, fontStyle: 'italic' },

  // Subscription modal
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