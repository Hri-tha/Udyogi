// src/screens/employer/PaymentProcessingScreen.js - FIXED NAVIGATION + TOAST
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { colors } from '../../constants/colors';
import { useLanguage } from '../../context/LanguageContext';
import {
  processPayment,
  processOnlinePayment,
  fixCompletedJobPayment
} from '../../services/database';
import {
  initiateRazorpayPayment,
  verifyRazorpayPayment,
  isRazorpayAvailable
} from '../../services/razorpay';
import RazorpayWebView from '../../components/RazorpayWebView';
import { db } from '../../services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import { useToast } from '../../components/Toast'; // ← ADDED

const { width } = Dimensions.get('window');

const PaymentProcessingScreen = ({ route, navigation }) => {
  const { applicationId } = route.params;
  const { locale, t } = useLanguage();
  const toast = useToast(); // ← ADDED

  const [application, setApplication] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [actualPayment, setActualPayment] = useState(0);
  const [workDuration, setWorkDuration] = useState(0);
  const [needsFix, setNeedsFix] = useState(false);
  const [error, setError] = useState(null);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [showRazorpayWebView, setShowRazorpayWebView] = useState(false);
  const [webViewPaymentData, setWebViewPaymentData] = useState(null);

  // ── Helper: navigate back to tracking after successful payment ───────────
  const navigateAfterPayment = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('EmployerJobTracking', { applicationId });
    }
  };

  // Translations for this screen
  const translations = {
    en: {
      processPayment: "Process Payment",
      loadingPaymentDetails: "Loading payment details...",
      loadingTimeout: "Loading Timeout",
      errorLoadingData: "Error Loading Data",
      timeoutMessage: "Taking too long to load payment details. Please check your connection and try again.",
      retry: "Retry",
      goBack: "Go Back",
      paymentDetailsNotFound: "Payment details not found",
      paymentTo: "Payment To",
      fixJobData: "Fix Job Data",
      fixJobDataDesc: "This job is marked as completed but is missing completion time data. The current payment calculation (₹{amount}) is based on temporary fallback.",
      fixJobDataButton: "Fix Job Data & Save Calculation",
      fixing: "Fixing...",
      paymentCalculation: "Payment Calculation",
      calculatedPayment: "Calculated Payment: ₹{amount} (based on {duration} of work)",
      expectedPayment: "Expected Payment: ₹{amount} (based on scheduled hours)",
      workDuration: "Work Duration",
      hourlyRate: "Hourly Rate",
      calculatedAmount: "Calculated Amount",
      paymentInfo: "Payment is calculated based on actual work hours completed by the worker.",
      expectedPaymentInfo: "Payment is based on scheduled work hours as actual work duration is not available.",
      paymentAmount: "Payment Amount",
      recommended: "Recommended: ₹{amount} (based on actual work hours)",
      expected: "Expected: ₹{amount} (based on scheduled hours)",
      enterAmount: "Enter amount (recommended: {amount})",
      amountDifference: "Amount Difference",
      amountDifferenceDesc: "This amount differs from calculated payment (₹{amount})",
      paymentMethod: "Payment Method",
      cashPayment: "Cash Payment",
      cashDesc: "Pay directly in cash to the worker",
      onlinePayment: "Online Payment",
      onlineEnabled: "Secure payment via UPI, Cards & Net Banking",
      onlineDisabled: "Online payment currently unavailable",
      upiTransfer: "UPI Transfer",
      upiDesc: "Transfer via UPI to worker's account",
      bankTransfer: "Bank Transfer",
      bankDesc: "Direct bank account transfer",
      requiresAppUpdate: "Requires app update",
      securedByRazorpay: "Secured by Razorpay • UPI • Cards • Net Banking",
      paymentNotes: "Payment Notes (Optional)",
      addNotes: "Add any notes about this payment...",
      payOnline: "Pay ₹{amount} Online",
      payAmount: "Pay ₹{amount}",
      secureOnlinePayment: "Secure Online Payment",
      securePaymentDesc: "Your payment is secured with Razorpay. All transactions are encrypted and protected. Supports UPI, Credit/Debit Cards, Net Banking, and Wallets.",
      important: "Important",
      importantNote: "After processing the payment, both you and the worker will receive a confirmation notification. The job will be marked as completed and earnings will be updated.\n\n⚠️ Make sure you have completed the payment before confirming.",
      confirmPayment: "Confirm Payment",
      confirmPaymentMessage: "You are about to pay ₹{amount} for {duration} of work.\n\nThis amount is calculated based on actual work duration.",
      cancel: "Cancel",
      onlinePaymentUnavailable: "Online Payment Unavailable",
      onlinePaymentUnavailableDesc: "Online payments are currently not available. Please use cash payment.",
      paymentSuccessful: "🎉 Payment Successful",
      paymentSuccessfulDesc: "Online payment of ₹{amount} processed successfully! The worker has been notified.",
      done: "Done",
      paymentIssue: "Payment Issue",
      paymentIssueDesc: "Payment was processed by Razorpay but failed to update in our system. Please contact support with Payment ID: {id}",
      verificationFailed: "Payment Verification Failed",
      paymentFailed: "Payment Failed",
      jobDataFixed: "✅ Job Data Fixed",
      jobDataFixedDesc: "Payment calculation updated to ₹{amount} for {hours} hours of work.",
      ok: "OK",
      cannotProcessPayment: "Cannot Process Payment",
      waitForCompletion: "Please wait for the worker to complete the job first.",
      paymentRequired: "Payment Required",
      processBeforeCompleting: "Please process the payment before completing the job.",
      yesPaid: "Yes, I have paid",
      paymentRecorded: "✅ Payment Recorded",
      paymentRecordedDesc: "{method} of ₹{amount} has been successfully recorded. The worker has been notified and the job is marked as completed.",
      invalidAmount: "Invalid Amount",
      invalidAmountDesc: "Cannot process payment with invalid amount",
      minutes: "minutes",
      hour: "hour",
      hours: "hours",
      workStarted: "Work started",
      workCompleted: "Work completed",
      loading: "Loading...",
      name: "Name",
      phone: "Phone",
      job: "Job",
      error: "Error",
      failed: "Failed",
      pleaseTryAgain: "Please try again",
      contactSupport: "Contact support",
      support: "Support",
      rateWorkerNow: "Rate Worker Now",
    },
    hi: {
      processPayment: "भुगतान प्रक्रिया करें",
      loadingPaymentDetails: "भुगतान विवरण लोड हो रहे हैं...",
      loadingTimeout: "लोडिंग टाइमआउट",
      errorLoadingData: "डेटा लोड करने में त्रुटि",
      timeoutMessage: "भुगतान विवरण लोड करने में बहुत अधिक समय लग रहा है। कृपया अपना कनेक्शन जांचें और पुनः प्रयास करें।",
      retry: "पुनः प्रयास करें",
      goBack: "वापस जाएं",
      paymentDetailsNotFound: "भुगतान विवरण नहीं मिले",
      paymentTo: "भुगतान करें",
      fixJobData: "नौकरी डेटा ठीक करें",
      fixJobDataDesc: "यह नौकरी पूर्ण के रूप में चिह्नित है लेकिन समाप्ति समय डेटा गायब है। वर्तमान भुगतान गणना (₹{amount}) अस्थायी फॉलबैक पर आधारित है।",
      fixJobDataButton: "नौकरी डेटा ठीक करें और गणना सहेजें",
      fixing: "ठीक किया जा रहा है...",
      paymentCalculation: "भुगतान गणना",
      calculatedPayment: "गणना किया गया भुगतान: ₹{amount} ({duration} कार्य के आधार पर)",
      expectedPayment: "अनुमानित भुगतान: ₹{amount} (निर्धारित घंटों के आधार पर)",
      workDuration: "कार्य अवधि",
      hourlyRate: "प्रति घंटा दर",
      calculatedAmount: "गणना की गई राशि",
      paymentInfo: "भुगतान कर्मचारी द्वारा पूर्ण किए गए वास्तविक कार्य घंटों के आधार पर गणना की जाती है।",
      expectedPaymentInfo: "भुगतान निर्धारित कार्य घंटों के आधार पर है क्योंकि वास्तविक कार्य अवधि उपलब्ध नहीं है।",
      paymentAmount: "भुगतान राशि",
      recommended: "सिफारिश: ₹{amount} (वास्तविक कार्य घंटों के आधार पर)",
      expected: "अनुमानित: ₹{amount} (निर्धारित घंटों के आधार पर)",
      enterAmount: "राशि दर्ज करें (सिफारिश: {amount})",
      amountDifference: "राशि अंतर",
      amountDifferenceDesc: "यह राशि गणना किए गए भुगतान से भिन्न है (₹{amount})",
      paymentMethod: "भुगतान विधि",
      cashPayment: "नकद भुगतान",
      cashDesc: "कर्मचारी को सीधे नकद भुगतान करें",
      onlinePayment: "ऑनलाइन भुगतान",
      onlineEnabled: "यूपीआई, कार्ड और नेट बैंकिंग के माध्यम से सुरक्षित भुगतान",
      onlineDisabled: "ऑनलाइन भुगतान वर्तमान में उपलब्ध नहीं",
      upiTransfer: "यूपीआई ट्रांसफर",
      upiDesc: "कर्मचारी के खाते में यूपीआई के माध्यम से स्थानांतरण",
      bankTransfer: "बैंक ट्रांसफर",
      bankDesc: "सीधे बैंक खाते में स्थानांतरण",
      requiresAppUpdate: "ऐप अपडेट की आवश्यकता है",
      securedByRazorpay: "Razorpay द्वारा सुरक्षित • UPI • कार्ड • नेट बैंकिंग",
      paymentNotes: "भुगतान नोट्स (वैकल्पिक)",
      addNotes: "इस भुगतान के बारे में कोई नोट जोड़ें...",
      payOnline: "₹{amount} ऑनलाइन भुगतान करें",
      payAmount: "₹{amount} भुगतान करें",
      secureOnlinePayment: "सुरक्षित ऑनलाइन भुगतान",
      securePaymentDesc: "आपका भुगतान Razorpay द्वारा सुरक्षित है। सभी लेनदेन एन्क्रिप्टेड और संरक्षित हैं। यूपीआई, क्रेडिट/डेबिट कार्ड, नेट बैंकिंग और वॉलेट का समर्थन करता है।",
      important: "महत्वपूर्ण",
      importantNote: "भुगतान प्रक्रिया करने के बाद, आपको और कर्मचारी दोनों को पुष्टि सूचना प्राप्त होगी। नौकरी को पूर्ण के रूप में चिह्नित किया जाएगा और कमाई अपडेट हो जाएगी।\n\n⚠️ पुष्टि करने से पहले सुनिश्चित करें कि आपने भुगतान पूरा कर लिया है।",
      confirmPayment: "भुगतान की पुष्टि करें",
      confirmPaymentMessage: "आप {duration} कार्य के लिए ₹{amount} का भुगतान करने वाले हैं।\n\nयह राशि वास्तविक कार्य अवधि के आधार पर गणना की गई है।",
      cancel: "रद्द करें",
      onlinePaymentUnavailable: "ऑनलाइन भुगतान उपलब्ध नहीं",
      onlinePaymentUnavailableDesc: "ऑनलाइन भुगतान वर्तमान में उपलब्ध नहीं हैं। कृपया नकद भुगतान का उपयोग करें।",
      paymentSuccessful: "🎉 भुगतान सफल",
      paymentSuccessfulDesc: "₹{amount} का ऑनलाइन भुगतान सफलतापूर्वक प्रोसेस हुआ! कर्मचारी को सूचित कर दिया गया है।",
      done: "हो गया",
      paymentIssue: "भुगतान समस्या",
      paymentIssueDesc: "भुगतान Razorpay द्वारा प्रोसेस किया गया लेकिन हमारे सिस्टम में अपडेट करने में विफल रहा। पेमेंट आईडी के साथ सपोर्ट से संपर्क करें: {id}",
      verificationFailed: "भुगतान सत्यापन विफल",
      paymentFailed: "भुगतान विफल",
      jobDataFixed: "✅ नौकरी डेटा ठीक किया गया",
      jobDataFixedDesc: "भुगतान गणना {hours} घंटे के कार्य के लिए ₹{amount} में अपडेट की गई।",
      ok: "ठीक है",
      cannotProcessPayment: "भुगतान प्रक्रिया नहीं कर सकते",
      waitForCompletion: "कृपया पहले कर्मचारी के काम पूरा करने की प्रतीक्षा करें।",
      paymentRequired: "भुगतान आवश्यक",
      processBeforeCompleting: "कृपया नौकरी पूर्ण करने से पहले भुगतान प्रक्रिया करें।",
      yesPaid: "हां, मैंने भुगतान कर दिया है",
      paymentRecorded: "✅ भुगतान दर्ज किया गया",
      paymentRecordedDesc: "{method} के ₹{amount} का भुगतान सफलतापूर्वक दर्ज किया गया। कर्मचारी को सूचित कर दिया गया है और नौकरी को पूर्ण के रूप में चिह्नित किया गया है।",
      invalidAmount: "अमान्य राशि",
      invalidAmountDesc: "अमान्य राशि के साथ भुगतान प्रक्रिया नहीं कर सकते",
      minutes: "मिनट",
      hour: "घंटा",
      hours: "घंटे",
      workStarted: "कार्य शुरू",
      workCompleted: "कार्य पूर्ण",
      loading: "लोड हो रहा है...",
      name: "नाम",
      phone: "फोन",
      job: "नौकरी",
      error: "त्रुटि",
      failed: "विफल",
      pleaseTryAgain: "कृपया पुनः प्रयास करें",
      contactSupport: "सहायता से संपर्क करें",
      support: "समर्थन",
      rateWorkerNow: "कर्मचारी को रेट करें",
    }
  };

  const tr = translations[locale] || translations.en;

  useEffect(() => {
    loadData();
    checkRazorpayAvailability();
  }, []);

  // Real-time listener for application updates
  useEffect(() => {
    if (applicationId) {
      const appRef = doc(db, 'applications', applicationId);
      const unsubscribe = onSnapshot(appRef, (docSnap) => {
        if (docSnap.exists()) {
          const updatedApp = { id: docSnap.id, ...docSnap.data() };
          setApplication(updatedApp);
          if (updatedApp.workCompletedTimestamp) {
            const calculatedActualPayment = calculateActualPayment(updatedApp);
            setActualPayment(calculatedActualPayment);
            const workDurationHours = calculateWorkDurationHours(updatedApp);
            setWorkDuration(workDurationHours);
            if (!paymentAmount || paymentAmount === '0') {
              setPaymentAmount(calculatedActualPayment.toString());
            }
          }
        }
      });
      return () => unsubscribe();
    }
  }, [applicationId]);

  // Timeout for loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setTimeoutReached(true);
        setLoading(false);
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [loading]);

  const checkRazorpayAvailability = () => {
    try {
      const available = isRazorpayAvailable();
      setRazorpayEnabled(available);
    } catch (error) {
      console.error('Error checking Razorpay availability:', error);
      setRazorpayEnabled(false);
    }
  };

  const calculatePaymentFromDuration = (durationMinutes, hourlyRate) => {
    const ratePerMinute = hourlyRate / 60;
    let calculatedPayment = Math.round(durationMinutes * ratePerMinute);
    return Math.max(1, calculatedPayment);
  };

  const calculateWorkDurationHours = (appData) => {
    if (appData.workStartedTimestamp && appData.workCompletedTimestamp) {
      const durationMs = appData.workCompletedTimestamp - appData.workStartedTimestamp;
      return durationMs / (1000 * 60 * 60);
    } else if (appData.actualWorkDuration) {
      return appData.actualWorkDuration;
    } else if (appData.actualWorkMinutes) {
      return appData.actualWorkMinutes / 60;
    } else if (appData.journeyStatus === 'completed' && appData.workStartedTimestamp) {
      const currentTime = new Date().getTime();
      const durationMs = currentTime - appData.workStartedTimestamp;
      return durationMs / (1000 * 60 * 60);
    }
    return 0;
  };

  const calculateActualPayment = (appData) => {
    try {
      if (appData.calculatedPayment !== undefined && appData.calculatedPayment !== null && appData.calculatedPayment > 0) {
        return appData.calculatedPayment;
      }
      if (appData.workStartedTimestamp && appData.workCompletedTimestamp) {
        const durationMs = appData.workCompletedTimestamp - appData.workStartedTimestamp;
        const durationMinutes = durationMs / (1000 * 60);
        const hourlyRate = appData.hourlyRate || 0;
        return calculatePaymentFromDuration(durationMinutes, hourlyRate);
      }
      if (appData.actualWorkDuration && appData.actualWorkDuration > 0) {
        const durationMinutes = appData.actualWorkDuration * 60;
        const hourlyRate = appData.hourlyRate || 0;
        return calculatePaymentFromDuration(durationMinutes, hourlyRate);
      }
      if (appData.journeyStatus === 'completed' && appData.workStartedTimestamp && !appData.workCompletedTimestamp) {
        const currentTime = new Date().getTime();
        const durationMs = currentTime - appData.workStartedTimestamp;
        const durationMinutes = durationMs / (1000 * 60);
        const hourlyRate = appData.hourlyRate || 0;
        return calculatePaymentFromDuration(durationMinutes, hourlyRate);
      }
      return appData.expectedPayment || 0;
    } catch (error) {
      console.error('Payment calculation error:', error);
      return appData.expectedPayment || 0;
    }
  };

  const loadData = async () => {
    try {
      setError(null);
      if (!applicationId) throw new Error('No application ID provided');

      const appRef = doc(db, 'applications', applicationId);
      const appSnap = await getDoc(appRef);

      if (appSnap.exists()) {
        const appData = { id: appSnap.id, ...appSnap.data() };
        setApplication(appData);

        const shouldFix = appData.journeyStatus === 'completed' &&
          appData.workStartedTimestamp &&
          !appData.workCompletedTimestamp;
        setNeedsFix(shouldFix);

        const calculatedActualPayment = calculateActualPayment(appData);
        setActualPayment(calculatedActualPayment);

        let workDurationHours = calculateWorkDurationHours(appData);
        setWorkDuration(workDurationHours);

        const paymentAmountValue = calculatedActualPayment > 0
          ? calculatedActualPayment.toString()
          : (appData.expectedPayment || '').toString();
        setPaymentAmount(paymentAmountValue);

        const jobRef = doc(db, 'jobs', appData.jobId);
        const jobSnap = await getDoc(jobRef);
        if (jobSnap.exists()) {
          setJob({ id: jobSnap.id, ...jobSnap.data() });
        }
      } else {
        setError(tr.paymentDetailsNotFound);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    {
      id: 'cash',
      icon: '💵',
      label: tr.cashPayment,
      description: tr.cashDesc,
      color: '#4CAF50',
      gradient: ['#4CAF50', '#45a049'],
      disabled: false
    },
    {
      id: 'online',
      icon: '📱',
      label: tr.onlinePayment,
      description: razorpayEnabled ? tr.onlineEnabled : tr.onlineDisabled,
      color: '#2196F3',
      gradient: ['#2196F3', '#1976D2'],
      disabled: !razorpayEnabled
    },
    {
      id: 'upi',
      icon: '💳',
      label: tr.upiTransfer,
      description: tr.upiDesc,
      color: '#9C27B0',
      gradient: ['#9C27B0', '#7B1FA2'],
      disabled: false
    },
    {
      id: 'bank',
      icon: '🏦',
      label: tr.bankTransfer,
      description: tr.bankDesc,
      color: '#FF9800',
      gradient: ['#FF9800', '#F57C00'],
      disabled: false
    },
  ];

  const handleProcessPayment = async () => {
    const amount = parseFloat(paymentAmount) || actualPayment;
    if (amount <= 0 || isNaN(amount)) {
      // ✅ REPLACED Alert → toast
      toast.error(tr.invalidAmount, tr.invalidAmountDesc);
      return;
    }

    // Keep Alert for confirmation dialogs that need user action buttons
    Alert.alert(
      tr.confirmPayment,
      tr.confirmPaymentMessage
        .replace('{amount}', amount)
        .replace('{duration}', formatDuration(workDuration)),
      [
        { text: tr.cancel, style: 'cancel' },
        { text: tr.confirmPayment, onPress: () => confirmPayment(amount) }
      ]
    );
  };

  const confirmPayment = async (amount) => {
    if (selectedMethod === 'online') {
      if (!razorpayEnabled) {
        // ✅ REPLACED Alert → toast
        toast.warning(tr.onlinePaymentUnavailable, tr.onlinePaymentUnavailableDesc);
        return;
      }
      await handleOnlinePayment(amount);
    } else {
      await handleOfflinePayment(amount);
    }
  };

  const handleOnlinePayment = async (amount) => {
    setProcessing(true);
    try {
      const paymentData = {
        amount: Math.round(amount * 100),
        description: `Payment for job: ${job?.title || tr.job}`,
        employerName: application?.employerName || 'Employer',
        employerId: application?.employerId,
        workerName: application?.workerName || tr.name,
        workerId: application?.workerId,
        jobTitle: job?.title || tr.job,
        jobId: application?.jobId,
        applicationId: applicationId
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
                const processResult = await processOnlinePayment(applicationId, {
                  ...paymentResult,
                  verified: true,
                  amount: amount,
                  method: 'online',
                  notes: paymentNotes.trim()
                });

                if (processResult.success) {
                  // ✅ REPLACED Alert → toast, then navigate
                  toast.success(
                    tr.paymentSuccessful,
                    tr.paymentSuccessfulDesc.replace('{amount}', amount)
                  );
                  setTimeout(() => navigateAfterPayment(), 1200);
                } else {
                  // ✅ REPLACED Alert → toast
                  toast.warning(
                    tr.paymentIssue,
                    tr.paymentIssueDesc.replace('{id}', paymentResult.paymentId)
                  );
                  setTimeout(() => navigateAfterPayment(), 2500);
                }
              } else {
                // ✅ REPLACED Alert → toast
                toast.error(
                  tr.verificationFailed,
                  verificationResult.error || 'Could not verify payment. Please contact support.'
                );
              }
            } catch (verificationError) {
              console.error('❌ Verification error:', verificationError);
              // ✅ REPLACED Alert → toast
              toast.error(tr.error, `${tr.verificationFailed}. ${tr.pleaseTryAgain}`);
            }
          },
          onError: (error) => {
            console.error('❌ Payment error:', error);
            // ✅ REPLACED Alert → toast
            toast.error(tr.paymentFailed, error.error || tr.paymentFailed);
          }
        };

        setWebViewPaymentData(webViewData);
        setShowRazorpayWebView(true);
        setProcessing(false);
      } else if (!razorpayResult.success) {
        // ✅ REPLACED Alert → toast
        toast.error(tr.paymentFailed, razorpayResult.error || tr.paymentFailed);
        setProcessing(false);
      }
    } catch (error) {
      console.error('❌ Online payment error:', error);
      // ✅ REPLACED Alert → toast
      toast.error(tr.error, `${tr.paymentFailed}: ${error.message}`);
      setProcessing(false);
    }
  };

  const handleOfflinePayment = async (amount) => {
    const methodName = paymentMethods.find(m => m.id === selectedMethod)?.label || selectedMethod;

    // Keep Alert for confirmation dialogs that need user action buttons
    Alert.alert(
      `${tr.confirmPayment} — ${methodName}`,
      `Are you sure you want to record ${methodName.toLowerCase()} of ₹${amount} to ${application?.workerName}?\n\n⚠️ Make sure you have completed the payment before confirming.`,
      [
        { text: tr.cancel, style: 'cancel' },
        {
          text: tr.yesPaid,
          onPress: async () => {
            setProcessing(true);

            const paymentData = {
              amount: amount,
              method: selectedMethod,
              notes: paymentNotes.trim(),
            };

            const result = await processPayment(applicationId, paymentData);
            setProcessing(false);

            if (result.success) {
              // ✅ REPLACED Alert → toast, then navigate
              toast.success(
                tr.paymentRecorded,
                tr.paymentRecordedDesc
                  .replace('{method}', methodName)
                  .replace('{amount}', amount)
              );
              setTimeout(() => navigateAfterPayment(), 1200);
            } else {
              // ✅ REPLACED Alert → toast
              toast.error(tr.error, result.error || `${tr.failed}. ${tr.pleaseTryAgain}`);
            }
          }
        }
      ]
    );
  };

  const PaymentMethodCard = ({ method, isSelected, onPress }) => (
    <TouchableOpacity
      style={[
        styles.methodCard,
        isSelected && [styles.methodCardSelected, { borderColor: method.color }],
        method.disabled && styles.methodCardDisabled
      ]}
      onPress={method.disabled ? null : onPress}
      activeOpacity={method.disabled ? 1 : 0.7}
      disabled={method.disabled}
    >
      <LinearGradient
        colors={
          method.disabled
            ? ['#e0e0e0', '#cccccc']
            : isSelected
              ? method.gradient
              : ['#f8f9fa', '#e9ecef']
        }
        style={styles.methodIconContainer}
      >
        <Text style={[styles.methodIcon, method.disabled && styles.methodIconDisabled]}>
          {method.icon}
        </Text>
      </LinearGradient>

      <View style={styles.methodInfo}>
        <Text style={[
          styles.methodLabel,
          isSelected && !method.disabled && { color: method.color },
          method.disabled && styles.methodLabelDisabled
        ]}>
          {method.label}
        </Text>
        <Text style={[
          styles.methodDescription,
          method.disabled && styles.methodDescriptionDisabled
        ]}>
          {method.description}
        </Text>

        {method.id === 'online' && isSelected && !method.disabled && (
          <View style={styles.onlinePaymentInfo}>
            <Feather name="shield" size={12} color="#2196F3" />
            <Text style={styles.onlinePaymentText}>{tr.securedByRazorpay}</Text>
          </View>
        )}

        {method.disabled && method.id === 'online' && (
          <View style={styles.disabledInfo}>
            <MaterialIcons name="info-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.disabledInfoText}>{tr.requiresAppUpdate}</Text>
          </View>
        )}
      </View>

      <View style={[
        styles.radioButton,
        isSelected && [styles.radioButtonSelected, { borderColor: method.color }],
        method.disabled && styles.radioButtonDisabled
      ]}>
        {isSelected && !method.disabled && (
          <View style={[styles.radioButtonInner, { backgroundColor: method.color }]} />
        )}
      </View>
    </TouchableOpacity>
  );

  const formatDuration = (hours) => {
    if (!hours || hours === 0) {
      if (application?.actualWorkMinutes && application.actualWorkMinutes > 0) {
        const minutes = application.actualWorkMinutes;
        return `${minutes} ${locale === 'hi' ? 'मिनट' : 'minute'}${minutes !== 1 ? (locale === 'hi' ? '' : 's') : ''}`;
      }
      return locale === 'hi' ? '0 मिनट' : '0 minutes';
    }

    const totalMinutes = Math.round(hours * 60);
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (wholeHours === 0) {
      return `${minutes} ${locale === 'hi' ? 'मिनट' : 'minute'}${minutes !== 1 ? (locale === 'hi' ? '' : 's') : ''}`;
    } else if (minutes === 0) {
      return `${wholeHours} ${locale === 'hi' ? 'घंटा' : 'hour'}${wholeHours !== 1 ? (locale === 'hi' ? 'घंटे' : 's') : ''}`;
    } else {
      return `${wholeHours} ${locale === 'hi' ? 'घंटे' : 'hour'}${wholeHours !== 1 ? (locale === 'hi' ? '' : 's') : ''} ${minutes} ${locale === 'hi' ? 'मिनट' : 'minute'}${minutes !== 1 ? (locale === 'hi' ? '' : 's') : ''}`;
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading && !timeoutReached) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{tr.loadingPaymentDetails}</Text>
        <Text style={styles.loadingSubText}>
          {locale === 'hi' ? 'यह कुछ क्षण ले सकता है' : 'This may take a few moments'}
        </Text>
      </View>
    );
  }

  if (timeoutReached || error) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.primary, '#4A90E2']} style={styles.gradientHeader}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{tr.processPayment}</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.warning} />
          <Text style={styles.errorTitle}>
            {timeoutReached ? tr.loadingTimeout : tr.errorLoadingData}
          </Text>
          <Text style={styles.errorText}>
            {timeoutReached
              ? tr.timeoutMessage
              : error || `${tr.failed} ${tr.loadingPaymentDetails}`}
          </Text>
          <View style={styles.errorButtons}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setLoading(true);
                setTimeoutReached(false);
                setError(null);
                loadData();
              }}
            >
              <Text style={styles.retryButtonText}>{tr.retry}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>{tr.goBack}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!application || !job) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[colors.primary, '#4A90E2']} style={styles.gradientHeader}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{tr.processPayment}</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.errorText}>{tr.paymentDetailsNotFound}</Text>
          <TouchableOpacity style={styles.errorBackButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorBackButtonText}>{tr.goBack}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const hourlyRate = application.hourlyRate || job.rate || 0;
  const hasActualWorkData = application.workStartedTimestamp && application.workCompletedTimestamp;

  return (
    <View style={styles.container}>
      <RazorpayWebView
        visible={showRazorpayWebView}
        onClose={() => {
          setShowRazorpayWebView(false);
          setProcessing(false);
        }}
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{tr.processPayment}</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Worker Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="person" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>{tr.paymentTo}</Text>
          </View>
          <View style={styles.workerInfo}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.workerAvatar}>
              <Text style={styles.workerAvatarText}>
                {application.workerName?.charAt(0)?.toUpperCase() || 'W'}
              </Text>
            </LinearGradient>
            <View style={styles.workerDetails}>
              <Text style={styles.workerName}>{application.workerName}</Text>
              <View style={styles.workerContact}>
                <Feather name="phone" size={14} color={colors.textSecondary} />
                <Text style={styles.workerPhone}>{application.workerPhone}</Text>
              </View>
              <View style={styles.workerContact}>
                <MaterialIcons name="work" size={14} color={colors.primary} />
                <Text style={styles.jobTitleText}>{job.title}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Fix Job Data Card */}
        {needsFix && (
          <View style={styles.fixCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="build" size={20} color={colors.warning} />
              <Text style={styles.cardTitle}>{tr.fixJobData}</Text>
            </View>
            <Text style={styles.infoText}>
              {tr.fixJobDataDesc.replace('{amount}', actualPayment)}
            </Text>
            <TouchableOpacity
              style={styles.fixButton}
              onPress={async () => {
                setProcessing(true);
                const result = await fixCompletedJobPayment(applicationId);
                setProcessing(false);
                if (result.success) {
                  // ✅ REPLACED Alert → toast
                  toast.success(
                    tr.jobDataFixed,
                    tr.jobDataFixedDesc
                      .replace('{amount}', result.calculatedPayment)
                      .replace('{hours}', result.workDuration.toFixed(2))
                  );
                  loadData();
                } else {
                  // ✅ REPLACED Alert → toast
                  toast.error(tr.error, result.error || tr.failed);
                }
              }}
            >
              <Text style={styles.fixButtonText}>
                {processing ? tr.fixing : tr.fixJobDataButton}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Work Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="payments" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>{tr.paymentCalculation}</Text>
          </View>

          {hasActualWorkData ? (
            <>
              <Text style={styles.recommendedAmount}>
                {tr.calculatedPayment
                  .replace('{amount}', actualPayment)
                  .replace('{duration}', formatDuration(workDuration))}
              </Text>
              <View style={styles.paymentSummary}>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>{tr.workDuration}:</Text>
                  <Text style={styles.paymentValue}>{formatDuration(workDuration)}</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>{tr.hourlyRate}:</Text>
                  <Text style={styles.paymentValue}>₹{hourlyRate}/{locale === 'hi' ? 'घंटा' : 'hour'}</Text>
                </View>
                <View style={[styles.paymentRow, styles.calculatedPaymentRow]}>
                  <Text style={[styles.paymentLabel, styles.highlight]}>{tr.calculatedAmount}:</Text>
                  <Text style={[styles.paymentValue, styles.highlightValue]}>₹{actualPayment}</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.recommendedAmount}>
              {tr.expectedPayment.replace('{amount}', application.expectedPayment || 0)}
            </Text>
          )}

          <View style={styles.infoBox}>
            <Feather name="info" size={16} color={colors.info} />
            <Text style={styles.infoText}>
              {hasActualWorkData ? tr.paymentInfo : tr.expectedPaymentInfo}
            </Text>
          </View>
        </View>

        {/* Payment Amount Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="payments" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>{tr.paymentAmount}</Text>
          </View>

          <Text style={styles.recommendedAmount}>
            {hasActualWorkData
              ? tr.recommended.replace('{amount}', actualPayment)
              : tr.expected.replace('{amount}', application.expectedPayment || 0)}
          </Text>

          <View style={styles.amountInputContainer}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder={tr.enterAmount.replace('{amount}', hasActualWorkData ? actualPayment : application.expectedPayment || 0)}
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {paymentAmount && actualPayment > 0 && Math.abs(parseFloat(paymentAmount) - actualPayment) > 10 && (
            <View style={styles.warningBox}>
              <MaterialIcons name="warning" size={20} color={colors.warning} />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>{tr.amountDifference}</Text>
                <Text style={styles.warningText}>
                  {tr.amountDifferenceDesc.replace('{amount}', actualPayment)}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.infoBox}>
            <Feather name="info" size={16} color={colors.info} />
            <Text style={styles.infoText}>
              {hasActualWorkData ? tr.paymentInfo : tr.expectedPaymentInfo}
            </Text>
          </View>
        </View>

        {/* Payment Method Selection */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="payment" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>{tr.paymentMethod}</Text>
          </View>
          {paymentMethods.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              isSelected={selectedMethod === method.id}
              onPress={() => setSelectedMethod(method.id)}
            />
          ))}
        </View>

        {/* Payment Notes */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="notes" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>{tr.paymentNotes}</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder={tr.addNotes}
            multiline
            numberOfLines={3}
            value={paymentNotes}
            onChangeText={setPaymentNotes}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Process Payment Button */}
        <TouchableOpacity
          style={[
            styles.processButton,
            processing && styles.processButtonDisabled,
            selectedMethod === 'online' && !paymentMethods.find(m => m.id === 'online')?.disabled && styles.onlinePaymentButton
          ]}
          onPress={handleProcessPayment}
          disabled={processing}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              processing
                ? ['#ccc', '#999']
                : selectedMethod === 'online'
                  ? ['#667eea', '#764ba2']
                  : ['#4CAF50', '#45a049']
            }
            style={styles.processButtonGradient}
          >
            {processing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialIcons
                  name={
                    selectedMethod === 'online' ? "credit-card" :
                    selectedMethod === 'cash'   ? "attach-money" :
                    selectedMethod === 'upi'    ? "smartphone" :
                    "account-balance"
                  }
                  size={22}
                  color="#fff"
                />
                <Text style={styles.processText}>
                  {selectedMethod === 'online'
                    ? tr.payOnline.replace('{amount}', paymentAmount || actualPayment)
                    : tr.payAmount.replace('{amount}', paymentAmount || actualPayment)}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Security Note for Online Payments */}
        {selectedMethod === 'online' && razorpayEnabled && (
          <View style={styles.securityNote}>
            <View style={styles.securityHeader}>
              <Feather name="shield" size={18} color="#4CAF50" />
              <Text style={styles.securityTitle}>{tr.secureOnlinePayment}</Text>
            </View>
            <Text style={styles.securityDescription}>{tr.securePaymentDesc}</Text>
          </View>
        )}

        {/* Important Note */}
        <View style={styles.noteCard}>
          <MaterialIcons name="info" size={20} color={colors.info} />
          <View style={styles.noteContent}>
            <Text style={styles.noteTitle}>{tr.important}</Text>
            <Text style={styles.noteText}>{tr.importantNote}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  gradientHeader: {
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerBackButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: colors.textSecondary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBackButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorBackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  fixCard: {
    backgroundColor: '#FFF3E0',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 8,
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  workerAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  workerDetails: {
    flex: 1,
  },
  workerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  workerContact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  workerPhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  jobTitleText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  paymentSummary: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calculatedPaymentRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  paymentLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  paymentValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  highlight: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  highlightValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  recommendedAmount: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    backgroundColor: colors.success + '15',
    padding: 8,
    borderRadius: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  rupeeSymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '15',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningContent: {
    flex: 1,
    marginLeft: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.warning,
    marginBottom: 2,
  },
  warningText: {
    fontSize: 13,
    color: colors.warning,
    lineHeight: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info + '10',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 12,
    color: colors.info,
    marginLeft: 8,
    flex: 1,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  methodCardSelected: {
    backgroundColor: colors.primary + '08',
    borderWidth: 2,
  },
  methodCardDisabled: {
    opacity: 0.5,
    backgroundColor: '#f5f5f5',
  },
  methodIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodIcon: {
    fontSize: 20,
  },
  methodIconDisabled: {
    opacity: 0.5,
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  methodLabelDisabled: {
    color: colors.textSecondary,
  },
  methodDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  methodDescriptionDisabled: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  onlinePaymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  onlinePaymentText: {
    fontSize: 11,
    color: '#2196F3',
    marginLeft: 4,
    fontWeight: '500',
  },
  disabledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  disabledInfoText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.primary,
  },
  radioButtonDisabled: {
    borderColor: colors.border,
    opacity: 0.5,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  notesInput: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  processButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  processButtonGradient: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processButtonDisabled: {
    opacity: 0.6,
  },
  onlinePaymentButton: {
    shadowColor: '#667eea',
  },
  processText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  securityNote: {
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 8,
  },
  securityDescription: {
    fontSize: 13,
    color: '#4CAF50',
    lineHeight: 18,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: colors.info + '15',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  noteContent: {
    flex: 1,
    marginLeft: 12,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.info,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  fixButton: {
    backgroundColor: colors.warning,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  fixButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default PaymentProcessingScreen;