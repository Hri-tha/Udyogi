// src/screens/employer/EmployerHomeScreen.js
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { fetchEmployerJobs } from '../../services/database';
import { colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

export default function EmployerHomeScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadJobs = async () => {
    const result = await fetchEmployerJobs(user.uid);
    if (result.success) {
      setJobs(result.jobs);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  const activeJobs = jobs.filter(j => j.status === 'open').length;
  const closedJobs = jobs.filter(j => j.status === 'closed').length;
  const totalApplications = jobs.reduce((sum, j) => sum + (j.applications?.length || 0), 0);
  const pendingApplications = jobs.reduce((sum, j) => sum + (j.applications?.filter(app => app.status === 'pending')?.length || 0), 0);

  const handleViewApplications = (jobId, jobTitle) => {
    navigation.navigate('Applications', { 
      jobId: jobId,
      jobTitle: jobTitle 
    });
  };

  const handleJobDetails = (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    Alert.alert(
      `${job.title} - Options`,
      'What would you like to do?',
      [
        {
          text: 'View Applications',
          onPress: () => navigation.navigate('Applications', { 
            jobId: jobId,
            jobTitle: job.title 
          })
        },
        {
          text: 'Job Details',
          onPress: () => {
            Alert.alert(
              'Job Details', 
              `🏢 ${job.title}\n\n📍 ${job.location}\n💰 ₹${job.rate}/hour\n⏱️ ${job.hours} hours\n\n📝 ${job.description}`,
              [{ text: 'OK' }]
            );
          }
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const StatCard = ({ value, label, subtitle, color = colors.primary, icon }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>
              Welcome back, {userProfile?.name?.split(' ')[0] || 'Employer'}! 👋
            </Text>
            <Text style={styles.subGreeting}>Here's your hiring dashboard</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('EmployerProfile')}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userProfile?.name?.charAt(0) || 'E'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats Grid */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard 
            value={activeJobs}
            label="Active Jobs"
            subtitle="Open positions"
            color={colors.primary}
            icon="📋"
          />
          <StatCard 
            value={totalApplications}
            label="Applications"
            subtitle="Total received"
            color={colors.info}
            icon="📨"
          />
          <StatCard 
            value={pendingApplications}
            label="Pending"
            subtitle="Need review"
            color={colors.warning}
            icon="⏳"
          />
          <StatCard 
            value={userProfile?.totalHires || 0}
            label="Total Hires"
            subtitle="Successful hires"
            color={colors.success}
            icon="✅"
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={styles.primaryAction}
            onPress={() => navigation.navigate('PostJob')}
          >
            <View style={styles.actionContent}>
              <Text style={styles.actionIcon}>+</Text>
              <View style={styles.actionTexts}>
                <Text style={styles.actionTitle}>Post New Job</Text>
                <Text style={styles.actionSubtitle}>Find qualified workers</Text>
              </View>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.secondaryAction}>
              <Text style={styles.secondaryActionIcon}>👥</Text>
              <Text style={styles.secondaryActionText}>My Team</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryAction}>
              <Text style={styles.secondaryActionIcon}>📊</Text>
              <Text style={styles.secondaryActionText}>Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryAction}>
              <Text style={styles.secondaryActionIcon}>⚙️</Text>
              <Text style={styles.secondaryActionText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Job Posts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Job Posts</Text>
            <View style={styles.jobCountBadge}>
              <Text style={styles.jobCountText}>{jobs.length}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading your jobs...</Text>
            </View>
          ) : jobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>💼</Text>
              <Text style={styles.emptyStateTitle}>No jobs posted yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Start hiring by posting your first job opportunity
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('PostJob')}
              >
                <Text style={styles.emptyStateButtonText}>Post Your First Job</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.jobsList}>
              {jobs.map((job) => (
                <View key={job.id} style={styles.jobCard}>
                  <TouchableOpacity 
                    onPress={() => handleJobDetails(job.id)}
                    style={styles.jobContent}
                  >
                    <View style={styles.jobHeader}>
                      <View style={styles.jobTitleSection}>
                        <Text style={styles.jobTitle}>{job.title}</Text>
                        <View style={[
                          styles.statusBadge,
                          job.status === 'open' ? styles.statusOpen : styles.statusClosed
                        ]}>
                          <Text style={styles.statusText}>
                            {job.status === 'open' ? 'Active' : 'Closed'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.jobSalary}>₹{job.rate}/hr</Text>
                    </View>
                    
                    <View style={styles.jobDetails}>
                      <View style={styles.jobDetail}>
                        <Text style={styles.jobDetailIcon}>📍</Text>
                        <Text style={styles.jobDetailText}>{job.location}</Text>
                      </View>
                      <View style={styles.jobDetail}>
                        <Text style={styles.jobDetailIcon}>⏱️</Text>
                        <Text style={styles.jobDetailText}>{job.hours} hours</Text>
                      </View>
                    </View>

                    <Text style={styles.jobDescription} numberOfLines={2}>
                      {job.description}
                    </Text>

                    <View style={styles.jobFooter}>
                      <View style={styles.applicationsInfo}>
                        <Text style={styles.applicationsIcon}>📨</Text>
                        <Text style={[
                          styles.applicationsCount,
                          (job.applications?.length || 0) > 0 && styles.hasApplications
                        ]}>
                          {job.applications?.length || 0} applications
                        </Text>
                      </View>
                      <Text style={styles.jobDate}>
                        {job.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Applications Button */}
                  {(job.applications?.length || 0) > 0 && (
                    <TouchableOpacity
                      style={styles.viewApplicationsButton}
                      onPress={() => handleViewApplications(job.id, job.title)}
                    >
                      <Text style={styles.viewApplicationsIcon}>👀</Text>
                      <Text style={styles.viewApplicationsText}>
                        View Applications ({job.applications.length})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingTop: 50,
    paddingHorizontal: 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  profileButton: {
    padding: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  avatarText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    flex: 1,
    minWidth: (width - 52) / 2,
    borderLeftWidth: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  actionsSection: {
    marginBottom: 32,
  },
  primaryAction: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    fontSize: 24,
    color: colors.white,
    marginRight: 12,
    fontWeight: '300',
  },
  actionTexts: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
    fontWeight: '400',
  },
  actionArrow: {
    fontSize: 20,
    color: colors.white,
    fontWeight: '300',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  secondaryActionIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  jobCountBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  jobCountText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.white,
    borderRadius: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyStateButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  jobsList: {
    gap: 16,
  },
  jobCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  jobContent: {
    padding: 20,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusOpen: {
    backgroundColor: colors.successLight,
  },
  statusClosed: {
    backgroundColor: colors.errorLight,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  jobSalary: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  jobDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  jobDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jobDetailIcon: {
    fontSize: 14,
    opacity: 0.7,
  },
  jobDetailText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  jobDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  applicationsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  applicationsIcon: {
    fontSize: 14,
  },
  applicationsCount: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  hasApplications: {
    color: colors.primary,
    fontWeight: '600',
  },
  jobDate: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  viewApplicationsButton: {
    backgroundColor: colors.primary,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  viewApplicationsIcon: {
    fontSize: 16,
  },
  viewApplicationsText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
});