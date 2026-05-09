// src/screens/employer/ApplicationsScreen.js - REVAMPED UI with status tabs
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFocusEffect } from '@react-navigation/native';
import {
  updateApplicationStatus,
  fetchJobApplications,
  fetchEmployerJobs,
} from '../../services/database';
import { colors } from '../../constants/colors';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        '#F4F6FB',
  white:     '#FFFFFF',
  primary:   '#4F63D2',
  success:   '#16A34A',
  warning:   '#D97706',
  error:     '#DC2626',
  text:      '#111827',
  sub:       '#6B7280',
  border:    '#E5E7EB',
  muted:     '#9CA3AF',
  tag_pend:  '#FEF3C7',
  tag_acc:   '#D1FAE5',
  tag_rej:   '#FEE2E2',
  tag_done:  '#DBEAFE',
  tag_pay:   '#FEF9C3',
};

const SHADOW = {
  shadowColor: '#1A1D2E',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

const ApplicationsScreen = ({ route, navigation }) => {
  const { jobId: routeJobId } = route.params || {};
  const { user, userProfile, resolvedUid } = useAuth();
  const { locale } = useLanguage();

  const [applications, setApplications]         = useState([]);
  const [jobs, setJobs]                         = useState([]);
  const [selectedJobId, setSelectedJobId]       = useState(routeJobId || null);
  const [loading, setLoading]                   = useState(true);
  const [showJobSelector, setShowJobSelector]   = useState(!routeJobId);
  const [processingId, setProcessingId]         = useState(null);
  const [activeTab, setActiveTab]               = useState('all');

  const uid = resolvedUid || user?.uid || userProfile?.uid || null;

  const tr = {
    en: {
      back: 'Back',
      applications: 'Applications',
      selectJob: 'Select Job',
      loadingApplications: 'Loading applications…',
      selectJobToView: 'Select a job to view its applications',
      noJobsWithApplications: 'No applications yet',
      noJobsDesc: 'Applications will appear once workers apply to your jobs',
      noApplicationsYet: 'No applications here',
      noApplicationsDesc: 'Switch tabs or wait for workers to apply',
      applicationAccepted: 'Application accepted! Location shared and chat enabled.',
      locationPermissionRequired: 'Location Permission Required',
      locationPermissionDesc: 'We need your location to share with the worker.',
      success: 'Success',
      error: 'Error',
      failedToLoad: 'Failed to load',
      applicationRejected: 'Application rejected.',
      failedToAccept: 'Failed to accept application.',
      failedToReject: 'Failed to reject application.',
      pleaseTryAgain: 'Please try again.',
      accept: 'Accept',
      reject: 'Reject',
      trackJob: 'Track Job',
      processPayment: 'Process Payment',
      viewLocation: 'View Location',
      openChat: 'Open Chat',
      rateWorker: 'Rate Worker',
      noUserFound: 'Please log in to view applications.',
      tabs: { all: 'All', pending: 'Pending', accepted: 'Active', completed: 'Done', rejected: 'Rejected' },
      status: {
        pending:         '⏳ Pending',
        accepted:        '✅ Accepted',
        rejected:        '❌ Rejected',
        completed:       '🏁 Completed',
        awaiting_payment:'💰 Pay Required',
      },
      applied: 'Applied',
      workerContact: 'Contact Worker',
      name: 'Name',
      phone: 'Phone',
      contactNote: 'Contact the worker to coordinate job details.',
      jobCompleted: 'Job Completed',
      payment: 'Payment',
      amount: 'Amount',
      paid: 'Paid',
      youRated: 'You rated',
      stars: 'stars',
    },
    hi: {
      back: 'पीछे',
      applications: 'आवेदन',
      selectJob: 'नौकरी चुनें',
      loadingApplications: 'आवेदन लोड हो रहे हैं…',
      selectJobToView: 'आवेदन देखने के लिए नौकरी चुनें',
      noJobsWithApplications: 'अभी तक कोई आवेदन नहीं',
      noJobsDesc: 'जब कर्मचारी आवेदन करेंगे तो यहाँ दिखेगा',
      noApplicationsYet: 'यहाँ कोई आवेदन नहीं',
      noApplicationsDesc: 'टैब बदलें या प्रतीक्षा करें',
      applicationAccepted: 'आवेदन स्वीकृत! स्थान साझा किया गया।',
      locationPermissionRequired: 'स्थान अनुमति आवश्यक',
      locationPermissionDesc: 'कर्मचारी के साथ स्थान साझा करने के लिए आवश्यक।',
      success: 'सफल',
      error: 'त्रुटि',
      failedToLoad: 'लोड विफल',
      applicationRejected: 'आवेदन अस्वीकृत।',
      failedToAccept: 'स्वीकार करने में विफल।',
      failedToReject: 'अस्वीकार करने में विफल।',
      pleaseTryAgain: 'पुनः प्रयास करें।',
      accept: 'स्वीकार',
      reject: 'अस्वीकार',
      trackJob: 'नौकरी ट्रैक करें',
      processPayment: 'भुगतान करें',
      viewLocation: 'स्थान देखें',
      openChat: 'चैट खोलें',
      rateWorker: 'रेटिंग दें',
      noUserFound: 'आवेदन देखने के लिए लॉग इन करें।',
      tabs: { all: 'सभी', pending: 'लंबित', accepted: 'सक्रिय', completed: 'पूर्ण', rejected: 'अस्वीकृत' },
      status: {
        pending:         '⏳ लंबित',
        accepted:        '✅ स्वीकृत',
        rejected:        '❌ अस्वीकृत',
        completed:       '🏁 पूर्ण',
        awaiting_payment:'💰 भुगतान बाकी',
      },
      applied: 'आवेदन',
      workerContact: 'कर्मचारी से संपर्क',
      name: 'नाम',
      phone: 'फोन',
      contactNote: 'नौकरी के विवरण के लिए संपर्क करें।',
      jobCompleted: 'नौकरी पूर्ण',
      payment: 'भुगतान',
      amount: 'राशि',
      paid: 'भुगतान हुआ',
      youRated: 'आपने रेट किया',
      stars: 'स्टार',
    },
  }[locale] || { ...{} };
  // fallback merge
  const t = { ...(tr.en || {}), ...tr };

  // ── Focus reload ─────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (!uid) { setLoading(false); return; }
      if (routeJobId)       loadApplications(routeJobId);
      else if (selectedJobId) loadApplications(selectedJobId);
      else                  loadEmployerJobs();
    }, [uid, routeJobId, selectedJobId])
  );

  useEffect(() => {
    if (routeJobId && routeJobId !== selectedJobId) {
      setSelectedJobId(routeJobId);
      setShowJobSelector(false);
      if (uid) loadApplications(routeJobId);
    }
  }, [routeJobId]);

  // ── Data fetchers ─────────────────────────────────────────────────────────
  const loadEmployerJobs = async () => {
    try {
      setLoading(true);
      if (!uid) { setLoading(false); return; }
      const result = await fetchEmployerJobs(uid);
      if (result.success) {
        const jobsWithApps = [];
        for (const job of result.jobs) {
          const appsResult = await fetchJobApplications(job.id);
          if (appsResult.success && appsResult.applications.length > 0)
            jobsWithApps.push({ ...job, applications: appsResult.applications });
        }
        setJobs(jobsWithApps);
      } else {
        Alert.alert(t.error, `${t.failedToLoad}: ${result.error}`);
      }
    } catch { Alert.alert(t.error, t.failedToLoad); }
    finally  { setLoading(false); }
  };

  const loadApplications = async (targetJobId) => {
    if (!targetJobId) { setShowJobSelector(true); await loadEmployerJobs(); return; }
    try {
      setLoading(true);
      const result = await fetchJobApplications(targetJobId);
      if (result.success) {
        setApplications(result.applications);
        setSelectedJobId(targetJobId);
        setShowJobSelector(false);
      } else {
        Alert.alert(t.error, result.error || t.failedToLoad);
      }
    } catch { Alert.alert(t.error, t.failedToLoad); }
    finally  { setLoading(false); }
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAccept = async (application) => {
    setProcessingId(application.id);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t.locationPermissionRequired, t.locationPermissionDesc);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      const address = geo.length > 0
        ? `${geo[0].name || ''} ${geo[0].street || ''}, ${geo[0].city || ''}, ${geo[0].region || ''}`.trim()
        : userProfile?.location || 'Work Location';
      const locationData = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, address, sharedAt: new Date().toISOString() };
      const result = await updateApplicationStatus(application.id, 'accepted', locationData);
      if (result.success) {
        Alert.alert(t.success, t.applicationAccepted);
        await loadApplications(selectedJobId);
      } else {
        Alert.alert(t.error, result.error || t.failedToAccept);
      }
    } catch { Alert.alert(t.error, `${t.failedToAccept} ${t.pleaseTryAgain}`); }
    finally  { setProcessingId(null); }
  };

  const handleReject = async (applicationId) => {
    try {
      const result = await updateApplicationStatus(applicationId, 'rejected');
      if (result.success) {
        Alert.alert(t.success, t.applicationRejected);
        await loadApplications(selectedJobId);
      } else {
        Alert.alert(t.error, result.error || t.failedToReject);
      }
    } catch { Alert.alert(t.error, t.failedToReject); }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatDate = (date) => {
    if (!date) return '';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return ''; }
  };

  const getStatusMeta = (app) => {
    const s = app.status;
    if (s === 'completed')        return { label: t.status?.completed || '🏁 Completed',       bg: C.tag_done,  text: '#1D4ED8' };
    if (s === 'awaiting_payment') return { label: t.status?.awaiting_payment || '💰 Pay Required', bg: C.tag_pay,   text: '#B45309' };
    if (s === 'accepted')         return { label: t.status?.accepted || '✅ Accepted',           bg: C.tag_acc,   text: '#15803D' };
    if (s === 'rejected')         return { label: t.status?.rejected || '❌ Rejected',           bg: C.tag_rej,   text: '#B91C1C' };
    return                               { label: t.status?.pending  || '⏳ Pending',            bg: C.tag_pend,  text: '#92400E' };
  };

  const getJourneyLabel = (js) => {
    switch (js) {
      case 'onTheWay':  return '🚗 On the Way';
      case 'reached':   return '📍 Arrived';
      case 'started':   return '⚡ Working';
      case 'completed': return '✅ Work Done';
      default:          return '';
    }
  };

  // ── Tab filtering ─────────────────────────────────────────────────────────
  const TAB_KEYS   = ['all', 'pending', 'accepted', 'completed', 'rejected'];
  const tabLabels  = t.tabs || { all: 'All', pending: 'Pending', accepted: 'Active', completed: 'Done', rejected: 'Rejected' };

  const filterApps = (apps) => {
    if (activeTab === 'all') return apps;
    if (activeTab === 'accepted') return apps.filter(a => a.status === 'accepted' || a.status === 'awaiting_payment');
    if (activeTab === 'completed') return apps.filter(a => a.status === 'completed');
    if (activeTab === 'rejected')  return apps.filter(a => a.status === 'rejected');
    return apps.filter(a => a.status === activeTab);
  };

  const tabCount = (key) => {
    if (key === 'all') return applications.length;
    if (key === 'accepted') return applications.filter(a => a.status === 'accepted' || a.status === 'awaiting_payment').length;
    return applications.filter(a => a.status === key).length;
  };

  const visibleApps = filterApps(applications);

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!loading && !uid) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor={C.white} />
        <AppHeader title={t.applications} onBack={() => navigation.goBack()} left="← Back" />
        <View style={styles.center}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.emptyTitle}>{t.noUserFound}</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor={C.white} />
        <AppHeader title={t.applications} onBack={() => navigation.goBack()} left="← Back" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>{t.loadingApplications}</Text>
        </View>
      </View>
    );
  }

  // ── Job Selector ──────────────────────────────────────────────────────────
  if (showJobSelector) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor={C.white} />
        <AppHeader
          title={t.selectJob}
          onBack={() => navigation.goBack()}
          left={`← ${t.back}`}
        />
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionHeading}>{t.selectJobToView}</Text>

          {jobs.length === 0 ? (
            <EmptyState icon="📋" title={t.noJobsWithApplications} sub={t.noJobsDesc} />
          ) : (
            jobs.map((job) => {
              const counts = { pending: 0, accepted: 0, completed: 0, rejected: 0 };
              (job.applications || []).forEach(app => {
                if (counts[app.status] !== undefined) counts[app.status]++;
              });
              return (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  onPress={() => loadApplications(job.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.jobCardLeft}>
                    <Text style={styles.jobCardTitle}>{job.title}</Text>
                    <Text style={styles.jobCardLocation}>📍 {job.location}</Text>
                    <View style={styles.jobCardBadgeRow}>
                      {counts.pending   > 0 && <Badge label={`${counts.pending} pending`}   color={C.warning} />}
                      {counts.accepted  > 0 && <Badge label={`${counts.accepted} active`}   color={C.primary} />}
                      {counts.completed > 0 && <Badge label={`${counts.completed} done`}    color={C.success} />}
                      {counts.rejected  > 0 && <Badge label={`${counts.rejected} rejected`} color={C.error}   />}
                    </View>
                  </View>
                  <Text style={styles.jobCardArrow}>›</Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Applications List ─────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      <AppHeader
        title={t.applications}
        onBack={() => { setShowJobSelector(true); setApplications([]); }}
        left={`← ${t.selectJob}`}
      />

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        <Text style={styles.summaryTitle}>
          {applications[0]?.jobTitle || t.applications}
        </Text>
        <Text style={styles.summaryCount}>
          {applications.length} {applications.length === 1 ? 'applicant' : 'applicants'}
        </Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {TAB_KEYS.map(key => {
            const count = tabCount(key);
            const active = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveTab(key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {tabLabels[key]}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabBubble, active && styles.tabBubbleActive]}>
                    <Text style={[styles.tabBubbleText, active && styles.tabBubbleTextActive]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {visibleApps.length === 0 ? (
          <EmptyState icon="👥" title={t.noApplicationsYet} sub={t.noApplicationsDesc} />
        ) : (
          visibleApps.map(app => (
            <ApplicationCard
              key={app.id}
              app={app}
              locale={locale}
              t={t}
              processingId={processingId}
              getStatusMeta={getStatusMeta}
              getJourneyLabel={getJourneyLabel}
              formatDate={formatDate}
              onAccept={() => handleAccept(app)}
              onReject={() => handleReject(app.id)}
              onTrack={() => navigation.navigate('EmployerJobTracking', { applicationId: app.id })}
              onPayment={() => navigation.navigate('PaymentProcessing', { applicationId: app.id })}
              onLocation={() => app.employerLocation && navigation.navigate('JobLocation', { application: app, isEmployer: true })}
              onChat={() => app.chatEnabled && navigation.navigate('ChatScreen', { applicationId: app.id, otherUser: app.workerId, jobTitle: app.jobTitle, otherUserName: app.workerName })}
              onRate={() => navigation.navigate('CompleteJob', { applicationId: app.id, jobId: app.jobId, workerId: app.workerId, workerName: app.workerName })}
            />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// ─── Application Card ─────────────────────────────────────────────────────────
const ApplicationCard = ({
  app, locale, t, processingId,
  getStatusMeta, getJourneyLabel, formatDate,
  onAccept, onReject, onTrack, onPayment, onLocation, onChat, onRate,
}) => {
  const meta   = getStatusMeta(app);
  const jLabel = getJourneyLabel(app.journeyStatus);
  const isPending   = app.status === 'pending';
  const isAccepted  = app.status === 'accepted';
  const isAwaiting  = app.status === 'awaiting_payment';
  const isCompleted = app.status === 'completed';
  const isRejected  = app.status === 'rejected';
  const isProcessing = processingId === app.id;

  return (
    <View style={styles.card}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{(app.workerName || '?')[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.workerName}>{app.workerName}</Text>
          <Text style={styles.workerPhone}>📞 {app.workerPhone}</Text>
        </View>
        <View style={[styles.statusTag, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusTagText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>

      {/* Job + date row */}
      <View style={styles.cardMeta}>
        <Text style={styles.cardMetaText}>💼 {app.jobTitle}</Text>
        <Text style={styles.cardMetaText}>📅 {formatDate(app.appliedAt)}</Text>
      </View>

      {/* Journey pill */}
      {jLabel !== '' && !isRejected && (
        <View style={styles.journeyPill}>
          <Text style={styles.journeyPillText}>{jLabel}</Text>
        </View>
      )}

      {/* Payment badge */}
      {app.paymentStatus && (
        <View style={[styles.payBadge, app.paymentStatus === 'paid' ? styles.payBadgePaid : styles.payBadgePending]}>
          <Text style={styles.payBadgeText}>
            {app.paymentStatus === 'paid'
              ? (locale === 'hi' ? '💰 भुगतान हुआ' : '💰 Paid')
              : (locale === 'hi' ? '⏳ भुगतान बाकी' : '⏳ Payment Pending')}
          </Text>
        </View>
      )}

      {/* ── PENDING actions ─────────────────────────────────── */}
      {isPending && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnAccept, isProcessing && styles.btnDisabled]}
            onPress={onAccept}
            disabled={isProcessing}
            activeOpacity={0.85}
          >
            {isProcessing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.btnText}>✅ {t.accept}</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnReject]}
            onPress={onReject}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>❌ {t.reject}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── ACCEPTED / AWAITING PAYMENT actions ─────────────── */}
      {(isAccepted || isAwaiting) && (
        <View style={styles.actionBlock}>
          <Divider />
          <View style={styles.actionGrid}>
            <GridBtn icon="📊" label={t.trackJob}      onPress={onTrack}    color={C.primary} />
            {isAwaiting && <GridBtn icon="💳" label={t.processPayment} onPress={onPayment}  color={C.success} />}
            {app.locationShared && <GridBtn icon="📍" label={t.viewLocation}  onPress={onLocation} color="#7C3AED" />}
            {app.chatEnabled    && <GridBtn icon="💬" label={t.openChat}      onPress={onChat}     color={C.primary} />}
          </View>
          <View style={styles.contactBox}>
            <Text style={styles.contactTitle}>{t.workerContact}</Text>
            <Text style={styles.contactRow}>👤 {t.name}: <Text style={styles.contactVal}>{app.workerName}</Text></Text>
            <Text style={styles.contactRow}>📞 {t.phone}: <Text style={styles.contactVal}>{app.workerPhone}</Text></Text>
            <Text style={styles.contactNote}>{t.contactNote}</Text>
          </View>
        </View>
      )}

      {/* ── COMPLETED actions ────────────────────────────────── */}
      {isCompleted && (
        <View style={styles.actionBlock}>
          <Divider />
          <View style={styles.completedBanner}>
            <Text style={styles.completedBannerText}>🏁 {t.jobCompleted}</Text>
          </View>
          <View style={styles.actionGrid}>
            <GridBtn icon="📊" label={locale === 'hi' ? 'विवरण देखें' : 'View Details'} onPress={onTrack} color={C.primary} />
            {!app.hasRating && <GridBtn icon="⭐" label={t.rateWorker} onPress={onRate} color={C.warning} />}
          </View>
          {app.paymentAmount && (
            <View style={styles.paymentSummary}>
              <Text style={styles.paymentSummaryLabel}>{t.amount}</Text>
              <Text style={styles.paymentSummaryValue}>₹{app.paymentAmount}</Text>
            </View>
          )}
          {app.hasRating && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingText}>
                ⭐ {t.youRated} {app.employerRating}/5 {t.stars}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── REJECTED ─────────────────────────────────────────── */}
      {isRejected && (
        <View style={styles.rejectedBanner}>
          <Text style={styles.rejectedText}>❌ {locale === 'hi' ? 'आवेदन अस्वीकृत कर दिया गया' : 'Application was rejected'}</Text>
        </View>
      )}
    </View>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const AppHeader = ({ title, onBack, left }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onBack} style={styles.headerBack}>
      <Text style={styles.headerBackText}>{left}</Text>
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={{ width: 80 }} />
  </View>
);

const Badge = ({ label, color }) => (
  <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
);

const GridBtn = ({ icon, label, onPress, color }) => (
  <TouchableOpacity style={[styles.gridBtn, { borderColor: color + '40', backgroundColor: color + '10' }]} onPress={onPress} activeOpacity={0.8}>
    <Text style={styles.gridBtnIcon}>{icon}</Text>
    <Text style={[styles.gridBtnText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const Divider = () => <View style={styles.divider} />;

const EmptyState = ({ icon, title, sub }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyIcon}>{icon}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySub}>{sub}</Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: C.bg },
  scroll:      { flex: 1 },
  scrollContent: { padding: 16 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 15, color: C.sub },
  lockIcon:    { fontSize: 48, marginBottom: 12 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 16,
    paddingBottom: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerBack:     { minWidth: 80 },
  headerBackText: { color: C.primary, fontSize: 15, fontWeight: '600' },
  headerTitle:    { fontSize: 17, fontWeight: '700', color: C.text },

  // Summary strip
  summaryStrip: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    backgroundColor:  C.primary,
    paddingHorizontal: 18,
    paddingVertical:   12,
  },
  summaryTitle: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  summaryCount: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },

  // Tab bar
  tabBarWrap: {
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tabBar: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    gap: 5,
  },
  tabActive:         { backgroundColor: C.primary, borderColor: C.primary },
  tabLabel:          { fontSize: 13, fontWeight: '600', color: C.sub },
  tabLabelActive:    { color: '#fff' },
  tabBubble:         { backgroundColor: C.border, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  tabBubbleActive:   { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBubbleText:     { fontSize: 11, fontWeight: '700', color: C.sub },
  tabBubbleTextActive: { color: '#fff' },

  // Section heading
  sectionHeading: { fontSize: 16, fontWeight: '600', color: C.sub, textAlign: 'center', marginBottom: 18, marginTop: 4 },

  // Job cards (selector)
  jobCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: C.primary,
    ...SHADOW,
  },
  jobCardLeft:       { flex: 1 },
  jobCardTitle:      { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 4 },
  jobCardLocation:   { fontSize: 13, color: C.sub, marginBottom: 8 },
  jobCardBadgeRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  jobCardArrow:      { fontSize: 26, color: C.muted, marginLeft: 10 },

  // Badge (pill)
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Application card
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    ...SHADOW,
  },
  cardHeader:   { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary + '20', alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 18, fontWeight: '800', color: C.primary },
  workerName:   { fontSize: 16, fontWeight: '700', color: C.text },
  workerPhone:  { fontSize: 13, color: C.sub, marginTop: 2 },
  statusTag:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusTagText:{ fontSize: 11, fontWeight: '700' },

  cardMeta:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  cardMetaText: { fontSize: 12, color: C.sub },

  journeyPill:  { alignSelf: 'flex-start', marginTop: 10, backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  journeyPillText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },

  payBadge:        { marginTop: 8, alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  payBadgePaid:    { backgroundColor: '#D1FAE5' },
  payBadgePending: { backgroundColor: '#FEF3C7' },
  payBadgeText:    { fontSize: 12, fontWeight: '700', color: C.text },

  // Actions
  actionRow:    { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn:          { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  btnAccept:    { backgroundColor: C.success },
  btnReject:    { backgroundColor: C.error },
  btnDisabled:  { opacity: 0.6 },
  btnText:      { color: '#fff', fontSize: 14, fontWeight: '700' },

  actionBlock: { marginTop: 4 },
  divider:     { height: 1, backgroundColor: C.border, marginVertical: 14 },

  actionGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  gridBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius:   10,
    borderWidth:    1.5,
    gap: 6,
  },
  gridBtnIcon: { fontSize: 14 },
  gridBtnText: { fontSize: 12, fontWeight: '700' },

  contactBox:    { backgroundColor: C.bg, borderRadius: 10, padding: 12 },
  contactTitle:  { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 6 },
  contactRow:    { fontSize: 13, color: C.sub, marginBottom: 3 },
  contactVal:    { fontWeight: '700', color: C.text },
  contactNote:   { fontSize: 11, color: C.muted, marginTop: 6, fontStyle: 'italic' },

  completedBanner:     { backgroundColor: '#D1FAE5', borderRadius: 10, padding: 10, alignItems: 'center', marginBottom: 12 },
  completedBannerText: { fontSize: 14, fontWeight: '700', color: C.success },

  paymentSummary:      { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.bg, borderRadius: 10, padding: 12, marginTop: 4 },
  paymentSummaryLabel: { fontSize: 13, color: C.sub, fontWeight: '600' },
  paymentSummaryValue: { fontSize: 16, fontWeight: '800', color: C.primary },

  ratingRow:   { marginTop: 10, alignItems: 'center' },
  ratingText:  { fontSize: 13, color: C.warning, fontWeight: '700' },

  rejectedBanner: { marginTop: 12, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, alignItems: 'center' },
  rejectedText:   { fontSize: 13, fontWeight: '700', color: C.error },

  // Empty state
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon:  { fontSize: 52, marginBottom: 16, opacity: 0.5 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.sub, textAlign: 'center', marginBottom: 8 },
  emptySub:   { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20 },
});

export default ApplicationsScreen;