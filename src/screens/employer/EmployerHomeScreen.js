// src/screens/employer/EmployerHomeScreen.js - FIXED VERSION
// SAFE AREA FIX: floating button and scroll content now respect bottom inset
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  Dimensions,
  Modal,
  Image,
  Animated,
  FlatList,
} from 'react-native';
import GradientView from '../../components/GradientView';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchAllEmployerJobs,
  fetchJobApplications,
  deletePastJob,
  getEmployerJobPostingStats
} from '../../services/database';
import { colors } from '../../constants/colors';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const defaultAvatar = 'https://ui-avatars.com/api/?name=Employer&background=007AFF&color=fff&size=128';

export default function EmployerHomeScreen({ navigation }) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { locale, t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [futureJobs, setFutureJobs] = useState([]);
  const [pastJobs, setPastJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPastJobs, setShowPastJobs] = useState(false);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [postingStats, setPostingStats] = useState(null);
  const [showAllJobs, setShowAllJobs] = useState(false);

  // ── Resolve the real employer UID ──────────────────────────────────────────
  const resolvedUid = user?.uid || userProfile?.uid || null;

  const translations = {
    en: {
      welcome: "Welcome back",
      subtitle: "Here's your hiring dashboard",
      overview: "Overview",
      upcomingJobs: "Upcoming Jobs",
      pastJobs: "Past Jobs",
      applications: "Applications",
      totalHires: "Total Hires",
      futureDates: "Future dates",
      completedExpired: "Completed/Expired",
      totalReceived: "Total received",
      completedWork: "Completed work",
      postNewJob: "Post New Job",
      findWorkers: "Find qualified workers",
      viewApplications: "View Applications",
      settings: "Settings",
      noUpcomingJobs: "No upcoming jobs",
      noJobsDesc: "Post a new job to find workers for future dates",
      active: "Active",
      closed: "Closed",
      cancelled: "Cancelled",
      location: "Location",
      rate: "Rate",
      duration: "Duration",
      date: "Date",
      time: "Time",
      status: "Status",
      completed: "Completed",
      worker: "worker",
      workers: "workers",
      applicationsCount: "applications",
      jobDetails: "Job Details",
      viewDetails: "View Details",
      deleteJob: "Delete Job",
      expired: "Expired",
      of: "of",
      areYouSure: "Are you sure?",
      deleteConfirmation: "Are you sure you want to delete",
      cannotUndone: "This action cannot be undone",
      success: "Success",
      deletedSuccessfully: "Job deleted successfully",
      error: "Error",
      failedDelete: "Failed to delete job",
      loading: "Loading your dashboard...",
      refresh: "Pull to refresh",
      modalTitle: "Past Jobs",
      noPastJobs: "No past jobs",
      pastJobsDesc: "Completed and expired jobs will appear here",
      chooseAction: "Choose an action",
      today: "Today",
      tomorrow: "Tomorrow",
      dateNotSet: "Date not set",
      showAll: "Show All",
      activeSubscription: "Active Subscription",
      unlimitedJobPosting: "Unlimited job posting",
      expires: "Expires",
      expiresNotSet: "Not set",
      freeJobPosts: "Free Job Posts",
      freePostsUsed: "used",
      manageSubscription: "Manage",
      subscriptionBenefits: "Go Unlimited",
      unlimitedPosts: "Unlimited job posts",
      noPlatformFees: "No platform fees",
      prioritySupport: "Priority support",
      upgradeNow: "Upgrade Now",
      subscriptionExpired: "Subscription Expired",
      renewSubscription: "Renew Subscription",
      daysLeft: "days left",
      freePostsRemaining: "Free posts remaining",
      viewAllJobs: "View All Jobs",
      viewLessJobs: "Show Less",
      postNow: "Post Now",
      analytics: "Analytics",
      notifications: "Notifications",
      responseRate: "Response rate",
      viewInsights: "View Insights",
      jobTitle: "Job Title",
      jobDescription: "Description",
      requirements: "Requirements",
      contactInfo: "Contact Information",
      email: "Email",
      phone: "Phone",
      close: "Close",
      viewAllApplications: "View All Applications",
      viewMoreJobs: "View More Jobs",
      limitedTime: "Limited Time",
    },
    hi: {
      welcome: "वापसी पर स्वागत है",
      subtitle: "यहां है आपका भर्ती डैशबोर्ड",
      overview: "अवलोकन",
      upcomingJobs: "आगामी नौकरियां",
      pastJobs: "पिछली नौकरियां",
      applications: "आवेदन",
      totalHires: "कुल भर्ती",
      futureDates: "भविष्य की तारीखें",
      completedExpired: "पूर्ण/समाप्त",
      totalReceived: "कुल प्राप्त",
      completedWork: "पूर्ण कार्य",
      postNewJob: "नई नौकरी पोस्ट करें",
      findWorkers: "योग्य कर्मचारी ढूंढें",
      viewApplications: "आवेदन देखें",
      settings: "सेटिंग्स",
      noUpcomingJobs: "कोई आगामी नौकरी नहीं",
      noJobsDesc: "भविष्य की तारीखों के लिए कर्मचारी ढूंढने के लिए नई नौकरी पोस्ट करें",
      active: "सक्रिय",
      closed: "बंद",
      cancelled: "रद्द",
      location: "स्थान",
      rate: "दर",
      duration: "अवधि",
      date: "तारीख",
      time: "समय",
      status: "स्थिति",
      completed: "पूर्ण",
      worker: "कर्मचारी",
      workers: "कर्मचारी",
      applicationsCount: "आवेदन",
      jobDetails: "नौकरी विवरण",
      viewDetails: "विवरण देखें",
      deleteJob: "नौकरी हटाएं",
      expired: "समाप्त",
      of: "में से",
      areYouSure: "क्या आप सुनिश्चित हैं?",
      deleteConfirmation: "क्या आप निश्चित रूप से हटाना चाहते हैं",
      cannotUndone: "इस क्रिया को पूर्ववत नहीं किया जा सकता",
      success: "सफल",
      deletedSuccessfully: "नौकरी सफलतापूर्वक हटाई गई",
      error: "त्रुटि",
      failedDelete: "नौकरी हटाने में विफल",
      loading: "आपका डैशबोर्ड लोड हो रहा है...",
      refresh: "रिफ्रेश करने के लिए खींचें",
      modalTitle: "पिछली नौकरियां",
      noPastJobs: "कोई पिछली नौकरी नहीं",
      pastJobsDesc: "पूर्ण और समाप्त नौकरियां यहां दिखाई देंगी",
      chooseAction: "एक क्रिया चुनें",
      today: "आज",
      tomorrow: "कल",
      dateNotSet: "तारीख सेट नहीं है",
      showAll: "सभी दिखाएं",
      activeSubscription: "सक्रिय सदस्यता",
      unlimitedJobPosting: "असीमित नौकरी पोस्टिंग",
      expires: "समाप्ति",
      expiresNotSet: "निर्धारित नहीं",
      freeJobPosts: "मुफ्त नौकरी पोस्ट",
      freePostsUsed: "इस्तेमाल किए गए",
      manageSubscription: "प्रबंधित करें",
      subscriptionBenefits: "असीमित पोस्ट पाएं",
      unlimitedPosts: "असीमित नौकरी पोस्ट",
      noPlatformFees: "कोई प्लेटफॉर्म शुल्क नहीं",
      prioritySupport: "प्राथमिकिक सपोर्ट",
      upgradeNow: "अभी अपग्रेड करें",
      subscriptionExpired: "सदस्यता समाप्त",
      renewSubscription: "सदस्यता नवीनीकरण करें",
      daysLeft: "दिन शेष",
      freePostsRemaining: "मुफ्त पोस्ट शेष",
      viewAllJobs: "सभी नौकरियां देखें",
      viewLessJobs: "कम दिखाएं",
      postNow: "अभी पोस्ट करें",
      analytics: "विश्लेषण",
      notifications: "सूचनाएं",
      responseRate: "प्रतिक्रिया दर",
      viewInsights: "इनसाइट्स देखें",
      jobTitle: "नौकरी शीर्षक",
      jobDescription: "विवरण",
      requirements: "आवश्यकताएं",
      contactInfo: "संपर्क जानकारी",
      email: "ईमेल",
      phone: "फोन",
      close: "बंद करें",
      viewAllApplications: "सभी आवेदन देखें",
      viewMoreJobs: "अधिक नौकरियां देखें",
      limitedTime: "सीमित समय",
    }
  };

  const tr = translations[locale] || translations.en;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [resolvedUid])
  );

  const loadPostingStats = async () => {
    try {
      if (!resolvedUid) return;
      const result = await getEmployerJobPostingStats(resolvedUid);
      if (result.success) setPostingStats(result.stats);
    } catch (error) {
      console.error('❌ Error loading posting stats:', error);
    }
  };

  const loadData = async () => {
    try {
      await loadJobs();
      await loadPostingStats();
      await refreshUserProfile?.();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadJobs = async () => {
    try {
      if (!resolvedUid) return;
      const result = await fetchAllEmployerJobs(resolvedUid);
      if (result.success) {
        const futureJobsWithApps = await Promise.all(
          result.futureJobs.map(async (job) => {
            const appsResult = await fetchJobApplications(job.id);
            return { ...job, applications: appsResult.success ? appsResult.applications : [] };
          })
        );
        const pastJobsWithApps = await Promise.all(
          result.pastJobs.map(async (job) => {
            const appsResult = await fetchJobApplications(job.id);
            return { ...job, applications: appsResult.success ? appsResult.applications : [] };
          })
        );
        setFutureJobs(futureJobsWithApps);
        setPastJobs(pastJobsWithApps);
      } else {
        Alert.alert(
          locale === 'hi' ? 'त्रुटि' : 'Error',
          locale === 'hi' ? 'नौकरियां लोड करने में विफल' : 'Failed to load jobs'
        );
      }
    } catch (error) {
      console.error('Exception loading jobs:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getGreetingName = () => {
    if (userProfile?.name) {
      return locale === 'hi'
        ? `${userProfile.name.split(' ')[0]} जी`
        : userProfile.name.split(' ')[0];
    }
    return '';
  };

  const getGreetingMessage = () => {
    const name = getGreetingName();
    if (name) {
      return locale === 'hi' ? `${name}, ${tr.welcome}` : `${tr.welcome}, ${name}`;
    }
    return tr.welcome;
  };

  const isSubscriptionActive = () =>
    userProfile?.subscriptionStatus === 'active' || postingStats?.hasActiveSubscription;

  const getFreePostsUsed = () =>
    postingStats?.freePostsUsed ?? userProfile?.freePostsUsed ?? 0;

  const getFreePostsRemaining = () => {
    if (postingStats?.freePostsRemaining !== undefined) return postingStats.freePostsRemaining;
    const used = userProfile?.freePostsUsed || 0;
    const available = userProfile?.freePostsAvailable || 3;
    return Math.max(0, available - used);
  };

  const formatJobDate = (jobDate, startTime) => {
    if (!jobDate) return locale === 'hi' ? 'तारीख सेट नहीं' : 'Date not set';
    const date = new Date(jobDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) {
      return `${locale === 'hi' ? 'आज' : 'Today'}${startTime ? `, ${startTime}` : ''}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `${locale === 'hi' ? 'कल' : 'Tomorrow'}${startTime ? `, ${startTime}` : ''}`;
    } else {
      return `${date.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN')}${startTime ? `, ${startTime}` : ''}`;
    }
  };

  const getStatusText = (status, completedCount = 0) => {
    if (locale === 'hi') {
      switch (status) {
        case 'open': return 'सक्रिय';
        case 'closed': return 'बंद';
        case 'cancelled': return 'रद्द';
        default: return completedCount > 0 ? 'पूर्ण' : 'समाप्त';
      }
    } else {
      switch (status) {
        case 'open': return 'Active';
        case 'closed': return 'Closed';
        case 'cancelled': return 'Cancelled';
        default: return completedCount > 0 ? 'Completed' : 'Expired';
      }
    }
  };

  const handleDeletePastJob = (job) => {
    Alert.alert(
      `🗑️ ${locale === 'hi' ? 'पिछली नौकरी हटाएं' : 'Delete Past Job'}`,
      `${locale === 'hi' ? 'क्या आप निश्चित रूप से हटाना चाहते हैं' : 'Are you sure you want to delete'} "${job.title}"?`,
      [
        { text: locale === 'hi' ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: locale === 'hi' ? 'हटाएं' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deletePastJob(job.id, resolvedUid);
              if (result.success) {
                Alert.alert('✅ ' + (locale === 'hi' ? 'सफल' : 'Success'), result.message);
                loadData();
              } else {
                Alert.alert('❌ ' + (locale === 'hi' ? 'त्रुटि' : 'Error'), result.error);
              }
            } catch (error) {
              console.error('Error deleting past job:', error);
            }
          }
        }
      ]
    );
  };

  const handleJobCardPress = (job) => { setSelectedJob(job); setShowJobDetails(true); };
  const handleViewAllJobs = () => setShowAllJobs(!showAllJobs);

  const quickActions = [
    {
      id: '1', title: tr.postNewJob, subtitle: tr.findWorkers,
      icon: 'add-business', color: colors.primary,
      action: () => navigation.navigate('PostJob'),
    },
    {
      id: '2', title: tr.viewApplications,
      subtitle: `${futureJobs.reduce((sum, job) => sum + (job.applications?.length || 0), 0)} ${locale === 'hi' ? 'नए' : 'new'}`,
      icon: 'people', color: colors.success,
      action: () => navigation.navigate('Applications'),
    },
    {
      id: '3', title: tr.pastJobs,
      subtitle: `${pastJobs.length} ${locale === 'hi' ? 'पूर्ण' : 'completed'}`,
      icon: 'history', color: colors.warning,
      action: () => setShowPastJobs(true),
    },
    {
      id: '4', title: tr.settings, subtitle: tr.manageSubscription,
      icon: 'settings', color: colors.info,
      action: () => navigation.navigate('EmployerProfile'),
    },
  ];

  const statsData = [
    { id: '1', title: tr.upcomingJobs, value: futureJobs.length, subtitle: tr.futureDates, icon: 'event', color: colors.primary },
    { id: '2', title: tr.totalHires, value: pastJobs.reduce((sum, job) => sum + (job.applications?.filter(app => app.status === 'completed').length || 0), 0), subtitle: tr.completedWork, icon: 'work', color: colors.success },
    { id: '3', title: tr.applications, value: futureJobs.reduce((sum, job) => sum + (job.applications?.length || 0), 0), subtitle: tr.totalReceived, icon: 'description', color: colors.info },
    { id: '4', title: tr.responseRate, value: '92%', subtitle: '24h response', icon: 'trending-up', color: colors.warning },
  ];

  const jobsToShow = showAllJobs ? futureJobs : futureJobs.slice(0, 3);

  // ── The FAB bottom offset must clear the tab bar (60) + system inset.
  // We add a small extra gap (16) so it floats visibly above the tab bar.
  const fabBottom = insets.bottom + 60 + 16;

  // ── Scroll content bottom padding: enough to clear FAB + tab bar + inset
  const scrollPaddingBottom = insets.bottom + 60 + 80;

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{tr.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Fixed Header */}
      <View style={styles.fixedHeader}>
        <GradientView
          colors={[colors.primary, colors.primaryDark]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreetingMessage()}</Text>
              <Text style={styles.subGreeting}>{tr.subtitle} 👋</Text>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('EmployerProfile')}
            >
              <Image
                source={{ uri: userProfile?.photoURL || defaultAvatar }}
                style={styles.avatar}
              />
              {userProfile?.subscriptionStatus === 'active' && (
                <View style={styles.premiumBadge}>
                  <Icon name="star" size={12} color={colors.white} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Subscription / Free Posts Card */}
          <View style={styles.subscriptionCard}>
            {isSubscriptionActive() ? (
              <View style={styles.premiumCard}>
                <View style={styles.premiumCardContent}>
                  <View style={styles.premiumIcon}>
                    <Icon name="workspace-premium" size={24} color={colors.white} />
                  </View>
                  <View style={styles.premiumInfo}>
                    <Text style={styles.premiumTitle}>{tr.activeSubscription}</Text>
                    <Text style={styles.premiumSubtitle}>
                      {tr.unlimitedJobPosting} • {tr.daysLeft}: {postingStats?.subscriptionExpiry
                        ? new Date(postingStats.subscriptionExpiry).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN')
                        : tr.expiresNotSet}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.managePremiumButton}
                  onPress={() => navigation.navigate('Subscription')}
                >
                  <Text style={styles.managePremiumText}>{tr.manageSubscription}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.freePostsCard}>
                <View style={styles.freePostsHeader}>
                  <Icon name="celebration" size={20} color={colors.white} />
                  <Text style={styles.freePostsTitle}>{tr.freeJobPosts}</Text>
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>{tr.limitedTime}</Text>
                  </View>
                </View>
                <View style={styles.progressContainer}>
                  <View style={styles.progressLabels}>
                    <Text style={styles.progressText}>{getFreePostsUsed()} / 3 {tr.freePostsUsed}</Text>
                    <Text style={styles.progressText}>{getFreePostsRemaining()} {tr.freePostsRemaining}</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${Math.min((getFreePostsUsed() / 3) * 100, 100)}%` }]} />
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={() => navigation.navigate('Subscription')}
                >
                  <GradientView
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.upgradeGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Icon name="rocket-launch" size={16} color={colors.white} />
                    <Text style={styles.upgradeButtonText}>{tr.upgradeNow}</Text>
                  </GradientView>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </GradientView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{tr.overview}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EmployerProfile')}>
              <Text style={styles.viewAllText}>{tr.viewInsights}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsGrid}>
            {statsData.map((stat) => (
              <View key={stat.id} style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: stat.color + '20' }]}>
                  <Icon name={stat.icon} size={20} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.title}</Text>
                <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {locale === 'hi' ? 'त्वरित कार्रवाई' : 'Quick Actions'}
            </Text>
          </View>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity key={action.id} style={styles.actionCard} onPress={action.action}>
                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                  <Icon name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subscription Promo */}
        {!isSubscriptionActive() && (
          <TouchableOpacity
            style={styles.subscriptionPromo}
            onPress={() => navigation.navigate('Subscription')}
          >
            <GradientView
              colors={['#667eea', '#764ba2']}
              style={styles.promoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.promoContent}>
                <View style={styles.promoTextContainer}>
                  <Text style={styles.promoTitle}>🎯 {tr.subscriptionBenefits}</Text>
                  <Text style={styles.promoSubtitle}>
                    {tr.unlimitedPosts} • {tr.noPlatformFees} • {tr.prioritySupport}
                  </Text>
                </View>
                <View style={styles.promoPriceContainer}>
                  <Text style={styles.promoPrice}>₹49</Text>
                  <Text style={styles.promoDuration}>/{locale === 'hi' ? 'माह' : 'month'}</Text>
                </View>
              </View>
              <Icon name="arrow-forward" size={20} color={colors.white} style={styles.promoArrow} />
            </GradientView>
          </TouchableOpacity>
        )}

        {/* Upcoming Jobs */}
        <View style={styles.jobsSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>{tr.upcomingJobs}</Text>
              <Text style={styles.sectionSubtitle}>
                {futureJobs.length} {locale === 'hi' ? 'सक्रिय नौकरियां' : 'active jobs'}
              </Text>
            </View>
            {futureJobs.length > 0 && (
              <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAllJobs}>
                <Text style={styles.viewAllButtonText}>
                  {showAllJobs ? tr.viewLessJobs : tr.viewAllJobs}
                </Text>
                <Icon name={showAllJobs ? "expand-less" : "chevron-right"} size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {futureJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="work-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyStateTitle}>{tr.noUpcomingJobs}</Text>
              <Text style={styles.emptyStateSubtitle}>{tr.noJobsDesc}</Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('PostJob')}
              >
                <Icon name="add" size={20} color={colors.white} />
                <Text style={styles.emptyStateButtonText}>{tr.postNewJob}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.jobsList}>
              {jobsToShow.map((job) => (
                <TouchableOpacity key={job.id} style={styles.jobCard} onPress={() => handleJobCardPress(job)}>
                  <View style={styles.jobCardHeader}>
                    <View style={styles.jobTitleContainer}>
                      <Text style={styles.jobTitle}>{job.title}</Text>
                      <View style={[
                        styles.jobStatus,
                        job.status === 'open' && styles.jobStatusActive,
                        job.status === 'closed' && styles.jobStatusCompleted,
                      ]}>
                        <Text style={styles.jobStatusText}>{getStatusText(job.status)}</Text>
                      </View>
                    </View>
                    <Text style={styles.jobSalary}>₹{job.rate}/hr</Text>
                  </View>
                  <View style={styles.jobDetails}>
                    <View style={styles.jobDetail}>
                      <Icon name="location-on" size={14} color={colors.textLight} />
                      <Text style={styles.jobDetailText}>{job.location}</Text>
                    </View>
                    <View style={styles.jobDetail}>
                      <Icon name="access-time" size={14} color={colors.textLight} />
                      <Text style={styles.jobDetailText}>{formatJobDate(job.jobDate, job.startTime)}</Text>
                    </View>
                  </View>
                  <View style={styles.jobFooter}>
                    <View style={styles.applicationsContainer}>
                      <Icon name="people" size={16} color={colors.primary} />
                      <Text style={styles.applicationsCount}>
                        {job.applications?.length || 0} {tr.applicationsCount}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.viewApplicationsButton}
                      onPress={() => {
                        setShowJobDetails(false);
                        navigation.navigate('Applications', { jobId: job.id, jobTitle: job.title });
                      }}
                    >
                      <Text style={styles.viewApplicationsText}>
                        {locale === 'hi' ? 'आवेदन देखें' : 'View Applications'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}

              {futureJobs.length > 3 && !showAllJobs && (
                <TouchableOpacity style={styles.viewMoreJobs} onPress={handleViewAllJobs}>
                  <View style={styles.viewMoreIconContainer}>
                    <Icon name="add" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.viewMoreText}>
                    {locale === 'hi'
                      ? `+ ${futureJobs.length - 3} और नौकरियां देखें`
                      : `+${futureJobs.length - 3} ${tr.viewMoreJobs}`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Post Job Button
          bottom is dynamic: tab bar height (60) + system inset + gap (16)
          so it always floats visibly above the tab bar on every device. */}
      <TouchableOpacity
        style={[styles.floatingButton, { bottom: fabBottom }]}
        onPress={() => navigation.navigate('PostJob')}
      >
        <GradientView
          colors={[colors.primary, colors.primaryDark]}
          style={styles.floatingButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Icon name="add" size={24} color={colors.white} />
          <Text style={styles.floatingButtonText}>
            {isSubscriptionActive()
              ? (locale === 'hi' ? 'नौकरी पोस्ट करें' : 'Post Job')
              : getFreePostsRemaining() > 0
                ? (locale === 'hi' ? 'मुफ्त नौकरी पोस्ट करें' : 'Post Free Job')
                : (locale === 'hi' ? 'नौकरी पोस्ट करें' : 'Post Job')
            }
          </Text>
        </GradientView>
      </TouchableOpacity>

      {/* Job Details Modal */}
      <Modal
        visible={showJobDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowJobDetails(false)}
      >
        <View style={styles.jobDetailsModal}>
          <View style={styles.jobDetailsContent}>
            <View style={styles.jobDetailsHeader}>
              <Text style={styles.jobDetailsTitle}>{tr.jobDetails}</Text>
              <TouchableOpacity style={styles.jobDetailsCloseButton} onPress={() => setShowJobDetails(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {selectedJob && (
              <ScrollView style={styles.jobDetailsScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.jobDetailsCard}>
                  <View style={styles.jobDetailsHeaderRow}>
                    <Text style={styles.jobDetailsJobTitle}>{selectedJob.title}</Text>
                    <Text style={styles.jobDetailsSalary}>₹{selectedJob.rate}/hr</Text>
                  </View>
                  <View style={styles.jobDetailsStatusContainer}>
                    <View style={[styles.jobDetailsStatus, selectedJob.status === 'open' && styles.jobDetailsStatusActive]}>
                      <Text style={styles.jobDetailsStatusText}>{getStatusText(selectedJob.status)}</Text>
                    </View>
                    <Text style={styles.jobDetailsDate}>{formatJobDate(selectedJob.jobDate, selectedJob.startTime)}</Text>
                  </View>
                  <View style={styles.jobDetailsSection}>
                    <View style={styles.jobDetailsRow}>
                      <Icon name="location-on" size={18} color={colors.textLight} />
                      <Text style={styles.jobDetailsLocation}>{selectedJob.location}</Text>
                    </View>
                    <View style={styles.jobDetailsRow}>
                      <Icon name="people" size={18} color={colors.textLight} />
                      <Text style={styles.jobDetailsApplications}>
                        {selectedJob.applications?.length || 0} {tr.applicationsCount}
                      </Text>
                    </View>
                  </View>
                  {selectedJob.description && (
                    <View style={styles.jobDetailsSection}>
                      <Text style={styles.jobDetailsSectionTitle}>{tr.jobDescription}</Text>
                      <Text style={styles.jobDetailsDescription}>{selectedJob.description}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
            <View style={styles.jobDetailsActions}>
              <TouchableOpacity style={styles.jobDetailsCloseBtn} onPress={() => setShowJobDetails(false)}>
                <Text style={styles.jobDetailsCloseBtnText}>{tr.close}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.jobDetailsViewApplicationsBtn}
                onPress={() => {
                  setShowJobDetails(false);
                  navigation.navigate('Applications', { jobId: selectedJob?.id, jobTitle: selectedJob?.title });
                }}
              >
                <Icon name="visibility" size={18} color={colors.white} />
                <Text style={styles.jobDetailsViewApplicationsText}>{tr.viewAllApplications}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Past Jobs Modal */}
      <Modal
        visible={showPastJobs}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPastJobs(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{tr.pastJobs}</Text>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowPastJobs(false)}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={pastJobs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalContent}
            ListEmptyComponent={
              <View style={styles.modalEmptyState}>
                <Icon name="history" size={64} color={colors.textLight} />
                <Text style={styles.modalEmptyStateTitle}>{tr.noPastJobs}</Text>
                <Text style={styles.modalEmptyStateSubtitle}>{tr.pastJobsDesc}</Text>
              </View>
            }
            renderItem={({ item: job }) => (
              <View style={styles.modalJobCard}>
                <View style={styles.modalJobHeader}>
                  <View>
                    <Text style={styles.modalJobTitle}>{job.title}</Text>
                    <Text style={styles.modalJobDate}>{formatJobDate(job.jobDate, job.startTime)}</Text>
                  </View>
                  <Text style={styles.modalJobSalary}>₹{job.rate}/hr</Text>
                </View>
                <View style={styles.modalJobDetails}>
                  <Text style={styles.modalJobLocation}>{job.location}</Text>
                  <Text style={styles.modalJobApplications}>
                    {job.applications?.filter(app => app.status === 'completed').length || 0} {locale === 'hi' ? 'पूर्ण' : 'completed'}
                  </Text>
                </View>
                <View style={styles.modalJobActions}>
                  <TouchableOpacity style={styles.modalDeleteButton} onPress={() => handleDeletePastJob(job)}>
                    <Icon name="delete-outline" size={18} color={colors.error} />
                    <Text style={styles.modalDeleteText}>{tr.deleteJob}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalViewButton}
                    onPress={() => {
                      setShowPastJobs(false);
                      navigation.navigate('Applications', { jobId: job.id, jobTitle: job.title });
                    }}
                  >
                    <Icon name="visibility" size={18} color={colors.primary} />
                    <Text style={styles.modalViewText}>{tr.viewDetails}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: 16, fontSize: 16, color: colors.textSecondary, fontWeight: '500' },
  fixedHeader: { backgroundColor: colors.primary, paddingTop: Platform.OS === 'ios' ? 50 : 40, zIndex: 1000 },
  headerGradient: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 20, fontWeight: '600', color: colors.white, marginBottom: 4 },
  subGreeting: { fontSize: 14, color: 'rgba(255, 255, 255, 0.9)' },
  profileButton: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.white },
  premiumBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: colors.warning, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.white },
  subscriptionCard: { marginTop: 10 },
  premiumCard: { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  premiumCardContent: { flexDirection: 'row', alignItems: 'center' },
  premiumIcon: { marginRight: 12 },
  premiumInfo: { flex: 1 },
  premiumTitle: { fontSize: 16, fontWeight: '600', color: colors.white, marginBottom: 2 },
  premiumSubtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)' },
  managePremiumButton: { backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  managePremiumText: { fontSize: 12, fontWeight: '600', color: colors.white },
  freePostsCard: { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  freePostsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  freePostsTitle: { fontSize: 16, fontWeight: '600', color: colors.white, marginLeft: 8, flex: 1 },
  newBadge: { backgroundColor: colors.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  newBadgeText: { fontSize: 10, fontWeight: '700', color: colors.white },
  progressContainer: { marginBottom: 16 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.9)', fontWeight: '500' },
  progressBar: { height: 6, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.white, borderRadius: 3 },
  upgradeButton: { borderRadius: 12, overflow: 'hidden' },
  upgradeGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  upgradeButtonText: { fontSize: 14, fontWeight: '600', color: colors.white, marginLeft: 8 },
  scrollView: { flex: 1 },
  // NOTE: paddingBottom is applied dynamically via inline style using insets
  scrollContent: { paddingTop: 20 },
  statsSection: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  viewAllText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { backgroundColor: colors.white, padding: 16, borderRadius: 16, flex: 1, minWidth: (width - 52) / 2, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  statIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  statLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  statSubtitle: { fontSize: 12, color: colors.textSecondary },
  actionsSection: { paddingHorizontal: 20, marginBottom: 24 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { backgroundColor: colors.white, padding: 16, borderRadius: 16, flex: 1, minWidth: (width - 52) / 2, alignItems: 'center', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionTitle: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 4 },
  actionSubtitle: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  subscriptionPromo: { marginHorizontal: 20, marginBottom: 24, borderRadius: 16, overflow: 'hidden', shadowColor: '#764ba2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5 },
  promoGradient: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promoContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  promoTextContainer: { flex: 1 },
  promoTitle: { fontSize: 18, fontWeight: '700', color: colors.white, marginBottom: 4 },
  promoSubtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.9)' },
  promoPriceContainer: { flexDirection: 'row', alignItems: 'baseline', marginLeft: 16 },
  promoPrice: { fontSize: 28, fontWeight: '800', color: colors.white },
  promoDuration: { fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', marginLeft: 2 },
  promoArrow: { marginLeft: 12 },
  jobsSection: { paddingHorizontal: 20 },
  sectionSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  viewAllButton: { flexDirection: 'row', alignItems: 'center' },
  viewAllButtonText: { fontSize: 14, fontWeight: '600', color: colors.primary, marginRight: 4 },
  emptyState: { backgroundColor: colors.white, padding: 40, borderRadius: 16, alignItems: 'center', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 8 },
  emptyStateSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyStateButton: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyStateButtonText: { color: colors.white, fontSize: 16, fontWeight: '600', marginLeft: 8 },
  jobsList: { gap: 12 },
  jobCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  jobCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  jobTitleContainer: { flex: 1, marginRight: 12 },
  jobTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
  jobStatus: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  jobStatusActive: { backgroundColor: colors.success + '20' },
  jobStatusCompleted: { backgroundColor: colors.warning + '20' },
  jobStatusText: { fontSize: 10, fontWeight: '700', color: colors.text },
  jobSalary: { fontSize: 18, fontWeight: '700', color: colors.primary },
  jobDetails: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  jobDetail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  jobDetailText: { fontSize: 13, color: colors.textSecondary },
  jobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight },
  applicationsContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  applicationsCount: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  viewApplicationsButton: { backgroundColor: colors.primary + '10', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  viewApplicationsText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  viewMoreJobs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight, borderStyle: 'dashed' },
  viewMoreIconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '10', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  viewMoreText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  // bottom is set dynamically via inline style — do NOT set it here
  floatingButton: { position: 'absolute', right: 20, borderRadius: 25, overflow: 'hidden', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  floatingButtonGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  floatingButtonText: { color: colors.white, fontSize: 14, fontWeight: '600', marginLeft: 8 },
  jobDetailsModal: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  jobDetailsContent: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.9 },
  jobDetailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  jobDetailsTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  jobDetailsCloseButton: { padding: 4 },
  jobDetailsScroll: { padding: 20 },
  jobDetailsCard: { backgroundColor: colors.white, borderRadius: 16, padding: 20, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  jobDetailsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  jobDetailsJobTitle: { fontSize: 20, fontWeight: '700', color: colors.text, flex: 1, marginRight: 12 },
  jobDetailsSalary: { fontSize: 22, fontWeight: '700', color: colors.primary },
  jobDetailsStatusContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  jobDetailsStatus: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.success + '20' },
  jobDetailsStatusActive: { backgroundColor: colors.success + '20' },
  jobDetailsStatusText: { fontSize: 12, fontWeight: '700', color: colors.text },
  jobDetailsDate: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  jobDetailsSection: { marginBottom: 24 },
  jobDetailsSectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  jobDetailsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  jobDetailsLocation: { fontSize: 14, color: colors.textSecondary, marginLeft: 8, flex: 1 },
  jobDetailsApplications: { fontSize: 14, color: colors.textSecondary, marginLeft: 8 },
  jobDetailsDescription: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  jobDetailsActions: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: colors.borderLight, gap: 12 },
  jobDetailsCloseBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.borderLight, alignItems: 'center' },
  jobDetailsCloseBtnText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  jobDetailsViewApplicationsBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, gap: 8 },
  jobDetailsViewApplicationsText: { fontSize: 16, fontWeight: '600', color: colors.white },
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.white, paddingTop: 50 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalCloseButton: { padding: 4 },
  modalContent: { padding: 20, paddingBottom: 40 },
  modalEmptyState: { alignItems: 'center', padding: 48 },
  modalEmptyStateTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 8 },
  modalEmptyStateSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  modalJobCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  modalJobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  modalJobTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  modalJobDate: { fontSize: 12, color: colors.textSecondary },
  modalJobSalary: { fontSize: 18, fontWeight: '700', color: colors.primary },
  modalJobDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  modalJobLocation: { fontSize: 14, color: colors.textSecondary },
  modalJobApplications: { fontSize: 14, fontWeight: '600', color: colors.success },
  modalJobActions: { flexDirection: 'row', gap: 12 },
  modalDeleteButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.error + '10', padding: 12, borderRadius: 8, gap: 8 },
  modalDeleteText: { fontSize: 14, fontWeight: '600', color: colors.error },
  modalViewButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '10', padding: 12, borderRadius: 8, gap: 8 },
  modalViewText: { fontSize: 14, fontWeight: '600', color: colors.primary },
});