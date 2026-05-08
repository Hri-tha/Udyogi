// src/screens/employer/PlatformFeePaymentScreen.js
// FIXES:
//   1. user can be null (AsyncStorage-only mode) — replaced every user.uid /
//      user.displayName reference with safe resolvedUid / resolvedName from
//      useAuth() userProfile fallback + AsyncStorage lookup.
//   2. After "Pay Now" succeeds the fee record in pendingFeeData is created
//      here (not in PostJobScreen) so there is no double-creation.

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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../constants/colors';
import RazorpayWebView from '../../components/RazorpayWebView';
import {
  checkPendingFees,
  processPlatformFeePayment,
  getFeeById,
  createPlatformFee,
} from '../../services/platformFeeService';
import {
  initiateRazorpayPayment,
  verifyRazorpayPayment,
  isRazorpayAvailable,
} from '../../services/razorpay';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';

// ── Safely resolve uid even when Firebase Auth is unavailable ─────────────────
async function resolveUidFromStorage() {
  try {
    const raw = await AsyncStorage.getItem('current_user');
    if (raw) {
      const p = JSON.parse(raw);
      if (p?.uid && p.uid !== 'none' && p.uid.length > 5) return p.uid;
    }
    for (const key of ['userId', 'uid', 'user_id', '@user_id', 'authUser', 'user']) {
      const val = await AsyncStorage.getItem(key);
      if (val && val !== 'none' && val.length > 5) {
        try {
          const p = JSON.parse(val);
          if (p?.uid && p.uid !== 'none') return p.uid;
        } catch { return val; }
      }
    }
  } catch (_) {}
  return null;
}

const PlatformFeePaymentScreen = ({ route, navigation }) => {
  const { user, userProfile } = useAuth();
  const { locale } = useLanguage();

  const {
    feeIds = [],
    totalAmount = 0,
    returnTo,
    immediateFeeAmount = 0,
    postJobData,
    fromPostJob = false,
    isNewJobPayment = false,
    source,
    // pendingFeeData — fee record to create AFTER successful payment
    pendingFeeData,
  } = route.params || {};

  // ── Resolve uid safely ────────────────────────────────────────────────────
  const [resolvedUid, setResolvedUid]   = useState(user?.uid || userProfile?.uid || null);
  const [resolvedName, setResolvedName] = useState(
    user?.displayName || userProfile?.name || userProfile?.companyName || 'Employer'
  );

  useEffect(() => {
    // If uid not yet known, try AsyncStorage
    if (!resolvedUid) {
      resolveUidFromStorage().then(uid => {
        if (uid) setResolvedUid(uid);
      });
    }
    // Keep name in sync
    const name = user?.displayName || userProfile?.name || userProfile?.companyName || 'Employer';
    setResolvedName(name);
  }, [user, userProfile]);

  const [loading, setLoading]                 = useState(true);
  const [processing, setProcessing]           = useState(false);
  const [fees, setFees]                       = useState([]);
  const [selectedMethod, setSelectedMethod]   = useState('online');
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [showRazorpayWebView, setShowRazorpayWebView] = useState(false);
  const [webViewPaymentData, setWebViewPaymentData]   = useState(null);
  const [isLoadingSpecificFee, setIsLoadingSpecificFee] = useState(false);

  const translations = {
    en: {
      platformFeePayment: 'Platform Fee Payment',
      back: 'Back',
      paymentRequired: 'Payment Required',
      payToComplete: 'Pay platform fee to complete job posting',
      clearFees: 'Please clear pending platform fees to continue posting jobs',
      allFeesPaid: 'All Fees Paid',
      noPendingFees: 'You have no pending platform fees',
      totalAmountDue: 'Total Amount Due',
      platformFeeFor: 'Platform fee for new job posting',
      platformFeeForJobs: 'Platform fee for',
      job: 'job', jobs: 'jobs',
      feeBreakdown: 'Fee Breakdown',
      platformFee: 'Platform Fee', jobPayment: 'Job Payment',
      newJob: 'New Job', immediatePayment: 'Immediate Payment',
      percentageFee: '5% fee',
      noPendingFeesMessage: 'You have no pending platform fees. You can post new jobs freely.',
      paymentMethod: 'Payment Method',
      onlinePayment: 'Online Payment',
      upiCardsNetbanking: 'UPI, Cards, Net Banking',
      currentlyUnavailable: 'Currently unavailable',
      cashPayment: 'Cash Payment',
      contactSupport: 'Contact support for details',
      infoNote: 'Platform fees help us maintain and improve the service. Payment is required before posting new jobs.',
      infoNoteImmediate: 'Pay platform fee now to complete your job posting. Job will be visible to workers immediately after payment.',
      infoNoteNoFees: 'Platform fee is 5% of total job payment. Pay within 7 days of job completion.',
      payNow: 'Pay Now',
      arrangeCashPayment: 'Arrange Cash Payment',
      cancelJobPosting: 'Cancel Job Posting',
      cancelAndReturn: 'Cancel and Return',
      returnToJobs: 'Return to Jobs',
      loadingFeeDetails: 'Loading fee details...',
      loadingPaymentDetails: 'Loading payment details...',
      noValidFees: 'No valid fees to pay',
      noFeesToPay: 'No fees to pay',
      paymentFailed: 'Payment Failed',
      verificationFailed: 'Payment Verification Failed',
      tryAgain: 'Please try again or contact support',
      paymentSuccessful: 'Payment Successful',
      paidSuccessfully: 'paid successfully!',
      continue: 'Continue',
      cashPaymentTitle: 'Cash Payment',
      cashPaymentMessage: 'Please contact support to arrange cash payment of platform fees.',
      markAsPaid: 'Mark as Paid',
      paymentRecorded: 'Payment Recorded',
      cashPaymentVerified: 'Your cash payment will be verified by our team. You can post jobs once verified.',
      error: 'Error',
      failedToLoad: 'Failed to load payment details',
      failedToProcess: 'Failed to process payment',
      failedOnlinePayment: 'Failed to process online payment',
      failedCashPayment: 'Failed to record cash payment',
    },
    hi: {
      platformFeePayment: 'प्लेटफॉर्म शुल्क भुगतान',
      back: 'वापस',
      paymentRequired: 'भुगतान आवश्यक',
      payToComplete: 'नौकरी पोस्टिंग पूरी करने के लिए प्लेटफॉर्म शुल्क भुगतान करें',
      clearFees: 'नई नौकरियां पोस्ट करने के लिए कृपया लंबित प्लेटफॉर्म शुल्क चुकाएं',
      allFeesPaid: 'सभी शुल्क चुकाए गए',
      noPendingFees: 'आपका कोई लंबित प्लेटफॉर्म शुल्क नहीं है',
      totalAmountDue: 'कुल देय राशि',
      platformFeeFor: 'नई नौकरी पोस्टिंग के लिए प्लेटफॉर्म शुल्क',
      platformFeeForJobs: 'के लिए प्लेटफॉर्म शुल्क',
      job: 'नौकरी', jobs: 'नौकरियों',
      feeBreakdown: 'शुल्क विवरण',
      platformFee: 'प्लेटफॉर्म शुल्क', jobPayment: 'नौकरी भुगतान',
      newJob: 'नई नौकरी', immediatePayment: 'तत्काल भुगतान',
      percentageFee: '5% शुल्क',
      noPendingFeesMessage: 'आपका कोई लंबित प्लेटफॉर्म शुल्क नहीं है। आप स्वतंत्र रूप से नई नौकरियां पोस्ट कर सकते हैं।',
      paymentMethod: 'भुगतान विधि',
      onlinePayment: 'ऑनलाइन भुगतान',
      upiCardsNetbanking: 'यूपीआई, कार्ड, नेट बैंकिंग',
      currentlyUnavailable: 'वर्तमान में अनुपलब्ध',
      cashPayment: 'नकद भुगतान',
      contactSupport: 'विवरण के लिए समर्थन से संपर्क करें',
      infoNote: 'प्लेटफॉर्म शुल्क सेवा को बनाए रखने और सुधारने में मदद करते हैं। नई नौकरियां पोस्ट करने से पहले भुगतान आवश्यक है।',
      infoNoteImmediate: 'अपनी नौकरी पोस्टिंग पूरी करने के लिए अभी प्लेटफॉर्म शुल्क भुगतान करें। भुगतान के तुरंत बाद नौकरी कर्मचारियों को दिखाई देगी।',
      infoNoteNoFees: 'प्लेटफॉर्म शुल्क कुल नौकरी भुगतान का 5% है। नौकरी पूरा होने के 7 दिनों के भीतर भुगतान करें।',
      payNow: 'अभी भुगतान करें',
      arrangeCashPayment: 'नकद भुगतान की व्यवस्था करें',
      cancelJobPosting: 'नौकरी पोस्टिंग रद्द करें',
      cancelAndReturn: 'रद्द करें और वापस जाएं',
      returnToJobs: 'नौकरियों पर वापस जाएं',
      loadingFeeDetails: 'शुल्क विवरण लोड हो रहा है...',
      loadingPaymentDetails: 'भुगतान विवरण लोड हो रहा है...',
      noValidFees: 'भुगतान के लिए कोई वैध शुल्क नहीं',
      noFeesToPay: 'भुगतान के लिए कोई शुल्क नहीं',
      paymentFailed: 'भुगतान विफल',
      verificationFailed: 'भुगतान सत्यापन विफल',
      tryAgain: 'कृपया पुनः प्रयास करें या समर्थन से संपर्क करें',
      paymentSuccessful: 'भुगतान सफल',
      paidSuccessfully: 'सफलतापूर्वक भुगतान किया गया!',
      continue: 'जारी रखें',
      cashPaymentTitle: 'नकद भुगतान',
      cashPaymentMessage: 'कृपया प्लेटफॉर्म शुल्क के नकद भुगतान की व्यवस्था करने के लिए समर्थन से संपर्क करें।',
      markAsPaid: 'चुकाया गया मार्क करें',
      paymentRecorded: 'भुगतान दर्ज किया गया',
      cashPaymentVerified: 'आपका नकद भुगतान हमारी टीम द्वारा सत्यापित किया जाएगा। सत्यापित होने के बाद आप नौकरियां पोस्ट कर सकते हैं।',
      error: 'त्रुटि',
      failedToLoad: 'भुगतान विवरण लोड करने में विफल',
      failedToProcess: 'भुगतान प्रोसेस करने में विफल',
      failedOnlinePayment: 'ऑनलाइन भुगतान प्रोसेस करने में विफल',
      failedCashPayment: 'नकद भुगतान दर्ज करने में विफल',
    },
  };

  const tr = translations[locale] || translations.en;

  useEffect(() => {
    loadFees();
    checkRazorpay();
  }, []);

  const checkRazorpay = () => {
    setRazorpayEnabled(isRazorpayAvailable());
  };

  const loadFees = async () => {
    try {
      if (isNewJobPayment && immediateFeeAmount > 0) {
        const immediateFee = {
          id: feeIds[0] || `temp_${Date.now()}`,
          amount: immediateFeeAmount,
          jobTitle: postJobData?.title || 'New Job',
          totalJobPayment: postJobData?.totalPayment || immediateFeeAmount * 20,
          needsPayment: true,
          status: 'pending_payment',
          isImmediateFee: true,
          description: `Platform fee for: ${postJobData?.title || 'New Job'}`,
          createdAt: new Date(),
        };
        setFees([immediateFee]);
        setLoading(false);
        return;
      }

      if (feeIds.length > 0 && !isNewJobPayment) {
        setIsLoadingSpecificFee(true);
        const loadedFees = [];
        for (const feeId of feeIds) {
          try {
            const fee = await getFeeById(feeId);
            if (fee && fee.needsPayment) loadedFees.push(fee);
          } catch (error) {
            console.error(`Error loading fee ${feeId}:`, error);
          }
        }
        if (loadedFees.length > 0) {
          setFees(loadedFees);
          setLoading(false);
          setIsLoadingSpecificFee(false);
          return;
        }
      }

      // Fallback — use resolvedUid (safe even when user is null)
      const uid = resolvedUid || user?.uid || userProfile?.uid;
      if (!uid) { setLoading(false); return; }

      const result = await checkPendingFees(uid);
      if (result.success) {
        setFees(result.pendingFees.filter(fee => fee.needsPayment === true));
      } else {
        Alert.alert(tr.error, result.error || tr.failedToLoad);
      }
    } catch (error) {
      console.error('Error loading fees:', error);
      if (immediateFeeAmount > 0) {
        setFees([{
          id: 'fallback_fee',
          amount: immediateFeeAmount,
          jobTitle: postJobData?.title || 'Job',
          totalJobPayment: immediateFeeAmount * 20,
          needsPayment: true,
          status: 'pending',
          isFallback: true,
          description: locale === 'hi' ? 'प्लेटफॉर्म शुल्क भुगतान' : 'Platform fee payment',
        }]);
      } else {
        Alert.alert(tr.error, tr.failedToLoad);
      }
    } finally {
      setLoading(false);
      setIsLoadingSpecificFee(false);
    }
  };

  const handlePayNow = async () => {
    const currentFees = fees.length > 0 ? fees
      : immediateFeeAmount > 0 ? [{
          id: 'current_fee',
          amount: immediateFeeAmount,
          description: locale === 'hi' ? 'प्लेटफॉर्म शुल्क भुगतान' : 'Platform fee payment',
        }]
      : [];

    if (currentFees.length === 0) {
      Alert.alert(locale === 'hi' ? 'सूचना' : 'Info', tr.noFeesToPay);
      return;
    }

    setProcessing(true);
    try {
      if (selectedMethod === 'online' && razorpayEnabled) {
        await handleOnlinePayment(currentFees);
      } else {
        await handleCashPayment(currentFees);
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(tr.error, tr.failedToProcess);
    } finally {
      setProcessing(false);
    }
  };

  const handleOnlinePayment = async (currentFees) => {
    try {
      const total  = currentFees.reduce((sum, fee) => sum + fee.amount, 0);
      const ids    = currentFees.map(fee => fee.id);
      // FIX: use resolvedUid + resolvedName — never touch user directly
      const uid    = resolvedUid || user?.uid || userProfile?.uid || '';
      const name   = resolvedName;

      if (currentFees.length === 0 || total <= 0) {
        Alert.alert(tr.error, tr.noValidFees);
        return;
      }

      const paymentData = {
        amount: Math.round(total * 100), // paise
        description: currentFees.length === 1 && currentFees[0].jobTitle
          ? `${locale === 'hi' ? 'के लिए प्लेटफॉर्म शुल्क:' : 'Platform fee for:'} ${currentFees[0].jobTitle}`
          : `${locale === 'hi' ? 'के लिए प्लेटफॉर्म शुल्क' : 'Platform fee for'} ${currentFees.length} ${locale === 'hi' ? 'नौकरियों' : 'job' + (currentFees.length > 1 ? 's' : '')}`,
        employerName: name,
        employerId: uid,
        feeIds: ids,
        returnTo,
      };

      const razorpayResult = await initiateRazorpayPayment(paymentData);

      if (razorpayResult.success && razorpayResult.useWebView) {
        const webViewData = {
          ...razorpayResult.webViewConfig,
          htmlContent: razorpayResult.htmlContent,
          onSuccess: async (paymentResult) => {
            try {
              const verificationResult = await verifyRazorpayPayment(paymentResult);

              if (verificationResult.success && verificationResult.verified) {
                // FIX: If this is a new job payment, create the fee record NOW
                // (job already created by PostJobScreen — no duplication)
                if (isNewJobPayment && pendingFeeData) {
                  try {
                    await createPlatformFee({
                      ...pendingFeeData,
                      paymentOption: 'now',
                      status: 'paid',
                      needsPayment: false,
                    });
                  } catch (feeCreateErr) {
                    console.warn('Fee record creation failed (non-fatal):', feeCreateErr.message);
                  }
                }

                // Mark existing fee records as paid
                const paymentPromises = currentFees
                  .filter(fee => !fee.id?.startsWith('temp_') && !fee.id?.startsWith('fallback_') && fee.id !== 'current_fee')
                  .map(fee =>
                    processPlatformFeePayment(fee.id, {
                      method: 'online',
                      paymentId: paymentResult.paymentId,
                      razorpayData: paymentResult,
                      amount: fee.amount,
                      timestamp: new Date().toISOString(),
                      employerId: uid,
                      isNewJobPayment,
                    })
                  );
                if (paymentPromises.length > 0) await Promise.all(paymentPromises);

                Alert.alert(
                  `✅ ${locale === 'hi' ? 'भुगतान सफल' : 'Payment Successful'}`,
                  `₹${total} ${locale === 'hi' ? 'का प्लेटफॉर्म शुल्क सफलतापूर्वक भुगतान किया गया!' : 'platform fee paid successfully!'}`,
                  [{
                    text: locale === 'hi' ? 'जारी रखें' : 'Continue',
                    onPress: async () => {
                      await loadFees();
                      if (returnTo === 'PostJobSuccess' && postJobData) {
                        navigation.replace('PostJobSuccess', { jobData: postJobData, isPaid: true });
                      } else if (returnTo) {
                        navigation.replace(returnTo);
                      } else if (fromPostJob) {
                        navigation.navigate('PostJob', { refresh: true });
                      } else {
                        navigation.goBack();
                      }
                    },
                  }]
                );
              } else {
                Alert.alert(
                  locale === 'hi' ? 'भुगतान सत्यापन विफल' : 'Payment Verification Failed',
                  verificationResult.error || tr.tryAgain
                );
              }
            } catch (verificationError) {
              console.error('Verification error:', verificationError);
              Alert.alert(tr.error, tr.tryAgain);
            }
          },
          onError: (error) => {
            Alert.alert(
              locale === 'hi' ? 'भुगतान विफल' : 'Payment Failed',
              error.error || locale === 'hi' ? 'भुगतान पूरा नहीं किया जा सका' : 'Payment could not be completed'
            );
          },
        };

        setWebViewPaymentData(webViewData);
        setShowRazorpayWebView(true);
      } else if (!razorpayResult.success) {
        Alert.alert(
          locale === 'hi' ? 'भुगतान विफल' : 'Payment Failed',
          razorpayResult.error || locale === 'hi' ? 'भुगतान शुरू नहीं किया जा सका' : 'Payment could not be initialized'
        );
      }
    } catch (error) {
      console.error('Online payment error:', error);
      Alert.alert(tr.error, `${tr.failedOnlinePayment}: ${error.message}`);
      setProcessing(false);
    }
  };

  const handleCashPayment = async (currentFees) => {
    const uid = resolvedUid || user?.uid || userProfile?.uid || '';
    Alert.alert(
      locale === 'hi' ? 'नकद भुगतान' : 'Cash Payment',
      locale === 'hi' ? 'कृपया प्लेटफॉर्म शुल्क के नकद भुगतान की व्यवस्था करने के लिए समर्थन से संपर्क करें।' : 'Please contact support to arrange cash payment of platform fees.',
      [
        { text: locale === 'hi' ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: locale === 'hi' ? 'चुकाया गया मार्क करें' : 'Mark as Paid',
          onPress: async () => {
            try {
              const cashPromises = currentFees
                .filter(fee => !fee.id?.startsWith('temp_') && !fee.id?.startsWith('fallback_') && fee.id !== 'current_fee')
                .map(fee =>
                  processPlatformFeePayment(fee.id, {
                    method: 'cash', amount: fee.amount,
                    timestamp: new Date().toISOString(),
                    employerId: uid, status: 'pending_verification',
                  })
                );
              if (cashPromises.length > 0) await Promise.all(cashPromises);

              Alert.alert(
                locale === 'hi' ? 'भुगतान दर्ज किया गया' : 'Payment Recorded',
                locale === 'hi' ? 'आपका नकद भुगतान हमारी टीम द्वारा सत्यापित किया जाएगा।' : 'Your cash payment will be verified by our team. You can post jobs once verified.',
                [{
                  text: 'OK',
                  onPress: async () => {
                    await loadFees();
                    if (returnTo) navigation.replace(returnTo);
                    else if (fromPostJob) navigation.navigate('PostJob', { refresh: true });
                    else navigation.goBack();
                  },
                }]
              );
            } catch (error) {
              console.error('Cash payment error:', error);
              Alert.alert(tr.error, tr.failedCashPayment);
            }
          },
        },
      ]
    );
  };

  const handleBackPress = () => {
    if (fromPostJob) navigation.navigate('PostJob', { refresh: true });
    else if (returnTo) navigation.replace(returnTo);
    else if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('EmployerHome');
  };

  const handleCancel = () => {
    if (fromPostJob) navigation.navigate('PostJob', { refresh: true });
    else if (returnTo) navigation.replace(returnTo);
    else if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('EmployerHome');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          {isLoadingSpecificFee ? tr.loadingFeeDetails : tr.loadingPaymentDetails}
        </Text>
      </View>
    );
  }

  const totalDue = fees.reduce((sum, fee) => sum + (fee.amount || 0), 0) || immediateFeeAmount || totalAmount || 0;
  const hasFees  = fees.length > 0 || immediateFeeAmount > 0;

  return (
    <View style={styles.container}>
      <RazorpayWebView
        visible={showRazorpayWebView}
        onClose={() => setShowRazorpayWebView(false)}
        paymentData={webViewPaymentData}
        onPaymentSuccess={(result) => {
          setShowRazorpayWebView(false);
          webViewPaymentData?.onSuccess(result);
        }}
        onPaymentFailed={(error) => {
          setShowRazorpayWebView(false);
          webViewPaymentData?.onError(error);
        }}
      />

      {/* Header */}
      <LinearGradient colors={[colors.primary, '#4A90E2']} style={styles.gradientHeader}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Text style={styles.backButtonText}>
              ← {locale === 'hi' ? 'वापस' : 'Back'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {locale === 'hi' ? 'प्लेटफॉर्म शुल्क भुगतान' : 'Platform Fee Payment'}
          </Text>
          <View style={{ width: 60 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Banner */}
        {hasFees ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningIcon}>💰</Text>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>
                {locale === 'hi' ? 'भुगतान आवश्यक' : 'Payment Required'}
              </Text>
              <Text style={styles.warningText}>
                {isNewJobPayment ? tr.payToComplete : tr.clearFees}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.successBanner}>
            <Text style={styles.successIcon}>✅</Text>
            <View style={styles.successContent}>
              <Text style={styles.successTitle}>
                {locale === 'hi' ? 'सभी शुल्क चुकाए गए' : 'All Fees Paid'}
              </Text>
              <Text style={styles.successText}>
                {locale === 'hi' ? 'आपका कोई लंबित प्लेटफॉर्म शुल्क नहीं है' : 'You have no pending platform fees'}
              </Text>
            </View>
          </View>
        )}

        {/* Total card */}
        {hasFees && (
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>
              {locale === 'hi' ? 'कुल देय राशि' : 'Total Amount Due'}
            </Text>
            <Text style={styles.totalAmount}>₹{totalDue}</Text>
            <Text style={styles.totalSubtext}>
              {isNewJobPayment
                ? (locale === 'hi' ? 'नई नौकरी पोस्टिंग के लिए प्लेटफॉर्म शुल्क' : 'Platform fee for new job posting')
                : fees.length > 0
                  ? `${locale === 'hi' ? 'के लिए प्लेटफॉर्म शुल्क' : 'Platform fee for'} ${fees.length} ${locale === 'hi' ? (fees.length > 1 ? 'नौकरियों' : 'नौकरी') : 'job' + (fees.length > 1 ? 's' : '')}`
                  : (locale === 'hi' ? 'प्लेटफॉर्म शुल्क भुगतान' : 'Platform fee payment')}
            </Text>
          </View>
        )}

        {/* Fee breakdown */}
        {hasFees ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{locale === 'hi' ? 'शुल्क विवरण' : 'Fee Breakdown'}</Text>
            {fees.map((fee, index) => (
              <View key={fee.id || index} style={styles.feeItem}>
                <View style={styles.feeInfo}>
                  <Text style={styles.feeJobTitle}>
                    {fee.jobTitle || fee.description || (locale === 'hi' ? 'प्लेटफॉर्म शुल्क' : 'Platform Fee')}
                  </Text>
                  <Text style={styles.feeDetails}>
                    {fee.totalJobPayment
                      ? `${locale === 'hi' ? 'नौकरी भुगतान' : 'Job Payment'}: ₹${fee.totalJobPayment}`
                      : `${locale === 'hi' ? 'प्लेटफॉर्म शुल्क' : 'Platform fee'}: ${fee.percentage || '5%'}`}
                  </Text>
                  {fee.isImmediateFee && (
                    <Text style={styles.feeImmediate}>
                      {locale === 'hi' ? '🆕 नई नौकरी' : '🆕 New Job'}
                    </Text>
                  )}
                </View>
                <View style={styles.feeAmountContainer}>
                  <Text style={styles.feeAmount}>₹{fee.amount || totalDue}</Text>
                  <Text style={styles.feePercentage}>{locale === 'hi' ? '5% शुल्क' : '5% fee'}</Text>
                </View>
              </View>
            ))}
            {fees.length === 0 && immediateFeeAmount > 0 && (
              <View style={styles.feeItem}>
                <View style={styles.feeInfo}>
                  <Text style={styles.feeJobTitle}>
                    {postJobData?.title || (locale === 'hi' ? 'नई नौकरी पोस्टिंग' : 'New Job Posting')}
                  </Text>
                  <Text style={styles.feeDetails}>
                    {locale === 'hi' ? 'नौकरी पोस्टिंग के लिए प्लेटफॉर्म शुल्क' : 'Platform fee for job posting'}
                  </Text>
                  <Text style={styles.feeImmediate}>
                    {locale === 'hi' ? '🆕 तत्काल भुगतान' : '🆕 Immediate Payment'}
                  </Text>
                </View>
                <View style={styles.feeAmountContainer}>
                  <Text style={styles.feeAmount}>₹{immediateFeeAmount}</Text>
                  <Text style={styles.feePercentage}>{locale === 'hi' ? '5% शुल्क' : '5% fee'}</Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{locale === 'hi' ? 'कोई लंबित शुल्क नहीं' : 'No Pending Fees'}</Text>
            <Text style={styles.noFeesText}>
              {locale === 'hi'
                ? 'आपका कोई लंबित प्लेटफॉर्म शुल्क नहीं है। आप स्वतंत्र रूप से नई नौकरियां पोस्ट कर सकते हैं।'
                : 'You have no pending platform fees. You can post new jobs freely.'}
            </Text>
          </View>
        )}

        {/* Payment method */}
        {hasFees && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{locale === 'hi' ? 'भुगतान विधि' : 'Payment Method'}</Text>

            <TouchableOpacity
              style={[styles.methodCard, selectedMethod === 'online' && styles.methodCardSelected]}
              onPress={() => setSelectedMethod('online')}
              disabled={!razorpayEnabled}
            >
              <View style={styles.methodIcon}><Text style={styles.methodIconText}>💳</Text></View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>{locale === 'hi' ? 'ऑनलाइन भुगतान' : 'Online Payment'}</Text>
                <Text style={styles.methodSubtitle}>
                  {razorpayEnabled
                    ? (locale === 'hi' ? 'यूपीआई, कार्ड, नेट बैंकिंग' : 'UPI, Cards, Net Banking')
                    : (locale === 'hi' ? 'वर्तमान में अनुपलब्ध' : 'Currently unavailable')}
                </Text>
              </View>
              <View style={[styles.radio, selectedMethod === 'online' && styles.radioSelected]}>
                {selectedMethod === 'online' && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodCard, selectedMethod === 'cash' && styles.methodCardSelected]}
              onPress={() => setSelectedMethod('cash')}
            >
              <View style={styles.methodIcon}><Text style={styles.methodIconText}>💵</Text></View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>{locale === 'hi' ? 'नकद भुगतान' : 'Cash Payment'}</Text>
                <Text style={styles.methodSubtitle}>
                  {locale === 'hi' ? 'विवरण के लिए समर्थन से संपर्क करें' : 'Contact support for details'}
                </Text>
              </View>
              <View style={[styles.radio, selectedMethod === 'cash' && styles.radioSelected]}>
                {selectedMethod === 'cash' && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            {hasFees
              ? isNewJobPayment ? tr.infoNoteImmediate : tr.infoNote
              : tr.infoNoteNoFees}
          </Text>
        </View>

        {/* Pay button */}
        {hasFees && (
          <TouchableOpacity
            style={[styles.payButton, processing && styles.payButtonDisabled]}
            onPress={handlePayNow}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Text style={styles.payButtonIcon}>💰</Text>
                <Text style={styles.payButtonText}>
                  {selectedMethod === 'online'
                    ? (locale === 'hi' ? `₹${totalDue} अभी भुगतान करें` : `Pay ₹${totalDue} Now`)
                    : (locale === 'hi' ? 'नकद भुगतान की व्यवस्था करें' : 'Arrange Cash Payment')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.backButtonCard} onPress={handleCancel}>
          <Text style={styles.backButtonCardText}>
            {hasFees
              ? isNewJobPayment
                ? (locale === 'hi' ? 'नौकरी पोस्टिंग रद्द करें' : 'Cancel Job Posting')
                : (locale === 'hi' ? 'रद्द करें और वापस जाएं' : 'Cancel and Return')
              : (locale === 'hi' ? 'नौकरियों पर वापस जाएं' : 'Return to Jobs')}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.background },
  loadingContainer:   { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText:        { marginTop: 12, fontSize: 16, color: colors.textSecondary },
  gradientHeader:     { paddingTop: 60, paddingBottom: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  backButton:         { padding: 8 },
  backButtonText:     { color: colors.white, fontSize: 16, fontWeight: '600' },
  headerTitle:        { fontSize: 20, fontWeight: 'bold', color: colors.white },
  content:            { flex: 1, padding: 20 },
  warningBanner:      { flexDirection: 'row', backgroundColor: colors.warning + '20', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.warning, marginBottom: 20 },
  successBanner:      { flexDirection: 'row', backgroundColor: colors.success + '20', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.success, marginBottom: 20 },
  warningIcon:        { fontSize: 24, marginRight: 12 },
  successIcon:        { fontSize: 24, marginRight: 12 },
  warningContent:     { flex: 1 },
  successContent:     { flex: 1 },
  warningTitle:       { fontSize: 16, fontWeight: 'bold', color: colors.warning, marginBottom: 4 },
  successTitle:       { fontSize: 16, fontWeight: 'bold', color: colors.success, marginBottom: 4 },
  warningText:        { fontSize: 14, color: colors.text, lineHeight: 20 },
  successText:        { fontSize: 14, color: colors.text, lineHeight: 20 },
  totalCard:          { backgroundColor: colors.primary, padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  totalLabel:         { fontSize: 14, color: colors.white, opacity: 0.9, marginBottom: 8 },
  totalAmount:        { fontSize: 48, fontWeight: 'bold', color: colors.white, marginBottom: 8 },
  totalSubtext:       { fontSize: 14, color: colors.white, opacity: 0.9 },
  card:               { backgroundColor: colors.white, padding: 20, borderRadius: 16, marginBottom: 16, shadowColor: colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  cardTitle:          { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  noFeesText:         { fontSize: 14, color: colors.textSecondary, lineHeight: 20, textAlign: 'center', paddingVertical: 20 },
  feeItem:            { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  feeInfo:            { flex: 1 },
  feeJobTitle:        { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  feeDetails:         { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  feeImmediate:       { fontSize: 11, color: colors.primary, backgroundColor: colors.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
  feeAmountContainer: { alignItems: 'flex-end' },
  feeAmount:          { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 2 },
  feePercentage:      { fontSize: 11, color: colors.textSecondary },
  methodCard:         { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 2, borderColor: colors.border, marginBottom: 12 },
  methodCardSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  methodIcon:         { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  methodIconText:     { fontSize: 24 },
  methodInfo:         { flex: 1 },
  methodTitle:        { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 },
  methodSubtitle:     { fontSize: 13, color: colors.textSecondary },
  radio:              { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  radioSelected:      { borderColor: colors.primary },
  radioInner:         { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  infoBox:            { flexDirection: 'row', backgroundColor: colors.info + '15', padding: 16, borderRadius: 12, marginBottom: 20 },
  infoIcon:           { fontSize: 20, marginRight: 12 },
  infoText:           { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
  payButton:          { flexDirection: 'row', backgroundColor: colors.primary, padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  payButtonDisabled:  { opacity: 0.6 },
  payButtonIcon:      { fontSize: 20, marginRight: 8 },
  payButtonText:      { fontSize: 18, fontWeight: 'bold', color: colors.white },
  backButtonCard:     { backgroundColor: colors.background, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  backButtonCardText: { fontSize: 16, color: colors.text, fontWeight: '600' },
});

export default PlatformFeePaymentScreen;