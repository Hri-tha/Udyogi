// src/screens/employer/EmployerJobTrackingScreen.js - HINDI VERSION
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
import { useLanguage } from '../../context/LanguageContext';
import { onApplicationUpdate } from '../../services/database';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import RatingModal from '../../components/RatingModal';

const EmployerJobTrackingScreen = ({ route, navigation }) => {
  const { applicationId } = route.params;
  const { locale, t } = useLanguage();
  const [application, setApplication] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workDuration, setWorkDuration] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [actualPayment, setActualPayment] = useState(0);

  // Translations for this screen
  const translations = {
    en: {
      back: "Back",
      jobTracking: "Job Tracking",
      loadingTracking: "Loading tracking details...",
      jobTrackingNotAvailable: "Job tracking not available",
      jobCompleted: "Job Completed",
      jobCompletedDesc: "The job has been successfully completed.",
      rateWorkerPerformance: "Rate Worker Performance",
      rateWorkerDesc: "Please rate the worker to complete the job process.",
      paymentRequired: "Payment Required",
      applicationAccepted: "Application Accepted",
      applicationAcceptedDesc: "Worker has accepted the job. Waiting for them to start journey.",
      workerOnTheWay: "Worker On The Way",
      workerOnTheWayDesc: "Worker is traveling to your location.",
      workerHasArrived: "Worker Has Arrived",
      workerHasArrivedDesc: "Worker has reached the location and will start work soon.",
      workInProgress: "Work In Progress",
      workInProgressDesc: "Worker is currently working on the job.",
      workCompleted: "Work Completed",
      workCompletedDesc: "Worker has completed the job. Payment due:",
      jobStatus: "Job Status",
      jobStatusDesc: "Tracking worker progress...",
      jobDetails: "Job Details",
      workerInformation: "Worker Information",
      name: "Name",
      phone: "Phone",
      schedule: "Schedule",
      date: "Date",
      time: "Time",
      notSpecified: "Not specified",
      workDuration: "Work Duration",
      timeSpentWorking: "Time spent working",
      actualWorkDuration: "Actual Work Duration",
      workStarted: "Work started",
      workCompleted: "Work completed",
      paymentDetails: "Payment Details",
      hourlyRate: "Hourly Rate",
      actualDuration: "Actual Duration",
      calculatedPayment: "Calculated Payment",
      originalEstimate: "Original Estimate",
      calculation: "Calculation",
      hours: "hours",
      status: "Status",
      paid: "Paid",
      pending: "Pending",
      amountPaid: "Amount Paid",
      yourRating: "Your Rating",
      stars: "stars",
      processPayment: "Process Payment",
      completeRateJob: "Complete & Rate Job",
      viewJobHistory: "View Job History",
      viewLocation: "View Location",
      chatWithWorker: "Chat with Worker",
      cannotProcessPayment: "Cannot Process Payment",
      waitForCompletion: "Please wait for the worker to complete the job first.",
      paymentRequiredAlert: "Payment Required",
      processPaymentBefore: "Please process the payment before completing the job.",
      thankYou: "Thank You! 🙏",
      ratingSubmitted: "Your rating has been submitted successfully.",
      ok: "OK",
      error: "Error",
      applicationNotFound: "Application not found",
      failedToLoad: "Failed to load job tracking details",
      paymentCalculation: "Payment Calculation",
      jobTitle: "Job Title",
      location: "Location",
      rate: "Rate",
      perHour: "/hour",
      minutes: "minutes",
      hour: "hour",
      hours: "hours",
      na: "N/A",
      expectedPayment: "Expected Payment",
      expected: "Expected",
    },
    hi: {
      back: "पीछे",
      jobTracking: "नौकरी ट्रैकिंग",
      loadingTracking: "ट्रैकिंग विवरण लोड हो रहे हैं...",
      jobTrackingNotAvailable: "नौकरी ट्रैकिंग उपलब्ध नहीं",
      jobCompleted: "नौकरी पूर्ण",
      jobCompletedDesc: "नौकरी सफलतापूर्वक पूर्ण हुई है।",
      rateWorkerPerformance: "कर्मचारी प्रदर्शन रेट करें",
      rateWorkerDesc: "कृपया नौकरी प्रक्रिया को पूर्ण करने के लिए कर्मचारी को रेट करें।",
      paymentRequired: "भुगतान आवश्यक",
      applicationAccepted: "आवेदन स्वीकृत",
      applicationAcceptedDesc: "कर्मचारी ने नौकरी स्वीकार कर ली है। उनके यात्रा शुरू करने की प्रतीक्षा है।",
      workerOnTheWay: "कर्मचारी रास्ते में",
      workerOnTheWayDesc: "कर्मचारी आपके स्थान की ओर यात्रा कर रहा है।",
      workerHasArrived: "कर्मचारी पहुंच गया",
      workerHasArrivedDesc: "कर्मचारी स्थान पर पहुंच गया है और जल्द ही काम शुरू करेगा।",
      workInProgress: "कार्य प्रगति पर",
      workInProgressDesc: "कर्मचारी वर्तमान में नौकरी पर काम कर रहा है।",
      workCompleted: "कार्य पूर्ण",
      workCompletedDesc: "कर्मचारी ने नौकरी पूरी कर ली है। भुगतान देय:",
      jobStatus: "नौकरी स्थिति",
      jobStatusDesc: "कर्मचारी प्रगति ट्रैक की जा रही है...",
      jobDetails: "नौकरी विवरण",
      workerInformation: "कर्मचारी जानकारी",
      name: "नाम",
      phone: "फोन",
      schedule: "समयसारणी",
      date: "तारीख",
      time: "समय",
      notSpecified: "निर्दिष्ट नहीं",
      workDuration: "कार्य अवधि",
      timeSpentWorking: "कार्य में बिताया समय",
      actualWorkDuration: "वास्तविक कार्य अवधि",
      workStarted: "कार्य शुरू",
      workCompleted: "कार्य पूर्ण",
      paymentDetails: "भुगतान विवरण",
      hourlyRate: "प्रति घंटा दर",
      actualDuration: "वास्तविक अवधि",
      calculatedPayment: "गणना किया गया भुगतान",
      originalEstimate: "मूल अनुमान",
      calculation: "गणना",
      hours: "घंटे",
      status: "स्थिति",
      paid: "भुगतान हुआ",
      pending: "लंबित",
      amountPaid: "भुगतान राशि",
      yourRating: "आपकी रेटिंग",
      stars: "स्टार",
      processPayment: "भुगतान प्रक्रिया करें",
      completeRateJob: "पूर्ण और रेट करें",
      viewJobHistory: "नौकरी इतिहास देखें",
      viewLocation: "स्थान देखें",
      chatWithWorker: "कर्मचारी से चैट करें",
      cannotProcessPayment: "भुगतान प्रक्रिया नहीं कर सकते",
      waitForCompletion: "कृपया पहले कर्मचारी के काम पूरा करने की प्रतीक्षा करें।",
      paymentRequiredAlert: "भुगतान आवश्यक",
      processPaymentBefore: "कृपया नौकरी पूर्ण करने से पहले भुगतान प्रक्रिया करें।",
      thankYou: "धन्यवाद! 🙏",
      ratingSubmitted: "आपकी रेटिंग सफलतापूर्वक सबमिट हो गई है।",
      ok: "ठीक है",
      error: "त्रुटि",
      applicationNotFound: "आवेदन नहीं मिला",
      failedToLoad: "नौकरी ट्रैकिंग विवरण लोड करने में विफल",
      paymentCalculation: "भुगतान गणना",
      jobTitle: "नौकरी शीर्षक",
      location: "स्थान",
      rate: "दर",
      perHour: "/घंटा",
      minutes: "मिनट",
      hour: "घंटा",
      hours: "घंटे",
      na: "उपलब्ध नहीं",
      expectedPayment: "अनुमानित भुगतान",
      expected: "अनुमानित",
    }
  };

  const tr = translations[locale] || translations.en;

  // Load initial data
  useEffect(() => {
    loadInitialData();

    // Real-time listener for application updates
    const unsubscribe = onApplicationUpdate(applicationId, (updatedApp) => {
      setApplication(updatedApp);
      calculateActualPayment(updatedApp);
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

  const calculateActualPayment = (appData) => {
    try {
      // If we have calculated payment from database, use that
      if (appData.calculatedPayment) {
        setActualPayment(appData.calculatedPayment);
        return;
      }
      
      // Calculate based on actual work timestamps
      if (appData.workStartedTimestamp && appData.workCompletedTimestamp) {
        const durationMs = appData.workCompletedTimestamp - appData.workStartedTimestamp;
        const durationHours = durationMs / (1000 * 60 * 60);
        const hourlyRate = appData.hourlyRate || 0;
        const calculatedPayment = Math.round(durationHours * hourlyRate);
        setActualPayment(calculatedPayment);
        
        console.log('Payment Calculation in Tracking:', {
          durationHours: durationHours.toFixed(2),
          hourlyRate: hourlyRate,
          calculatedPayment: calculatedPayment
        });
      } else {
        // Fallback to expected payment
        setActualPayment(appData.expectedPayment || 0);
      }
    } catch (error) {
      console.error('Payment calculation error in tracking:', error);
      setActualPayment(appData.expectedPayment || 0);
    }
  };

  const loadInitialData = async () => {
    try {
      const appRef = doc(db, 'applications', applicationId);
      const appSnap = await getDoc(appRef);

      if (!appSnap.exists()) {
        Alert.alert(tr.error, tr.applicationNotFound);
        setLoading(false);
        return;
      }

      const appData = { id: appSnap.id, ...appSnap.data() };
      setApplication(appData);
      calculateActualPayment(appData);

      if (appData.jobId) {
        const jobRef = doc(db, 'jobs', appData.jobId);
        const jobSnap = await getDoc(jobRef);
        if (jobSnap.exists()) {
          setJob({ id: jobSnap.id, ...jobSnap.data() });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(tr.error, tr.failedToLoad);
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

  const formatWorkDuration = (hours) => {
    if (!hours) return locale === 'hi' ? '0 घंटे' : '0 hours';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    if (locale === 'hi') {
      if (wholeHours === 0) {
        return `${minutes} मिनट`;
      } else if (minutes === 0) {
        return `${wholeHours} घंटे`;
      } else {
        return `${wholeHours} घंटे ${minutes} मिनट`;
      }
    } else {
      if (wholeHours === 0) {
        return `${minutes} minutes`;
      } else if (minutes === 0) {
        return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
      } else {
        return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''} ${minutes} minutes`;
      }
    }
  };

  const getStatusInfo = () => {
    const status = application?.status;
    const journeyStatus = application?.journeyStatus;

    // Handle completed job status
    if (status === 'completed') {
      return {
        icon: '✅',
        color: colors.success,
        title: tr.jobCompleted,
        message: tr.jobCompletedDesc,
      };
    }

    // Handle awaiting rating status
    if (status === 'awaiting_rating') {
      return {
        icon: '⭐',
        color: colors.warning,
        title: tr.rateWorkerPerformance,
        message: tr.rateWorkerDesc,
      };
    }

    // Handle awaiting payment status
    if (status === 'awaiting_payment') {
      return {
        icon: '💰',
        color: colors.warning,
        title: tr.paymentRequired,
        message: `${tr.workCompletedDesc} ₹${actualPayment}`,
      };
    }

    // Handle journey status for active jobs
    switch (journeyStatus) {
      case 'accepted':
        return {
          icon: '✓',
          color: colors.info,
          title: tr.applicationAccepted,
          message: tr.applicationAcceptedDesc,
        };
      case 'onTheWay':
        return {
          icon: '🚗',
          color: colors.warning,
          title: tr.workerOnTheWay,
          message: tr.workerOnTheWayDesc,
        };
      case 'reached':
        return {
          icon: '📍',
          color: colors.success,
          title: tr.workerHasArrived,
          message: tr.workerHasArrivedDesc,
        };
      case 'started':
        return {
          icon: '⚡',
          color: colors.primary,
          title: tr.workInProgress,
          message: tr.workInProgressDesc,
        };
      case 'completed':
        return {
          icon: '✅',
          color: colors.success,
          title: tr.workCompleted,
          message: `${tr.workCompletedDesc} ₹${actualPayment}`,
        };
      default:
        return {
          icon: 'ℹ️',
          color: colors.textSecondary,
          title: tr.jobStatus,
          message: tr.jobStatusDesc,
        };
    }
  };

  const handleProcessPayment = () => {
    if (application?.journeyStatus !== 'completed' && application?.status !== 'awaiting_payment') {
      Alert.alert(tr.cannotProcessPayment, tr.waitForCompletion);
      return;
    }

    navigation.navigate('PaymentProcessing', {
      applicationId: application.id,
    });
  };

  const handleCompleteJob = () => {
    if (application?.paymentStatus !== 'paid') {
      Alert.alert(tr.paymentRequiredAlert, tr.processPaymentBefore);
      return;
    }

    navigation.navigate('CompleteJob', {
      applicationId: application.id,
      jobId: application.jobId,
      workerId: application.workerId,
      workerName: application.workerName,
    });
  };

  const handleRateWorker = () => {
    setShowRatingModal(true);
  };

  const handleRatingSubmitted = () => {
    Alert.alert(
      tr.thankYou,
      tr.ratingSubmitted,
      [{ 
        text: tr.ok, 
        onPress: () => {
          setShowRatingModal(false);
          navigation.navigate('EmployerHome');
        }
      }]
    );
  };

  const handleViewJobHistory = () => {
    navigation.navigate('ApplicationsScreen');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{tr.loadingTracking}</Text>
      </View>
    );
  }

  if (!application || !job) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← {tr.back}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{tr.jobTracking}</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{tr.jobTrackingNotAvailable}</Text>
        </View>
      </View>
    );
  }

  const statusInfo = getStatusInfo();
  const isJobCompleted = application.status === 'completed';
  const isAwaitingRating = application.status === 'awaiting_rating';
  const isAwaitingPayment = application.status === 'awaiting_payment';
  const hasActualWorkData = application.workStartedTimestamp && application.workCompletedTimestamp;
  const hourlyRate = application.hourlyRate || job.rate || 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← {tr.back}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tr.jobTracking}</Text>
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
          <Text style={styles.cardTitle}>{tr.jobDetails}</Text>
          <Text style={styles.infoValue}>{job.title}</Text>
          <Text style={styles.infoValue}>{job.location}</Text>
          <Text style={styles.infoValue}>{tr.rate}: ₹{hourlyRate}{tr.perHour}</Text>
        </View>

        {/* Worker Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr.workerInformation}</Text>
          <Text style={styles.infoLabel}>{tr.name}: <Text style={styles.infoValue}>{application.workerName}</Text></Text>
          <Text style={styles.infoLabel}>{tr.phone}: <Text style={styles.infoValue}>{application.workerPhone}</Text></Text>
        </View>

        {/* Schedule */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr.schedule}</Text>
          <Text style={styles.infoLabel}>{tr.date}: <Text style={styles.infoValue}>{job.jobDate || tr.notSpecified}</Text></Text>
          <Text style={styles.infoLabel}>{tr.time}: <Text style={styles.infoValue}>{job.startTime || tr.na} - {job.endTime || tr.na}</Text></Text>
        </View>

        {/* Work Timer (if started) */}
        {application.journeyStatus === 'started' && (
          <View style={styles.timerCard}>
            <Text style={styles.timerTitle}>{tr.workDuration}</Text>
            <Text style={styles.timerValue}>{formatDuration(workDuration)}</Text>
            <Text style={styles.timerSubtitle}>{tr.timeSpentWorking}</Text>
          </View>
        )}

        {/* Actual Work Duration (if completed) */}
        {hasActualWorkData && (
          <View style={[styles.card, styles.workDurationCard]}>
            <Text style={styles.cardTitle}>{tr.actualWorkDuration}</Text>
            <Text style={styles.workDurationValue}>
              {formatWorkDuration((application.workCompletedTimestamp - application.workStartedTimestamp) / (1000 * 60 * 60))}
            </Text>
            <Text style={styles.workDurationNote}>
              {tr.workStarted}: {new Date(application.workStartedTimestamp).toLocaleTimeString(locale === 'hi' ? 'hi-IN' : 'en-IN')}
              {'\n'}
              {tr.workCompleted}: {new Date(application.workCompletedTimestamp).toLocaleTimeString(locale === 'hi' ? 'hi-IN' : 'en-IN')}
            </Text>
          </View>
        )}

        {/* Payment Information - UPDATED WITH ACTUAL CALCULATION */}
        {(application.paymentStatus || isAwaitingPayment || isJobCompleted) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{tr.paymentDetails}</Text>
            
            {/* Hourly Rate */}
            <Text style={styles.infoLabel}>{tr.hourlyRate}: <Text style={styles.infoValue}>₹{hourlyRate}{tr.perHour}</Text></Text>
            
            {/* Actual Work Duration */}
            {hasActualWorkData && (
              <Text style={styles.infoLabel}>
                {tr.actualDuration}: <Text style={styles.infoValue}>
                  {formatWorkDuration((application.workCompletedTimestamp - application.workStartedTimestamp) / (1000 * 60 * 60))}
                </Text>
              </Text>
            )}
            
            {/* Payment Amount */}
            <Text style={styles.infoLabel}>
              {hasActualWorkData ? tr.calculatedPayment : tr.expectedPayment}: 
              <Text style={[styles.infoValue, styles.highlight]}> ₹{actualPayment}</Text>
            </Text>
            
            {/* Show original estimate for comparison */}
            {hasActualWorkData && application.expectedPayment && application.expectedPayment !== actualPayment && (
              <Text style={styles.infoLabel}>
                {tr.originalEstimate}: <Text style={[styles.infoValue, styles.originalEstimate]}>
                  ₹{application.expectedPayment}
                </Text>
              </Text>
            )}
            
            {/* Payment Calculation Details */}
            {hasActualWorkData && (
              <View style={styles.calculationBox}>
                <Text style={styles.calculationText}>
                  {tr.calculation}: {((application.workCompletedTimestamp - application.workStartedTimestamp) / (1000 * 60 * 60)).toFixed(2)} {tr.hours} × ₹{hourlyRate}{tr.perHour}
                </Text>
              </View>
            )}
            
            {/* Payment Status */}
            {application.paymentStatus && (
              <View style={[
                styles.paymentStatus,
                application.paymentStatus === 'paid' ? styles.paymentStatusPaid : styles.paymentStatusPending
              ]}>
                <Text style={styles.paymentStatusText}>
                  {tr.status}: {application.paymentStatus === 'paid' ? '✅ ' + tr.paid : '⏳ ' + tr.pending}
                </Text>
              </View>
            )}
            
            {/* Amount Paid */}
            {application.paymentAmount && (
              <Text style={styles.infoLabel}>{tr.amountPaid}: <Text style={[styles.infoValue, styles.highlight]}>₹{application.paymentAmount}</Text></Text>
            )}
          </View>
        )}

        {/* Rating Information (for completed jobs) */}
        {isJobCompleted && application.hasRating && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{tr.yourRating}</Text>
            <View style={styles.ratingDisplay}>
              <Text style={styles.ratingStars}>
                {'⭐'.repeat(application.employerRating)}{'☆'.repeat(5 - application.employerRating)}
              </Text>
              <Text style={styles.ratingValue}>{application.employerRating}/5 {tr.stars}</Text>
              {application.employerComment && (
                <Text style={styles.ratingComment}>"{application.employerComment}"</Text>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Payment Button - Show for completed work awaiting payment */}
          {(application.journeyStatus === 'completed' || isAwaitingPayment) && application.paymentStatus !== 'paid' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={handleProcessPayment}
            >
              <Text style={styles.actionButtonIcon}>💰</Text>
              <Text style={styles.actionButtonText}>{tr.processPayment} - ₹{actualPayment}</Text>
            </TouchableOpacity>
          )}

          {/* Complete Job Button - Show after payment */}
          {application.paymentStatus === 'paid' && application.status !== 'completed' && !isAwaitingRating && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleCompleteJob}
            >
              <Text style={styles.actionButtonIcon}>✓</Text>
              <Text style={styles.actionButtonText}>{tr.completeRateJob}</Text>
            </TouchableOpacity>
          )}

          {/* Rate Worker Button - Show for awaiting rating or completed jobs without rating */}
          {(isAwaitingRating || (isJobCompleted && !application.hasRating)) && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.warning }]}
              onPress={handleRateWorker}
            >
              <Text style={styles.actionButtonIcon}>⭐</Text>
              <Text style={styles.actionButtonText}>{tr.rateWorkerPerformance}</Text>
            </TouchableOpacity>
          )}

          {/* View Job History Button - For completed jobs */}
          {isJobCompleted && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.info }]}
              onPress={handleViewJobHistory}
            >
              <Text style={styles.actionButtonIcon}>📋</Text>
              <Text style={styles.actionButtonText}>{tr.viewJobHistory}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Secondary Actions */}
        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('JobLocation', { application, isEmployer: true })}
          >
            <Text style={styles.secondaryButtonText}>📍 {tr.viewLocation}</Text>
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
            <Text style={styles.secondaryButtonText}>💬 {tr.chatWithWorker}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Rating Modal */}
      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleRatingSubmitted}
        ratingType="worker"
        ratingData={{
          jobId: job.id,
          jobTitle: job.title,
          workerId: application.workerId,
          workerName: application.workerName,
          employerId: application.employerId,
          employerName: job.companyName,
          applicationId: application.id,
        }}
      />
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
  workDurationCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
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
  originalEstimate: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
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
  timerSubtitle: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 4,
  },
  workDurationValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.success,
    textAlign: 'center',
    marginBottom: 8,
  },
  workDurationNote: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  calculationBox: {
    backgroundColor: colors.info + '10',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  calculationText: {
    fontSize: 12,
    color: colors.info,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  paymentStatus: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  paymentStatusPaid: {
    backgroundColor: colors.success + '20',
  },
  paymentStatusPending: {
    backgroundColor: colors.warning + '20',
  },
  paymentStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  ratingDisplay: {
    alignItems: 'center',
    padding: 16,
  },
  ratingStars: {
    fontSize: 24,
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  ratingComment: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
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