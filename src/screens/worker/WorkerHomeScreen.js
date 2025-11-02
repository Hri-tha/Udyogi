// src/screens/worker/WorkerHomeScreen.js
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
import { useJob } from '../../context/JobContext';
import { colors } from '../../constants/colors';
import { fetchWorkerApplications } from '../../services/database';

const { width } = Dimensions.get('window');

// Simple icon component
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
      'checkmark-circle': '✓',
      'person': '👤',
      'notifications': '🔔',
      'briefcase-outline': '💼',
      'time': '⏰',
      'trending': '📈',
      'star': '⭐',
      'filter': '🔍',
    };
    return iconMap[iconName] || '❓';
  };

  return (
    <Text style={[{ fontSize: size, color: color }, style]}>
      {getIconChar(name)}
    </Text>
  );
};

export default function WorkerHomeScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  const { jobs, loading, fetchJobs, currentLocation } = useJob();
  const [refreshing, setRefreshing] = useState(false);
  const [myApplications, setMyApplications] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await fetchJobs();
      await loadApplications();
    } catch (error) {
      Alert.alert('Error', 'Failed to load jobs');
    }
  };

  const loadApplications = async () => {
    try {
      const result = await fetchWorkerApplications(user.uid);
      if (result.success) {
        setMyApplications(result.applications);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Get accepted job IDs to filter them out
  const acceptedJobIds = myApplications
    .filter(app => app.status === 'accepted')
    .map(app => app.jobId);

  // Get pending job IDs
  const pendingJobIds = myApplications
    .filter(app => app.status === 'pending')
    .map(app => app.jobId);

  // Filter jobs: exclude accepted jobs, show only open jobs
  const availableJobs = jobs.filter(job => 
    job.status === 'open' && !acceptedJobIds.includes(job.id)
  );

  // Further filter by category
  const getFilteredJobs = () => {
    if (selectedCategory === 'all') return availableJobs;
    if (selectedCategory === 'applied') {
      return availableJobs.filter(job => pendingJobIds.includes(job.id));
    }
    if (selectedCategory === 'new') {
      return availableJobs.filter(job => !pendingJobIds.includes(job.id));
    }
    return availableJobs;
  };

  const filteredJobs = getFilteredJobs();

  const CategoryButton = ({ label, value, icon, count }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === value && styles.categoryButtonActive
      ]}
      onPress={() => setSelectedCategory(value)}
    >
      <Text style={styles.categoryIcon}>{icon}</Text>
      <View style={styles.categoryContent}>
        <Text style={[
          styles.categoryLabel,
          selectedCategory === value && styles.categoryLabelActive
        ]}>
          {label}
        </Text>
        <Text style={[
          styles.categoryCount,
          selectedCategory === value && styles.categoryCountActive
        ]}>
          {count} jobs
        </Text>
      </View>
    </TouchableOpacity>
  );

  const QuickStatCard = ({ icon, value, label, color, onPress }) => (
    <TouchableOpacity 
      style={[styles.quickStatCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickStatIcon, { backgroundColor: color + '20' }]}>
        <Text style={styles.quickStatIconText}>{icon}</Text>
      </View>
      <View style={styles.quickStatContent}>
        <Text style={styles.quickStatValue}>{value}</Text>
        <Text style={styles.quickStatLabel}>{label}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header with Gradient Effect */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeText}>Welcome back! 👋</Text>
              <Text style={styles.userName}>{userProfile?.name || 'Worker'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.profileButton} 
              onPress={() => navigation.navigate('WorkerProfile')}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {userProfile?.name?.charAt(0) || 'W'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Quick Stats Row */}
          <View style={styles.quickStatsRow}>
            <QuickStatCard
              icon="💼"
              value={availableJobs.length}
              label="Available"
              color={colors.primary}
              onPress={() => setSelectedCategory('new')}
            />
            <QuickStatCard
              icon="⏳"
              value={pendingJobIds.length}
              label="Pending"
              color={colors.warning}
              onPress={() => setSelectedCategory('applied')}
            />
            <QuickStatCard
              icon="✓"
              value={acceptedJobIds.length}
              label="Accepted"
              color={colors.success}
              onPress={() => navigation.navigate('MyJobs')}
            />
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Location Filter */}
        <View style={styles.locationSection}>
          <View style={styles.locationHeader}>
            <View>
              <Text style={styles.sectionTitle}>Find Your Next Job</Text>
              <Text style={styles.sectionSubtitle}>
                {filteredJobs.length} opportunities waiting for you
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Text style={styles.notificationIcon}>🔔</Text>
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>2</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.locationButton}
            onPress={() => navigation.navigate('LocationFilter')}
          >
            <View style={styles.locationIconContainer}>
              <Text style={styles.locationIcon}>📍</Text>
            </View>
            <Text style={styles.locationText}>
              {currentLocation || 'All Locations'}
            </Text>
            <Text style={styles.locationArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Category Filter */}
        <View style={styles.categorySection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            <CategoryButton
              label="All Jobs"
              value="all"
              icon="💼"
              count={availableJobs.length}
            />
            <CategoryButton
              label="New Jobs"
              value="new"
              icon="✨"
              count={availableJobs.filter(job => !pendingJobIds.includes(job.id)).length}
            />
            <CategoryButton
              label="Applied"
              value="applied"
              icon="📝"
              count={pendingJobIds.length}
            />
          </ScrollView>
        </View>

        {/* Jobs List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Finding perfect jobs for you...</Text>
          </View>
        ) : filteredJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>
              {selectedCategory === 'applied' ? '📝' : '🔍'}
            </Text>
            <Text style={styles.emptyTitle}>
              {selectedCategory === 'applied' 
                ? 'No Applied Jobs' 
                : 'No Jobs Available'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedCategory === 'applied'
                ? 'Start applying to jobs to track them here'
                : currentLocation 
                  ? `No jobs found in ${currentLocation}. Try changing location.`
                  : 'New opportunities will appear here soon.'}
            </Text>
            {selectedCategory !== 'applied' && (
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => navigation.navigate('LocationFilter')}
              >
                <Text style={styles.emptyButtonText}>Change Location</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.jobsContainer}>
            {filteredJobs.map((job, index) => {
              const hasApplied = pendingJobIds.includes(job.id);
              const isNew = !hasApplied && new Date() - new Date(job.createdAt) < 7 * 24 * 60 * 60 * 1000;
              
              return (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
                  activeOpacity={0.7}
                >
                  {/* Card Header */}
                  <View style={styles.jobCardHeader}>
                    <View style={styles.companyLogo}>
                      <Text style={styles.companyLogoText}>
                        {job.companyName?.charAt(0) || '🏢'}
                      </Text>
                    </View>
                    <View style={styles.jobCardHeaderInfo}>
                      <View style={styles.jobTitleRow}>
                        <Text style={styles.jobTitle} numberOfLines={1}>
                          {job.title}
                        </Text>
                        {isNew && (
                          <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>NEW</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.jobCompany} numberOfLines={1}>
                        {job.companyName || job.company}
                      </Text>
                    </View>
                  </View>

                  {/* Job Details Grid */}
                  <View style={styles.jobDetailsGrid}>
                    <View style={styles.jobDetailBox}>
                      <Text style={styles.jobDetailIcon}>💰</Text>
                      <Text style={styles.jobDetailValue}>
                        ₹{job.rate || job.salary}
                      </Text>
                      <Text style={styles.jobDetailLabel}>per hour</Text>
                    </View>
                    
                    <View style={styles.jobDetailBox}>
                      <Text style={styles.jobDetailIcon}>📍</Text>
                      <Text style={styles.jobDetailValue} numberOfLines={1}>
                        {job.location?.split(',')[0] || job.location}
                      </Text>
                      <Text style={styles.jobDetailLabel}>location</Text>
                    </View>
                    
                    <View style={styles.jobDetailBox}>
                      <Text style={styles.jobDetailIcon}>⏰</Text>
                      <Text style={styles.jobDetailValue}>
                        {job.duration || 'Flexible'}
                      </Text>
                      <Text style={styles.jobDetailLabel}>duration</Text>
                    </View>
                  </View>

                  {/* Job Tags */}
                  <View style={styles.jobTags}>
                    <View style={styles.jobTag}>
                      <Text style={styles.jobTagText}>{job.jobType || 'Full-time'}</Text>
                    </View>
                    <View style={styles.jobTag}>
                      <Text style={styles.jobTagText}>
                        {job.experienceLevel || 'Any Experience'}
                      </Text>
                    </View>
                  </View>

                  {/* Action Button */}
                  <TouchableOpacity
                    style={[
                      styles.jobActionButton,
                      hasApplied && styles.jobActionButtonApplied
                    ]}
                    onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
                  >
                    {hasApplied ? (
                      <>
                        <Text style={styles.jobActionIcon}>✓</Text>
                        <Text style={[styles.jobActionText, styles.jobActionTextApplied]}>
                          Application Pending
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.jobActionText}>Apply Now</Text>
                        <Text style={styles.jobActionArrow}>→</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

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
  headerContainer: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.white,
  },
  profileButton: {
    padding: 4,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderLeftWidth: 3,
  },
  quickStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  quickStatIconText: {
    fontSize: 20,
  },
  quickStatContent: {
    flex: 1,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  quickStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  locationSection: {
    padding: 20,
    paddingBottom: 10,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  notificationButton: {
    position: 'relative',
  },
  notificationIcon: {
    fontSize: 24,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  locationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationIcon: {
    fontSize: 18,
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  locationArrow: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  categorySection: {
    paddingVertical: 10,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    minWidth: 130,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  categoryContent: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  categoryLabelActive: {
    color: colors.white,
  },
  categoryCount: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryCountActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    marginHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 16,
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: 16,
    opacity: 0.4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  jobsContainer: {
    padding: 20,
    paddingTop: 10,
  },
  jobCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  companyLogoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  jobCardHeaderInfo: {
    flex: 1,
  },
  jobTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  newBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
  },
  jobCompany: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  jobDetailsGrid: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  jobDetailBox: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  jobDetailIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  jobDetailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  jobDetailLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  jobTags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  jobTag: {
    backgroundColor: colors.gray200,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  jobTagText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  jobActionButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobActionButtonApplied: {
    backgroundColor: colors.warning + '20',
  },
  jobActionIcon: {
    fontSize: 16,
    color: colors.warning,
    marginRight: 6,
  },
  jobActionText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.white,
  },
  jobActionTextApplied: {
    color: colors.warning,
  },
  jobActionArrow: {
    fontSize: 18,
    color: colors.white,
    marginLeft: 6,
  },
  bottomSpacing: {
    height: 24,
  },
});