// src/screens/employer/EmployerProfileScreen.js
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
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { updateEmployerProfile, fetchEmployerJobs } from '../../services/database';
import { colors } from '../../constants/colors';

export default function EmployerProfileScreen({ navigation }) {
  const { user, userProfile, refreshUserProfile, logout } = useAuth();
  const { locale, changeLanguage } = useLanguage();
  const [loading, setLoading]           = useState(false);
  const [editMode, setEditMode]         = useState(false);
  const [jobs, setJobs]                 = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [languageModal, setLanguageModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phoneNumber: '',
    location: '',
    industry: '',
    companySize: '',
    description: '',
  });

  const translations = {
    en: {
      profile: "Profile",
      back: "Back",
      edit: "Edit",
      cancel: "Cancel",
      verified: "Verified",
      activeJobs: "Active Jobs",
      applications: "Applications",
      totalHires: "Total Hires",
      performanceOverview: "Performance Overview",
      completionRate: "Completion Rate",
      applicationsToHire: "Applications to Hire",
      currentlyOpen: "Currently Open",
      allTime: "All Time",
      avgResponse: "Avg. Response",
      companyInfo: "Company Information",
      industry: "Industry",
      companySize: "Company Size",
      email: "Email",
      phone: "Phone",
      location: "Location",
      aboutCompany: "About Company",
      notSpecified: "Not specified",
      notProvided: "Not provided",
      preferences: "Preferences",
      pushNotifications: "Push Notifications",
      receiveAlerts: "Receive job application alerts",
      emailNotifications: "Email Notifications",
      getUpdates: "Get updates via email",
      autoCloseJobs: "Auto-close Jobs",
      autoCloseDesc: "Automatically close filled positions",
      postNewJob: "Post New Job",
      dashboard: "Dashboard",
      saveChanges: "Save Changes",
      account: "Account",
      viewAnalytics: "View Analytics",
      subscription: "Subscription",
      helpSupport: "Help & Support",
      logout: "Logout",
      memberSince: "Member since",
      recent: "Recent",
      fullName: "Full Name",
      companyName: "Company Name",
      companyDescription: "Company Description",
      tellWorkers: "Tell workers about your company...",
      selectIndustry: "Select Industry",
      manufacturing: "Manufacturing",
      construction: "Construction",
      retail: "Retail",
      selectLanguage: "Select Language",
      english: "English",
      hindi: "हिन्दी (Hindi)",
      language: "Language",
      changeLanguage: "Change Language",
      currentLanguage: "Current",
      appLanguage: "App Language",
      save: "Save",
      areYouSure: "Are you sure?",
      logoutConfirm: "Are you sure you want to logout?",
      yesLogout: "Logout",
      error: "Error",
      success: "Success",
      profileUpdated: "Profile updated successfully!",
      enterName: "Please enter your name",
      enterCompany: "Please enter company name",
      failedUpdate: "Failed to update profile",
      failedLogout: "Failed to logout. Please try again.",
    },
    hi: {
      profile: "प्रोफाइल",
      back: "पीछे",
      edit: "संपादित करें",
      cancel: "रद्द करें",
      verified: "सत्यापित",
      activeJobs: "सक्रिय नौकरियां",
      applications: "आवेदन",
      totalHires: "कुल भर्ती",
      performanceOverview: "प्रदर्शन अवलोकन",
      completionRate: "पूर्णता दर",
      applicationsToHire: "आवेदन से भर्ती",
      currentlyOpen: "वर्तमान में खुली",
      allTime: "कुल",
      avgResponse: "औसत प्रतिक्रिया",
      companyInfo: "कंपनी की जानकारी",
      industry: "उद्योग",
      companySize: "कंपनी का आकार",
      email: "ईमेल",
      phone: "फोन",
      location: "स्थान",
      aboutCompany: "कंपनी के बारे में",
      notSpecified: "निर्दिष्ट नहीं",
      notProvided: "प्रदान नहीं किया गया",
      preferences: "प्राथमिकताएं",
      pushNotifications: "पुश सूचनाएं",
      receiveAlerts: "नौकरी आवेदन अलर्ट प्राप्त करें",
      emailNotifications: "ईमेल सूचनाएं",
      getUpdates: "ईमेल के माध्यम से अपडेट प्राप्त करें",
      autoCloseJobs: "स्वचालित बंद नौकरियां",
      autoCloseDesc: "भरे हुए पदों को स्वचालित रूप से बंद करें",
      postNewJob: "नई नौकरी पोस्ट करें",
      dashboard: "डैशबोर्ड",
      saveChanges: "परिवर्तन सहेजें",
      account: "खाता",
      viewAnalytics: "विश्लेषण देखें",
      subscription: "सदस्यता",
      helpSupport: "सहायता और समर्थन",
      logout: "लॉगआउट",
      memberSince: "सदस्यता शुरू",
      recent: "हाल ही में",
      fullName: "पूरा नाम",
      companyName: "कंपनी का नाम",
      companyDescription: "कंपनी विवरण",
      tellWorkers: "कर्मचारियों को अपनी कंपनी के बारे में बताएं...",
      selectIndustry: "उद्योग चुनें",
      manufacturing: "विनिर्माण",
      construction: "निर्माण",
      retail: "खुदरा",
      selectLanguage: "भाषा चुनें",
      english: "अंग्रेजी (English)",
      hindi: "हिन्दी",
      language: "भाषा",
      changeLanguage: "भाषा बदलें",
      currentLanguage: "वर्तमान",
      appLanguage: "ऐप भाषा",
      save: "सहेजें",
      areYouSure: "क्या आप सुनिश्चित हैं?",
      logoutConfirm: "क्या आप निश्चित रूप से लॉगआउट करना चाहते हैं?",
      yesLogout: "लॉगआउट करें",
      error: "त्रुटि",
      success: "सफल",
      profileUpdated: "प्रोफाइल सफलतापूर्वक अपडेट हुआ!",
      enterName: "कृपया अपना नाम दर्ज करें",
      enterCompany: "कृपया कंपनी का नाम दर्ज करें",
      failedUpdate: "प्रोफाइल अपडेट करने में विफल",
      failedLogout: "लॉगआउट करने में विफल। कृपया पुनः प्रयास करें।",
    }
  };

  const tr = translations[locale] || translations.en;

  useEffect(() => {
    loadProfileData();
    loadEmployerStats();
  }, []);

  const loadProfileData = () => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        companyName: userProfile.companyName || '',
        email: userProfile.email || user?.email || '',
        phoneNumber: userProfile.phoneNumber || '',
        location: userProfile.location || '',
        industry: userProfile.industry || (locale === 'hi' ? 'विनिर्माण' : 'Manufacturing'),
        companySize: userProfile.companySize || (locale === 'hi' ? 'छोटा (1-50)' : 'Small (1-50)'),
        description: userProfile.description || '',
      });
    }
  };

  const loadEmployerStats = async () => {
    try {
      if (!user?.uid) return;
      const result = await fetchEmployerJobs(user.uid);
      if (result.success) setJobs(result.jobs);
    } catch (e) {
      console.error('loadEmployerStats error:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!formData.name.trim()) {
      Alert.alert(tr.error, tr.enterName);
      return;
    }
    if (!formData.companyName.trim()) {
      Alert.alert(tr.error, tr.enterCompany);
      return;
    }
    setLoading(true);
    const result = await updateEmployerProfile(user.uid, {
      ...formData,
      lastUpdated: new Date(),
    });
    setLoading(false);
    if (result.success) {
      await refreshUserProfile();
      setEditMode(false);
      Alert.alert(tr.success, tr.profileUpdated);
    } else {
      Alert.alert(tr.error, result.error || tr.failedUpdate);
    }
  };

  const handleCancelEdit = () => {
    loadProfileData();
    setEditMode(false);
  };

  const handleLogout = () => {
    Alert.alert(
      tr.logout,
      tr.logoutConfirm,
      [
        { text: tr.cancel, style: 'cancel' },
        {
          text: tr.yesLogout,
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (e) {
              console.warn('logout error (non-fatal):', e.message);
            } finally {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            }
          },
        },
      ]
    );
  };

  const calculateStats = () => {
    const activeJobs = jobs.filter(j => j.status === 'open').length;
    const totalApplications = jobs.reduce((sum, j) => sum + (j.applications?.length || 0), 0);
    const acceptedApplications = jobs.reduce((sum, j) => {
      return sum + (j.applications?.filter(app => app.status === 'accepted').length || 0);
    }, 0);
    return {
      activeJobs,
      totalApplications,
      acceptedApplications,
      completionRate: totalApplications > 0
        ? Math.round((acceptedApplications / totalApplications) * 100)
        : 0,
    };
  };

  const stats = calculateStats();

  const getCurrentLanguageText = () => locale === 'hi' ? 'हिन्दी' : 'English';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← {tr.back}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tr.profile}</Text>
        <TouchableOpacity
          onPress={() => setEditMode(!editMode)}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>
            {editMode ? tr.cancel : tr.edit}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userProfile?.name?.charAt(0)?.toUpperCase() || 'E'}
              </Text>
            </View>
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeText}>✓</Text>
            </View>
          </View>

          {!editMode ? (
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {userProfile?.name || (locale === 'hi' ? 'नियोक्ता' : 'Employer')}
              </Text>
              <Text style={styles.companyNameText}>
                {userProfile?.companyName || tr.companyName}
              </Text>
              <Text style={styles.profileLocation}>
                📍 {userProfile?.location || tr.location}
              </Text>
              <View style={styles.industryTags}>
                <IndustryTag title={userProfile?.industry || tr.industry} />
                <IndustryTag title={userProfile?.companySize || tr.companySize} />
              </View>
            </View>
          ) : (
            <View style={styles.editForm}>
              <TextInput
                style={styles.input}
                placeholder={tr.fullName}
                value={formData.name}
                onChangeText={t => setFormData({ ...formData, name: t })}
              />
              <TextInput
                style={styles.input}
                placeholder={tr.companyName}
                value={formData.companyName}
                onChangeText={t => setFormData({ ...formData, companyName: t })}
              />
              <TextInput
                style={styles.input}
                placeholder={tr.location}
                value={formData.location}
                onChangeText={t => setFormData({ ...formData, location: t })}
              />
            </View>
          )}

          <View style={styles.profileStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.activeJobs}</Text>
              <Text style={styles.statLabel}>{tr.activeJobs}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalApplications}</Text>
              <Text style={styles.statLabel}>{tr.applications}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile?.totalHires || 0}</Text>
              <Text style={styles.statLabel}>{tr.totalHires}</Text>
            </View>
          </View>
        </View>

        {/* Performance Overview */}
        <Text style={styles.sectionTitle}>{tr.performanceOverview}</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title={tr.completionRate}
            value={`${stats.completionRate}%`}
            subtitle={tr.applicationsToHire}
            color={colors.success}
          />
          <StatCard
            title={tr.activeJobs}
            value={stats.activeJobs}
            subtitle={tr.currentlyOpen}
          />
          <StatCard
            title={tr.totalHires}
            value={userProfile?.totalHires || 0}
            subtitle={tr.allTime}
            color={colors.warning}
          />
          <StatCard
            title={locale === 'hi' ? 'प्रतिक्रिया समय' : 'Response Time'}
            value="<24h"
            subtitle={tr.avgResponse}
            color={colors.info}
          />
        </View>

        {/* Company Information */}
        <Text style={styles.sectionTitle}>{tr.companyInfo}</Text>
        <View style={styles.infoCard}>
          {!editMode ? (
            <>
              <InfoRow icon="🏢" label={tr.industry}     value={userProfile?.industry     || tr.notSpecified} />
              <InfoRow icon="👥" label={tr.companySize}   value={userProfile?.companySize   || tr.notSpecified} />
              <InfoRow icon="📧" label={tr.email}         value={userProfile?.email         || user?.email || tr.notProvided} />
              <InfoRow icon="📱" label={tr.phone}         value={userProfile?.phoneNumber   || tr.notProvided} />
              <InfoRow icon="📍" label={tr.location}      value={userProfile?.location      || tr.notSpecified} />
              {userProfile?.description && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.descriptionLabel}>{tr.aboutCompany}</Text>
                  <Text style={styles.descriptionText}>{userProfile.description}</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.editForm}>
              <View style={styles.inputRow}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>{tr.industry}</Text>
                  <TouchableOpacity
                    style={styles.pickerInput}
                    onPress={() => setShowEditModal(true)}
                  >
                    <Text style={styles.pickerText}>{formData.industry}</Text>
                    <Text style={styles.pickerArrow}>▼</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>{tr.companySize}</Text>
                  <TouchableOpacity
                    style={styles.pickerInput}
                    onPress={() => setShowEditModal(true)}
                  >
                    <Text style={styles.pickerText}>{formData.companySize}</Text>
                    <Text style={styles.pickerArrow}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.inputLabel}>{tr.email}</Text>
              <TextInput
                style={styles.input}
                placeholder={tr.email}
                value={formData.email}
                onChangeText={t => setFormData({ ...formData, email: t })}
                keyboardType="email-address"
              />

              <Text style={styles.inputLabel}>{tr.phone}</Text>
              <TextInput
                style={styles.input}
                placeholder={tr.phone}
                value={formData.phoneNumber}
                onChangeText={t => setFormData({ ...formData, phoneNumber: t })}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>{tr.companyDescription}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={tr.tellWorkers}
                value={formData.description}
                onChangeText={t => setFormData({ ...formData, description: t })}
                multiline
                numberOfLines={4}
              />
            </View>
          )}
        </View>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>{tr.preferences}</Text>
        <View style={styles.settingsCard}>
          <SettingRow
            title={tr.pushNotifications}
            subtitle={tr.receiveAlerts}
            value={notifications}
            onValueChange={setNotifications}
          />
          <SettingRow
            title={tr.emailNotifications}
            subtitle={tr.getUpdates}
            value={true}
            onValueChange={() => {}}
          />
          <SettingRow
            title={tr.autoCloseJobs}
            subtitle={tr.autoCloseDesc}
            value={true}
            onValueChange={() => {}}
          />
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setLanguageModal(true)}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{tr.appLanguage}</Text>
              <Text style={styles.settingSubtitle}>{tr.changeLanguage}</Text>
            </View>
            <View style={styles.languageDisplay}>
              <Text style={styles.currentLanguageText}>{getCurrentLanguageText()}</Text>
              <Text style={styles.languageArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        {editMode ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancelEdit}
            >
              <Text style={styles.cancelButtonText}>{tr.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveButtonText}>{tr.saveChanges}</Text>
              }
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => navigation.navigate('PostJob')}
            >
              <Text style={styles.secondaryButtonText}>📝 {tr.postNewJob}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => navigation.navigate('EmployerHome')}
            >
              <Text style={styles.primaryButtonText}>🏠 {tr.dashboard}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Account */}
        <Text style={styles.sectionTitle}>{tr.account}</Text>
        <View style={styles.accountCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.menuText}>🔄 {tr.subscription}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          {/* ── UPDATED: navigates to HelpSupport screen ── */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('HelpSupport')}
          >
            <Text style={styles.menuText}>❓ {tr.helpSupport}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.logoutItem]}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>🚪 {tr.logout}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {tr.memberSince}{' '}
            {user?.metadata?.creationTime
              ? new Date(user.metadata.creationTime).toLocaleDateString(
                  locale === 'hi' ? 'hi-IN' : 'en-IN'
                )
              : tr.recent}
          </Text>
        </View>
      </ScrollView>

      {/* Industry Picker Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{tr.selectIndustry}</Text>
            {[
              locale === 'hi' ? 'विनिर्माण' : 'Manufacturing',
              locale === 'hi' ? 'निर्माण'   : 'Construction',
              locale === 'hi' ? 'खुदरा'     : 'Retail',
              locale === 'hi' ? 'सेवाएं'    : 'Services',
              locale === 'hi' ? 'कृषि'      : 'Agriculture',
            ].map(item => (
              <TouchableOpacity
                key={item}
                style={[styles.modalOption, formData.industry === item && styles.selectedOption]}
                onPress={() => { setFormData({ ...formData, industry: item }); setShowEditModal(false); }}
              >
                <Text style={formData.industry === item ? styles.selectedText : null}>{item}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCloseText}>{tr.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Modal */}
      <Modal
        visible={languageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLanguageModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{tr.selectLanguage}</Text>

            <TouchableOpacity
              style={[styles.modalOption, locale === 'en' && styles.selectedOption]}
              onPress={() => { changeLanguage('en'); setLanguageModal(false); }}
            >
              <View style={styles.languageOptionContent}>
                <Text style={styles.languageFlag}>🇺🇸</Text>
                <View style={styles.languageOptionTexts}>
                  <Text style={[styles.languageName, locale === 'en' && styles.selectedText]}>
                    {tr.english}
                  </Text>
                  {locale === 'en' && <Text style={styles.currentLabel}>{tr.currentLanguage}</Text>}
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, locale === 'hi' && styles.selectedOption]}
              onPress={() => { changeLanguage('hi'); setLanguageModal(false); }}
            >
              <View style={styles.languageOptionContent}>
                <Text style={styles.languageFlag}>🇮🇳</Text>
                <View style={styles.languageOptionTexts}>
                  <Text style={[styles.languageName, locale === 'hi' && styles.selectedText]}>
                    {tr.hindi}
                  </Text>
                  {locale === 'hi' && <Text style={styles.currentLabel}>{tr.currentLanguage}</Text>}
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalClose} onPress={() => setLanguageModal(false)}>
              <Text style={styles.modalCloseText}>{tr.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Helper Components ──────────────────────────────────────────────────────────
const IndustryTag = ({ title }) => (
  <View style={styles.industryTag}>
    <Text style={styles.industryTagText}>{title}</Text>
  </View>
);

const StatCard = ({ title, value, subtitle, color = colors.primary }) => (
  <View style={styles.statCard}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
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

const SettingRow = ({ title, subtitle, value, onValueChange }) => (
  <View style={styles.settingRow}>
    <View style={styles.settingInfo}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingSubtitle}>{subtitle}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#767577', true: colors.success + '80' }}
      thumbColor={value ? colors.success : '#f4f3f4'}
    />
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton:      { color: colors.primary, fontSize: 16, fontWeight: '600' },
  headerTitle:     { fontSize: 18, fontWeight: 'bold', color: colors.text },
  editButton:      { paddingHorizontal: 12, paddingVertical: 6 },
  editButtonText:  { color: colors.primary, fontSize: 16, fontWeight: '600' },
  scrollContent:   { flex: 1, padding: 15 },

  profileCard:     { backgroundColor: colors.white, padding: 20, borderRadius: 16, marginBottom: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  avatarSection:   { position: 'relative', marginBottom: 15 },
  avatar:          { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText:      { color: colors.white, fontSize: 32, fontWeight: 'bold' },
  avatarBadge:     { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.success, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.white },
  avatarBadgeText: { color: colors.white, fontSize: 12, fontWeight: 'bold' },
  profileInfo:     { alignItems: 'center', marginBottom: 20 },
  profileName:     { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  companyNameText: { fontSize: 16, color: colors.primary, fontWeight: '600', marginBottom: 8 },
  profileLocation: { fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
  industryTags:    { flexDirection: 'row', gap: 8 },
  industryTag:     { backgroundColor: colors.primary + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  industryTagText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  profileStats:    { flexDirection: 'row', width: '100%', backgroundColor: colors.background, padding: 16, borderRadius: 12, justifyContent: 'space-around' },
  statItem:        { alignItems: 'center' },
  statNumber:      { fontSize: 20, fontWeight: 'bold', color: colors.text },
  statLabel:       { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  statDivider:     { width: 1, backgroundColor: colors.border },

  sectionTitle:    { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 12, marginTop: 8 },

  statsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard:        { backgroundColor: colors.white, padding: 16, borderRadius: 12, flex: 1, minWidth: '47%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  statValue:       { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  statTitle:       { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' },
  statSubtitle:    { fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 2 },

  infoCard:           { backgroundColor: colors.white, padding: 20, borderRadius: 12, marginBottom: 20 },
  infoRow:            { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border + '50' },
  infoIcon:           { fontSize: 20, marginRight: 12, width: 24 },
  infoContent:        { flex: 1 },
  infoLabel:          { fontSize: 14, color: colors.textSecondary, marginBottom: 2 },
  infoValue:          { fontSize: 16, color: colors.text, fontWeight: '500' },
  descriptionSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border + '50' },
  descriptionLabel:   { fontSize: 14, color: colors.textSecondary, marginBottom: 8, fontWeight: '600' },
  descriptionText:    { fontSize: 14, color: colors.text, lineHeight: 20 },

  settingsCard:        { backgroundColor: colors.white, borderRadius: 12, marginBottom: 20, overflow: 'hidden' },
  settingRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border + '50' },
  settingInfo:         { flex: 1 },
  settingTitle:        { fontSize: 16, color: colors.text, fontWeight: '500', marginBottom: 2 },
  settingSubtitle:     { fontSize: 14, color: colors.textSecondary },
  languageDisplay:     { flexDirection: 'row', alignItems: 'center' },
  currentLanguageText: { fontSize: 14, color: colors.primary, fontWeight: '600', marginRight: 8 },
  languageArrow:       { fontSize: 16, color: colors.textSecondary },

  actionButtons:      { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionButton:       { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryButton:      { backgroundColor: colors.primary },
  secondaryButton:    { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.primary },
  saveButton:         { backgroundColor: colors.success },
  cancelButton:       { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.error },
  primaryButtonText:  { color: colors.white, fontSize: 16, fontWeight: '600' },
  secondaryButtonText:{ color: colors.primary, fontSize: 16, fontWeight: '600' },
  saveButtonText:     { color: colors.white, fontSize: 16, fontWeight: '600' },
  cancelButtonText:   { color: colors.error, fontSize: 16, fontWeight: '600' },

  accountCard: { backgroundColor: colors.white, borderRadius: 12, marginBottom: 20, overflow: 'hidden' },
  menuItem:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border + '50' },
  menuText:    { fontSize: 16, color: colors.text },
  menuArrow:   { fontSize: 18, color: colors.textSecondary },
  logoutItem:  { borderBottomWidth: 0 },
  logoutText:  { fontSize: 16, color: colors.error, fontWeight: '600' },

  footer:     { alignItems: 'center', paddingVertical: 20 },
  footerText: { fontSize: 12, color: colors.textSecondary },

  editForm:    { width: '100%' },
  input:       { backgroundColor: colors.background, padding: 12, borderRadius: 8, fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  textArea:    { height: 100, textAlignVertical: 'top' },
  inputRow:    { flexDirection: 'row', gap: 12 },
  halfInput:   { flex: 1 },
  inputLabel:  { fontSize: 14, color: colors.textSecondary, marginBottom: 6, fontWeight: '500' },
  pickerInput: { backgroundColor: colors.background, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pickerText:  { fontSize: 16, color: colors.text },
  pickerArrow: { color: colors.textSecondary, fontSize: 12 },

  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent:   { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  modalTitle:     { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalOption:    { padding: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
  selectedOption: { backgroundColor: colors.primary + '10' },
  selectedText:   { color: colors.primary, fontWeight: '600' },
  modalClose:     { padding: 15, marginTop: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  modalCloseText: { color: colors.error, fontSize: 16, fontWeight: '600' },

  languageOptionContent: { flexDirection: 'row', alignItems: 'center' },
  languageFlag:          { fontSize: 24, marginRight: 12 },
  languageOptionTexts:   { flex: 1 },
  languageName:          { fontSize: 16, color: colors.text },
  currentLabel:          { fontSize: 12, color: colors.success, marginTop: 2, fontWeight: '600' },
});