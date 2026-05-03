// src/screens/worker/MyJobsScreen.js - FIXED: null user error
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useJob } from '../../context/JobContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../constants/colors';
import { fetchWorkerApplications } from '../../services/database';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const MyJobsScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [myApplications, setMyApplications] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const { jobs, fetchJobs } = useJob();
  // ── FIX: pull resolvedUid just like WorkerHomeScreen does ──────────────────
  const { user, userProfile, resolvedUid } = useAuth();
  const { locale } = useLanguage();

  // Translations for this screen
  const translations = {
    en: {
      greeting: 'Hello,',
      applications: 'Applications',
      statsTitle: 'Filter Applications',
      allApplications: 'All Applications',
      acceptedApplications: 'Accepted Applications',
      pendingApplications: 'Pending Applications',
      rejectedApplications: 'Rejected Applications',
      accepted: 'Accepted',
      pending: 'Pending',
      rejected: 'Rejected',
      all: 'All',
      total: 'Total',
      appliedOn: 'Applied',
      perDay: '/day',
      perHour: '/hour',
      congratulations: "Congratulations! You've been selected for this job.",
      beingReviewed: 'Your application is being reviewed by the employer',
      keepTrying: 'Keep trying! More opportunities are waiting for you.',
      trackJob: 'Track Job',
      location: 'Location',
      chat: 'Chat',
      jobDetails: 'Job Details',
      findSimilarJobs: 'Find Similar Jobs',
      noApplications: 'No applications yet',
      noFilteredApplications: 'No {filter} applications',
      startApplying: 'Start applying to jobs and track them here',
      tryDifferentFilter: 'Try selecting a different filter',
      browseJobs: 'Browse Jobs',
      readyToStart: 'Ready to Start',
      onTheWay: 'On the Way',
      reachedLocation: 'Reached Location',
      workStarted: 'Work Started',
      workCompleted: 'Work Completed',
      locationNotAvailable: 'Location Not Available',
      locationNotShared: 'The employer has not shared their location yet.',
      chatNotAvailable: 'Chat Not Available',
      chatNotEnabled: 'Chat is not yet enabled for this application.',
      trackingNotAvailable: 'Not Available',
      trackingForAccepted: 'Job tracking is only available for accepted applications.',
      errorLoading: 'Error loading applications',
      failedToLoad: 'Failed to load applications',
      currentStatus: 'Current status: {status}',
      loading: 'Loading...',
      today: 'Today',
      yesterday: 'Yesterday',
      recent: 'Recent',
      notLoggedIn: 'Please log in to view your applications.',
    },
    hi: {
      greeting: 'नमस्ते,',
      applications: 'आवेदन',
      statsTitle: 'आवेदन फ़िल्टर करें',
      allApplications: 'सभी आवेदन',
      acceptedApplications: 'स्वीकृत आवेदन',
      pendingApplications: 'लंबित आवेदन',
      rejectedApplications: 'अस्वीकृत आवेदन',
      accepted: 'स्वीकृत',
      pending: 'लंबित',
      rejected: 'अस्वीकृत',
      all: 'सभी',
      total: 'कुल',
      appliedOn: 'आवेदन किया',
      perDay: '/दिन',
      perHour: '/घंटा',
      congratulations: 'बधाई हो! आपको इस नौकरी के लिए चुना गया है।',
      beingReviewed: 'आपका आवेदन नियोक्ता द्वारा समीक्षा के लिए है',
      keepTrying: 'कोशिश जारी रखें! आपके लिए और अवसर इंतज़ार कर रहे हैं।',
      trackJob: 'नौकरी ट्रैक करें',
      location: 'स्थान',
      chat: 'चैट',
      jobDetails: 'नौकरी विवरण',
      findSimilarJobs: 'समान नौकरियां खोजें',
      noApplications: 'अभी तक कोई आवेदन नहीं',
      noFilteredApplications: 'कोई {filter} आवेदन नहीं',
      startApplying: 'नौकरियों के लिए आवेदन करना शुरू करें और उन्हें यहां ट्रैक करें',
      tryDifferentFilter: 'एक अलग फ़िल्टर चुनने का प्रयास करें',
      browseJobs: 'नौकरियां ब्राउज़ करें',
      readyToStart: 'शुरुआत के लिए तैयार',
      onTheWay: 'रास्ते में',
      reachedLocation: 'स्थान पर पहुंचे',
      workStarted: 'काम शुरू हुआ',
      workCompleted: 'काम पूरा हुआ',
      locationNotAvailable: 'स्थान उपलब्ध नहीं',
      locationNotShared: 'नियोक्ता ने अभी तक अपना स्थान साझा नहीं किया है।',
      chatNotAvailable: 'चैट उपलब्ध नहीं',
      chatNotEnabled: 'चैट अभी तक इस आवेदन के लिए सक्षम नहीं है।',
      trackingNotAvailable: 'उपलब्ध नहीं',
      trackingForAccepted: 'नौकरी ट्रैकिंग केवल स्वीकृत आवेदनों के लिए उपलब्ध है।',
      errorLoading: 'आवेदन लोड करने में त्रुटि',
      failedToLoad: 'आवेदन लोड करने में विफल',
      currentStatus: 'वर्तमान स्थिति: {status}',
      loading: 'लोड हो रहा है...',
      today: 'आज',
      yesterday: 'कल',
      recent: 'हालिया',
      notLoggedIn: 'अपने आवेदन देखने के लिए कृपया लॉग इन करें।',
    },
  };

  const tr = translations[locale] || translations.en;

  // ── Load applications whenever the screen is focused ──────────────────────
  useFocusEffect(
    useCallback(() => {
      if (resolvedUid) {
        loadApplications();
      } else {
        // Auth context is still initialising — wait a tick and retry
        const timer = setTimeout(() => {
          if (resolvedUid) loadApplications();
          else setLoading(false); // give up gracefully
        }, 1500);
        return () => clearTimeout(timer);
      }
    }, [resolvedUid])
  );

  const loadApplications = async () => {
    // ── CORE FIX: guard against null/undefined uid ─────────────────────────
    const uid = resolvedUid || user?.uid;
    if (!uid) {
      console.warn('MyJobsScreen: no uid available, skipping load');
      setLoading(false);
      return;
    }

    try {
      const applicationsResult = await fetchWorkerApplications(uid);
      if (applicationsResult.success) {
        setMyApplications(applicationsResult.applications);
      } else {
        console.error('fetchWorkerApplications failed:', applicationsResult.error);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      Alert.alert(
        locale === 'hi' ? 'त्रुटि' : 'Error',
        tr.failedToLoad
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  const getFilteredApplications = () => {
    if (selectedFilter === 'all') return myApplications;
    return myApplications.filter(app => app.status === selectedFilter);
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'accepted':
        return {
          color: colors.success,
          bg: colors.successLight,
          icon: '✓',
          text: tr.accepted,
          emoji: '🎉',
        };
      case 'rejected':
        return {
          color: colors.error,
          bg: colors.errorLight,
          icon: '✕',
          text: tr.rejected,
          emoji: '😔',
        };
      case 'pending':
        return {
          color: colors.warning,
          bg: colors.warningLight,
          icon: '⏱',
          text: tr.pending,
          emoji: '⏳',
        };
      default:
        return {
          color: colors.textSecondary,
          bg: colors.gray200,
          icon: '•',
          text: status,
          emoji: '📋',
        };
    }
  };

  const getStatsData = () => {
    const total = myApplications.length;
    const accepted = myApplications.filter(a => a.status === 'accepted').length;
    const pending = myApplications.filter(a => a.status === 'pending').length;
    const rejected = myApplications.filter(a => a.status === 'rejected').length;
    return { total, accepted, pending, rejected };
  };

  const getFilterLabel = (filter) => {
    switch (filter) {
      case 'all': return tr.all;
      case 'accepted': return tr.accepted;
      case 'pending': return tr.pending;
      case 'rejected': return tr.rejected;
      default: return filter;
    }
  };

  const getFilterCountLabel = (filter) => {
    const stats = getStatsData();
    const count = stats[filter === 'all' ? 'total' : filter];
    return count > 0 ? count : 0;
  };

  const formatApplicationDate = (date) => {
    if (!date?.toDate) return tr.recent;
    const appliedDate = date.toDate();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (appliedDate.toDateString() === today.toDateString()) {
      return `${tr.today}, ${appliedDate.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN')}`;
    } else if (appliedDate.toDateString() === yesterday.toDateString()) {
      return `${tr.yesterday}, ${appliedDate.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN')}`;
    } else {
      return `${tr.appliedOn} ${appliedDate.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN')}`;
    }
  };

  const stats = getStatsData();
  const filteredApplications = getFilteredApplications();

  // ── Sub-components ─────────────────────────────────────────────────────────

  const FilterButton = ({ label, value, count }) => (
    <TouchableOpacity
      style={[styles.filterButton, selectedFilter === value && styles.filterButtonActive]}
      onPress={() => setSelectedFilter(value)}
    >
      <Text style={[styles.filterButtonText, selectedFilter === value && styles.filterButtonTextActive]}>
        {label}
      </Text>
      {count > 0 && (
        <View style={[styles.filterBadge, selectedFilter === value && styles.filterBadgeActive]}>
          <Text style={[styles.filterBadgeText, selectedFilter === value && styles.filterBadgeTextActive]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const StatCard = ({ label, value, color, icon }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const handleViewLocation = (application) => {
    if (application.locationShared) {
      navigation.navigate('JobLocation', { application, isEmployer: false });
    } else {
      Alert.alert(tr.locationNotAvailable, tr.locationNotShared);
    }
  };

  const handleOpenChat = (application) => {
    if (application.chatEnabled) {
      navigation.navigate('ChatScreen', {
        applicationId: application.id,
        otherUser: application.employerId,
        jobTitle: application.jobTitle,
        otherUserName: application.companyName || 'Employer',
      });
    } else {
      Alert.alert(tr.chatNotAvailable, tr.chatNotEnabled);
    }
  };

  const handleTrackJob = (application) => {
    if (application.status === 'accepted') {
      navigation.navigate('JobTracking', { applicationId: application.id });
    } else {
      Alert.alert(tr.trackingNotAvailable, tr.trackingForAccepted);
    }
  };

  const getJourneyStatusDisplay = (application) => {
    if (application.status !== 'accepted') return null;
    const journeyStatus = application.journeyStatus || 'accepted';
    const statusConfigs = {
      accepted:  { text: tr.readyToStart,    color: colors.info,    icon: '📋' },
      onTheWay:  { text: tr.onTheWay,        color: colors.warning, icon: '🚗' },
      reached:   { text: tr.reachedLocation, color: colors.info,    icon: '📍' },
      started:   { text: tr.workStarted,     color: colors.primary, icon: '▶️' },
      completed: { text: tr.workCompleted,   color: colors.success, icon: '✅' },
    };
    const config = statusConfigs[journeyStatus] || statusConfigs.accepted;
    return (
      <View style={[styles.journeyStatus, { backgroundColor: config.color + '20' }]}>
        <Text style={styles.journeyStatusIcon}>{config.icon}</Text>
        <Text style={[styles.journeyStatusText, { color: config.color }]}>{config.text}</Text>
      </View>
    );
  };

  const getApplicationsTitle = () => {
    switch (selectedFilter) {
      case 'all':      return tr.allApplications;
      case 'accepted': return tr.acceptedApplications;
      case 'pending':  return tr.pendingApplications;
      case 'rejected': return tr.rejectedApplications;
      default:         return tr.allApplications;
    }
  };

  const getEmptyStateText = () => {
    if (selectedFilter === 'all') {
      return { title: tr.noApplications, subtitle: tr.startApplying, showCTA: true };
    }
    return {
      title: tr.noFilteredApplications.replace('{filter}', getFilterLabel(selectedFilter)),
      subtitle: tr.tryDifferentFilter,
      showCTA: false,
    };
  };

  // ── Not logged in guard ────────────────────────────────────────────────────
  if (!loading && !resolvedUid && !user?.uid) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.greeting}>{tr.greeting}</Text>
            <Text style={styles.userName}>👋</Text>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.emptyText}>{tr.notLoggedIn}</Text>
        </View>
      </View>
    );
  }

  const emptyState = getEmptyStateText();

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>{tr.greeting}</Text>
          <Text style={styles.userName}>
            {userProfile?.name || (locale === 'hi' ? 'मजदूर' : 'Worker')} 👋
          </Text>
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.headerStatsText}>{stats.total}</Text>
          <Text style={styles.headerStatsLabel}>{tr.applications}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <StatCard label={tr.accepted} value={stats.accepted} color={colors.success} icon="✓" />
          <StatCard label={tr.pending}  value={stats.pending}  color={colors.warning} icon="⏱" />
          <StatCard label={tr.total}    value={stats.total}    color={colors.primary} icon="📊" />
        </View>

        {/* Filter Buttons */}
        <View style={styles.filtersSection}>
          <Text style={styles.sectionTitle}>{tr.statsTitle}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            <FilterButton label={tr.all}      value="all"      count={getFilterCountLabel('all')} />
            <FilterButton label={tr.accepted} value="accepted" count={getFilterCountLabel('accepted')} />
            <FilterButton label={tr.pending}  value="pending"  count={getFilterCountLabel('pending')} />
            <FilterButton label={tr.rejected} value="rejected" count={getFilterCountLabel('rejected')} />
          </ScrollView>
        </View>

        {/* Applications List */}
        <View style={styles.applicationsSection}>
          <Text style={styles.sectionTitle}>{getApplicationsTitle()}</Text>

          {filteredApplications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>
                {selectedFilter === 'all' ? '📋' : getStatusConfig(selectedFilter).emoji}
              </Text>
              <Text style={styles.emptyText}>{emptyState.title}</Text>
              <Text style={styles.emptySubtext}>{emptyState.subtitle}</Text>
              {emptyState.showCTA && (
                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={() => navigation.navigate('WorkerHome')}
                >
                  <Text style={styles.ctaButtonText}>{tr.browseJobs}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredApplications.map((application) => {
              const statusConfig = getStatusConfig(application.status);
              return (
                <View key={application.id} style={styles.applicationCard}>
                  {/* Card Header */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('JobDetails', { jobId: application.jobId })}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                        <View style={styles.cardHeaderText}>
                          <Text style={styles.jobTitle} numberOfLines={1}>
                            {application.jobTitle}
                          </Text>
                          <Text style={styles.companyName} numberOfLines={1}>
                            {application.companyName}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                          {statusConfig.icon} {statusConfig.text}
                        </Text>
                      </View>
                    </View>

                    {/* Journey Status for Accepted Jobs */}
                    {application.status === 'accepted' && getJourneyStatusDisplay(application)}

                    {/* Card Details */}
                    <View style={styles.cardDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailIcon}>📅</Text>
                        <Text style={styles.detailText}>
                          {formatApplicationDate(application.appliedAt)}
                        </Text>
                      </View>
                      {application.salary && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailIcon}>💰</Text>
                          <Text style={styles.detailText}>₹{application.salary}{tr.perDay}</Text>
                        </View>
                      )}
                      {application.rate && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailIcon}>💰</Text>
                          <Text style={styles.detailText}>₹{application.rate}{tr.perHour}</Text>
                        </View>
                      )}
                      {application.hourlyRate && !application.rate && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailIcon}>💰</Text>
                          <Text style={styles.detailText}>₹{application.hourlyRate}{tr.perHour}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Status-specific Actions */}
                  {application.status === 'accepted' && (
                    <View style={styles.acceptedSection}>
                      <View style={styles.congratsBox}>
                        <Text style={styles.congratsEmoji}>🎉</Text>
                        <Text style={styles.congratsText}>
                          {tr.congratulations}
                          {application.journeyStatus
                            ? ` ${tr.currentStatus.replace('{status}', application.journeyStatus)}`
                            : ''}
                        </Text>
                      </View>

                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.trackingButton]}
                          onPress={() => handleTrackJob(application)}
                        >
                          <Text style={styles.actionButtonIcon}>📱</Text>
                          <Text style={styles.actionButtonLabel}>{tr.trackJob}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionButton, styles.locationButton]}
                          onPress={() => handleViewLocation(application)}
                        >
                          <Text style={styles.actionButtonIcon}>📍</Text>
                          <Text style={styles.actionButtonLabel}>{tr.location}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionButton, styles.chatButton]}
                          onPress={() => handleOpenChat(application)}
                        >
                          <Text style={styles.actionButtonIcon}>💬</Text>
                          <Text style={styles.actionButtonLabel}>{tr.chat}</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.secondaryActionsRow}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.detailsButton]}
                          onPress={() =>
                            navigation.navigate('JobDetails', { jobId: application.jobId })
                          }
                        >
                          <Text style={styles.actionButtonIcon}>📋</Text>
                          <Text style={styles.actionButtonLabel}>{tr.jobDetails}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {application.status === 'pending' && (
                    <View style={styles.pendingSection}>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoIcon}>⏳</Text>
                        <Text style={styles.infoText}>{tr.beingReviewed}</Text>
                      </View>
                    </View>
                  )}

                  {application.status === 'rejected' && (
                    <View style={styles.rejectedSection}>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoIcon}>💼</Text>
                        <Text style={styles.infoText}>{tr.keepTrying}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => navigation.navigate('WorkerHome')}
                      >
                        <Text style={styles.secondaryButtonText}>{tr.findSimilarJobs}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.bottomSpacing} />
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
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
    marginBottom: 4,
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerStats: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 70,
  },
  headerStatsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerStatsLabel: {
    fontSize: 11,
    color: colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filtersSection: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  filterBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
    minWidth: 24,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  filterBadgeTextActive: {
    color: colors.white,
  },
  applicationsSection: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  applicationCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  journeyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  journeyStatusIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  journeyStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  acceptedSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  congratsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  congratsEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  congratsText: {
    flex: 1,
    fontSize: 14,
    color: colors.successText,
    fontWeight: '600',
    lineHeight: 20,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
  },
  trackingButton: {
    backgroundColor: colors.primary + '20',
  },
  locationButton: {
    backgroundColor: (colors.info || '#3b82f6') + '20',
  },
  chatButton: {
    backgroundColor: colors.warning + '20',
  },
  detailsButton: {
    backgroundColor: colors.gray200 || '#e5e7eb',
  },
  actionButtonIcon: {
    fontSize: 20,
  },
  actionButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  pendingSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rejectedSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100 || '#f3f4f6',
    padding: 12,
    borderRadius: 12,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    lineHeight: 18,
  },
  secondaryButton: {
    backgroundColor: colors.primary + '15',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    backgroundColor: colors.white,
    borderRadius: 16,
    marginTop: 8,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.4,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  ctaButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 24,
  },
});

export default MyJobsScreen;