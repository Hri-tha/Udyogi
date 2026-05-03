// src/screens/worker/WorkerHomeScreen.js
// FIXED: Apply button error, location filter added, navigation fixes, enhanced UI
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
  Platform,
  TextInput,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useJob } from '../../context/JobContext';
import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../constants/colors';
import { fetchFutureJobs, fetchWorkerApplications, createApplication, createNotification } from '../../services/database';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const defaultAvatar =
  'https://ui-avatars.com/api/?name=Worker&background=1a56db&color=fff&size=128';

// ─── Translations ─────────────────────────────────────────────────────────────
const translations = {
  en: {
    welcomeBack: 'Welcome back 👋',
    subtitle: 'Find your next job',
    verifiedWorker: 'Verified Worker',
    workerLevel: 'Worker',
    jobsDone: 'jobs done',
    view: 'View',
    overview: '📊 Overview',
    details: 'Details →',
    labelNew: 'New',
    labelWaiting: 'Waiting',
    labelDone: 'Done',
    labelEarned: 'Earned',
    jobsAvailable: 'Jobs Available',
    applications: 'Applications',
    completed: 'Completed',
    totalEarned: 'Total Earned',
    quickActions: '⚡ Quick Actions',
    browseJobs: 'Browse Jobs',
    findWork: 'Find work',
    myApplications: 'My Applications',
    myProfile: 'My Profile',
    editInfo: 'Edit info',
    help: 'Help',
    support: 'Support',
    availableJobs: '🧱 Available Jobs',
    jobsNearYou: 'jobs near you',
    viewAll: 'View All →',
    open: 'OPEN',
    applicants: 'applicants',
    applyNow: 'Apply Now',
    alreadyApplied: '✅ Applied!',
    moreJobs: 'more jobs',
    browseAllJobs: '🔍 Browse All Jobs',
    noAvailableJobs: 'No Jobs Right Now',
    noJobsDesc: 'New jobs will show here.\nCheck back soon!',
    loading: 'Loading...',
    applyTitle: 'Apply for Job?',
    applyMsg: 'Do you want to apply for',
    cancel: 'Cancel',
    apply: 'Apply',
    success: '✅ Success',
    applySuccess: 'Application submitted!',
    error: '❌ Error',
    applyError: 'Could not apply. Try again.',
    jobDetails: 'Job Details',
    description: 'About this Job',
    requirements: 'Requirements',
    location: 'Location',
    date: 'Date & Time',
    close: 'Close',
    perHour: '/hr',
    hours: 'hours',
    today: 'Today',
    tomorrow: 'Tomorrow',
    pending: 'pending',
    contactInfo: 'Contact',
    locationLabel: 'Your Area',
    noProfile: 'Profile incomplete',
    completeProfile: 'Complete Profile',
    filterByLocation: 'Filter by location',
    searchPlaceholder: 'Search city...',
    allLocations: 'All Locations',
    locationFilter: '📍 Location',
    clearFilter: 'Clear',
    profileIncomplete: 'Profile Incomplete',
    profileIncompleteMsg: 'Please complete your name and phone number in your profile before applying.',
    goToProfile: 'Go to Profile',
  },
  hi: {
    welcomeBack: 'वापसी पर स्वागत है 👋',
    subtitle: 'अगला काम खोजें',
    verifiedWorker: 'सत्यापित मजदूर',
    workerLevel: 'मजदूर',
    jobsDone: 'काम पूरे',
    view: 'देखें',
    overview: '📊 जानकारी',
    details: 'और देखें →',
    labelNew: 'नया',
    labelWaiting: 'प्रतीक्षा',
    labelDone: 'पूर्ण',
    labelEarned: 'कमाई',
    jobsAvailable: 'नौकरियां',
    applications: 'आवेदन',
    completed: 'पूर्ण काम',
    totalEarned: 'कुल कमाई',
    quickActions: '⚡ तुरंत करें',
    browseJobs: 'नौकरी खोजें',
    findWork: 'काम ढूंढें',
    myApplications: 'मेरे आवेदन',
    myProfile: 'मेरी प्रोफ़ाइल',
    editInfo: 'जानकारी',
    help: 'मदद',
    support: 'सहायता',
    availableJobs: '🧱 उपलब्ध नौकरियां',
    jobsNearYou: 'नौकरियां पास में',
    viewAll: 'सब देखें →',
    open: 'खुला',
    applicants: 'आवेदक',
    applyNow: 'आवेदन करें',
    alreadyApplied: '✅ हो गया!',
    moreJobs: 'और नौकरियां',
    browseAllJobs: '🔍 सभी नौकरियां देखें',
    noAvailableJobs: 'अभी कोई नौकरी नहीं',
    noJobsDesc: 'नई नौकरियां यहाँ दिखेंगी।\nबाद में देखें!',
    loading: 'लोड हो रहा है...',
    applyTitle: 'आवेदन करें?',
    applyMsg: 'क्या आप इस नौकरी के लिए आवेदन करना चाहते हैं?',
    cancel: 'रद्द करें',
    apply: 'आवेदन करें',
    success: '✅ सफल',
    applySuccess: 'आवेदन हो गया!',
    error: '❌ त्रुटि',
    applyError: 'आवेदन नहीं हुआ। फिर कोशिश करें।',
    jobDetails: 'नौकरी विवरण',
    description: 'नौकरी के बारे में',
    requirements: 'आवश्यकताएं',
    location: 'जगह',
    date: 'तारीख और समय',
    close: 'बंद करें',
    perHour: '/घंटा',
    hours: 'घंटे',
    today: 'आज',
    tomorrow: 'कल',
    pending: 'बाकी',
    contactInfo: 'संपर्क',
    locationLabel: 'आपका क्षेत्र',
    noProfile: 'प्रोफाइल अधूरा',
    completeProfile: 'प्रोफाइल पूरा करें',
    filterByLocation: 'स्थान के अनुसार फ़िल्टर करें',
    searchPlaceholder: 'शहर खोजें...',
    allLocations: 'सभी स्थान',
    locationFilter: '📍 स्थान',
    clearFilter: 'हटाएं',
    profileIncomplete: 'प्रोफाइल अधूरी है',
    profileIncompleteMsg: 'आवेदन करने से पहले कृपया अपना नाम और फ़ोन नंबर प्रोफाइल में भरें।',
    goToProfile: 'प्रोफाइल पर जाएं',
  },
};

// ─── Job emoji helper ──────────────────────────────────────────────────────────
const getJobEmoji = (title = '') => {
  const t = title.toLowerCase();
  if (t.includes('construct') || t.includes('build') || t.includes('mason')) return '🏗';
  if (t.includes('deliver') || t.includes('driver') || t.includes('transport')) return '🚚';
  if (t.includes('clean') || t.includes('sweep') || t.includes('house')) return '🏠';
  if (t.includes('cook') || t.includes('kitchen') || t.includes('food')) return '👨‍🍳';
  if (t.includes('guard') || t.includes('security') || t.includes('watch')) return '💂';
  if (t.includes('paint') || t.includes('wall')) return '🎨';
  if (t.includes('electric') || t.includes('wire')) return '⚡';
  if (t.includes('plumb') || t.includes('pipe')) return '🔧';
  if (t.includes('farm') || t.includes('agri') || t.includes('harvest')) return '🌾';
  if (t.includes('load') || t.includes('unload') || t.includes('carry')) return '📦';
  return '💼';
};

// ─── Soft location match ──────────────────────────────────────────────────────
const locationMatches = (jobLocation = '', filterLocation = '') => {
  if (!filterLocation || filterLocation.trim() === '') return true;
  const jl = jobLocation.toLowerCase().trim();
  const fl = filterLocation.toLowerCase().trim();
  return jl.includes(fl) || fl.includes(jl);
};

export default function WorkerHomeScreen({ navigation }) {
  const { user, userProfile, refreshUserProfile, resolvedUid } = useAuth();
  const { currentLocation, setCurrentLocation } = useJob();
  const { locale } = useLanguage();

  const [availableJobs, setAvailableJobs]       = useState([]);
  const [myApplications, setMyApplications]     = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [refreshing, setRefreshing]             = useState(false);
  const [showJobDetails, setShowJobDetails]     = useState(false);
  const [selectedJob, setSelectedJob]           = useState(null);
  const [showAllJobs, setShowAllJobs]           = useState(false);
  const [applyingJobId, setApplyingJobId]       = useState(null);
  const [appliedLocally, setAppliedLocally]     = useState([]);
  const [lang, setLang]                         = useState(locale || 'en');

  // ── Location filter state ──────────────────────────────────────────────────
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [locationSearch, setLocationSearch]         = useState('');
  const [activeLocationFilter, setActiveLocationFilter] = useState('');

  const tr = translations[lang] || translations.en;

  // ── Seed location from worker profile ────────────────────────────────────
  useEffect(() => {
    if (userProfile?.location && !currentLocation) {
      setCurrentLocation(userProfile.location);
      setActiveLocationFilter(userProfile.location);
    }
  }, [userProfile?.location]);

  // ── Data loading ──────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (resolvedUid) {
        loadData();
      }
    }, [resolvedUid])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadAvailableJobs(), loadApplications()]);
      await refreshUserProfile?.();
    } catch (error) {
      console.error('Error loading worker home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAvailableJobs = async () => {
    try {
      const result = await fetchFutureJobs({});
      if (result.success) setAvailableJobs(result.jobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const loadApplications = async () => {
    try {
      if (!resolvedUid) return;
      const result = await fetchWorkerApplications(resolvedUid);
      if (result.success) setMyApplications(result.applications);
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getFirstName = () => {
    if (userProfile?.name) return userProfile.name.split(' ')[0];
    return lang === 'hi' ? 'मजदूर' : 'Worker';
  };

  const getGreeting = () => {
    const name = getFirstName();
    return lang === 'hi' ? `${name} जी` : name;
  };

  const appliedJobIds = [
    ...myApplications.map(a => a.jobId).filter(Boolean),
    ...appliedLocally,
  ];

  // Use activeLocationFilter for filtering (not just currentLocation)
  const filterLocation = activeLocationFilter || '';
  const unappliedJobs = availableJobs.filter(
    job =>
      job.status === 'open' &&
      !appliedJobIds.includes(job.id) &&
      locationMatches(job.location, filterLocation)
  );
  const jobsToShow = showAllJobs ? unappliedJobs : unappliedJobs.slice(0, 3);

  const formatJobDate = (jobDate, startTime) => {
    if (!jobDate) return '';
    const date = new Date(jobDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    let label = '';
    if (date.toDateString() === today.toDateString()) label = tr.today;
    else if (date.toDateString() === tomorrow.toDateString()) label = tr.tomorrow;
    else label = date.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN');
    return startTime ? `${label}, ${startTime}` : label;
  };

  // ── FIXED Apply function ──────────────────────────────────────────────────
  // Root cause: userProfile.phoneNumber may be undefined; also need to check
  // both `phone` and `phoneNumber` fields. We now call createApplication directly
  // instead of going through JobContext.applyForJob to avoid the strict profile check.
  const handleApply = (job) => {
    if (!resolvedUid) {
      Alert.alert(tr.error, 'Please log in to apply');
      return;
    }

    // Check profile completeness — accept either `phone` or `phoneNumber`
    const workerName  = userProfile?.name;
    const workerPhone = userProfile?.phoneNumber || userProfile?.phone || '';

    if (!workerName) {
      Alert.alert(
        tr.profileIncomplete,
        tr.profileIncompleteMsg,
        [
          { text: tr.cancel, style: 'cancel' },
          { text: tr.goToProfile, onPress: () => navigation.navigate('WorkerProfile') },
        ]
      );
      return;
    }

    Alert.alert(
      tr.applyTitle,
      `${tr.applyMsg}\n\n${job.title}`,
      [
        { text: tr.cancel, style: 'cancel' },
        {
          text: tr.apply,
          onPress: async () => {
            setApplyingJobId(job.id);
            try {
              // Build application data — never pass undefined values to Firestore
              const applicationData = {
                jobId:       job.id,
                workerId:    resolvedUid,
                workerName:  workerName || 'Worker',
                workerPhone: workerPhone || '',
                workerEmail: userProfile?.email || user?.email || '',
                employerId:  job.employerId,
                jobTitle:    job.title,
                companyName: job.companyName || job.company || 'Company',
                status:      'pending',
              };

              const result = await createApplication(applicationData);

              if (result.success) {
                setAppliedLocally(prev => [...prev, job.id]);
                Alert.alert(tr.success, tr.applySuccess);
                // Send notification to employer (non-blocking)
                createNotification(job.employerId, {
                  title:      '📥 New Application Received',
                  message:    `${workerName} has applied for your "${job.title}" position.`,
                  type:       'new_application',
                  actionType: 'view_applications',
                  actionId:   job.id,
                }).catch(() => {});
                await loadApplications();
              } else {
                Alert.alert(tr.error, result.error || tr.applyError);
              }
            } catch (err) {
              console.error('Apply error:', err);
              Alert.alert(tr.error, err.message || tr.applyError);
            } finally {
              setApplyingJobId(null);
            }
          },
        },
      ]
    );
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = [
    {
      emoji: '💼',
      value: unappliedJobs.length,
      label: tr.jobsAvailable,
      pill: tr.labelNew,
      pillBg: '#eff6ff', pillColor: '#1a56db', iconBg: '#eff6ff',
    },
    {
      emoji: '📋',
      value: myApplications.filter(a => a.status === 'pending').length,
      label: tr.applications,
      pill: tr.labelWaiting,
      pillBg: '#fff7ed', pillColor: '#ea580c', iconBg: '#fff7ed',
    },
    {
      emoji: '✅',
      value: myApplications.filter(a => a.status === 'completed' || a.status === 'accepted').length,
      label: tr.completed,
      pill: tr.labelDone,
      pillBg: '#f0fdf4', pillColor: '#16a34a', iconBg: '#f0fdf4',
    },
    {
      emoji: '💰',
      value: `₹${userProfile?.totalEarnings || 0}`,
      label: tr.totalEarned,
      pill: tr.labelEarned,
      pillBg: '#fefce8', pillColor: '#ca8a04', iconBg: '#fefce8',
    },
  ];

  // ── Quick Actions — use correct screen names ───────────────────────────────
  const quickActions = [
    {
      emoji: '🔍', title: tr.browseJobs, sub: tr.findWork, iconBg: '#eff6ff',
      // Try BrowseJobs first; if that fails the navigator will warn (dev only)
      action: () => {
        try { navigation.navigate('BrowseJobs'); }
        catch { navigation.navigate('WorkerBrowseJobs'); }
      },
    },
    {
      emoji: '📄', title: tr.myApplications,
      sub: `${myApplications.length} ${tr.pending}`,
      iconBg: '#fff7ed',
      action: () => navigation.navigate('WorkerApplications'),
    },
    {
      emoji: '👤', title: tr.myProfile, sub: tr.editInfo, iconBg: '#f0fdf4',
      action: () => navigation.navigate('WorkerProfile'),
    },
    {
      emoji: '🙋', title: tr.help, sub: tr.support, iconBg: '#fefce8',
      action: () => {
        try { navigation.navigate('HelpSupport'); }
        catch { Alert.alert('Help', 'Contact us at support@udyogi.com'); }
      },
    },
  ];

  // ── Location filter modal cities ───────────────────────────────────────────
  const popularCities = [
    'Mumbai, Maharashtra', 'Delhi, Delhi', 'Bengaluru, Karnataka',
    'Hyderabad, Telangana', 'Chennai, Tamil Nadu', 'Kolkata, West Bengal',
    'Pune, Maharashtra', 'Ahmedabad, Gujarat', 'Surat, Gujarat',
    'Lucknow, Uttar Pradesh', 'Jaipur, Rajasthan', 'Nagpur, Maharashtra',
    'Indore, Madhya Pradesh', 'Patna, Bihar', 'Bhopal, Madhya Pradesh',
  ];
  const filteredCities = popularCities.filter(c =>
    c.toLowerCase().includes(locationSearch.toLowerCase())
  );

  // ── No-profile guard ──────────────────────────────────────────────────────
  if (!loading && resolvedUid && userProfile && !userProfile.profileComplete) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a56db" />
        <View style={s.header}>
          <LangToggle lang={lang} setLang={setLang} />
          <View style={s.headerTop}>
            <View>
              <Text style={s.welcomeText}>{tr.welcomeBack}</Text>
              <Text style={s.greetingName}>{getGreeting()}</Text>
            </View>
          </View>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>👷</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 8 }}>
            {tr.noProfile}
          </Text>
          <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
            Please complete your profile to start applying for jobs.
          </Text>
          <TouchableOpacity
            style={[s.applyBtn, { paddingHorizontal: 32, paddingVertical: 14 }]}
            onPress={() => navigation.navigate('ProfileSetup', { userType: 'worker' })}
          >
            <Text style={s.applyBtnText}>{tr.completeProfile} →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <View style={s.loadingScreen}>
        <ActivityIndicator size="large" color="#1a56db" />
        <Text style={s.loadingText}>{tr.loading}</Text>
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a56db" />

      {/* ── HEADER ── */}
      <View style={s.header}>
        <LangToggle lang={lang} setLang={setLang} />

        <View style={s.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.welcomeText}>{tr.welcomeBack}</Text>
            <Text style={s.greetingName}>{getGreeting()}</Text>
            {/* Location filter pill in header */}
            <TouchableOpacity
              style={s.locationFilterPill}
              onPress={() => setShowLocationFilter(true)}
            >
              <Text style={s.locationFilterPillIcon}>📍</Text>
              <Text style={s.locationFilterPillText} numberOfLines={1}>
                {activeLocationFilter || tr.allLocations}
              </Text>
              <Text style={s.locationFilterPillChevron}>▾</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.avatarWrap} onPress={() => navigation.navigate('WorkerProfile')}>
            <Image
              source={{ uri: userProfile?.photoURL || defaultAvatar }}
              style={s.avatar}
            />
            {userProfile?.isVerified && (
              <View style={s.verifiedDot}>
                <Text style={{ fontSize: 7, color: '#fff' }}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Worker Status Card */}
        <View style={s.workerCard}>
          <View style={s.workerCardLeft}>
            <View style={s.workerCardIcon}>
              <Text style={{ fontSize: 20 }}>🏅</Text>
            </View>
            <View>
              <Text style={s.workerCardTitle}>
                {userProfile?.isVerified ? tr.verifiedWorker : tr.workerLevel}
              </Text>
              <Text style={s.workerCardSub}>
                {myApplications.filter(a => a.status === 'completed').length} {tr.jobsDone} • ⭐{' '}
                {userProfile?.rating || 4.5}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={s.workerCardBtn} onPress={() => navigation.navigate('WorkerProfile')}>
            <Text style={s.workerCardBtnText}>{tr.view}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SCROLL CONTENT ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a56db" />
        }
      >
        {/* Stats Grid */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{tr.overview}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('WorkerProfile')}>
              <Text style={s.sectionLink}>{tr.details}</Text>
            </TouchableOpacity>
          </View>
          <View style={s.statsGrid}>
            {stats.map((item, idx) => (
              <View key={idx} style={s.statCard}>
                <View style={s.statCardTop}>
                  <View style={[s.statIcon, { backgroundColor: item.iconBg }]}>
                    <Text style={{ fontSize: 17 }}>{item.emoji}</Text>
                  </View>
                  <View style={[s.statPill, { backgroundColor: item.pillBg }]}>
                    <Text style={[s.statPillText, { color: item.pillColor }]}>{item.pill}</Text>
                  </View>
                </View>
                <Text style={s.statValue}>{item.value}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{tr.quickActions}</Text>
          <View style={s.actionsGrid}>
            {quickActions.map((item, idx) => (
              <TouchableOpacity key={idx} style={s.actionCard} onPress={item.action} activeOpacity={0.75}>
                <View style={[s.actionIcon, { backgroundColor: item.iconBg }]}>
                  <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                </View>
                <Text style={s.actionTitle}>{item.title}</Text>
                <Text style={s.actionSub}>{item.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Available Jobs */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>{tr.availableJobs}</Text>
              <Text style={s.sectionSub}>{unappliedJobs.length} {tr.jobsNearYou}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Location Filter Button */}
              <TouchableOpacity
                style={[s.locationFilterBtn, activeLocationFilter && s.locationFilterBtnActive]}
                onPress={() => setShowLocationFilter(true)}
              >
                <Text style={[s.locationFilterBtnText, activeLocationFilter && s.locationFilterBtnTextActive]}>
                  {tr.locationFilter}
                </Text>
              </TouchableOpacity>
              {unappliedJobs.length > 0 && (
                <TouchableOpacity onPress={() => setShowAllJobs(!showAllJobs)}>
                  <Text style={s.sectionLink}>{tr.viewAll}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Active filter chip */}
          {activeLocationFilter ? (
            <View style={s.activeFilterChip}>
              <Text style={s.activeFilterIcon}>📍</Text>
              <Text style={s.activeFilterText} numberOfLines={1}>{activeLocationFilter}</Text>
              <TouchableOpacity
                onPress={() => { setActiveLocationFilter(''); setLocationSearch(''); }}
                style={s.activeFilterClear}
              >
                <Text style={s.activeFilterClearText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {unappliedJobs.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyEmoji}>😔</Text>
              <Text style={s.emptyTitle}>{tr.noAvailableJobs}</Text>
              <Text style={s.emptyDesc}>{tr.noJobsDesc}</Text>
              {activeLocationFilter ? (
                <TouchableOpacity
                  style={[s.emptyBtn, { marginBottom: 10 }]}
                  onPress={() => setActiveLocationFilter('')}
                >
                  <Text style={s.emptyBtnText}>🌍 {tr.allLocations}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={s.emptyBtn} onPress={() => {
                try { navigation.navigate('BrowseJobs'); }
                catch { navigation.navigate('WorkerBrowseJobs'); }
              }}>
                <Text style={s.emptyBtnText}>🔍 {tr.browseJobs}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {jobsToShow.map(job => {
                const isApplying = applyingJobId === job.id;
                const isApplied  = appliedJobIds.includes(job.id);
                const applicantCount =
                  job.applicationsCount !== undefined
                    ? job.applicationsCount
                    : (job.applications?.length ?? 0);
                return (
                  <TouchableOpacity
                    key={job.id}
                    style={s.jobCard}
                    onPress={() => { setSelectedJob(job); setShowJobDetails(true); }}
                    activeOpacity={0.85}
                  >
                    <View style={s.jobCardTop}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={s.jobTitle}>{getJobEmoji(job.title)} {job.title}</Text>
                        <View style={s.openBadge}>
                          <View style={s.openDot} />
                          <Text style={s.openText}>{tr.open}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.jobSalary}>₹{job.rate}</Text>
                        <Text style={s.jobSalaryUnit}>{tr.perHour}</Text>
                      </View>
                    </View>

                    <View style={s.jobMeta}>
                      <View style={s.jobMetaRow}>
                        <Text style={s.jobMetaIcon}>📍</Text>
                        <Text style={s.jobMetaText} numberOfLines={1}>{job.location}</Text>
                      </View>
                      {(job.jobDate || job.startTime) && (
                        <View style={s.jobMetaRow}>
                          <Text style={s.jobMetaIcon}>🕐</Text>
                          <Text style={s.jobMetaText}>
                            {formatJobDate(job.jobDate, job.startTime)}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={s.jobFooter}>
                      <View style={s.applicantsRow}>
                        <Text style={s.applicantsIcon}>👥</Text>
                        <Text style={s.applicantsText}>{applicantCount} {tr.applicants}</Text>
                      </View>
                      <TouchableOpacity
                        style={[s.applyBtn, isApplied && s.applyBtnDone]}
                        onPress={() => !isApplied && !isApplying && handleApply(job)}
                        disabled={isApplied || isApplying}
                      >
                        {isApplying ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={s.applyBtnText}>
                            {isApplied ? tr.alreadyApplied : `✋ ${tr.applyNow}`}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {unappliedJobs.length > 3 && !showAllJobs && (
                <TouchableOpacity style={s.viewMoreCard} onPress={() => setShowAllJobs(true)}>
                  <Text style={s.viewMoreIcon}>➕</Text>
                  <Text style={s.viewMoreText}>+{unappliedJobs.length - 3} {tr.moreJobs}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── FLOATING BUTTON ── */}
      <TouchableOpacity style={s.fab} onPress={() => {
        try { navigation.navigate('BrowseJobs'); }
        catch { navigation.navigate('WorkerBrowseJobs'); }
      }} activeOpacity={0.85}>
        <View style={s.fabGradient}>
          <Text style={s.fabText}>{tr.browseAllJobs}</Text>
        </View>
      </TouchableOpacity>

      {/* ── LOCATION FILTER MODAL ── */}
      <Modal
        visible={showLocationFilter}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLocationFilter(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { paddingBottom: 24 }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalHeaderTitle}>{tr.filterByLocation}</Text>
              <TouchableOpacity onPress={() => setShowLocationFilter(false)} style={s.modalCloseBtn}>
                <Text style={{ fontSize: 20, color: '#64748b' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search input */}
            <View style={s.locationSearchBox}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
              <TextInput
                style={s.locationSearchInput}
                placeholder={tr.searchPlaceholder}
                placeholderTextColor="#94a3b8"
                value={locationSearch}
                onChangeText={setLocationSearch}
                autoCapitalize="words"
              />
              {locationSearch ? (
                <TouchableOpacity onPress={() => setLocationSearch('')}>
                  <Text style={{ color: '#94a3b8', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* All locations option */}
            <TouchableOpacity
              style={[s.cityItem, !activeLocationFilter && s.cityItemSelected]}
              onPress={() => {
                setActiveLocationFilter('');
                setLocationSearch('');
                setShowLocationFilter(false);
              }}
            >
              <Text style={s.cityIcon}>🌍</Text>
              <Text style={[s.cityName, !activeLocationFilter && s.cityNameSelected]}>
                {tr.allLocations}
              </Text>
              {!activeLocationFilter && <Text style={s.cityCheck}>✓</Text>}
            </TouchableOpacity>

            {/* City list */}
            <ScrollView style={{ maxHeight: height * 0.45 }} showsVerticalScrollIndicator={false}>
              {filteredCities.map((city, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.cityItem, activeLocationFilter === city && s.cityItemSelected]}
                  onPress={() => {
                    setActiveLocationFilter(city);
                    setLocationSearch('');
                    setShowLocationFilter(false);
                  }}
                >
                  <Text style={s.cityIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.cityName, activeLocationFilter === city && s.cityNameSelected]}>
                      {city.split(',')[0]}
                    </Text>
                    <Text style={s.cityState}>{city.split(',')[1]?.trim()}</Text>
                  </View>
                  {activeLocationFilter === city && <Text style={s.cityCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
              {filteredCities.length === 0 && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 14 }}>No cities found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── JOB DETAILS MODAL ── */}
      <Modal
        visible={showJobDetails}
        animationType="slide"
        transparent
        onRequestClose={() => setShowJobDetails(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalHeaderTitle}>{tr.jobDetails}</Text>
              <TouchableOpacity onPress={() => setShowJobDetails(false)} style={s.modalCloseBtn}>
                <Text style={{ fontSize: 20, color: '#64748b' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedJob && (
              <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={s.modalCard}>
                  <View style={s.modalTitleRow}>
                    <Text style={s.modalJobTitle}>
                      {getJobEmoji(selectedJob.title)} {selectedJob.title}
                    </Text>
                    <View>
                      <Text style={s.modalSalary}>₹{selectedJob.rate}</Text>
                      <Text style={s.modalSalaryUnit}>{tr.perHour}</Text>
                    </View>
                  </View>
                  <View style={s.modalBadgeRow}>
                    <View style={s.openBadge}>
                      <View style={s.openDot} />
                      <Text style={s.openText}>{tr.open}</Text>
                    </View>
                    <Text style={s.modalDate}>
                      {formatJobDate(selectedJob.jobDate, selectedJob.startTime)}
                    </Text>
                  </View>
                  <View style={s.modalInfoRow}>
                    <Text style={s.modalInfoIcon}>📍</Text>
                    <Text style={s.modalInfoText}>{selectedJob.location}</Text>
                  </View>
                  {selectedJob.duration && (
                    <View style={s.modalInfoRow}>
                      <Text style={s.modalInfoIcon}>⏱</Text>
                      <Text style={s.modalInfoText}>{selectedJob.duration} {tr.hours}</Text>
                    </View>
                  )}
                  <View style={s.modalInfoRow}>
                    <Text style={s.modalInfoIcon}>👥</Text>
                    <Text style={s.modalInfoText}>
                      {selectedJob.applicationsCount !== undefined
                        ? selectedJob.applicationsCount
                        : selectedJob.applications?.length ?? 0}{' '}
                      {tr.applicants}
                    </Text>
                  </View>
                  {selectedJob.description && (
                    <View style={s.modalSection}>
                      <Text style={s.modalSectionTitle}>📝 {tr.description}</Text>
                      <Text style={s.modalSectionBody}>{selectedJob.description}</Text>
                    </View>
                  )}
                  {selectedJob.requirements && (
                    <View style={s.modalSection}>
                      <Text style={s.modalSectionTitle}>✅ {tr.requirements}</Text>
                      <Text style={s.modalSectionBody}>{selectedJob.requirements}</Text>
                    </View>
                  )}
                  {selectedJob.employerEmail && (
                    <View style={s.modalSection}>
                      <Text style={s.modalSectionTitle}>📞 {tr.contactInfo}</Text>
                      <View style={s.modalInfoRow}>
                        <Text style={s.modalInfoIcon}>✉️</Text>
                        <Text style={s.modalInfoText}>{selectedJob.employerEmail}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCloseAction} onPress={() => setShowJobDetails(false)}>
                <Text style={s.modalCloseActionText}>{tr.close}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.modalApplyAction,
                  selectedJob && appliedJobIds.includes(selectedJob.id) && s.applyBtnDone,
                ]}
                onPress={() => {
                  if (selectedJob && !appliedJobIds.includes(selectedJob.id)) {
                    setShowJobDetails(false);
                    handleApply(selectedJob);
                  }
                }}
                disabled={selectedJob && appliedJobIds.includes(selectedJob.id)}
              >
                <Text style={s.modalApplyText}>
                  {selectedJob && appliedJobIds.includes(selectedJob.id)
                    ? tr.alreadyApplied
                    : `✋ ${tr.applyNow}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Language Toggle ──────────────────────────────────────────────────────────
function LangToggle({ lang, setLang }) {
  return (
    <View style={s.langRow}>
      <TouchableOpacity style={[s.langBtn, lang === 'en' && s.langBtnActive]} onPress={() => setLang('en')}>
        <Text style={[s.langBtnText, lang === 'en' && s.langBtnTextActive]}>EN</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.langBtn, lang === 'hi' && s.langBtnActive]} onPress={() => setLang('hi')}>
        <Text style={[s.langBtnText, lang === 'hi' && s.langBtnTextActive]}>हिं</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_WIDTH = (width - 20 * 2 - 10) / 2;

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f0f4ff' },
  loadingScreen:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4ff' },
  loadingText:  { marginTop: 14, fontSize: 16, color: '#64748b', fontWeight: '600' },

  header: {
    paddingTop: Platform.OS === 'ios' ? 52 : 42,
    paddingHorizontal: 18, paddingBottom: 20,
    backgroundColor: '#1a56db',
  },
  langRow:        { flexDirection: 'row', gap: 6, marginBottom: 10 },
  langBtn:        { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.12)' },
  langBtnActive:  { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: 'transparent' },
  langBtnText:    { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  langBtnTextActive: { color: '#1a56db' },
  headerTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  welcomeText:    { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: 2 },
  greetingName:   { fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 8 },

  // Location filter pill in header
  locationFilterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  locationFilterPillIcon:    { fontSize: 12 },
  locationFilterPillText:    { fontSize: 12, color: '#ffffff', fontWeight: '600', maxWidth: 160 },
  locationFilterPillChevron: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },

  avatarWrap:     { position: 'relative' },
  avatar:         { width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.6)' },
  verifiedDot:    { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#1a56db', justifyContent: 'center', alignItems: 'center' },

  workerCard:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  workerCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  workerCardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  workerCardTitle:{ fontSize: 14, fontWeight: '800', color: '#ffffff', marginBottom: 2 },
  workerCardSub:  { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  workerCardBtn:  { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 14, paddingVertical: 6 },
  workerCardBtnText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },

  scroll:        { flex: 1 },
  scrollContent: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 110 },

  section:       { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  sectionTitle:  { fontSize: 17, fontWeight: '800', color: '#1e293b' },
  sectionSub:    { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  sectionLink:   { fontSize: 13, fontWeight: '700', color: '#1a56db' },

  // Location filter button in section header
  locationFilterBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  locationFilterBtnActive: {
    backgroundColor: '#eff6ff', borderColor: '#1a56db',
  },
  locationFilterBtnText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  locationFilterBtnTextActive: { color: '#1a56db' },

  // Active filter chip
  activeFilterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#eff6ff', borderRadius: 20, borderWidth: 1, borderColor: '#bfdbfe',
    paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 12,
  },
  activeFilterIcon:      { fontSize: 13 },
  activeFilterText:      { fontSize: 12, fontWeight: '600', color: '#1a56db', maxWidth: 180 },
  activeFilterClear:     { padding: 2 },
  activeFilterClearText: { fontSize: 13, color: '#94a3b8', fontWeight: '700' },

  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard:      { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, width: CARD_WIDTH, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  statCardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statIcon:      { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statPill:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statPillText:  { fontSize: 10, fontWeight: '800' },
  statValue:     { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 3 },
  statLabel:     { fontSize: 11, color: '#64748b', fontWeight: '600' },

  actionsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  actionCard:    { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, width: CARD_WIDTH, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  actionIcon:    { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionTitle:   { fontSize: 12, fontWeight: '800', color: '#1e293b', textAlign: 'center', marginBottom: 3 },
  actionSub:     { fontSize: 11, color: '#94a3b8', fontWeight: '500', textAlign: 'center' },

  jobCard:       { backgroundColor: '#ffffff', borderRadius: 18, padding: 15, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  jobCardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  jobTitle:      { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 6, lineHeight: 20 },
  openBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#dcfce7', alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  openDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  openText:      { fontSize: 10, fontWeight: '800', color: '#16a34a' },
  jobSalary:     { fontSize: 20, fontWeight: '800', color: '#1a56db', textAlign: 'right' },
  jobSalaryUnit: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textAlign: 'right' },
  jobMeta:       { gap: 6, marginBottom: 12 },
  jobMetaRow:    { flexDirection: 'row', alignItems: 'center', gap: 7 },
  jobMetaIcon:   { fontSize: 13, width: 18, textAlign: 'center' },
  jobMetaText:   { fontSize: 12, color: '#64748b', fontWeight: '500', flex: 1 },
  jobFooter:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 11 },
  applicantsRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  applicantsIcon:{ fontSize: 14 },
  applicantsText:{ fontSize: 12, color: '#1a56db', fontWeight: '700' },
  applyBtn:      { backgroundColor: '#1a56db', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, minWidth: 110, alignItems: 'center', justifyContent: 'center' },
  applyBtnDone:  { backgroundColor: '#16a34a' },
  applyBtnText:  { fontSize: 13, fontWeight: '800', color: '#ffffff' },

  viewMoreCard:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 2, borderColor: '#c7d7ff', borderStyle: 'dashed', padding: 14, marginTop: 2 },
  viewMoreIcon:  { fontSize: 18 },
  viewMoreText:  { fontSize: 13, fontWeight: '700', color: '#1a56db' },

  emptyState:    { backgroundColor: '#ffffff', borderRadius: 18, padding: 36, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  emptyEmoji:    { fontSize: 52, marginBottom: 12 },
  emptyTitle:    { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  emptyDesc:     { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn:      { backgroundColor: '#1a56db', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText:  { fontSize: 14, fontWeight: '800', color: '#ffffff' },

  fab:           { position: 'absolute', bottom: 24, alignSelf: 'center', borderRadius: 30, overflow: 'hidden', shadowColor: '#1a56db', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 10 },
  fabGradient:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 15, backgroundColor: '#1a56db', borderRadius: 30 },
  fabText:       { fontSize: 15, fontWeight: '800', color: '#ffffff' },

  // Modals
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:      { backgroundColor: '#f0f4ff', borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: height * 0.88 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalHeaderTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  modalCloseBtn: { padding: 4 },
  modalScroll:   { padding: 16 },
  modalCard:     { backgroundColor: '#ffffff', borderRadius: 18, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  modalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  modalJobTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', flex: 1, marginRight: 12, lineHeight: 24 },
  modalSalary:   { fontSize: 22, fontWeight: '800', color: '#1a56db', textAlign: 'right' },
  modalSalaryUnit: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textAlign: 'right' },
  modalBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalDate:     { fontSize: 13, color: '#64748b', fontWeight: '600' },
  modalInfoRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  modalInfoIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  modalInfoText: { fontSize: 14, color: '#475569', fontWeight: '500', flex: 1 },
  modalSection:  { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  modalSectionTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  modalSectionBody:  { fontSize: 13, color: '#64748b', lineHeight: 20, fontWeight: '500' },
  modalActions:  { flexDirection: 'row', padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  modalCloseAction:  { flex: 1, backgroundColor: '#e2e8f0', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  modalCloseActionText: { fontSize: 15, fontWeight: '700', color: '#64748b' },
  modalApplyAction:  { flex: 2, backgroundColor: '#1a56db', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  modalApplyText:    { fontSize: 15, fontWeight: '800', color: '#ffffff' },

  // Location filter modal
  locationSearchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    marginHorizontal: 16, marginBottom: 8,
  },
  locationSearchInput: { flex: 1, fontSize: 15, color: '#1e293b' },
  cityItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  cityItemSelected: { backgroundColor: '#eff6ff' },
  cityIcon:  { fontSize: 18, width: 24, textAlign: 'center' },
  cityName:  { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  cityNameSelected: { color: '#1a56db' },
  cityState: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  cityCheck: { fontSize: 16, color: '#1a56db', fontWeight: '800', marginLeft: 'auto' },
});