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
import { useJob } from '../../context/JobContext';
import { colors } from '../../constants/colors';

// Simple icon component to avoid font loading issues
const Icon = ({ name, size = 24, color = colors.text, style }) => {
  const getIconChar = (iconName) => {
    const iconMap = {
      'person-circle': '👤',
      'briefcase': '💼',
      'document-text': '📄',
      'location': '📍',
      'chevron-down': '▼',
      'cash-outline': '💰',
      'location-outline': '📍',
      'checkmark-circle': '✅',
      'person': '👤',
      'notifications': '🔔',
      'briefcase-outline': '💼',
    };
    return iconMap[iconName] || '❓';
  };

  return (
    <Text style={[{
      fontSize: size,
      color: color,
    }, style]}>
      {getIconChar(name)}
    </Text>
  );
};

export default function WorkerHomeScreen({ navigation }) {
  const { user, userProfile, logout } = useAuth();
  const { jobs, loading, fetchJobs, currentLocation } = useJob();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      await fetchJobs();
    } catch (error) {
      Alert.alert('Error', 'Failed to load jobs');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const availableJobs = jobs.filter(job => job.status === 'open');
  const appliedJobs = jobs.filter(job => 
    job.applications && job.applications.includes(user?.uid)
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome back! 👋</Text>
            <Text style={styles.userName}>{userProfile?.name || 'Worker'}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('WorkerProfile')}>
            <Icon name="person-circle" size={32} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#4CAF50' }]}>
              <Icon name="briefcase" size={20} color={colors.white} />
            </View>
            <Text style={styles.statNumber}>{availableJobs.length}</Text>
            <Text style={styles.statLabel}>Available Jobs</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FF9800' }]}>
              <Icon name="document-text" size={20} color={colors.white} />
            </View>
            <Text style={styles.statNumber}>{appliedJobs.length}</Text>
            <Text style={styles.statLabel}>Applied Jobs</Text>
          </View>
        </View>

        {/* Location Filter */}
        <View style={styles.locationSection}>
          <Text style={styles.sectionTitle}>Available Jobs</Text>
          <Text style={styles.sectionSubtitle}>
            Find your next opportunity from {availableJobs.length} available jobs
          </Text>
          
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={() => navigation.navigate('LocationFilter')}
          >
            <Icon name="location" size={16} color={colors.primary} />
            <Text style={styles.locationText}>
              Showing jobs in: {currentLocation || 'All Locations'}
            </Text>
            <Icon name="chevron-down" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Jobs List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading jobs...</Text>
          </View>
        ) : availableJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="briefcase-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No jobs available</Text>
            <Text style={styles.emptySubtitle}>
              {currentLocation ? `No jobs found in ${currentLocation}. Try changing location.` : 'No jobs posted yet.'}
            </Text>
            <TouchableOpacity 
              style={styles.changeLocationButton}
              onPress={() => navigation.navigate('LocationFilter')}
            >
              <Text style={styles.changeLocationText}>Change Location</Text>
            </TouchableOpacity>
          </View>
        ) : (
          availableJobs.map((job) => {
            const hasApplied = job.applications && job.applications.includes(user?.uid);
            return (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
              >
                <View style={styles.jobHeader}>
                  <View style={styles.jobInfo}>
                    <Text style={styles.jobTitle}>{job.title}</Text>
                    <Text style={styles.jobCompany}>{job.companyName || job.company}</Text>
                  </View>
                  {hasApplied && (
                    <View style={styles.appliedBadge}>
                      <Icon name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={styles.appliedText}>Applied</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.jobDetails}>
                  <View style={styles.jobDetailItem}>
                    <Icon name="cash-outline" size={16} color={colors.success} />
                    <Text style={styles.salaryText}>₹{job.rate || job.salary}/month</Text>
                  </View>
                  
                  <View style={styles.jobDetailItem}>
                    <Icon name="location-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.locationTextSmall}>{job.location}</Text>
                  </View>
                </View>

                <View style={styles.jobFooter}>
                  <Text style={styles.jobType}>{job.jobType || 'Full-time'}</Text>
                  <Text style={styles.experienceLevel}>
                    {job.experienceLevel || 'Any experience'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.applyButton,
                    hasApplied && styles.appliedButton
                  ]}
                  onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
                  disabled={hasApplied}
                >
                  <Text style={styles.applyButtonText}>
                    {hasApplied ? 'Applied' : 'Apply Now'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('MyJobs')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#4CAF50' }]}>
                <Icon name="document-text" size={24} color={colors.white} />
              </View>
              <Text style={styles.actionText}>My Applications</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('WorkerProfile')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#2196F3' }]}>
                <Icon name="person" size={24} color={colors.white} />
              </View>
              <Text style={styles.actionText}>My Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FF9800' }]}>
                <Icon name="notifications" size={24} color={colors.white} />
              </View>
              <Text style={styles.actionText}>Notifications</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  profileButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  locationSection: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  changeLocationButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  changeLocationText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  jobCard: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  jobCompany: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  appliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  appliedText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    marginLeft: 4,
  },
  jobDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  salaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
    marginLeft: 6,
  },
  locationTextSmall: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  jobType: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  experienceLevel: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  applyButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  appliedButton: {
    backgroundColor: colors.textSecondary,
  },
  applyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickActions: {
    padding: 20,
    paddingTop: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
});