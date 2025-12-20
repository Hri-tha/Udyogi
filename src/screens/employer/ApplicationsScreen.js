// src/screens/employer/ApplicationsScreen.js - HINDI VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  updateApplicationStatus, 
  fetchJobApplications,
  fetchEmployerJobs 
} from '../../services/database';
import { colors } from '../../constants/colors';

const ApplicationsScreen = ({ route, navigation }) => {
  const { jobId } = route.params || {};
  const { user, userProfile } = useAuth();
  const { locale, t } = useLanguage();
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(jobId);
  const [loading, setLoading] = useState(true);
  const [showJobSelector, setShowJobSelector] = useState(!jobId);
  const [processingApplication, setProcessingApplication] = useState(null);

  // Translations for this screen
  const translations = {
    en: {
      back: "Back",
      applications: "Applications",
      selectJob: "Select Job",
      loadingApplications: "Loading applications...",
      selectJobToView: "Select a job to view applications",
      noJobsWithApplications: "No jobs with applications",
      noJobsDesc: "Applications will appear here when workers apply to your jobs",
      applicationsCount: "application",
      applicationsCountPlural: "applications",
      noApplicationsYet: "No applications yet",
      noApplicationsDesc: "Applications will appear here when workers apply",
      applied: "Applied",
      applicationAccepted: "Application accepted! Location shared and chat enabled with the worker.",
      locationPermissionRequired: "Location Permission Required",
      locationPermissionDesc: "We need your location to share the work location with the worker.",
      success: "Success",
      error: "Error",
      failedToLoad: "Failed to load",
      applicationRejected: "Application rejected",
      failedToAccept: "Failed to accept application",
      failedToReject: "Failed to reject application",
      pleaseTryAgain: "Please try again.",
      pending: "Pending",
      accepted: "Accepted",
      rejected: "Rejected",
      completed: "Completed",
      paymentRequired: "Payment Required",
      rateWorker: "Rate Worker",
      accept: "Accept",
      reject: "Reject",
      trackJobProgress: "Track Job Progress",
      processPayment: "Process Payment",
      viewSharedLocation: "View Shared Location",
      openChat: "Open Chat",
      workerContactInfo: "Worker Contact Information",
      name: "Name",
      phone: "Phone",
      contactNote: "Please contact the worker to coordinate the job details.",
      jobCompleted: "Job Completed Successfully",
      viewJobDetails: "View Job Details",
      rateWorkerNow: "Rate Worker Now",
      rateWorkerPerformance: "Rate Worker Performance",
      payment: "Payment",
      amount: "Amount",
      paid: "Paid",
      paymentPending: "Payment Pending",
      youRated: "You rated",
      stars: "stars",
      onTheWay: "On The Way",
      arrived: "Arrived",
      working: "Working",
      jobCompletedStatus: "Completed",
      workingText: "Working",
      locationShared: "Location Shared",
      chatEnabled: "Chat Enabled",
      status: "Status",
      journeyStatus: "Progress",
      worker: "Worker",
      job: "Job",
      date: "Date",
      loading: "Loading...",
      noLocationPermission: "Location permission not granted",
      select: "Select",
      cancel: "Cancel",
      confirm: "Confirm",
      areYouSure: "Are you sure?",
      delete: "Delete",
      update: "Update",
      save: "Save",
      share: "Share",
      view: "View",
      edit: "Edit",
      deleteApplication: "Delete Application",
      deleteApplicationConfirm: "Are you sure you want to delete this application?",
      applicationDeleted: "Application deleted",
      failedToDelete: "Failed to delete application",
    },
    hi: {
      back: "पीछे",
      applications: "आवेदन",
      selectJob: "नौकरी चुनें",
      loadingApplications: "आवेदन लोड हो रहे हैं...",
      selectJobToView: "आवेदन देखने के लिए एक नौकरी चुनें",
      noJobsWithApplications: "आवेदन वाली कोई नौकरियां नहीं",
      noJobsDesc: "जब कर्मचारी आपकी नौकरियों के लिए आवेदन करेंगे तो आवेदन यहां दिखाई देंगे",
      applicationsCount: "आवेदन",
      applicationsCountPlural: "आवेदन",
      noApplicationsYet: "अभी तक कोई आवेदन नहीं",
      noApplicationsDesc: "जब कर्मचारी आवेदन करेंगे तो आवेदन यहां दिखाई देंगे",
      applied: "आवेदन किया",
      applicationAccepted: "आवेदन स्वीकृत! स्थान साझा किया गया और कर्मचारी के साथ चैट सक्षम हुई।",
      locationPermissionRequired: "स्थान अनुमति आवश्यक",
      locationPermissionDesc: "हमें कर्मचारी के साथ कार्य स्थान साझा करने के लिए आपके स्थान की आवश्यकता है।",
      success: "सफल",
      error: "त्रुटि",
      failedToLoad: "लोड करने में विफल",
      applicationRejected: "आवेदन अस्वीकृत",
      failedToAccept: "आवेदन स्वीकार करने में विफल",
      failedToReject: "आवेदन अस्वीकार करने में विफल",
      pleaseTryAgain: "कृपया पुनः प्रयास करें।",
      pending: "लंबित",
      accepted: "स्वीकृत",
      rejected: "अस्वीकृत",
      completed: "पूर्ण",
      paymentRequired: "भुगतान आवश्यक",
      rateWorker: "कर्मचारी को रेट करें",
      accept: "स्वीकार करें",
      reject: "अस्वीकार करें",
      trackJobProgress: "नौकरी प्रगति ट्रैक करें",
      processPayment: "भुगतान प्रक्रिया करें",
      viewSharedLocation: "साझा स्थान देखें",
      openChat: "चैट खोलें",
      workerContactInfo: "कर्मचारी संपर्क जानकारी",
      name: "नाम",
      phone: "फोन",
      contactNote: "कृपया नौकरी के विवरणों का समन्वय करने के लिए कर्मचारी से संपर्क करें।",
      jobCompleted: "नौकरी सफलतापूर्वक पूर्ण हुई",
      viewJobDetails: "नौकरी विवरण देखें",
      rateWorkerNow: "अभी कर्मचारी को रेट करें",
      rateWorkerPerformance: "कर्मचारी प्रदर्शन रेट करें",
      payment: "भुगतान",
      amount: "राशि",
      paid: "भुगतान हुआ",
      paymentPending: "भुगतान लंबित",
      youRated: "आपने रेट किया",
      stars: "स्टार",
      onTheWay: "रास्ते में",
      arrived: "पहुंच गया",
      working: "काम कर रहा",
      jobCompletedStatus: "पूर्ण",
      workingText: "कार्यरत",
      locationShared: "स्थान साझा",
      chatEnabled: "चैट सक्षम",
      status: "स्थिति",
      journeyStatus: "प्रगति",
      worker: "कर्मचारी",
      job: "नौकरी",
      date: "तारीख",
      loading: "लोड हो रहा है...",
      noLocationPermission: "स्थान अनुमति प्रदान नहीं की गई",
      select: "चुनें",
      cancel: "रद्द करें",
      confirm: "पुष्टि करें",
      areYouSure: "क्या आप सुनिश्चित हैं?",
      delete: "हटाएं",
      update: "अपडेट करें",
      save: "सहेजें",
      share: "साझा करें",
      view: "देखें",
      edit: "संपादित करें",
      deleteApplication: "आवेदन हटाएं",
      deleteApplicationConfirm: "क्या आप निश्चित रूप से इस आवेदन को हटाना चाहते हैं?",
      applicationDeleted: "आवेदन हटाया गया",
      failedToDelete: "आवेदन हटाने में विफल",
    }
  };

  const tr = translations[locale] || translations.en;

  useEffect(() => {
    console.log('ApplicationsScreen mounted with jobId:', jobId);
    if (jobId) {
      loadApplications(jobId);
    } else {
      loadEmployerJobs();
    }
  }, [jobId, user?.uid]);

  const loadEmployerJobs = async () => {
    try {
      if (!user?.uid) {
        console.log('No user ID available');
        setLoading(false);
        return;
      }

      console.log('Loading employer jobs for:', user.uid);
      const result = await fetchEmployerJobs(user.uid);
      console.log('Employer jobs result:', result);
      
      if (result.success) {
        // Get all jobs and fetch their applications
        const jobsWithApps = [];
        
        for (const job of result.jobs) {
          const appsResult = await fetchJobApplications(job.id);
          if (appsResult.success && appsResult.applications.length > 0) {
            jobsWithApps.push({
              ...job,
              applications: appsResult.applications
            });
          }
        }
        
        console.log('Jobs with applications:', jobsWithApps.length);
        setJobs(jobsWithApps);
      } else {
        console.error('Failed to fetch jobs:', result.error);
        Alert.alert(tr.error, `${tr.failedToLoad} jobs: ${result.error}`);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      Alert.alert(tr.error, `${tr.failedToLoad} jobs`);
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async (targetJobId) => {
    try {
      setLoading(true);
      console.log('Loading applications for job:', targetJobId);
      
      const result = await fetchJobApplications(targetJobId);
      console.log('Applications result:', result);
      
      if (result.success) {
        console.log('Found applications:', result.applications.length);
        setApplications(result.applications);
        setSelectedJobId(targetJobId);
        setShowJobSelector(false);
      } else {
        console.error('Failed to fetch applications:', result.error);
        Alert.alert(tr.error, result.error || `${tr.failedToLoad} applications`);
      }
    } catch (error) {
      console.error('Error in loadApplications:', error);
      Alert.alert(tr.error, `${tr.failedToLoad} applications`);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptApplication = async (application) => {
    console.log('Accepting application:', application.id);
    setProcessingApplication(application.id);
    
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          tr.locationPermissionRequired,
          tr.locationPermissionDesc
        );
        setProcessingApplication(null);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      let geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const address = geocode.length > 0 
        ? `${geocode[0].name || ''} ${geocode[0].street || ''}, ${geocode[0].city || ''}, ${geocode[0].region || ''}`
        : userProfile?.location || 'Work Location';

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address.trim(),
        sharedAt: new Date().toISOString()
      };

      console.log('Updating application status with location:', locationData);
      const result = await updateApplicationStatus(
        application.id, 
        'accepted', 
        locationData
      );

      if (result.success) {
        Alert.alert(
          tr.success, 
          tr.applicationAccepted
        );
        await loadApplications(selectedJobId);
      } else {
        console.error('Failed to accept application:', result.error);
        Alert.alert(tr.error, result.error || tr.failedToAccept);
      }
    } catch (error) {
      console.error('Error accepting application:', error);
      Alert.alert(tr.error, `${tr.failedToAccept} ${tr.pleaseTryAgain}`);
    } finally {
      setProcessingApplication(null);
    }
  };

  const handleRejectApplication = async (applicationId, workerId, workerName) => {
    try {
      console.log('Rejecting application:', applicationId);
      
      const result = await updateApplicationStatus(applicationId, 'rejected');
      
      if (result.success) {
        Alert.alert(tr.success, tr.applicationRejected);
        await loadApplications(selectedJobId);
      } else {
        Alert.alert(tr.error, result.error || tr.failedToReject);
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      Alert.alert(tr.error, tr.failedToReject);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return colors.success;
      case 'rejected': return colors.error;
      case 'completed': return colors.success;
      case 'awaiting_payment': return colors.warning;
      case 'awaiting_rating': return colors.info;
      default: return colors.warning;
    }
  };

  const getStatusText = (application) => {
    if (application.status === 'completed') {
      return locale === 'hi' ? '✅ पूर्ण' : '✅ Completed';
    } else if (application.status === 'awaiting_payment') {
      return locale === 'hi' ? '💰 भुगतान आवश्यक' : '💰 Payment Required';
    } else if (application.status === 'awaiting_rating') {
      return locale === 'hi' ? '⭐ कर्मचारी रेट करें' : '⭐ Rate Worker';
    } else if (application.status === 'accepted') {
      return locale === 'hi' ? '✅ स्वीकृत' : '✅ Accepted';
    } else if (application.status === 'rejected') {
      return locale === 'hi' ? '❌ अस्वीकृत' : '❌ Rejected';
    } else {
      return locale === 'hi' ? '⏳ लंबित' : '⏳ Pending';
    }
  };

  const getJourneyStatusText = (journeyStatus) => {
    switch (journeyStatus) {
      case 'onTheWay':
        return locale === 'hi' ? '🚗 रास्ते में' : '🚗 On The Way';
      case 'reached':
        return locale === 'hi' ? '📍 पहुंच गया' : '📍 Arrived';
      case 'started':
        return locale === 'hi' ? '⚡ काम कर रहा' : '⚡ Working';
      case 'completed':
        return locale === 'hi' ? '✅ पूर्ण' : '✅ Completed';
      default:
        return '';
    }
  };

  const handleViewLocation = (application) => {
    if (application.employerLocation) {
      navigation.navigate('JobLocation', { 
        application,
        isEmployer: true 
      });
    }
  };

  const handleOpenChat = (application) => {
    if (application.chatEnabled) {
      navigation.navigate('ChatScreen', {
        applicationId: application.id,
        otherUser: application.workerId,
        jobTitle: application.jobTitle,
        otherUserName: application.workerName
      });
    }
  };

  const handleTrackJob = (application) => {
    console.log('Navigating to job tracking for:', application.id);
    navigation.navigate('EmployerJobTracking', { 
      applicationId: application.id 
    });
  };

  const handleProcessPayment = (application) => {
    console.log('Navigating to payment processing for:', application.id);
    navigation.navigate('PaymentProcessing', { 
      applicationId: application.id 
    });
  };

  const handleRateWorker = (application) => {
    console.log('Navigating to rating for worker:', application.workerId);
    navigation.navigate('CompleteJob', {
      applicationId: application.id,
      jobId: application.jobId,
      workerId: application.workerId,
      workerName: application.workerName,
    });
  };

  // Format date based on locale
  const formatDate = (date) => {
    if (!date) return '';
    const d = date.toDate();
    return d.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← {tr.back}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{tr.applications}</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{tr.loadingApplications}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (showJobSelector) {
            navigation.goBack();
          } else {
            setShowJobSelector(true);
            setApplications([]);
          }
        }}>
          <Text style={styles.backButton}>
            {showJobSelector ? `← ${tr.back}` : `← ${tr.selectJob}`}
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {showJobSelector ? tr.selectJob : tr.applications}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {showJobSelector ? (
          // Job Selection View
          <View>
            <Text style={styles.sectionTitle}>{tr.selectJobToView}</Text>
            {jobs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>{tr.noJobsWithApplications}</Text>
                <Text style={styles.emptySubtext}>
                  {tr.noJobsDesc}
                </Text>
              </View>
            ) : (
              jobs.map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  onPress={() => {
                    console.log('Selected job:', job.id, 'with', job.applications?.length, 'applications');
                    loadApplications(job.id);
                  }}
                >
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <Text style={styles.jobLocation}>📍 {job.location}</Text>
                  <Text style={styles.applicationCount}>
                    {job.applications?.length || 0} {locale === 'hi' ? 'आवेदन' : job.applications?.length !== 1 ? 'applications' : 'application'}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          // Applications View
          <>
            <View style={styles.statsCard}>
              <Text style={styles.statsText}>
                {applications.length} {locale === 'hi' ? 'आवेदन' : applications.length !== 1 ? tr.applicationsCountPlural : tr.applicationsCount}
              </Text>
              {selectedJobId && applications.length > 0 && (
                <Text style={styles.jobName}>
                  {applications[0]?.jobTitle || tr.applications}
                </Text>
              )}
            </View>

            {applications.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyText}>{tr.noApplicationsYet}</Text>
                <Text style={styles.emptySubtext}>
                  {tr.noApplicationsDesc}
                </Text>
              </View>
            ) : (
              applications.map((application) => (
                <View key={application.id} style={styles.applicationCard}>
                  <View style={styles.applicationHeader}>
                    <View style={styles.workerInfo}>
                      <Text style={styles.workerName}>{application.workerName}</Text>
                      <Text style={styles.workerPhone}>📞 {application.workerPhone}</Text>
                    </View>
                    <Text style={[styles.status, { color: getStatusColor(application.status) }]}>
                      {getStatusText(application)}
                    </Text>
                  </View>
                  
                  <Text style={styles.jobTitle}>💼 {application.jobTitle}</Text>
                  <Text style={styles.appliedDate}>
                    📅 {tr.applied}: {formatDate(application.appliedAt)}
                  </Text>

                  {/* Journey Status Badge */}
                  {application.journeyStatus && application.journeyStatus !== 'accepted' && (
                    <View style={styles.journeyStatusBadge}>
                      <Text style={styles.journeyStatusText}>
                        {getJourneyStatusText(application.journeyStatus)}
                      </Text>
                    </View>
                  )}

                  {/* Payment Status */}
                  {application.paymentStatus && (
                    <View style={[
                      styles.paymentStatusBadge,
                      application.paymentStatus === 'paid' && styles.paymentStatusPaid,
                      application.paymentStatus === 'pending' && styles.paymentStatusPending
                    ]}>
                      <Text style={styles.paymentStatusText}>
                        {application.paymentStatus === 'paid' 
                          ? (locale === 'hi' ? '💰 भुगतान हुआ' : '💰 Paid')
                          : (locale === 'hi' ? '⏳ भुगतान लंबित' : '⏳ Payment Pending')}
                      </Text>
                    </View>
                  )}

                  {application.status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.acceptButton, 
                               processingApplication === application.id && styles.disabledButton]}
                        onPress={() => handleAcceptApplication(application)}
                        disabled={processingApplication === application.id}
                      >
                        {processingApplication === application.id ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Text style={styles.actionButtonText}>✅ {tr.accept}</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => 
                          handleRejectApplication(application.id, application.workerId, application.workerName)
                        }
                      >
                        <Text style={styles.actionButtonText}>❌ {tr.reject}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* ACCEPTED & IN PROGRESS ACTIONS */}
                  {(application.status === 'accepted' || application.status === 'awaiting_payment') && (
                    <View style={styles.acceptedActions}>
                      <Text style={styles.acceptedTitle}>
                        {application.status === 'accepted' 
                          ? (locale === 'hi' ? '✅ आवेदन स्वीकृत' : '✅ Application Accepted')
                          : (locale === 'hi' ? '💰 भुगतान आवश्यक' : '💰 Payment Required')}
                      </Text>
                      
                      {/* TRACK JOB PROGRESS BUTTON - Always show for accepted and awaiting_payment */}
                      <TouchableOpacity
                        style={[styles.actionButton, styles.trackButton]}
                        onPress={() => handleTrackJob(application)}
                      >
                        <Text style={styles.actionButtonText}>📊 {tr.trackJobProgress}</Text>
                      </TouchableOpacity>

                      {/* PAYMENT BUTTON - Show when payment is required */}
                      {application.status === 'awaiting_payment' && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.paymentButton]}
                          onPress={() => handleProcessPayment(application)}
                        >
                          <Text style={styles.actionButtonText}>💳 {tr.processPayment}</Text>
                        </TouchableOpacity>
                      )}

                      {application.locationShared && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.locationButton]}
                          onPress={() => handleViewLocation(application)}
                        >
                          <Text style={styles.actionButtonText}>📍 {tr.viewSharedLocation}</Text>
                        </TouchableOpacity>
                      )}

                      {application.chatEnabled && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.chatButton]}
                          onPress={() => handleOpenChat(application)}
                        >
                          <Text style={styles.actionButtonText}>💬 {tr.openChat}</Text>
                        </TouchableOpacity>
                      )}

                      <View style={styles.contactInfo}>
                        <Text style={styles.contactTitle}>{tr.workerContactInfo}:</Text>
                        <Text style={styles.contactDetail}>👤 {tr.name}: {application.workerName}</Text>
                        <Text style={styles.contactDetail}>📞 {tr.phone}: {application.workerPhone}</Text>
                        <Text style={styles.contactNote}>
                          {tr.contactNote}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* COMPLETED JOB ACTIONS */}
                  {application.status === 'completed' && (
                    <View style={styles.completedActions}>
                      <Text style={styles.completedTitle}>
                        ✅ {tr.jobCompleted}
                      </Text>
                      
                      {/* TRACK JOB PROGRESS BUTTON - Still show for completed jobs */}
                      <TouchableOpacity
                        style={[styles.actionButton, styles.trackButton]}
                        onPress={() => handleTrackJob(application)}
                      >
                        <Text style={styles.actionButtonText}>📊 {tr.viewJobDetails}</Text>
                      </TouchableOpacity>

                      {/* RATE WORKER BUTTON - Show if not rated yet */}
                      {!application.hasRating && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.rateButton]}
                          onPress={() => handleRateWorker(application)}
                        >
                          <Text style={styles.actionButtonText}>⭐ {tr.rateWorker}</Text>
                        </TouchableOpacity>
                      )}

                      {/* PAYMENT STATUS */}
                      {application.paymentStatus && (
                        <View style={styles.paymentInfo}>
                          <Text style={styles.paymentInfoText}>
                            {tr.payment}: {application.paymentStatus === 'paid' 
                              ? (locale === 'hi' ? '✅ पूर्ण' : '✅ Completed')
                              : (locale === 'hi' ? '⏳ लंबित' : '⏳ Pending')}
                          </Text>
                          {application.paymentAmount && (
                            <Text style={styles.paymentAmount}>
                              {tr.amount}: ₹{application.paymentAmount}
                            </Text>
                          )}
                        </View>
                      )}

                      {/* RATING STATUS */}
                      {application.hasRating && (
                        <View style={styles.ratingInfo}>
                          <Text style={styles.ratingInfoText}>
                            ⭐ {tr.youRated}: {application.employerRating}/5 {tr.stars}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* AWAITING RATING ACTIONS */}
                  {application.status === 'awaiting_rating' && (
                    <View style={styles.awaitingRatingActions}>
                      <Text style={styles.awaitingRatingTitle}>⭐ {tr.rateWorkerPerformance}</Text>
                      
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rateButton]}
                        onPress={() => handleRateWorker(application)}
                      >
                        <Text style={styles.actionButtonText}>⭐ {tr.rateWorkerNow}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.trackButton]}
                        onPress={() => handleTrackJob(application)}
                      >
                        <Text style={styles.actionButtonText}>📊 {tr.viewJobDetails}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {application.status === 'rejected' && (
                    <View style={styles.rejectedInfo}>
                      <Text style={styles.rejectedText}>
                        ❌ {locale === 'hi' ? 'आवेदन अस्वीकृत' : 'Application Rejected'}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  jobName: {
    color: colors.white,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.9,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: colors.white,
    borderRadius: 16,
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
  jobCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  applicationCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  workerPhone: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  jobTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  appliedDate: {
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.7,
    marginBottom: 12,
  },
  journeyStatusBadge: {
    backgroundColor: colors.info + '20',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  journeyStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.info,
  },
  paymentStatusBadge: {
    padding: 6,
    borderRadius: 6,
    marginBottom: 12,
    alignItems: 'center',
  },
  paymentStatusPaid: {
    backgroundColor: colors.success + '20',
  },
  paymentStatusPending: {
    backgroundColor: colors.warning + '20',
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  jobLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  applicationCount: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    marginBottom: 8,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  trackButton: {
    backgroundColor: colors.info,
    marginHorizontal: 0,
  },
  paymentButton: {
    backgroundColor: colors.warning,
    marginHorizontal: 0,
  },
  locationButton: {
    backgroundColor: colors.secondary,
    marginHorizontal: 0,
  },
  chatButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 0,
  },
  rateButton: {
    backgroundColor: colors.warning,
    marginHorizontal: 0,
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  acceptedActions: {
    marginTop: 12,
  },
  acceptedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 12,
    textAlign: 'center',
  },
  completedActions: {
    marginTop: 12,
  },
  completedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 12,
    textAlign: 'center',
  },
  awaitingRatingActions: {
    marginTop: 12,
  },
  awaitingRatingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.info,
    marginBottom: 12,
    textAlign: 'center',
  },
  contactInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  contactDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  contactNote: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  paymentInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 6,
    alignItems: 'center',
  },
  paymentInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  paymentAmount: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ratingInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: colors.warning + '15',
    borderRadius: 6,
    alignItems: 'center',
  },
  ratingInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
  },
  rejectedInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.error + '15',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  rejectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
    textAlign: 'center',
  },
});

export default ApplicationsScreen;