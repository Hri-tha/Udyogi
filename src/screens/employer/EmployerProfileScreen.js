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
import { signOut } from '../../services/auth';
import { updateEmployerProfile } from '../../services/database';
import { colors } from '../../constants/colors';
import { fetchEmployerJobs } from '../../services/database';

export default function EmployerProfileScreen({ navigation }) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form state
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

  // Load profile data and stats
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
        industry: userProfile.industry || 'Manufacturing',
        companySize: userProfile.companySize || 'Small (1-50)',
        description: userProfile.description || '',
      });
    }
  };

  const loadEmployerStats = async () => {
    const result = await fetchEmployerJobs(user.uid);
    if (result.success) {
      setJobs(result.jobs);
    }
    setStatsLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!formData.companyName.trim()) {
      Alert.alert('Error', 'Please enter company name');
      return;
    }

    setLoading(true);

    const updateData = {
      ...formData,
      lastUpdated: new Date(),
    };

    const result = await updateEmployerProfile(user.uid, updateData);
    setLoading(false);

    if (result.success) {
      await refreshUserProfile();
      setEditMode(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } else {
      Alert.alert('Error', result.error || 'Failed to update profile');
    }
  };

  const handleCancelEdit = () => {
    loadProfileData();
    setEditMode(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            const result = await signOut();
            if (!result.success) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const calculateStats = () => {
    const activeJobs = jobs.filter(j => j.status === 'open').length;
    const closedJobs = jobs.filter(j => j.status === 'closed').length;
    const totalApplications = jobs.reduce((sum, j) => sum + (j.applications?.length || 0), 0);
    const acceptedApplications = jobs.reduce((sum, j) => {
      const accepted = j.applications?.filter(app => app.status === 'accepted').length || 0;
      return sum + accepted;
    }, 0);

    return {
      activeJobs,
      closedJobs,
      totalApplications,
      acceptedApplications,
      completionRate: totalApplications > 0 ? Math.round((acceptedApplications / totalApplications) * 100) : 0,
    };
  };

  const stats = calculateStats();

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          onPress={() => setEditMode(!editMode)}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>
            {editMode ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userProfile?.name?.charAt(0) || 'E'}
              </Text>
            </View>
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeText}>✓</Text>
            </View>
          </View>

          {!editMode ? (
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userProfile?.name || 'Employer'}</Text>
              <Text style={styles.companyName}>{userProfile?.companyName || 'Company Name'}</Text>
              <Text style={styles.profileLocation}>📍 {userProfile?.location || 'Add location'}</Text>
              
              <View style={styles.industryTags}>
                <IndustryTag title={userProfile?.industry || 'Industry'} />
                <IndustryTag title={userProfile?.companySize || 'Size'} />
              </View>
            </View>
          ) : (
            <View style={styles.editForm}>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={formData.name}
                onChangeText={(text) => setFormData({...formData, name: text})}
              />
              <TextInput
                style={styles.input}
                placeholder="Company Name"
                value={formData.companyName}
                onChangeText={(text) => setFormData({...formData, companyName: text})}
              />
              <TextInput
                style={styles.input}
                placeholder="Location"
                value={formData.location}
                onChangeText={(text) => setFormData({...formData, location: text})}
              />
            </View>
          )}

          <View style={styles.profileStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.activeJobs}</Text>
              <Text style={styles.statLabel}>Active Jobs</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalApplications}</Text>
              <Text style={styles.statLabel}>Applications</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile?.totalHires || 0}</Text>
              <Text style={styles.statLabel}>Total Hires</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <Text style={styles.sectionTitle}>Performance Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard 
            title="Completion Rate" 
            value={`${stats.completionRate}%`} 
            subtitle="Applications to Hire"
            color={colors.success}
          />
          <StatCard 
            title="Active Jobs" 
            value={stats.activeJobs} 
            subtitle="Currently Open"
          />
          <StatCard 
            title="Total Hires" 
            value={userProfile?.totalHires || 0} 
            subtitle="All Time"
            color={colors.warning}
          />
          <StatCard 
            title="Response Time" 
            value="<24h" 
            subtitle="Avg. Response"
            color={colors.info}
          />
        </View>

        {/* Company Information */}
        <Text style={styles.sectionTitle}>Company Information</Text>
        <View style={styles.infoCard}>
          {!editMode ? (
            <>
              <InfoRow icon="🏢" label="Industry" value={userProfile?.industry || 'Not specified'} />
              <InfoRow icon="👥" label="Company Size" value={userProfile?.companySize || 'Not specified'} />
              <InfoRow icon="📧" label="Email" value={userProfile?.email || user?.email} />
              <InfoRow icon="📱" label="Phone" value={userProfile?.phoneNumber || 'Not provided'} />
              <InfoRow icon="📍" label="Location" value={userProfile?.location || 'Not specified'} />
              
              {userProfile?.description && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.descriptionLabel}>About Company</Text>
                  <Text style={styles.descriptionText}>{userProfile.description}</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.editForm}>
              <View style={styles.inputRow}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Industry</Text>
                  <TouchableOpacity 
                    style={styles.pickerInput}
                    onPress={() => setShowEditModal(true)}
                  >
                    <Text style={styles.pickerText}>{formData.industry}</Text>
                    <Text style={styles.pickerArrow}>▼</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Company Size</Text>
                  <TouchableOpacity 
                    style={styles.pickerInput}
                    onPress={() => setShowEditModal(true)}
                  >
                    <Text style={styles.pickerText}>{formData.companySize}</Text>
                    <Text style={styles.pickerArrow}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text})}
                keyboardType="email-address"
              />
              
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                value={formData.phoneNumber}
                onChangeText={(text) => setFormData({...formData, phoneNumber: text})}
                keyboardType="phone-pad"
              />
              
              <Text style={styles.inputLabel}>Company Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell workers about your company..."
                value={formData.description}
                onChangeText={(text) => setFormData({...formData, description: text})}
                multiline
                numberOfLines={4}
              />
            </View>
          )}
        </View>

        {/* Settings */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.settingsCard}>
          <SettingRow 
            title="Push Notifications"
            subtitle="Receive job application alerts"
            value={notifications}
            onValueChange={setNotifications}
          />
          <SettingRow 
            title="Email Notifications"
            subtitle="Get updates via email"
            value={true}
            onValueChange={() => {}}
          />
          <SettingRow 
            title="Auto-close Jobs"
            subtitle="Automatically close filled positions"
            value={true}
            onValueChange={() => {}}
          />
        </View>

        {/* Action Buttons */}
        {editMode ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancelEdit}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => navigation.navigate('PostJob')}
            >
              <Text style={styles.secondaryButtonText}>📝 Post New Job</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => navigation.navigate('EmployerHome')}
            >
              <Text style={styles.primaryButtonText}>🏠 Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.accountCard}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>📊 View Analytics</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>🔄 Subscription</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuText}>❓ Help & Support</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.menuItem, styles.logoutItem]}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Member since {user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Recent'}
          </Text>
        </View>
      </ScrollView>

      {/* Industry Picker Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Industry</Text>
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => {
                setFormData({...formData, industry: 'Manufacturing'});
                setShowEditModal(false);
              }}
            >
              <Text>Manufacturing</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => {
                setFormData({...formData, industry: 'Construction'});
                setShowEditModal(false);
              }}
            >
              <Text>Construction</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => {
                setFormData({...formData, industry: 'Retail'});
                setShowEditModal(false);
              }}
            >
              <Text>Retail</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modalClose}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Helper Components
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
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
    padding: 15,
  },
  profileCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarSection: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.success,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  profileLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  industryTags: {
    flexDirection: 'row',
    gap: 8,
  },
  industryTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  industryTagText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  profileStats: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    flex: 1,
    minWidth: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  descriptionSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border + '50',
  },
  descriptionLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  settingsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.success,
  },
  cancelButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.error,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  accountCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  menuText: {
    fontSize: 16,
    color: colors.text,
  },
  menuArrow: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    fontSize: 16,
    color: colors.error,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Edit Form Styles
  editForm: {
    width: '100%',
  },
  input: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  pickerInput: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerText: {
    fontSize: 16,
    color: colors.text,
  },
  pickerArrow: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalClose: {
    padding: 15,
    marginTop: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
});

