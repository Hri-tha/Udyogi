// src/screens/worker/JobDetailsScreen.js - HINDI VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useJob } from '../../context/JobContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../constants/colors';
import { fetchWorkerApplications, fetchJobById } from '../../services/database';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const JobDetailsScreen = ({ route, navigation }) => {
  const { jobId } = route.params;
  const { jobs, applyForJob } = useJob();
  const { user, userProfile } = useAuth();
  const { locale, t } = useLanguage();
  
  const [applying, setApplying] = useState(false);
  const [myApplication, setMyApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [job, setJob] = useState(null);

  // Translations for this screen
  const translations = {
    en: {
      headerTitle: 'Job Details',
      loadingText: 'Loading job details...',
      jobNotFound: 'Job not found',
      retry: 'Retry',
      applyButton: 'Apply for Job',
      applying: 'Applying...',
      alreadyApplied: 'Already Applied',
      alreadyAppliedMsg: 'You have already applied for this job.',
      profileIncomplete: 'Profile Incomplete',
      profileIncompleteMsg: 'Please complete your profile before applying for jobs.',
      error: 'Error',
      jobInfoUnavailable: 'Job information not available. Please try again.',
      jobDataIncomplete: 'Job data is incomplete. Please try again later.',
      applicationSuccess: 'Application submitted successfully! The employer will be notified.',
      failedToApply: 'Failed to apply for job. Please try again.',
      unknownError: 'Unknown error occurred',
      date: 'Date',
      time: 'Time',
      totalEstimatedEarnings: 'Total Estimated Earnings',
      hours: 'hours',
      jobDescription: 'Job Description',
      location: 'Location',
      locationNotSpecified: 'Location not specified',
      category: 'Category',
      noDescription: 'No description provided',
      jobCompleted: 'Job Completed!',
      applicationAccepted: 'Application Accepted!',
      applicationPending: 'Application Pending',
      applicationRejected: 'Application Rejected',
      congratsMsg: 'Congratulations! You can track your job progress below.',
      pendingMsg: 'Your application is being reviewed by the employer.',
      rejectedMsg: 'Unfortunately, your application was not accepted.',
      completedMsg: 'Job completed successfully! Great work!',
      trackJobProgress: 'Track Job Progress',
      dontWorry: 'Don\'t worry! Keep applying to other jobs.',
      browseMoreJobs: 'Browse More Jobs',
      viewEarningsHistory: 'View Earnings History',
      checkEarningsProfile: 'This job has been successfully completed. Check your earnings in your profile.',
      estimated: 'Estimated',
      perHour: '/hour',
      notSpecified: 'Not specified',
      success: 'Success',
      noJob: 'No job',
      company: 'Company',
      jobDate: 'Date',
      jobTime: 'Time',
      jobLocation: 'Location',
      jobCategory: 'Category',
      status: 'Status',
      applicationStatus: 'Application Status',
      readyToApply: 'Ready to apply',
      pleaseWait: 'Please wait...',
      calculating: 'Calculating...',
      earnings: 'Earnings',
      description: 'Description',
      details: 'Details',
      back: 'Back',
      share: 'Share',
      save: 'Save',
    },
    hi: {
      headerTitle: 'नौकरी विवरण',
      loadingText: 'नौकरी विवरण लोड हो रहा है...',
      jobNotFound: 'नौकरी नहीं मिली',
      retry: 'पुनः प्रयास करें',
      applyButton: 'नौकरी के लिए आवेदन करें',
      applying: 'आवेदन हो रहा है...',
      alreadyApplied: 'पहले ही आवेदन किया',
      alreadyAppliedMsg: 'आपने पहले ही इस नौकरी के लिए आवेदन किया है।',
      profileIncomplete: 'प्रोफाइल अधूरी है',
      profileIncompleteMsg: 'कृपया नौकरियों के लिए आवेदन करने से पहले अपनी प्रोफाइल पूरी करें।',
      error: 'त्रुटि',
      jobInfoUnavailable: 'नौकरी जानकारी उपलब्ध नहीं है। कृपया पुनः प्रयास करें।',
      jobDataIncomplete: 'नौकरी डेटा अधूरा है। कृपया बाद में पुनः प्रयास करें।',
      applicationSuccess: 'आवेदन सफलतापूर्वक जमा किया गया! नियोक्ता को सूचित किया जाएगा।',
      failedToApply: 'नौकरी के लिए आवेदन करने में विफल। कृपया पुनः प्रयास करें।',
      unknownError: 'अज्ञात त्रुटि हुई',
      date: 'तारीख',
      time: 'समय',
      totalEstimatedEarnings: 'कुल अनुमानित कमाई',
      hours: 'घंटे',
      jobDescription: 'नौकरी विवरण',
      location: 'स्थान',
      locationNotSpecified: 'स्थान निर्दिष्ट नहीं है',
      category: 'श्रेणी',
      noDescription: 'कोई विवरण प्रदान नहीं किया गया',
      jobCompleted: 'नौकरी पूरी हुई!',
      applicationAccepted: 'आवेदन स्वीकृत हुआ!',
      applicationPending: 'आवेदन लंबित',
      applicationRejected: 'आवेदन अस्वीकृत',
      congratsMsg: 'बधाई हो! आप नीचे अपनी नौकरी की प्रगति ट्रैक कर सकते हैं।',
      pendingMsg: 'आपका आवेदन नियोक्ता द्वारा समीक्षा के लिए है।',
      rejectedMsg: 'दुर्भाग्य से, आपका आवेदन स्वीकार नहीं किया गया।',
      completedMsg: 'नौकरी सफलतापूर्वक पूरी हुई! बहुत बढ़िया काम!',
      trackJobProgress: 'नौकरी प्रगति ट्रैक करें',
      dontWorry: 'चिंता न करें! अन्य नौकरियों के लिए आवेदन करना जारी रखें।',
      browseMoreJobs: 'अधिक नौकरियां ब्राउज़ करें',
      viewEarningsHistory: 'कमाई इतिहास देखें',
      checkEarningsProfile: 'यह नौकरी सफलतापूर्वक पूरी हो गई है। अपनी कमाई अपने प्रोफाइल में जांचें।',
      estimated: 'अनुमानित',
      perHour: '/घंटा',
      notSpecified: 'निर्दिष्ट नहीं',
      success: 'सफलता',
      noJob: 'कोई नौकरी नहीं',
      company: 'कंपनी',
      jobDate: 'तारीख',
      jobTime: 'समय',
      jobLocation: 'स्थान',
      jobCategory: 'श्रेणी',
      status: 'स्थिति',
      applicationStatus: 'आवेदन स्थिति',
      readyToApply: 'आवेदन करने के लिए तैयार',
      pleaseWait: 'कृपया प्रतीक्षा करें...',
      calculating: 'गणना हो रही है...',
      earnings: 'कमाई',
      description: 'विवरण',
      details: 'विवरण',
      back: 'वापस',
      share: 'साझा करें',
      save: 'सहेजें',
    }
  };

  const tr = translations[locale] || translations.en;

  // Find job from context or fetch from database
  useEffect(() => {
    loadJobDetails();
  }, [jobId]);

  useEffect(() => {
    if (job) {
      checkApplicationStatus();
    }
  }, [job]);

  useEffect(() => {
    if (job) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [job]);

  const loadJobDetails = async () => {
    try {
      // First try to find job in context
      const contextJob = jobs.find(j => j.id === jobId);
      if (contextJob) {
        setJob(contextJob);
        return;
      }

      // If not found in context, fetch from database
      const result = await fetchJobById(jobId);
      if (result.success) {
        setJob(result.job);
      } else {
        console.error('Job not found:', result.error);
        setJob(null);
      }
    } catch (error) {
      console.error('Error loading job details:', error);
      setJob(null);
    }
  };

  const checkApplicationStatus = async () => {
    try {
      const result = await fetchWorkerApplications(user.uid);
      if (result.success) {
        const application = result.applications.find(app => app.jobId === jobId);
        setMyApplication(application || null);
      }
    } catch (error) {
      console.error('Error checking application:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    console.log('=== Starting Application Process ===');
    console.log('Job ID:', jobId);
    console.log('Job data available:', !!job);
    console.log('User ID:', user?.uid);
    console.log('User profile:', userProfile);

    if (myApplication) {
      Alert.alert(tr.alreadyApplied, tr.alreadyAppliedMsg);
      return;
    }

    if (!userProfile?.name || !userProfile?.phoneNumber) {
      Alert.alert(tr.profileIncomplete, tr.profileIncompleteMsg);
      navigation.navigate('WorkerProfile');
      return;
    }

    // Ensure job data is available
    if (!job) {
      console.error('Job data is null when trying to apply');
      Alert.alert(tr.error, tr.jobInfoUnavailable);
      return;
    }

    // Validate critical job data
    if (!job.employerId) {
      console.error('Job missing employerId:', job);
      Alert.alert(tr.error, tr.jobDataIncomplete);
      return;
    }

    setApplying(true);
    try {
      console.log('Calling applyForJob with job data:', {
        jobId,
        jobTitle: job.title,
        employerId: job.employerId
      });

      // Pass the complete job data to the applyForJob function
      const result = await applyForJob(jobId, user.uid, userProfile, job);
      
      if (result.success) {
        console.log('Application successful, application ID:', result.applicationId);
        Alert.alert(tr.success, tr.applicationSuccess);
        await checkApplicationStatus();
      } else {
        throw new Error(result.error || tr.unknownError);
      }
    } catch (error) {
      console.error('Application error details:', {
        message: error.message,
        stack: error.stack
      });
      Alert.alert(tr.error, error.message || tr.failedToApply);
    }
    setApplying(false);
  };

  const handleTrackJob = () => {
    if (myApplication && myApplication.status === 'accepted') {
      navigation.navigate('JobTracking', {
        applicationId: myApplication.id
      });
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'construction': '🏗️',
      'cleaning': '🧹',
      'delivery': '🚚',
      'event': '🎪',
      'retail': '🛍️',
      'hospitality': '🏨',
      'other': '💼'
    };
    return icons[category?.toLowerCase()] || '💼';
  };

  const getStatusConfig = (status) => {
    const configs = {
      accepted: {
        color: colors.success,
        icon: 'check-circle',
        gradient: ['#4CAF50', '#45a049'],
        message: tr.congratsMsg
      },
      pending: {
        color: colors.warning,
        icon: 'clock',
        gradient: ['#FF9800', '#F57C00'],
        message: tr.pendingMsg
      },
      rejected: {
        color: colors.error,
        icon: 'close-circle',
        gradient: ['#f44336', '#d32f2f'],
        message: tr.rejectedMsg
      },
      completed: {
        color: '#27ae60',
        icon: 'check-circle-outline',
        gradient: ['#27ae60', '#219a52'],
        message: tr.completedMsg
      }
    };
    return configs[status] || configs.pending;
  };

  const calculateTotalEarnings = () => {
    if (!job?.startTime || !job?.endTime) return null;

    try {
      const parseTime = (timeStr) => {
        if (!timeStr) return 0;
        
        let time = String(timeStr).toLowerCase().trim();
        
        if (time.includes('am') || time.includes('pm')) {
          const [timePart, modifier] = time.split(/(am|pm)/);
          let [hours, minutes] = timePart.split(':').map(Number);
          
          if (modifier === 'pm' && hours < 12) hours += 12;
          if (modifier === 'am' && hours === 12) hours = 0;
          
          return hours + (minutes || 0) / 60;
        } else {
          const [hours, minutes] = time.split(':').map(Number);
          return hours + (minutes || 0) / 60;
        }
      };

      const start = parseTime(job.startTime);
      const end = parseTime(job.endTime);
      
      if (isNaN(start) || isNaN(end) || end <= start) return null;

      const totalHours = end - start;
      const hourlyRate = Number(job.rate || job.salary || 0);
      const totalMoney = totalHours * hourlyRate;

      return {
        totalHours: Math.round(totalHours * 100) / 100,
        totalMoney: Math.round(totalMoney)
      };
    } catch (error) {
      console.error('Error calculating total earnings:', error);
      return null;
    }
  };

  const totalEarnings = calculateTotalEarnings();

  if (loading && !job) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.primary, '#4A90E2']}
          style={styles.gradientHeader}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{tr.headerTitle}</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{tr.loadingText}</Text>
        </View>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.primary, '#4A90E2']}
          style={styles.gradientHeader}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{tr.headerTitle}</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.centerContent}>
          <MaterialIcons name="error-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.errorText}>{tr.jobNotFound}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadJobDetails}
          >
            <Text style={styles.retryButtonText}>{tr.retry}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Safe access to job properties with fallbacks
  const startTime = job.startTime ? String(job.startTime) : '';
  const endTime = job.endTime ? String(job.endTime) : '';
  const timeDisplay = startTime && endTime ? `${startTime} - ${endTime}` : tr.notSpecified;

  const hasApplied = myApplication !== null;
  const isAccepted = myApplication?.status === 'accepted';
  const isPending = myApplication?.status === 'pending';
  const isRejected = myApplication?.status === 'rejected';
  const isCompleted = myApplication?.status === 'completed';
  const statusConfig = getStatusConfig(myApplication?.status);

  const getJobStatusTitle = () => {
    if (isCompleted) return tr.jobCompleted;
    if (isAccepted) return tr.applicationAccepted;
    if (isPending) return tr.applicationPending;
    if (isRejected) return tr.applicationRejected;
    return tr.applicationStatus;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary, '#4A90E2']}
        style={styles.gradientHeader}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>{tr.back}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{tr.headerTitle}</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header Card */}
          <LinearGradient
            colors={['#fff', '#f8f9fa']}
            style={styles.headerCard}
          >
            <View style={styles.categoryIcon}>
              <Text style={styles.categoryIconText}>
                {getCategoryIcon(job.category)}
              </Text>
            </View>
            <View style={styles.headerContent}>
              <Text style={styles.title}>{String(job.title || tr.noJob)}</Text>
              <View style={styles.companyRow}>
                <MaterialIcons name="business" size={16} color={colors.primary} />
                <Text style={styles.company}>{String(job.companyName || job.company || tr.company)}</Text>
              </View>
              <View style={styles.salaryRow}>
                <FontAwesome5 name="money-bill-wave" size={16} color="#27ae60" />
                <Text style={styles.salary}>₹{String(job.rate || job.salary || '0')}{tr.perHour}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Quick Info Cards */}
          <View style={styles.quickInfoRow}>
            <View style={styles.quickInfoCard}>
              <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
              <Text style={styles.quickInfoLabel}>{tr.date}</Text>
              <Text style={styles.quickInfoValue}>
                {job.jobDate || tr.notSpecified}
              </Text>
            </View>
            
            <View style={styles.quickInfoCard}>
              <MaterialIcons name="access-time" size={20} color={colors.primary} />
              <Text style={styles.quickInfoLabel}>{tr.time}</Text>
              <Text style={styles.quickInfoValue}>{timeDisplay}</Text>
            </View>
          </View>

          {/* Total Earnings Card */}
          {totalEarnings && (
            <View style={styles.earningsCard}>
              <LinearGradient
                colors={['#27ae60', '#219a52']}
                style={styles.earningsGradient}
              >
                <View style={styles.earningsContent}>
                  <View style={styles.earningsIcon}>
                    <FontAwesome5 name="rupee-sign" size={20} color="#fff" />
                  </View>
                  <View style={styles.earningsText}>
                    <Text style={styles.earningsLabel}>{tr.totalEstimatedEarnings}</Text>
                    <Text style={styles.earningsAmount}>₹{totalEarnings.totalMoney}</Text>
                    <Text style={styles.earningsDetails}>
                      {totalEarnings.totalHours} {tr.hours} × ₹{job.rate || job.salary}{tr.perHour}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Description Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="description" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>{tr.jobDescription}</Text>
            </View>
            <Text style={styles.description}>
              {String(job.description || tr.noDescription)}
            </Text>
          </View>

          {/* Location Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="location-on" size={20} color={colors.primary} />
              <Text style={styles.cardTitle}>{tr.location}</Text>
            </View>
            <Text style={styles.value}>
              {String(job.location || tr.locationNotSpecified)}
            </Text>
          </View>

          {/* Category Card */}
          {job.category && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="category" size={20} color={colors.primary} />
                <Text style={styles.cardTitle}>{tr.category}</Text>
              </View>
              <View style={styles.categoryTag}>
                <Text style={styles.categoryText}>{String(job.category)}</Text>
              </View>
            </View>
          )}

          {/* Application Status */}
          {hasApplied && (
            <LinearGradient
              colors={statusConfig.gradient}
              style={styles.statusCard}
            >
              <View style={styles.statusContent}>
                <MaterialIcons 
                  name={statusConfig.icon} 
                  size={32} 
                  color="#fff" 
                />
                <View style={styles.statusTextContent}>
                  <Text style={styles.statusTitle}>
                    {getJobStatusTitle()}
                  </Text>
                  <Text style={styles.statusMessage}>
                    {statusConfig.message}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          )}

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            {!hasApplied ? (
              <TouchableOpacity
                style={[styles.applyButton, applying && styles.applyButtonDisabled]}
                onPress={handleApply}
                disabled={applying}
              >
                <LinearGradient
                  colors={applying ? ['#ccc', '#999'] : [colors.primary, '#4A90E2']}
                  style={styles.applyButtonGradient}
                >
                  {applying ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialIcons name="send" size={20} color="#fff" />
                  )}
                  <Text style={styles.applyButtonText}>
                    {applying ? tr.applying : tr.applyButton}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : isCompleted ? (
              <View style={styles.completedActions}>
                <LinearGradient
                  colors={['#27ae60', '#219a52']}
                  style={styles.completedBadge}
                >
                  <MaterialIcons name="check-circle" size={48} color="#fff" />
                  <Text style={styles.completedTitle}>{tr.jobCompleted}</Text>
                  <Text style={styles.completedMessage}>
                    {tr.checkEarningsProfile}
                  </Text>
                </LinearGradient>
                
                <TouchableOpacity
                  style={styles.viewEarningsButton}
                  onPress={() => navigation.navigate('WorkerProfile')}
                >
                  <Text style={styles.viewEarningsText}>{tr.viewEarningsHistory}</Text>
                </TouchableOpacity>
              </View>
            ) : isAccepted ? (
              <TouchableOpacity
                style={styles.trackButton}
                onPress={handleTrackJob}
              >
                <LinearGradient
                  colors={['#27ae60', '#219a52']}
                  style={styles.trackButtonGradient}
                >
                  <Feather name="navigation" size={20} color="#fff" />
                  <Text style={styles.trackButtonText}>{tr.trackJobProgress}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : isRejected ? (
              <View style={styles.rejectedActions}>
                <Text style={styles.rejectedText}>
                  {tr.dontWorry}
                </Text>
                <TouchableOpacity
                  style={styles.browseButton}
                  onPress={() => navigation.navigate('WorkerHome')}
                >
                  <Text style={styles.browseButtonText}>{tr.browseMoreJobs}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </Animated.View>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  headerCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryIconText: {
    fontSize: 24,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  company: {
    fontSize: 16,
    color: colors.primary,
    marginLeft: 6,
    fontWeight: '600',
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  salary: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
    marginLeft: 6,
  },
  quickInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickInfoCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  quickInfoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  quickInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  earningsCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  earningsGradient: {
    padding: 20,
    borderRadius: 16,
  },
  earningsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningsIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  earningsText: {
    flex: 1,
  },
  earningsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  earningsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  earningsDetails: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  value: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  categoryTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  categoryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  statusCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTextContent: {
    flex: 1,
    marginLeft: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  actionContainer: {
    marginTop: 8,
  },
  applyButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  applyButtonGradient: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonDisabled: {
    opacity: 0.7,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  completedActions: {
    alignItems: 'center',
  },
  completedBadge: {
    padding: 28,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  completedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    marginBottom: 8,
  },
  completedMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    lineHeight: 20,
  },
  viewEarningsButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  viewEarningsText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  trackButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  trackButtonGradient: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  rejectedActions: {
    alignItems: 'center',
    padding: 20,
  },
  rejectedText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default JobDetailsScreen;