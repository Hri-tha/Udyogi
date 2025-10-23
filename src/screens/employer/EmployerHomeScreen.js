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
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { signOut } from '../../services/auth';
import { fetchEmployerJobs } from '../../services/database';
import { colors } from '../../constants/colors';

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

  const activeJobs = jobs.filter(j => j.status === 'open').length;
  const totalApplications = jobs.reduce((sum, j) => sum + (j.applications?.length || 0), 0);

  const handleViewApplications = (jobId, jobTitle) => {
    navigation.navigate('Applications', { 
      jobId: jobId,
      jobTitle: jobTitle 
    });
  };

  const handleJobDetails = (jobId) => {
    // You can navigate to job details or show job details modal
    Alert.alert(
      'Job Options',
      'What would you like to do?',
      [
        {
          text: 'View Applications',
          onPress: () => {
            const job = jobs.find(j => j.id === jobId);
            navigation.navigate('Applications', { 
              jobId: jobId,
              jobTitle: job.title 
            });
          }
        },
        {
          text: 'View Job Details',
          onPress: () => {
            // Navigate to job details screen if you have one
            Alert.alert('Job Details', 'This would show job details');
          }
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>
            Hello, {userProfile?.name}! 👋
          </Text>
          <Text style={styles.subGreeting}>Manage your workforce</Text>
        </View>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeJobs}</Text>
            <Text style={styles.statLabel}>Active Jobs</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalApplications}</Text>
            <Text style={styles.statLabel}>Applications</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {userProfile?.totalHires || 0}
            </Text>
            <Text style={styles.statLabel}>Total Hires</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.postJobButton}
          onPress={() => navigation.navigate('PostJob')}
        >
          <Text style={styles.postJobButtonText}>➕ Post New Job</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Job Posts</Text>
          <Text style={styles.jobCount}>{jobs.length} jobs</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : jobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📋</Text>
            <Text style={styles.emptyStateText}>No jobs posted yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Click the button above to post your first job
            </Text>
          </View>
        ) : (
          jobs.map((job) => (
            <View key={job.id} style={styles.jobCard}>
              <TouchableOpacity 
                onPress={() => handleJobDetails(job.id)}
                style={styles.jobContent}
              >
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <View style={[
                    styles.statusBadge,
                    job.status === 'open' && styles.statusOpen,
                    job.status === 'closed' && styles.statusClosed
                  ]}>
                    <Text style={styles.statusText}>
                      {job.status === 'open' ? 'Open' : 'Closed'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.jobLocation}>📍 {job.location}</Text>
                <Text style={styles.jobDescription} numberOfLines={2}>
                  {job.description}
                </Text>
                <View style={styles.jobFooter}>
                  <Text style={styles.jobDetail}>₹{job.rate}/hr • {job.hours}hrs</Text>
                  <Text style={[
                    styles.jobApplications,
                    job.applications?.length > 0 && styles.hasApplications
                  ]}>
                    {job.applications?.length || 0} applications
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Applications Button */}
              <TouchableOpacity
                style={[
                  styles.viewApplicationsButton,
                  (!job.applications || job.applications.length === 0) && styles.disabledButton
                ]}
                onPress={() => handleViewApplications(job.id, job.title)}
                disabled={!job.applications || job.applications.length === 0}
              >
                <Text style={styles.viewApplicationsText}>
                  {job.applications?.length > 0 
                    ? `View Applications (${job.applications.length})` 
                    : 'No Applications'
                  }
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  subGreeting: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  postJobButton: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postJobButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  jobCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  jobCard: {
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  jobContent: {
    marginBottom: 10,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusOpen: {
    backgroundColor: colors.success + '20',
  },
  statusClosed: {
    backgroundColor: colors.error + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  jobLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  jobDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  jobApplications: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  hasApplications: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  viewApplicationsButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: colors.textSecondary,
  },
  viewApplicationsText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyStateIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});