// src/screens/worker/WorkerProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../constants/colors';
import {
  fetchWorkerRatings,
  fetchWorkerApplications,
  fetchWorkerEarnings,
  getWorkerEarningsStats,
} from '../../services/database';

const { width } = Dimensions.get('window');

const WorkerProfileScreen = ({ navigation }) => {
  // ── FIX: use resolvedUid — works in both Firebase and AsyncStorage-only mode
  const { user, userProfile, logout, resolvedUid } = useAuth();
  const { locale, changeLanguage } = useLanguage();

  const [ratings,      setRatings]      = useState([]);
  const [applications, setApplications] = useState([]);
  const [earnings,     setEarnings]     = useState([]);
  const [stats, setStats] = useState({
    totalJobs: 0, completedJobs: 0, acceptedJobs: 0,
    averageRating: 0, totalEarnings: 0, monthlyEarnings: 0, averageEarning: 0,
  });

  const translations = {
    en: {
      headerTitle: 'My Profile', workStatistics: 'Work Statistics',
      totalJobs: 'Total Jobs', completed: 'Completed',
      totalEarned: 'Total Earned', thisMonth: 'This Month',
      earningsSummary: 'Earnings Summary', jobsDone: 'Jobs Done',
      avgJob: 'Avg/Job', recentEarnings: 'Recent Earnings',
      performance: 'Performance', completionRate: 'Completion Rate',
      averageRating: 'Average Rating', averageEarnings: 'Average Earnings',
      skillsExpertise: 'Skills & Expertise', reviewsRatings: 'Reviews & Ratings',
      personalInformation: 'Personal Information', fullName: 'Full Name',
      email: 'Email', phone: 'Phone', location: 'Location',
      age: 'Age', experience: 'Experience',
      accountSettings: 'Account Settings', editProfile: 'Edit Profile',
      changePassword: 'Change Password', notifications: 'Notifications',
      privacySecurity: 'Privacy & Security', helpSupport: 'Help & Support',
      logout: 'Logout', logoutConfirm: 'Are you sure you want to logout?',
      cancel: 'Cancel', logoutText: 'Logout', errorLogout: 'Failed to logout',
      noRatings: 'No ratings', reviews: 'reviews', online: 'Online', cash: 'Cash',
      notSet: 'Not set', notSpecified: 'Not specified',
      memberSince: 'Member since', recently: 'Recently',
      switchToHindi: 'Switch to Hindi', switchToEnglish: 'Switch to English',
      appVersion: 'Udyogi v1.0.0', thisMonthEarnings: 'This Month',
      perJob: 'per job', completion: 'Completion', rating: 'Rating', earning: 'Earning',
      viewAllEarnings: 'View All Earnings', viewAllReviews: 'View All Reviews',
      verified: 'Verified',
    },
    hi: {
      headerTitle: 'मेरी प्रोफाइल', workStatistics: 'काम के आंकड़े',
      totalJobs: 'कुल नौकरियां', completed: 'पूरी हुईं',
      totalEarned: 'कुल कमाई', thisMonth: 'इस महीने',
      earningsSummary: 'कमाई का सारांश', jobsDone: 'काम हुए',
      avgJob: 'औसत/नौकरी', recentEarnings: 'हालिया कमाई',
      performance: 'प्रदर्शन', completionRate: 'पूर्णता दर',
      averageRating: 'औसत रेटिंग', averageEarnings: 'औसत कमाई',
      skillsExpertise: 'कौशल और विशेषज्ञता', reviewsRatings: 'समीक्षा और रेटिंग',
      personalInformation: 'व्यक्तिगत जानकारी', fullName: 'पूरा नाम',
      email: 'ईमेल', phone: 'फोन', location: 'स्थान',
      age: 'उम्र', experience: 'अनुभव',
      accountSettings: 'खाता सेटिंग्स', editProfile: 'प्रोफाइल संपादित करें',
      changePassword: 'पासवर्ड बदलें', notifications: 'सूचनाएं',
      privacySecurity: 'गोपनीयता और सुरक्षा', helpSupport: 'मदद और सहायता',
      logout: 'लॉग आउट', logoutConfirm: 'क्या आप वाकई लॉग आउट करना चाहते हैं?',
      cancel: 'रद्द करें', logoutText: 'लॉग आउट', errorLogout: 'लॉग आउट करने में विफल',
      noRatings: 'कोई रेटिंग नहीं', reviews: 'समीक्षाएं', online: 'ऑनलाइन', cash: 'कैश',
      notSet: 'सेट नहीं है', notSpecified: 'निर्दिष्ट नहीं',
      memberSince: 'सदस्य बने', recently: 'हाल ही में',
      switchToHindi: 'हिंदी में बदलें', switchToEnglish: 'अंग्रेजी में बदलें',
      appVersion: 'उद्योगी v1.0.0', thisMonthEarnings: 'इस महीने',
      perJob: 'प्रति नौकरी', completion: 'पूर्णता', rating: 'रेटिंग', earning: 'कमाई',
      viewAllEarnings: 'सभी कमाई देखें', viewAllReviews: 'सभी समीक्षाएं देखें',
      verified: 'सत्यापित',
    },
  };

  const tr = translations[locale] || translations.en;

  useEffect(() => {
    loadProfileData();
  }, [resolvedUid]);  // re-run when resolvedUid becomes available

  const loadProfileData = async () => {
    try {
      // ── FIX: guard on resolvedUid instead of user?.uid
      if (!resolvedUid) return;

      const [ratingsResult, appsResult] = await Promise.all([
        fetchWorkerRatings(resolvedUid),
        fetchWorkerApplications(resolvedUid),
      ]);

      if (ratingsResult.success) {
        setRatings(ratingsResult.ratings);
        calculateAverageRating(ratingsResult.ratings);
      }

      if (appsResult.success) {
        setApplications(appsResult.applications);
        calculateStats(appsResult.applications);
      }

      await loadEarningsData();
    } catch (e) {
      console.error('loadProfileData error:', e);
    }
  };

  const loadEarningsData = async () => {
    try {
      if (!resolvedUid) return;
      const [earningsResult, statsResult] = await Promise.all([
        fetchWorkerEarnings(resolvedUid),
        getWorkerEarningsStats(resolvedUid),
      ]);
      if (earningsResult.success) setEarnings(earningsResult.earnings);
      if (statsResult.success) {
        setStats(prev => ({
          ...prev,
          totalEarnings:   statsResult.stats.totalEarnings   || 0,
          monthlyEarnings: statsResult.stats.monthlyEarnings || 0,
          averageEarning:  statsResult.stats.averageEarning  || 0,
        }));
      }
    } catch (e) {
      console.error('loadEarningsData error:', e);
    }
  };

  const calculateAverageRating = (ratingsData) => {
    if (!ratingsData.length) return;
    const avg = ratingsData.reduce((acc, r) => acc + r.rating, 0) / ratingsData.length;
    setStats(prev => ({ ...prev, averageRating: parseFloat(avg.toFixed(1)) }));
  };

  const calculateStats = (appsData) => {
    setStats(prev => ({
      ...prev,
      totalJobs:     appsData.length,
      completedJobs: appsData.filter(a => a.status === 'completed').length,
      acceptedJobs:  appsData.filter(a => a.status === 'accepted').length,
    }));
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(
      tr.logout, tr.logoutConfirm,
      [
        { text: tr.cancel, style: 'cancel' },
        {
          text: tr.logoutText, style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.warn('logout error (non-fatal):', error.message);
            } finally {
              navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            }
          },
        },
      ]
    );
  };

  const handleLanguageToggle = () => {
    Alert.alert(
      locale === 'hi' ? 'भाषा बदलें' : 'Change Language',
      locale === 'hi'
        ? 'क्या आप अंग्रेजी भाषा में बदलना चाहते हैं?'
        : 'Do you want to switch to Hindi language?',
      [
        { text: tr.cancel, style: 'cancel' },
        {
          text: locale === 'hi' ? 'अंग्रेजी में बदलें' : 'Switch to Hindi',
          onPress: () => changeLanguage(locale === 'hi' ? 'en' : 'hi'),
        },
      ]
    );
  };

  const renderStars = (rating) => (
    <View style={styles.starsContainer}>
      {[1,2,3,4,5].map(star => (
        <Text key={star} style={styles.star}>{star <= rating ? '⭐' : '☆'}</Text>
      ))}
    </View>
  );

  // ── Sub-components ──────────────────────────────────────────────────────────
  const StatCard = ({ icon, value, label, color = colors.primary }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const SkillBadge = ({ skill }) => (
    <View style={styles.skillBadge}><Text style={styles.skillText}>{skill}</Text></View>
  );

  const ReviewCard = ({ review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <View style={styles.reviewerAvatar}>
            <Text style={styles.reviewerAvatarText}>{review.employerName?.charAt(0) || 'E'}</Text>
          </View>
          <View style={styles.reviewerDetails}>
            <Text style={styles.reviewerName}>{review.employerName}</Text>
            <Text style={styles.reviewDate}>
              {review.createdAt?.toDate?.()?.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN') ||
                (locale === 'hi' ? 'हालिया' : 'Recent')}
            </Text>
          </View>
        </View>
        {renderStars(review.rating)}
      </View>
      {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
      <Text style={styles.reviewJobTitle}>
        {locale === 'hi' ? 'नौकरी: ' : 'Job: '}{review.jobTitle}
      </Text>
    </View>
  );

  const EarningCard = ({ earning }) => (
    <View style={styles.earningCard}>
      <View style={styles.earningHeader}>
        <View style={styles.earningInfo}>
          <Text style={styles.earningJob}>{earning.jobTitle}</Text>
          <Text style={styles.earningEmployer}>{earning.employerName}</Text>
          <Text style={styles.earningDate}>
            {earning.paidAt?.toDate?.()?.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN') ||
              (locale === 'hi' ? 'हालिया' : 'Recent')}
          </Text>
        </View>
        <View style={styles.earningAmount}>
          <Text style={styles.earningValue}>₹{earning.amount}</Text>
          <View style={[styles.paymentMethodBadge, { backgroundColor: earning.paymentMethod === 'online' ? '#2196F3' : '#4CAF50' }]}>
            <Text style={styles.paymentMethodText}>
              {earning.paymentMethod === 'online' ? tr.online : tr.cash}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tr.headerTitle}</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleLanguageToggle} style={styles.languageButton}>
            <Text style={styles.languageButtonText}>
              {locale === 'hi' ? '🌐 EN' : '🌐 हि'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {userProfile?.name?.charAt(0)?.toUpperCase() || 'W'}
                </Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
                <Text style={styles.verifiedText}>{tr.verified}</Text>
              </View>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.name}>
                {userProfile?.name || (locale === 'hi' ? 'मजदूर' : 'Worker')}
              </Text>
              <Text style={styles.emailText}>
                {user?.email || userProfile?.email || ''}
              </Text>
              <View style={styles.ratingSection}>
                {renderStars(Math.round(stats.averageRating))}
                <Text style={styles.ratingText}>
                  {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : tr.noRatings}
                </Text>
                {ratings.length > 0 && (
                  <Text style={styles.ratingCount}>({ratings.length} {tr.reviews})</Text>
                )}
              </View>
              {userProfile?.skills?.length > 0 && (
                <View style={styles.skillsContainer}>
                  {userProfile.skills.slice(0, 3).map((skill, i) => (
                    <SkillBadge key={i} skill={skill} />
                  ))}
                  {userProfile.skills.length > 3 && (
                    <View style={styles.skillBadge}>
                      <Text style={styles.skillText}>+{userProfile.skills.length - 3}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          <View style={styles.contactInfo}>
            {userProfile?.location && (
              <View style={styles.contactItem}>
                <Text style={styles.contactIcon}>📍</Text>
                <Text style={styles.contactText}>{userProfile.location}</Text>
              </View>
            )}
            {userProfile?.phoneNumber && (
              <View style={styles.contactItem}>
                <Text style={styles.contactIcon}>📱</Text>
                <Text style={styles.contactText}>{userProfile.phoneNumber}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Work Statistics */}
        <Text style={styles.sectionTitle}>{tr.workStatistics}</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="💼" value={stats.totalJobs}              label={tr.totalJobs}  color={colors.info} />
          <StatCard icon="✅" value={stats.completedJobs}           label={tr.completed}   color={colors.success} />
          <StatCard icon="💰" value={`₹${stats.totalEarnings}`}    label={tr.totalEarned} color={colors.primary} />
          <StatCard icon="📈" value={`₹${stats.monthlyEarnings}`}  label={tr.thisMonth}   color={colors.warning} />
        </View>

        {/* Earnings Summary */}
        <Text style={styles.sectionTitle}>{tr.earningsSummary}</Text>
        <View style={styles.earningsSummaryCard}>
          <View style={styles.earningsStats}>
            <View style={styles.earningsStat}>
              <Text style={styles.earningsStatValue}>₹{stats.monthlyEarnings}</Text>
              <Text style={styles.earningsStatLabel}>{tr.thisMonthEarnings}</Text>
            </View>
            <View style={styles.earningsStat}>
              <Text style={styles.earningsStatValue}>{stats.completedJobs}</Text>
              <Text style={styles.earningsStatLabel}>{tr.jobsDone}</Text>
            </View>
            <View style={styles.earningsStat}>
              <Text style={styles.earningsStatValue}>₹{Math.round(stats.averageEarning)}</Text>
              <Text style={styles.earningsStatLabel}>{tr.perJob}</Text>
            </View>
          </View>
        </View>

        {/* Recent Earnings */}
        {earnings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{tr.recentEarnings}</Text>
            <View style={styles.earningsContainer}>
              {earnings.slice(0, 5).map((earning, i) => (
                <EarningCard key={earning.id || i} earning={earning} />
              ))}
              {earnings.length > 5 && (
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>{tr.viewAllEarnings} →</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Performance */}
        <Text style={styles.sectionTitle}>{tr.performance}</Text>
        <View style={styles.performanceCard}>
          {[
            {
              label: tr.completion,
              value: stats.totalJobs > 0 ? `${Math.round((stats.completedJobs / stats.totalJobs) * 100)}%` : '0%',
              fill: stats.totalJobs > 0 ? (stats.completedJobs / stats.totalJobs) * 100 : 0,
              color: colors.success,
            },
            {
              label: tr.rating,
              value: stats.averageRating > 0 ? `${stats.averageRating}/5` : 'N/A',
              fill: (stats.averageRating / 5) * 100,
              color: colors.warning,
            },
            {
              label: tr.earning,
              value: `₹${Math.round(stats.averageEarning)}`,
              fill: Math.min((stats.averageEarning / 5000) * 100, 100),
              color: colors.info,
            },
          ].map(item => (
            <View key={item.label} style={styles.performanceItem}>
              <View style={styles.performanceHeader}>
                <Text style={styles.performanceLabel}>{item.label}</Text>
                <Text style={styles.performanceValue}>{item.value}</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${item.fill}%`, backgroundColor: item.color }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Skills */}
        {userProfile?.skills?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{tr.skillsExpertise}</Text>
            <View style={styles.allSkillsContainer}>
              {userProfile.skills.map((skill, i) => <SkillBadge key={i} skill={skill} />)}
            </View>
          </>
        )}

        {/* Reviews */}
        {ratings.length > 0 && (
          <>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>{tr.reviewsRatings}</Text>
              <View style={styles.reviewsBadge}>
                <Text style={styles.reviewsBadgeText}>{ratings.length}</Text>
              </View>
            </View>
            <View style={styles.reviewsContainer}>
              {ratings.slice(0, 5).map((review, i) => <ReviewCard key={i} review={review} />)}
              {ratings.length > 5 && (
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>{tr.viewAllReviews} →</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Personal Information */}
        <Text style={styles.sectionTitle}>{tr.personalInformation}</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="👤" label={tr.fullName}  value={userProfile?.name         || tr.notSet} />
          <InfoRow icon="📧" label={tr.email}      value={user?.email || userProfile?.email || tr.notSet} />
          <InfoRow icon="📱" label={tr.phone}      value={userProfile?.phoneNumber  || tr.notSet} />
          <InfoRow icon="📍" label={tr.location}   value={userProfile?.location     || tr.notSet} />
          <InfoRow icon="🎂" label={tr.age}        value={userProfile?.age          || tr.notSet} />
          <InfoRow icon="🆔" label={tr.experience} value={userProfile?.experience   || tr.notSpecified} />
        </View>

        {/* Account Settings */}
        <Text style={styles.sectionTitle}>{tr.accountSettings}</Text>
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('EditProfile')}>
            <Text style={styles.actionIcon}>✏️</Text>
            <Text style={styles.actionText}>{tr.editProfile}</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionIcon}>🔔</Text>
            <Text style={styles.actionText}>{tr.notifications}</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionIcon}>🛡️</Text>
            <Text style={styles.actionText}>{tr.privacySecurity}</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionIcon}>❓</Text>
            <Text style={styles.actionText}>{tr.helpSupport}</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Language Toggle */}
        <TouchableOpacity style={styles.languageToggleButton} onPress={handleLanguageToggle}>
          <Text style={styles.languageToggleIcon}>{locale === 'hi' ? '🇮🇳' : '🇺🇸'}</Text>
          <Text style={styles.languageToggleText}>
            {locale === 'hi' ? tr.switchToEnglish : tr.switchToHindi}
          </Text>
          <Text style={styles.languageToggleArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutButtonText}>{tr.logout}</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {tr.memberSince}{' '}
            {user?.metadata?.creationTime
              ? new Date(user.metadata.creationTime).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN')
              : tr.recently}
          </Text>
          <Text style={styles.footerVersion}>{tr.appVersion}</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, backgroundColor: colors.primary },
  backButton:      { padding: 5 },
  backButtonText:  { color: colors.white, fontSize: 28, fontWeight: 'bold' },
  headerTitle:     { fontSize: 20, fontWeight: 'bold', color: colors.white },
  headerRight:     { flexDirection: 'row', alignItems: 'center' },
  languageButton:  { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  languageButtonText: { fontSize: 14, fontWeight: '600', color: colors.white },
  content:         { flex: 1, padding: 20 },

  profileCard:     { backgroundColor: colors.white, padding: 24, borderRadius: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  profileHeader:   { alignItems: 'center', marginBottom: 20 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar:          { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.primary + '40' },
  avatarText:      { fontSize: 40, fontWeight: 'bold', color: colors.white },
  verifiedBadge:   { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: colors.white },
  verifiedIcon:    { color: colors.white, fontSize: 12, fontWeight: 'bold', marginRight: 4 },
  verifiedText:    { color: colors.white, fontSize: 10, fontWeight: '600' },
  profileInfo:     { alignItems: 'center' },
  name:            { fontSize: 26, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  emailText:       { fontSize: 15, color: colors.textSecondary, marginBottom: 12 },
  ratingSection:   { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  starsContainer:  { flexDirection: 'row', marginRight: 8 },
  star:            { fontSize: 18, marginHorizontal: 1 },
  ratingText:      { fontSize: 16, fontWeight: 'bold', color: colors.text, marginRight: 6 },
  ratingCount:     { fontSize: 14, color: colors.textSecondary },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  skillBadge:      { backgroundColor: colors.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.primary + '40' },
  skillText:       { color: colors.primary, fontSize: 12, fontWeight: '600' },
  contactInfo:     { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  contactItem:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactIcon:     { fontSize: 16 },
  contactText:     { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },

  sectionTitle:    { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 12 },

  statsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard:        { backgroundColor: colors.white, padding: 16, borderRadius: 16, flex: 1, minWidth: (width - 52) / 2, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  statIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statIcon:        { fontSize: 24 },
  statValue:       { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  statLabel:       { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  earningsSummaryCard: { backgroundColor: colors.white, padding: 20, borderRadius: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  earningsStats:   { flexDirection: 'row', justifyContent: 'space-around' },
  earningsStat:    { alignItems: 'center' },
  earningsStatValue: { fontSize: 20, fontWeight: 'bold', color: colors.primary, marginBottom: 4 },
  earningsStatLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  earningsContainer: { marginBottom: 24 },
  earningCard:     { backgroundColor: colors.white, padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  earningHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  earningInfo:     { flex: 1 },
  earningJob:      { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  earningEmployer: { fontSize: 14, color: colors.textSecondary, marginBottom: 2 },
  earningDate:     { fontSize: 12, color: colors.textSecondary },
  earningAmount:   { alignItems: 'flex-end' },
  earningValue:    { fontSize: 18, fontWeight: 'bold', color: colors.success, marginBottom: 6 },
  paymentMethodBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  paymentMethodText: { fontSize: 10, color: colors.white, fontWeight: '600' },

  performanceCard: { backgroundColor: colors.white, padding: 20, borderRadius: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  performanceItem: { marginBottom: 20 },
  performanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  performanceLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  performanceValue: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  progressBar:     { height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden' },
  progressFill:    { height: '100%', borderRadius: 4 },

  allSkillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: colors.white, padding: 16, borderRadius: 16, marginBottom: 24 },

  reviewsHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  reviewsBadge:    { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  reviewsBadgeText:{ color: colors.white, fontSize: 12, fontWeight: 'bold' },
  reviewsContainer:{ marginBottom: 24 },
  reviewCard:      { backgroundColor: colors.white, padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  reviewHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reviewerInfo:    { flexDirection: 'row', alignItems: 'center', flex: 1 },
  reviewerAvatar:  { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  reviewerAvatarText: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  reviewerDetails: { flex: 1 },
  reviewerName:    { fontSize: 15, fontWeight: '600', color: colors.text },
  reviewDate:      { fontSize: 12, color: colors.textSecondary },
  reviewComment:   { fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 8 },
  reviewJobTitle:  { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },

  viewAllButton:   { backgroundColor: colors.primary + '15', padding: 14, borderRadius: 12, alignItems: 'center' },
  viewAllText:     { color: colors.primary, fontSize: 14, fontWeight: '600' },

  infoCard:        { backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  infoRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border + '50' },
  infoIcon:        { fontSize: 20, marginRight: 16, width: 24 },
  infoContent:     { flex: 1 },
  infoLabel:       { fontSize: 13, color: colors.textSecondary, marginBottom: 4, fontWeight: '500' },
  infoValue:       { fontSize: 15, fontWeight: '600', color: colors.text },

  actionsCard:     { backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  actionItem:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  actionIcon:      { fontSize: 20, marginRight: 16, width: 24 },
  actionText:      { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  actionArrow:     { fontSize: 20, color: colors.textSecondary, fontWeight: 'bold' },
  separator:       { height: 1, backgroundColor: colors.border + '50' },

  languageToggleButton: { flexDirection: 'row', backgroundColor: colors.white, padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: colors.primary + '30' },
  languageToggleIcon:   { fontSize: 24, marginRight: 12 },
  languageToggleText:   { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  languageToggleArrow:  { fontSize: 20, color: colors.primary, fontWeight: 'bold' },

  logoutButton:    { flexDirection: 'row', backgroundColor: colors.error, padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: colors.error, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  logoutIcon:      { fontSize: 20, marginRight: 8 },
  logoutButtonText:{ color: colors.white, fontSize: 16, fontWeight: 'bold' },

  footer:          { alignItems: 'center', paddingVertical: 24 },
  footerText:      { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  footerVersion:   { fontSize: 12, color: colors.textSecondary },
});

export default WorkerProfileScreen;