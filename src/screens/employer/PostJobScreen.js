// src/screens/employer/PostJobScreen.js - CLEAN PROFESSIONAL VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  createJobWithTiming, 
  getEmployerJobPostingStats, 
  checkSubscriptionStatus, 
  updateFreeJobPostCount,
  canPostJobForFree,
  activateMonthlySubscription,
  resetMonthlyFreePosts
} from '../../services/database';
import { colors } from '../../constants/colors';
import CustomDateTimePicker from '../../components/CustomDateTimePicker';
import {
  canPostJob,
  calculateJobPostingFee,
  createPlatformFee,
} from '../../services/platformFeeService';
import {
  isRazorpayAvailable,
  initiateRazorpayPayment,
  verifyRazorpayPayment
} from '../../services/razorpay';
import RazorpayWebView from '../../components/RazorpayWebView';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function PostJobScreen({ navigation, route }) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { locale, t } = useLanguage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(userProfile?.location || '');
  const [rate, setRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  // Platform fee states
  const [feeInfo, setFeeInfo] = useState(null);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState(null);
  const [processingFee, setProcessingFee] = useState(false);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [pendingFeesExist, setPendingFeesExist] = useState(false);
  
  // Free posts and subscription states
  const [postingStats, setPostingStats] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showRazorpayWebView, setShowRazorpayWebView] = useState(false);
  const [webViewPaymentData, setWebViewPaymentData] = useState(null);

  // Date and Time states
  const [jobDate, setJobDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Animation states
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  // Translations for this screen
  const translations = {
    en: {
      postNewJob: "Post New Job",
      back: "Back",
      clear: "Clear",
      checkingEligibility: "Checking eligibility...",
      pleaseClearFees: "Please clear pending fees to post new jobs",
      jobDetails: "Job Details",
      jobTitle: "Job Title",
      jobTitlePlaceholder: "e.g., Factory Helper Needed",
      description: "Description",
      descriptionPlaceholder: "Describe the work requirements, responsibilities, and any specific skills needed...",
      location: "Location",
      locationPlaceholder: "e.g., Industrial Area, Phase 1, Bangalore",
      schedule: "Schedule",
      jobDate: "Job Date",
      startTime: "Start Time",
      endTime: "End Time",
      hoursTotal: "hours total",
      payment: "Payment",
      hourlyRate: "Hourly Rate",
      ratePlaceholder: "Rate per hour",
      perHour: "/ hour",
      minimumRate: "Minimum rate: ₹50/hour",
      hourlyRateLabel: "Hourly Rate:",
      durationLabel: "Duration:",
      totalPayment: "Total Payment",
      postJob: "Post Job",
      cancel: "Cancel",
      tip: "💡 Tip: Provide clear job details and competitive rates to attract more qualified workers.",
      platformFee: "Platform Fee",
      choosePaymentOption: "Choose Payment Option:",
      payNow: "Pay Now",
      instantOnline: "Instant online payment via UPI/Card",
      currentlyUnavailable: "Currently unavailable",
      payAfterJob: "Pay After Job Completion",
      postNowPayLater: "Post now, pay when job is completed",
      notePayLater: "ℹ️ If you choose \"Pay Later\", payment will be required before posting your next job.",
      cancelButton: "Cancel",
      freeJobBanner: "Free job posting!",
      freeJobsRemaining: "free post(s) remaining",
      paymentRequired: "Payment Required",
      youHavePendingFees: "You have pending platform fees totaling ₹",
      fromCompletedJobs: "from completed jobs.",
      clearFeesBeforePosting: "Please clear these fees before posting new jobs.",
      payNowButton: "Pay Now",
      cancelButtonAlert: "Cancel",
      error: "Error",
      enterJobTitle: "Please enter job title",
      enterDescription: "Please enter job description",
      enterLocation: "Please enter location",
      rateMinimum: "Rate must be at least ₹50/hour",
      dateNotPast: "Job date cannot be in the past",
      endTimeAfterStart: "End time must be after start time",
      durationMinimum: "Job duration must be at least 1 hour",
      failedToPost: "Failed to post job",
      tryAgain: "Please try again.",
      platformFeeDesc: "5% platform fee on total payment of ₹",
      loading: "Loading...",
      // New translations for subscription
      activeMonthlySubscription: "Active Monthly Subscription",
      unlimitedJobPosting: "Unlimited job posting",
      daysRemaining: "days remaining",
      freeJobPosts: "Free Job Posts",
      freePostsRemaining: "free posts remaining",
      used: "used",
      getUnlimited: "Get Unlimited",
      freePostsExhausted: "Free Posts Exhausted",
      allFreePostsUsed: "All 3 free posts have been used",
      monthlySubscription: "Monthly Subscription",
      perMonth: "per month",
      noPlatformFees: "No platform fees",
      prioritySupport: "Priority support",
      advancedAnalytics: "Advanced analytics",
      subscribeNow: "Subscribe Now",
      later: "Later",
      unlimitedPosts: "Unlimited posts",
      subscribeNowPerMonth: "Subscribe Now - ₹49/month",
      subscriptionFailed: "Subscription Failed",
      failedToProcessSubscription: "Failed to process subscription",
      subscriptionActivated: "Subscription Activated",
      unlimitedJobsNow: "You can now post unlimited jobs!",
      paymentProcessing: "Processing payment...",
      postAJob: "Post a Job",
      fillDetailsBelow: "Fill in the details below to post your job",
      viewAllJobs: "View All Jobs",
      postSuccess: "Job Posted Successfully!",
      jobPostedMessage: "Your job has been posted and is now visible to workers",
    },
    hi: {
      postNewJob: "नई नौकरी पोस्ट करें",
      back: "वापस",
      clear: "साफ करें",
      checkingEligibility: "पात्रता की जाँच की जा रही है...",
      pleaseClearFees: "नई नौकरियाँ पोस्ट करने के लिए लंबित शुल्क साफ़ करें",
      jobDetails: "नौकरी विवरण",
      jobTitle: "नौकरी शीर्षक",
      jobTitlePlaceholder: "उदाहरण: फैक्टरी हेल्पर चाहिए",
      description: "विवरण",
      descriptionPlaceholder: "काम की आवश्यकताएं, जिम्मेदारियाँ और आवश्यक कौशल का विवरण दें...",
      location: "स्थान",
      locationPlaceholder: "उदाहरण: औद्योगिक क्षेत्र, चरण 1, बेंगलुरु",
      schedule: "अनुसूची",
      jobDate: "नौकरी की तारीख",
      startTime: "प्रारंभ समय",
      endTime: "समाप्ति समय",
      hoursTotal: "कुल घंटे",
      payment: "भुगतान",
      hourlyRate: "प्रति घंटा दर",
      ratePlaceholder: "प्रति घंटा दर",
      perHour: "/ घंटा",
      minimumRate: "न्यूनतम दर: ₹50/घंटा",
      hourlyRateLabel: "प्रति घंटा दर:",
      durationLabel: "अवधि:",
      totalPayment: "कुल भुगतान",
      postJob: "नौकरी पोस्ट करें",
      cancel: "रद्द करें",
      tip: "💡 सुझाव: अधिक योग्य कर्मचारियों को आकर्षित करने के लिए स्पष्ट नौकरी विवरण और प्रतिस्पर्धी दरें प्रदान करें।",
      platformFee: "प्लेटफॉर्म शुल्क",
      choosePaymentOption: "भुगतान विकल्प चुनें:",
      payNow: "अभी भुगतान करें",
      instantOnline: "यूपीआई/कार्ड के माध्यम से तत्काल ऑनलाइन भुगतान",
      currentlyUnavailable: "वर्तमान में अनुपलब्ध",
      payAfterJob: "नौकरी पूरा होने के बाद भुगतान करें",
      postNowPayLater: "अभी पोस्ट करें, नौकरी पूरी होने पर भुगतान करें",
      notePayLater: "ℹ️ यदि आप \"बाद में भुगतान\" चुनते हैं, तो आपकी अगली नौकरी पोस्ट करने से पहले भुगतान आवश्यक होगा।",
      cancelButton: "रद्द करें",
      freeJobBanner: "मुफ्त नौकरी पोस्टिंग!",
      freeJobsRemaining: "मुफ्त पोस्ट शेष",
      paymentRequired: "भुगतान आवश्यक",
      youHavePendingFees: "आपके ₹",
      fromCompletedJobs: "की पूर्ण नौकरियों से लंबित प्लेटफॉर्म शुल्क हैं।",
      clearFeesBeforePosting: "कृपया नई नौकरियाँ पोस्ट करने से पहले इन शुल्कों को साफ़ करें।",
      payNowButton: "अभी भुगतान करें",
      cancelButtonAlert: "रद्द करें",
      error: "त्रुटि",
      enterJobTitle: "कृपया नौकरी शीर्षक दर्ज करें",
      enterDescription: "कृपया विवरण दर्ज करें",
      enterLocation: "कृपया स्थान दर्ज करें",
      rateMinimum: "दर कम से कम ₹50/घंटा होनी चाहिए",
      dateNotPast: "नौकरी की तारीख अतीत में नहीं हो सकती",
      endTimeAfterStart: "समाप्ति समय प्रारंभ समय के बाद होना चाहिए",
      durationMinimum: "नौकरी की अवधि कम से कम 1 घंटा होनी चाहिए",
      failedToPost: "नौकरी पोस्ट करने में विफल",
      tryAgain: "कृपया पुनः प्रयास करें।",
      platformFeeDesc: "₹",
      platformFeeOnTotal: "के कुल भुगतान पर 5% प्लेटफॉर्म शुल्क",
      loading: "लोड हो रहा है...",
      // New translations for subscription
      activeMonthlySubscription: "सक्रिय मासिक सदस्यता",
      unlimitedJobPosting: "असीमित नौकरी पोस्टिंग",
      daysRemaining: "दिन शेष",
      freeJobPosts: "मुफ्त नौकरी पोस्ट",
      freePostsRemaining: "मुफ्त पोस्ट शेष",
      used: "इस्तेमाल किए गए",
      getUnlimited: "असीमित पोस्ट पाएं",
      freePostsExhausted: "मुफ्त पोस्ट समाप्त",
      allFreePostsUsed: "सभी 3 मुफ्त पोस्ट इस्तेमाल हो चुके हैं",
      monthlySubscription: "मासिक सदस्यता",
      perMonth: "प्रति माह",
      noPlatformFees: "कोई प्लेटफॉर्म शुल्क नहीं",
      prioritySupport: "प्राथमिकिक सपोर्ट",
      advancedAnalytics: "उन्नत एनालिटिक्स",
      subscribeNow: "अभी सब्सक्राइब करें",
      later: "बाद में",
      unlimitedPosts: "असीमित पोस्ट",
      subscribeNowPerMonth: "अभी सब्सक्राइब करें - ₹49/माह",
      subscriptionFailed: "सदस्यता विफल",
      failedToProcessSubscription: "सदस्यता प्रोसेस करने में विफल",
      subscriptionActivated: "सदस्यता सक्रिय",
      unlimitedJobsNow: "अब आप असीमित नौकरियां पोस्ट कर सकते हैं!",
      paymentProcessing: "भुगतान प्रोसेस हो रहा है...",
      postAJob: "नौकरी पोस्ट करें",
      fillDetailsBelow: "अपनी नौकरी पोस्ट करने के लिए नीचे विवरण भरें",
      viewAllJobs: "सभी नौकरियां देखें",
      postSuccess: "नौकरी सफलतापूर्वक पोस्ट हो गई!",
      jobPostedMessage: "आपकी नौकरी पोस्ट हो गई है और अब कर्मचारियों को दिखाई दे रही है",
    }
  };

  const tr = translations[locale] || translations.en;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    loadPostingStats();
    checkPostingEligibility();
    checkRazorpayAvailability();
  }, []);

  useEffect(() => {
    if (route.params?.refresh) {
      clearForm();
    }
  }, [route.params?.refresh]);

  const checkRazorpayAvailability = () => {
    const available = isRazorpayAvailable();
    setRazorpayEnabled(available);
  };

  const loadPostingStats = async () => {
    try {
      console.log('🔄 Loading posting stats for:', user.uid);
      
      // First check if we need to reset monthly free posts
      await resetMonthlyFreePosts(user.uid);
      
      const statsResult = await getEmployerJobPostingStats(user.uid);
      if (statsResult.success) {
        console.log('📊 Posting stats loaded:', statsResult.stats);
        setPostingStats(statsResult.stats);
      } else {
        console.error('❌ Failed to load posting stats:', statsResult.error);
      }
      
      const subscriptionResult = await checkSubscriptionStatus(user.uid);
      if (subscriptionResult.success) {
        console.log('👑 Subscription status:', subscriptionResult.subscription);
        setSubscriptionStatus(subscriptionResult.subscription);
      }
    } catch (error) {
      console.error('❌ Error loading posting stats:', error);
    }
  };

  const checkPostingEligibility = async () => {
    try {
      const result = await canPostJob(user.uid);

      if (!result.success) {
        Alert.alert(
          locale === 'hi' ? 'त्रुटि' : 'Error',
          result.error
        );
        navigation.goBack();
        return;
      }

      if (!result.canPost && result.requiresPayment) {
        // Has blocking pending fees
        Alert.alert(
          locale === 'hi' ? '💰 भुगतान आवश्यक' : '💰 Payment Required',
          `${locale === 'hi' ? 'आपके ₹' : 'You have pending platform fees totaling ₹'}${result.totalDue} ${locale === 'hi' ? 'की पूर्ण नौकरियों से लंबित प्लेटफॉर्म शुल्क हैं।\n\nकृपया नई नौकरियाँ पोस्ट करने से पहले इन शुल्कों को साफ़ करें।' : 'from completed jobs.\n\nPlease clear these fees before posting new jobs.'}`,
          [
            {
              text: locale === 'hi' ? 'अभी भुगतान करें' : 'Pay Now',
              onPress: () => {
                navigation.navigate('PlatformFeePayment', {
                  totalAmount: result.totalDue,
                  returnTo: 'PostJob',
                  source: 'eligibility_check'
                });
              }
            },
            {
              text: locale === 'hi' ? 'रद्द करें' : 'Cancel',
              style: 'cancel',
              onPress: () => navigation.goBack()
            }
          ],
          { cancelable: false }
        );
        setPendingFeesExist(true);
      } else {
        setPendingFeesExist(false);
      }
    } catch (error) {
      console.error('❌ Error checking posting eligibility:', error);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const formatDateForStorage = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString(locale === 'hi' ? 'hi-IN' : 'en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTimeForStorage = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const isEndTimeAfterStartTime = (start, end) => {
    const startTotalMinutes = start.getHours() * 60 + start.getMinutes();
    const endTotalMinutes = end.getHours() * 60 + end.getMinutes();
    return endTotalMinutes > startTotalMinutes;
  };

  const calculateDuration = () => {
    const startTotalMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endTotalMinutes = endTime.getHours() * 60 + endTime.getMinutes();
    const duration = (endTotalMinutes - startTotalMinutes) / 60;
    return duration > 0 ? duration.toFixed(1) : 0;
  };

  const calculateTotal = () => {
    const duration = calculateDuration();
    return duration > 0 && rate ? Math.round(duration * parseFloat(rate)) : 0;
  };

  const handlePostJob = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert(
        locale === 'hi' ? 'त्रुटि' : 'Error',
        locale === 'hi' ? 'कृपया नौकरी शीर्षक दर्ज करें' : 'Please enter job title'
      );
      return;
    }
    if (!description.trim()) {
      Alert.alert(
        locale === 'hi' ? 'त्रुटि' : 'Error',
        locale === 'hi' ? 'कृपया विवरण दर्ज करें' : 'Please enter job description'
      );
      return;
    }
    if (!location.trim()) {
      Alert.alert(
        locale === 'hi' ? 'त्रुटि' : 'Error',
        locale === 'hi' ? 'कृपया स्थान दर्ज करें' : 'Please enter location'
      );
      return;
    }
    if (!rate || rate < 50) {
      Alert.alert(
        locale === 'hi' ? 'त्रुटि' : 'Error',
        locale === 'hi' ? 'दर कम से कम ₹50/घंटा होनी चाहिए' : 'Rate must be at least ₹50/hour'
      );
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(jobDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      Alert.alert(
        locale === 'hi' ? 'त्रुटि' : 'Error',
        locale === 'hi' ? 'नौकरी की तारीख अतीत में नहीं हो सकती' : 'Job date cannot be in the past'
      );
      return;
    }

    if (!isEndTimeAfterStartTime(startTime, endTime)) {
      Alert.alert(
        locale === 'hi' ? 'त्रुटि' : 'Error',
        locale === 'hi' ? 'समाप्ति समय प्रारंभ समय के बाद होना चाहिए' : 'End time must be after start time'
      );
      return;
    }

    const duration = calculateDuration();
    if (duration < 1) {
      Alert.alert(
        locale === 'hi' ? 'त्रुटि' : 'Error',
        locale === 'hi' ? 'नौकरी की अवधि कम से कम 1 घंटा होनी चाहिए' : 'Job duration must be at least 1 hour'
      );
      return;
    }

    // Check if employer can post for free
    const canPostFreeResult = await canPostJobForFree(user.uid);
    
    if (!canPostFreeResult.success) {
      Alert.alert(
        locale === 'hi' ? 'त्रुटि' : 'Error',
        canPostFreeResult.error
      );
      return;
    }
    
    console.log('✅ Can post check result:', canPostFreeResult);
    
    if (canPostFreeResult.canPostForFree) {
      // Free post available or active subscription
      await proceedWithFreeJobPosting();
    } else {
      // Need to pay platform fee
      // Calculate platform fee
      const totalPayment = calculateTotal();
      const feeResult = await calculateJobPostingFee(totalPayment, user.uid);
      
      if (!feeResult.success) {
        Alert.alert(
          locale === 'hi' ? 'त्रुटि' : 'Error',
          feeResult.error
        );
        return;
      }

      setFeeInfo(feeResult);
      setShowFeeModal(true);
    }
  };

  const proceedWithFreeJobPosting = async () => {
    setLoading(true);

    try {
      // Update free post count if not subscription
      if (!subscriptionStatus?.isActive) {
        const updateResult = await updateFreeJobPostCount(user.uid);
        if (!updateResult.success) {
          throw new Error(updateResult.error);
        }
        console.log('✅ Free post count updated:', updateResult);
      }
      
      const totalPayment = calculateTotal();
      const duration = calculateDuration();
      
      const jobData = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        rate: parseInt(rate),
        employerId: user.uid,
        companyName: userProfile?.companyName || userProfile?.name || (locale === 'hi' ? 'कंपनी' : 'Company'),
        employerPhone: userProfile?.phoneNumber || '',
        jobDate: formatDateForStorage(jobDate),
        startTime: formatTimeForStorage(startTime),
        endTime: formatTimeForStorage(endTime),
        category: 'General',
        isFreePost: !subscriptionStatus?.isActive, // Mark if it's a free post
        subscriptionPost: subscriptionStatus?.isActive || false // Mark if it's a subscription post
      };

      const result = await createJobWithTiming(jobData);
      
      if (!result.success) {
        throw new Error(result.error || (locale === 'hi' ? 'नौकरी पोस्ट करने में विफल' : 'Failed to post job'));
      }

      const jobId = result.jobId;
      
      // Refresh user profile to update free posts count
      await refreshUserProfile?.();
      
      // Refresh posting stats
      await loadPostingStats();
      
      // Navigate to success screen
      navigation.replace('PostJobSuccess', {
        jobData: {
          jobId: jobId,
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          jobDate: formatDateForDisplay(jobDate),
          startTime: formatTime(startTime),
          endTime: formatTime(endTime),
          duration: duration,
          rate: parseInt(rate),
          totalPayment: totalPayment,
          platformFee: 0,
          isFreePost: !subscriptionStatus?.isActive,
          subscriptionPost: subscriptionStatus?.isActive || false
        },
        isPaid: false,
        isFree: true
      });

    } catch (error) {
      console.error('❌ Error in free job posting:', error);
      Alert.alert(
        locale === 'hi' ? 'त्रुटि' : 'Error',
        error.message || (locale === 'hi' ? 'नौकरी पोस्ट करने में विफल। कृपया पुनः प्रयास करें।' : 'Failed to post job. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFeePaymentSelection = async (option) => {
    setSelectedPaymentOption(option);
    setShowFeeModal(false);

    if (option === 'now') {
      await handlePayNowAndPost();
    } else {
      await handlePayLaterAndPost();
    }
  };

  const handlePayNowAndPost = async () => {
    setProcessingFee(true);

    try {
      // Calculate everything
      const totalPayment = calculateTotal();
      const duration = calculateDuration();

      // Create job data
      const jobData = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        rate: parseInt(rate),
        employerId: user.uid,
        companyName: userProfile?.companyName || userProfile?.name || (locale === 'hi' ? 'कंपनी' : 'Company'),
        employerPhone: userProfile?.phoneNumber || '',
        jobDate: formatDateForStorage(jobDate),
        startTime: formatTimeForStorage(startTime),
        endTime: formatTimeForStorage(endTime),
        category: 'General',
      };

      // Create the job first
      console.log('📝 Creating job...');
      const result = await createJobWithTiming(jobData);

      if (!result.success) {
        throw new Error(locale === 'hi' ? 'नौकरी बनाने में विफल' : 'Failed to create job');
      }

      const jobId = result.jobId;

      // Create platform fee record
      const feeData = {
        employerId: user.uid,
        employerName: userProfile?.name || (locale === 'hi' ? 'नियोक्ता' : 'Employer'),
        jobId: jobId,
        jobTitle: title.trim(),
        amount: feeInfo.platformFee,
        totalJobPayment: totalPayment,
        paymentOption: 'now',
        status: 'pending_payment',
        needsPayment: true
      };

      console.log('💰 Creating fee record...');
      const feeResult = await createPlatformFee(feeData);

      if (!feeResult.success) {
        throw new Error(locale === 'hi' ? 'शुल्क रिकॉर्ड बनाने में विफल' : 'Failed to create fee record');
      }

      // Navigate to payment screen with job data
      console.log('📍 Navigating to payment screen with fee ID:', feeResult.feeId);

      navigation.navigate('PlatformFeePayment', {
        feeIds: [feeResult.feeId],
        totalAmount: feeInfo.platformFee,
        immediateFeeAmount: feeInfo.platformFee,
        returnTo: 'PostJobSuccess',
        postJobData: {
          jobId: jobId,
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          jobDate: formatDateForDisplay(jobDate),
          startTime: formatTime(startTime),
          endTime: formatTime(endTime),
          duration: duration,
          rate: parseInt(rate),
          totalPayment: totalPayment,
          platformFee: feeInfo.platformFee
        },
        fromPostJob: true,
        isNewJobPayment: true,
        source: 'post_job'
      });

    } catch (error) {
      console.error('❌ Error in pay now flow:', error);
      Alert.alert(
        locale === 'hi' ? 'त्रुटि' : 'Error',
        error.message || (locale === 'hi' ? 'भुगतान प्रोसेस करने में विफल' : 'Failed to process payment')
      );
      setShowFeeModal(true);
    } finally {
      setProcessingFee(false);
    }
  };

  const handlePayLaterAndPost = async () => {
    setProcessingFee(true);

    try {
      const totalPayment = calculateTotal();
      const duration = calculateDuration();

      // Create job data
      const jobData = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        rate: parseInt(rate),
        employerId: user.uid,
        companyName: userProfile?.companyName || userProfile?.name || (locale === 'hi' ? 'कंपनी' : 'Company'),
        employerPhone: userProfile?.phoneNumber || '',
        jobDate: formatDateForStorage(jobDate),
        startTime: formatTimeForStorage(startTime),
        endTime: formatTimeForStorage(endTime),
        category: 'General',
      };

      // Create the job
      console.log('📝 Creating job...');
      const result = await createJobWithTiming(jobData);

      if (!result.success) {
        throw new Error(locale === 'hi' ? 'नौकरी बनाने में विफल' : 'Failed to create job');
      }

      const jobId = result.jobId;

      // Create platform fee record with 'later' option
      if (feeInfo && !feeInfo.isFree && feeInfo.platformFee > 0) {
        const feeData = {
          employerId: user.uid,
          employerName: userProfile?.name || (locale === 'hi' ? 'नियोक्ता' : 'Employer'),
          jobId: jobId,
          jobTitle: title.trim(),
          amount: feeInfo.platformFee,
          totalJobPayment: totalPayment,
          paymentOption: 'later',
          status: 'pending',
          needsPayment: false // Will be true when job completes
        };

        console.log('💰 Creating deferred fee record...');
        await createPlatformFee(feeData);
      }

      // Navigate to success screen
      navigation.replace('PostJobSuccess', {
        jobData: {
          jobId: jobId,
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          jobDate: formatDateForDisplay(jobDate),
          startTime: formatTime(startTime),
          endTime: formatTime(endTime),
          duration: duration,
          rate: parseInt(rate),
          totalPayment: totalPayment,
          platformFee: feeInfo?.platformFee || 0
        },
        isPaid: false
      });

    } catch (error) {
      console.error('❌ Error in pay later flow:', error);
      Alert.alert(
        locale === 'hi' ? 'त्रुटि' : 'Error',
        error.message || (locale === 'hi' ? 'नौकरी पोस्ट करने में विफल' : 'Failed to post job')
      );
    } finally {
      setProcessingFee(false);
    }
  };

  const handleSubscribe = async () => {
    setProcessingFee(true);
    
    try {
      if (!razorpayEnabled) {
        Alert.alert(
          locale === 'hi' ? 'त्रुटि' : 'Error',
          locale === 'hi' ? 'ऑनलाइन भुगतान वर्तमान में अनुपलब्ध है' : 'Online payment is currently unavailable'
        );
        return;
      }
      
      const paymentData = {
        amount: 4900, // ₹49 in paise
        description: locale === 'hi' ? 'मासिक सदस्यता - असीमित नौकरी पोस्टिंग' : 'Monthly Subscription - Unlimited Job Posting',
        employerName: user.displayName || userProfile?.name || 'Employer',
        employerId: user.uid,
        subscription: true
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
                // Activate subscription
                await activateMonthlySubscription(user.uid, {
                  paymentId: paymentResult.paymentId,
                  transactionId: paymentResult.orderId
                });
                
                // Refresh user profile
                await refreshUserProfile?.();
                
                // Refresh posting stats
                await loadPostingStats();
                
                Alert.alert(
                  locale === 'hi' ? 'सफलता' : 'Success',
                  locale === 'hi' ? 
                    'मासिक सदस्यता सक्रिय हो गई है! अब आप असीमित नौकरियां पोस्ट कर सकते हैं।' :
                    'Monthly subscription activated! You can now post unlimited jobs.',
                  [{
                    text: locale === 'hi' ? 'बढ़िया' : 'Great',
                    onPress: () => {
                      setShowSubscriptionModal(false);
                    }
                  }]
                );
              }
            } catch (error) {
              console.error('Subscription activation error:', error);
            }
          },
          onError: (error) => {
            Alert.alert(
              locale === 'hi' ? 'भुगतान विफल' : 'Payment Failed',
              error.error || (locale === 'hi' ? 'सदस्यता सक्रिय करने में विफल' : 'Failed to activate subscription')
            );
          }
        };
        
        setWebViewPaymentData(webViewData);
        setShowRazorpayWebView(true);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert(
        locale === 'hi' ? 'त्रुटि' : 'Error',
        locale === 'hi' ? 'सदस्यता प्रोसेस करने में विफल' : 'Failed to process subscription'
      );
    } finally {
      setProcessingFee(false);
    }
  };

  const clearForm = () => {
    setTitle('');
    setDescription('');
    setLocation(userProfile?.location || '');
    setRate('');
    setJobDate(new Date());
    setStartTime(new Date());
    setEndTime(new Date());
    setFeeInfo(null);
    setShowFeeModal(false);
    setSelectedPaymentOption(null);
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('EmployerHome');
    }
  };

  if (checkingEligibility) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          {locale === 'hi' ? 'पात्रता की जाँच की जा रही है...' : 'Checking eligibility...'}
        </Text>
      </View>
    );
  }

  if (pendingFeesExist) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={styles.simpleHeader}>
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.simpleHeaderTitle}>
            {locale === 'hi' ? 'नई नौकरी पोस्ट करें' : 'Post New Job'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <View style={styles.errorCard}>
            <View style={styles.errorIconContainer}>
              <Icon name="error-outline" size={48} color={colors.warning} />
            </View>
            <Text style={styles.errorTitle}>
              {locale === 'hi' ? 'भुगतान आवश्यक' : 'Payment Required'}
            </Text>
            <Text style={styles.errorMessage}>
              {locale === 'hi' ? 'नई नौकरियाँ पोस्ट करने के लिए लंबित शुल्क साफ़ करें' : 'Please clear pending fees to post new jobs'}
            </Text>
            <TouchableOpacity
              style={styles.payNowButton}
              onPress={() => navigation.navigate('PlatformFeePayment')}
            >
              <Text style={styles.payNowButtonText}>
                {locale === 'hi' ? 'शुल्क देखें' : 'View Fees'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Razorpay WebView Modal */}
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

      {/* Simple Clean Header */}
      <View style={styles.simpleHeader}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.simpleHeaderTitle}>
          {locale === 'hi' ? 'नई नौकरी पोस्ट करें' : 'Post New Job'}
        </Text>
        <TouchableOpacity
          onPress={clearForm}
          style={styles.clearButton}
        >
          <Icon name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Free Posts & Subscription Status Bar - Very Compact */}
        {(postingStats || subscriptionStatus) && (
          <Animated.View 
            style={[
              styles.statusBar,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {subscriptionStatus?.isActive ? (
              <View style={styles.subscriptionStatus}>
                <Icon name="workspace-premium" size={18} color="#FFD700" />
                <Text style={styles.subscriptionStatusText}>
                  {tr.unlimitedJobPosting} • {subscriptionStatus.daysRemaining} {tr.daysRemaining}
                </Text>
              </View>
            ) : (
              <View style={styles.freePostsStatus}>
                <Icon 
                  name={postingStats?.freePostsRemaining > 0 ? "local-offer" : "error-outline"} 
                  size={18} 
                  color={postingStats?.freePostsRemaining > 0 ? colors.success : colors.warning} 
                />
                <Text style={styles.freePostsStatusText}>
                  {postingStats?.freePostsRemaining > 0 ? (
                    <>
                      <Text style={styles.freePostsCount}>{postingStats.freePostsRemaining}</Text> {tr.freePostsRemaining}
                    </>
                  ) : (
                    tr.freePostsExhausted
                  )}
                </Text>
                {postingStats?.freePostsRemaining === 0 && (
                  <TouchableOpacity 
                    style={styles.getUnlimitedButton}
                    onPress={() => setShowSubscriptionModal(true)}
                  >
                    <Text style={styles.getUnlimitedText}>{tr.getUnlimited}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Animated.View>
        )}

        {/* Free Banner - Only shown when actually posting a free job */}
        {!subscriptionStatus?.isActive && postingStats?.freePostsRemaining > 0 && (
          <Animated.View 
            style={[
              styles.freeBanner,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.freeBannerContent}>
              <Icon name="check-circle" size={20} color={colors.success} />
              <Text style={styles.freeBannerText}>
                <Text style={styles.freeBannerHighlight}>{tr.freeJobBanner}</Text> ({postingStats?.freePostsRemaining} {tr.freeJobsRemaining})
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Job Details Section */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>
            {tr.jobDetails}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {tr.jobTitle}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={tr.jobTitlePlaceholder}
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {tr.description}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={tr.descriptionPlaceholder}
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {tr.location}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={tr.locationPlaceholder}
              placeholderTextColor={colors.textSecondary}
              value={location}
              onChangeText={setLocation}
              returnKeyType="done"
            />
          </View>
        </Animated.View>

        {/* Schedule Section */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>
            {tr.schedule}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {tr.jobDate}
            </Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="calendar-today" size={20} color={colors.primary} style={styles.dateTimeIcon} />
              <Text style={styles.dateTimeText}>{formatDateForDisplay(jobDate)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeColumn}>
              <Text style={styles.label}>
                {tr.startTime}
              </Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Icon name="access-time" size={20} color={colors.primary} style={styles.dateTimeIcon} />
                <Text style={styles.dateTimeText}>{formatTime(startTime)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timeColumn}>
              <Text style={styles.label}>
                {tr.endTime}
              </Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Icon name="access-time" size={20} color={colors.primary} style={styles.dateTimeIcon} />
                <Text style={styles.dateTimeText}>{formatTime(endTime)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {calculateDuration() > 0 && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {calculateDuration()} {tr.hoursTotal}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Payment Section */}
        <Animated.View 
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>
            {tr.payment}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {tr.hourlyRate}
            </Text>
            <View style={styles.rateInputContainer}>
              <View style={styles.rateInputPrefix}>
                <Text style={styles.rupeeSymbol}>₹</Text>
              </View>
              <TextInput
                style={styles.rateInput}
                placeholder={tr.ratePlaceholder}
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={rate}
                onChangeText={(text) => setRate(text.replace(/[^0-9]/g, ''))}
                returnKeyType="done"
              />
              <View style={styles.rateInputSuffix}>
                <Text style={styles.perHourText}>
                  {tr.perHour}
                </Text>
              </View>
            </View>
            <Text style={styles.hint}>
              {tr.minimumRate}
            </Text>
          </View>

          {calculateDuration() > 0 && rate && (
            <View style={styles.paymentSummary}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>
                  {tr.hourlyRateLabel}
                </Text>
                <Text style={styles.paymentValue}>₹{rate}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>
                  {tr.durationLabel}
                </Text>
                <Text style={styles.paymentValue}>{calculateDuration()} {locale === 'hi' ? 'घंटे' : 'hours'}</Text>
              </View>
              <View style={styles.paymentDivider} />
              <View style={styles.paymentRow}>
                <Text style={styles.paymentTotalLabel}>
                  {tr.totalPayment}:
                </Text>
                <Text style={styles.paymentTotalValue}>₹{calculateTotal()}</Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Custom Date/Time Pickers */}
        <CustomDateTimePicker
          visible={showDatePicker}
          mode="date"
          value={jobDate}
          minimumDate={new Date()}
          onConfirm={(date) => {
            setJobDate(date);
            setShowDatePicker(false);
          }}
          onCancel={() => setShowDatePicker(false)}
        />

        <CustomDateTimePicker
          visible={showStartTimePicker}
          mode="time"
          value={startTime}
          onConfirm={(time) => {
            setStartTime(time);
            setShowStartTimePicker(false);
          }}
          onCancel={() => setShowStartTimePicker(false)}
        />

        <CustomDateTimePicker
          visible={showEndTimePicker}
          mode="time"
          value={endTime}
          onConfirm={(time) => {
            setEndTime(time);
            setShowEndTimePicker(false);
          }}
          onCancel={() => setShowEndTimePicker(false)}
        />

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.postButton, (loading || processingFee) && styles.disabledButton]}
            onPress={handlePostJob}
            disabled={loading || processingFee}
          >
            {(loading || processingFee) ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Icon name="send" size={20} color={colors.white} style={styles.postButtonIcon} />
                <Text style={styles.postButtonText}>
                  {tr.postJob}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleBackPress}
            disabled={loading || processingFee}
          >
            <Text style={styles.cancelButtonText}>
              {tr.cancel}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          {tr.tip}
        </Text>

        <View style={styles.bottomSpacing} />
      </Animated.ScrollView>

      {/* Platform Fee Modal - Clean Version */}
      <Modal
        visible={showFeeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFeeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalOverlayBackground} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {tr.platformFee}
              </Text>
              <Text style={styles.modalSubtitle}>
                {locale === 'hi' ? '₹' : ''}{calculateTotal()}{locale === 'hi' ? ' के कुल भुगतान पर 5% प्लेटफॉर्म शुल्क' : '5% platform fee on total payment of ₹'}
              </Text>
            </View>

            <View style={styles.feeAmountContainer}>
              <Text style={styles.feeAmount}>₹{feeInfo?.platformFee || 0}</Text>
            </View>

            <Text style={styles.modalOptionTitle}>
              {tr.choosePaymentOption}
            </Text>

            <TouchableOpacity
              style={[styles.paymentOptionCard, !razorpayEnabled && styles.disabledOption]}
              onPress={() => handleFeePaymentSelection('now')}
              disabled={!razorpayEnabled || processingFee}
            >
              <View style={styles.optionHeader}>
                <Icon name="credit-card" size={24} color={colors.primary} />
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>
                    {tr.payNow}
                  </Text>
                  <Text style={styles.optionSubtitle}>
                    {razorpayEnabled
                      ? tr.instantOnline
                      : tr.currentlyUnavailable
                    }
                  </Text>
                </View>
                {processingFee && selectedPaymentOption === 'now' && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentOptionCard, processingFee && styles.disabledOption]}
              onPress={() => handleFeePaymentSelection('later')}
              disabled={processingFee}
            >
              <View style={styles.optionHeader}>
                <Icon name="watch-later" size={24} color={colors.warning} />
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>
                    {tr.payAfterJob}
                  </Text>
                  <Text style={styles.optionSubtitle}>
                    {tr.postNowPayLater}
                  </Text>
                </View>
                {processingFee && selectedPaymentOption === 'later' && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </View>
            </TouchableOpacity>

            <Text style={styles.modalNote}>
              {tr.notePayLater}
            </Text>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowFeeModal(false)}
              disabled={processingFee}
            >
              <Text style={styles.modalCancelText}>
                {tr.cancelButton}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Subscription Modal - Clean Version */}
      <Modal
        visible={showSubscriptionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSubscriptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalOverlayBackground} />
          <View style={styles.subscriptionModalContent}>
            <View style={styles.modalHeader}>
              <Icon name="workspace-premium" size={32} color="#FFD700" />
              <Text style={styles.modalTitle}>
                {tr.monthlySubscription}
              </Text>
            </View>
            
            <View style={styles.subscriptionPlanCard}>
              <Text style={styles.planPrice}>₹49</Text>
              <Text style={styles.planDuration}>
                {tr.perMonth}
              </Text>
            </View>
            
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Icon name="check" size={20} color={colors.success} />
                <Text style={styles.featureText}>
                  {tr.unlimitedJobPosting}
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check" size={20} color={colors.success} />
                <Text style={styles.featureText}>
                  {tr.noPlatformFees}
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check" size={20} color={colors.success} />
                <Text style={styles.featureText}>
                  {tr.prioritySupport}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.subscribeNowButton}
              onPress={handleSubscribe}
              disabled={processingFee}
            >
              {processingFee ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.subscribeNowText}>
                  {tr.subscribeNowPerMonth}
                </Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowSubscriptionModal(false)}
              disabled={processingFee}
            >
              <Text style={styles.modalCancelText}>
                {tr.later}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

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
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  // Simple Header
  simpleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
  },
  simpleHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  backButton: {
    padding: 8,
  },
  clearButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  errorIconContainer: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  payNowButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  payNowButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  // Status Bar (Compact)
  statusBar: {
    marginBottom: 16,
  },
  subscriptionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
  },
  subscriptionStatusText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    marginLeft: 8,
  },
  freePostsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  freePostsStatusText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    marginLeft: 8,
  },
  freePostsCount: {
    fontWeight: '600',
    color: colors.primary,
  },
  getUnlimitedButton: {
    marginLeft: 'auto',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  getUnlimitedText: {
    fontSize: 11,
    color: colors.white,
    fontWeight: '600',
  },
  // Free Banner
  freeBanner: {
    marginBottom: 16,
  },
  freeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '10',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  freeBannerText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '500',
    marginLeft: 8,
  },
  freeBannerHighlight: {
    fontWeight: '600',
  },
  // Sections
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    padding: 14,
    borderRadius: 8,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  dateTimeButton: {
    backgroundColor: colors.background,
    padding: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dateTimeIcon: {
    marginRight: 10,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeColumn: {
    flex: 1,
  },
  durationBadge: {
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  rateInputPrefix: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.primary + '10',
  },
  rupeeSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  rateInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
  },
  rateInputSuffix: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  perHourText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  paymentSummary: {
    backgroundColor: colors.primary + '5',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  paymentValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  paymentDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 8,
  },
  paymentTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  paymentTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  actionsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  postButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  postButtonIcon: {
    marginRight: 8,
  },
  postButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  footerNote: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    fontStyle: 'italic',
  },
  bottomSpacing: {
    height: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  feeAmountContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  feeAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  paymentOptionCard: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  disabledOption: {
    opacity: 0.5,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modalNote: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  modalCancelButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  // Subscription Modal
  subscriptionModalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    margin: 16,
  },
  subscriptionPlanCard: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  planDuration: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  featuresList: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
  },
  subscribeNowButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  subscribeNowText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});