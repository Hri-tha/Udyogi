// src/screens/employer/EmployerHomeScreen.js - UPDATED WITH FUTURE/PAST JOBS
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
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { 
  fetchAllEmployerJobs,
  fetchJobApplications,
  deletePastJob 
} from '../../services/database';
import { colors } from '../../constants/colors';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function EmployerHomeScreen({ navigation }) {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [futureJobs, setFutureJobs] = useState([]);
  const [pastJobs, setPastJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPastJobs, setShowPastJobs] = useState(false);

  // Use useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('EmployerHomeScreen focused, loading data...');
      loadData();
    }, [user?.uid])
  );

  const loadData = async () => {
    try {
      console.log('Loading employer data for:', user?.uid);
      await loadJobs();
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
      if (!user?.uid) {
        console.log('No user ID available');
        return;
      }

      console.log('Fetching all jobs for employer:', user.uid);
      const result = await fetchAllEmployerJobs(user.uid);
      console.log('Jobs fetch result:', result);
      
      if (result.success) {
        // Fetch applications for each future job
        const futureJobsWithApps = await Promise.all(
          result.futureJobs.map(async (job) => {
            const appsResult = await fetchJobApplications(job.id);
            return {
              ...job,
              applications: appsResult.success ? appsResult.applications : []
            };
          })
        );
        
        // Fetch applications for each past job
        const pastJobsWithApps = await Promise.all(
          result.pastJobs.map(async (job) => {
            const appsResult = await fetchJobApplications(job.id);
            return {
              ...job,
              applications: appsResult.success ? appsResult.applications : []
            };
          })
        );
        
        console.log('Future jobs loaded:', futureJobsWithApps.length);
        console.log('Past jobs loaded:', pastJobsWithApps.length);
        
        setFutureJobs(futureJobsWithApps);
        setPastJobs(pastJobsWithApps);
      } else {
        console.error('Failed to load jobs:', result.error);
        Alert.alert('Error', 'Failed to load jobs: ' + result.error);
      }
    } catch (error) {
      console.error('Exception loading jobs:', error);
      Alert.alert('Error', 'An error occurred while loading jobs');
    }
  };

  const onRefresh = () => {
    console.log('Refreshing employer home...');
    setRefreshing(true);
    loadData();
  };

  const handleDeletePastJob = (job) => {
    Alert.alert(
      '🗑️ Delete Past Job',
      `Are you sure you want to delete "${job.title}"?\n\nDate: ${job.jobDate}\nLocation: ${job.location}\n\nThis action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deletePastJob(job.id, user.uid);
              
              if (result.success) {
                Alert.alert('✅ Success', result.message || 'Past job deleted successfully');
                loadData(); // Refresh data
              } else {
                Alert.alert('❌ Error', result.error);
              }
            } catch (error) {
              console.error('Error deleting past job:', error);
              Alert.alert('Error', 'Failed to delete past job');
            }
          }
        }
      ]
    );
  };

  const handleJobOptions = (job, isPastJob = false) => {
    const options = [
      {
        text: '👁 View Applications',
        onPress: () => navigation.navigate('Applications', { 
          jobId: job.id,
          jobTitle: job.title 
        })
      },
      {
        text: '📋 Job Details',
        onPress: () => {
          const completedApps = job.applications?.filter(app => app.status === 'completed').length || 0;
          Alert.alert(
            job.title, 
            `📍 Location: ${job.location}\n💰 Rate: ₹${job.rate}/hour\n⏱️ Duration: ${job.hours || job.expectedDuration} hours\n📅 Date: ${job.jobDate || 'Not specified'}\n🕐 Time: ${job.startTime} - ${job.endTime}\n📝 Status: ${job.status}\n📊 Applications: ${job.applications?.length || 0}\n✅ Completed: ${completedApps}\n\n${job.description}`,
            [{ text: 'OK' }]
          );
        }
      }
    ];

    // Add Delete option for past jobs
    if (isPastJob) {
      options.push({
        text: '🗑 Delete Job',
        onPress: () => handleDeletePastJob(job),
        style: 'destructive'
      });
    }

    options.push({
      text: 'Cancel',
      style: 'cancel',
    });

    Alert.alert(`${job.title}`, 'Choose an action:', options);
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

  // Format job date for display
  const formatJobDate = (jobDate, startTime) => {
    if (!jobDate) return 'Date not set';
    
    const date = new Date(jobDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today${startTime ? `, ${startTime}` : ''}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow${startTime ? `, ${startTime}` : ''}`;
    } else {
      return `${date.toLocaleDateString()}${startTime ? `, ${startTime}` : ''}`;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

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
            value={futureJobs.length}
            label="Upcoming Jobs"
            subtitle="Future dates"
            color={colors.primary}
            icon="📅"
          />
          <StatCard 
            value={pastJobs.length}
            label="Past Jobs"
            subtitle="Completed/Expired"
            color={colors.info}
            icon="📝"
          />
          <StatCard 
            value={futureJobs.reduce((sum, job) => sum + (job.applications?.length || 0), 0)}
            label="Applications"
            subtitle="Total received"
            color={colors.success}
            icon="📨"
          />
          <StatCard 
            value={pastJobs.reduce((sum, job) => sum + (job.applications?.filter(app => app.status === 'completed').length || 0), 0)}
            label="Total Hires"
            subtitle="Completed work"
            color={colors.warning}
            icon="🎯"
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
            <TouchableOpacity 
              style={styles.secondaryAction}
              onPress={() => navigation.navigate('Applications')}
            >
              <Text style={styles.secondaryActionIcon}>👥</Text>
              <Text style={styles.secondaryActionText}>Applications</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.secondaryAction}
              onPress={() => setShowPastJobs(true)}
            >
              <Text style={styles.secondaryActionIcon}>📚</Text>
              <Text style={styles.secondaryActionText}>Past Jobs</Text>
              {pastJobs.length > 0 && (
                <View style={styles.pastJobsBadge}>
                  <Text style={styles.pastJobsBadgeText}>{pastJobs.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.secondaryAction}
              onPress={() => navigation.navigate('EmployerProfile')}
            >
              <Text style={styles.secondaryActionIcon}>⚙️</Text>
              <Text style={styles.secondaryActionText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upcoming Job Posts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Jobs</Text>
            <View style={styles.jobCountBadge}>
              <Text style={styles.jobCountText}>{futureJobs.length}</Text>
            </View>
          </View>

          {futureJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📅</Text>
              <Text style={styles.emptyStateTitle}>No upcoming jobs</Text>
              <Text style={styles.emptyStateSubtitle}>
                Post a new job to find workers for future dates
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('PostJob')}
              >
                <Text style={styles.emptyStateButtonText}>Post New Job</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.jobsList}>
              {futureJobs.map((job) => {
                const completedCount = job.applications?.filter(app => app.status === 'completed').length || 0;
                
                return (
                  <View key={job.id} style={styles.jobCard}>
                    <TouchableOpacity 
                      onPress={() => handleJobOptions(job, false)}
                      style={styles.jobContent}
                    >
                      <View style={styles.jobHeader}>
                        <View style={styles.jobTitleSection}>
                          <Text style={styles.jobTitle}>{job.title}</Text>
                          <View style={[
                            styles.statusBadge,
                            job.status === 'open' && styles.statusOpen,
                            job.status === 'closed' && styles.statusCompleted,
                            job.status === 'cancelled' && styles.statusCancelled
                          ]}>
                            <Text style={styles.statusText}>
                              {job.status === 'open' ? '🟢 Active' : 
                               job.status === 'closed' ? '🔴 Closed' : 
                               '🔴 Cancelled'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.jobSalary}>₹{job.rate}/hr</Text>
                      </View>
                      
                      {/* Job Date */}
                      <View style={styles.jobDateSection}>
                        <Text style={styles.jobDateIcon}>📅</Text>
                        <Text style={styles.jobDateText}>
                          {formatJobDate(job.jobDate, job.startTime)}
                        </Text>
                      </View>

                      <View style={styles.jobDetails}>
                        <View style={styles.jobDetail}>
                          <Text style={styles.jobDetailIcon}>📍</Text>
                          <Text style={styles.jobDetailText}>{job.location}</Text>
                        </View>
                        <View style={styles.jobDetail}>
                          <Text style={styles.jobDetailIcon}>⏱️</Text>
                          <Text style={styles.jobDetailText}>
                            {job.hours || job.expectedDuration} hours
                          </Text>
                        </View>
                      </View>

                      {/* Show completed count if any */}
                      {completedCount > 0 && (
                        <View style={styles.completedBadge}>
                          <Text style={styles.completedBadgeText}>
                            ✅ {completedCount} worker{completedCount > 1 ? 's' : ''} completed
                          </Text>
                        </View>
                      )}

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
                      </View>
                    </TouchableOpacity>

                    {/* Quick Actions for Job */}
                    <View style={styles.jobActions}>
                      {(job.applications?.length || 0) > 0 && (
                        <TouchableOpacity
                          style={[styles.jobActionButton, styles.viewAppsButton]}
                          onPress={() => navigation.navigate('Applications', { 
                            jobId: job.id, 
                            jobTitle: job.title 
                          })}
                        >
                          <Text style={styles.jobActionText}>
                            👀 View ({job.applications.length})
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Past Jobs Modal */}
      <Modal
        visible={showPastJobs}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPastJobs(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Past Jobs</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowPastJobs(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {pastJobs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📝</Text>
                <Text style={styles.emptyStateTitle}>No past jobs</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Completed and expired jobs will appear here
                </Text>
              </View>
            ) : (
              <View style={styles.jobsList}>
                {pastJobs.map((job) => {
                  const completedCount = job.applications?.filter(app => app.status === 'completed').length || 0;
                  const totalApps = job.applications?.length || 0;
                  
                  return (
                    <View key={job.id} style={styles.jobCard}>
                      <TouchableOpacity 
                        onPress={() => handleJobOptions(job, true)}
                        style={styles.jobContent}
                      >
                        <View style={styles.jobHeader}>
                          <View style={styles.jobTitleSection}>
                            <Text style={styles.jobTitle}>{job.title}</Text>
                            <View style={[
                              styles.statusBadge,
                              completedCount > 0 ? styles.statusCompleted : styles.statusExpired
                            ]}>
                              <Text style={styles.statusText}>
                                {completedCount > 0 ? '✅ Completed' : '📅 Expired'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.jobSalary}>₹{job.rate}/hr</Text>
                        </View>
                        
                        {/* Job Date */}
                        <View style={styles.jobDateSection}>
                          <Text style={styles.jobDateIcon}>📅</Text>
                          <Text style={styles.jobDateText}>
                            {job.jobDate ? new Date(job.jobDate).toLocaleDateString() : 'Date not set'}
                            {job.startTime ? `, ${job.startTime}` : ''}
                          </Text>
                        </View>

                        <View style={styles.jobDetails}>
                          <View style={styles.jobDetail}>
                            <Text style={styles.jobDetailIcon}>📍</Text>
                            <Text style={styles.jobDetailText}>{job.location}</Text>
                          </View>
                          <View style={styles.jobDetail}>
                            <Text style={styles.jobDetailIcon}>👥</Text>
                            <Text style={styles.jobDetailText}>
                              {totalApps} application{totalApps !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>

                        {/* Completion Stats */}
                        <View style={styles.completionStats}>
                          <Text style={styles.completionText}>
                            {completedCount} of {totalApps} completed
                          </Text>
                        </View>

                        <Text style={styles.jobDescription} numberOfLines={2}>
                          {job.description}
                        </Text>
                      </TouchableOpacity>

                      {/* Delete Button for Past Jobs */}
                      <View style={styles.jobActions}>
                        <TouchableOpacity
                          style={[styles.jobActionButton, styles.deleteButton]}
                          onPress={() => handleDeletePastJob(job)}
                        >
                          <Text style={styles.deleteButtonText}>🗑 Delete</Text>
                        </TouchableOpacity>
                        
                        {totalApps > 0 && (
                          <TouchableOpacity
                            style={[styles.jobActionButton, styles.viewAppsButton]}
                            onPress={() => {
                              setShowPastJobs(false);
                              navigation.navigate('Applications', { 
                                jobId: job.id, 
                                jobTitle: job.title 
                              });
                            }}
                          >
                            <Text style={styles.jobActionText}>
                              View Apps ({totalApps})
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
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
    position: 'relative',
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
  pastJobsBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.info,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  pastJobsBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
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
  statusCompleted: {
    backgroundColor: colors.success + '30',
  },
  statusExpired: {
    backgroundColor: colors.warning + '30',
  },
  statusCancelled: {
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
  jobDateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  jobDateIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  jobDateText: {
    fontSize: 14,
    fontWeight: '600',
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
  completedBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  completedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },
  completionStats: {
    backgroundColor: colors.info + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  completionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.info,
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
  jobActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  jobActionButton: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAppsButton: {
    backgroundColor: colors.primary,
    borderRightWidth: 1,
    borderRightColor: colors.white,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  jobActionText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.white,
    paddingTop: 50,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
});