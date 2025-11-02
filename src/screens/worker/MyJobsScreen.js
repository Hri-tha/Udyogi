import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useJob } from '../../context/JobContext';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/colors';
import { fetchWorkerApplications } from '../../services/database';

const { width } = Dimensions.get('window');

const MyJobsScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [myApplications, setMyApplications] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { jobs, fetchJobs } = useJob();
  const { user, userProfile } = useAuth();

  useEffect(() => {
    loadApplications();
  }, [jobs]);

  const loadApplications = async () => {
    try {
      const applicationsResult = await fetchWorkerApplications(user.uid);
      if (applicationsResult.success) {
        setMyApplications(applicationsResult.applications);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      Alert.alert('Error', 'Failed to load applications');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  const getFilteredApplications = () => {
    if (selectedFilter === 'all') return myApplications;
    return myApplications.filter(app => app.status === selectedFilter);
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'accepted':
        return {
          color: colors.success,
          bg: colors.successLight,
          icon: '✓',
          text: 'Accepted',
          emoji: '🎉'
        };
      case 'rejected':
        return {
          color: colors.error,
          bg: colors.errorLight,
          icon: '✕',
          text: 'Rejected',
          emoji: '😔'
        };
      case 'pending':
        return {
          color: colors.warning,
          bg: colors.warningLight,
          icon: '⏱',
          text: 'Pending',
          emoji: '⏳'
        };
      default:
        return {
          color: colors.textSecondary,
          bg: colors.gray200,
          icon: '•',
          text: status,
          emoji: '📋'
        };
    }
  };

  const getStatsData = () => {
    const total = myApplications.length;
    const accepted = myApplications.filter(a => a.status === 'accepted').length;
    const pending = myApplications.filter(a => a.status === 'pending').length;
    const rejected = myApplications.filter(a => a.status === 'rejected').length;
    
    return { total, accepted, pending, rejected };
  };

  const stats = getStatsData();
  const filteredApplications = getFilteredApplications();

  const FilterButton = ({ label, value, count }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === value && styles.filterButtonActive
      ]}
      onPress={() => setSelectedFilter(value)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedFilter === value && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
      {count > 0 && (
        <View style={[
          styles.filterBadge,
          selectedFilter === value && styles.filterBadgeActive
        ]}>
          <Text style={[
            styles.filterBadgeText,
            selectedFilter === value && styles.filterBadgeTextActive
          ]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const StatCard = ({ label, value, color, icon }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const handleViewLocation = (application) => {
    if (application.locationShared) {
      navigation.navigate('JobLocation', { 
        application,
        isEmployer: false 
      });
    } else {
      Alert.alert('Location Not Available', 'The employer has not shared their location yet.');
    }
  };

  const handleOpenChat = (application) => {
    if (application.chatEnabled) {
      navigation.navigate('ChatScreen', {
        applicationId: application.id,
        otherUser: application.employerId,
        jobTitle: application.jobTitle,
        otherUserName: application.companyName || 'Employer'
      });
    } else {
      Alert.alert('Chat Not Available', 'Chat is not yet enabled for this application.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.userName}>{userProfile?.name || 'Worker'} 👋</Text>
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.headerStatsText}>{stats.total}</Text>
          <Text style={styles.headerStatsLabel}>Applications</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <StatCard 
            label="Accepted" 
            value={stats.accepted} 
            color={colors.success}
            icon="✓"
          />
          <StatCard 
            label="Pending" 
            value={stats.pending} 
            color={colors.warning}
            icon="⏱"
          />
          <StatCard 
            label="Total" 
            value={stats.total} 
            color={colors.primary}
            icon="📊"
          />
        </View>

        {/* Filter Buttons */}
        <View style={styles.filtersSection}>
          <Text style={styles.sectionTitle}>Filter Applications</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            <FilterButton label="All" value="all" count={stats.total} />
            <FilterButton label="Accepted" value="accepted" count={stats.accepted} />
            <FilterButton label="Pending" value="pending" count={stats.pending} />
            <FilterButton label="Rejected" value="rejected" count={stats.rejected} />
          </ScrollView>
        </View>

        {/* Applications List */}
        <View style={styles.applicationsSection}>
          <Text style={styles.sectionTitle}>
            {selectedFilter === 'all' ? 'All Applications' : `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Applications`}
          </Text>
          
          {filteredApplications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>
                {selectedFilter === 'all' ? '📋' : getStatusConfig(selectedFilter).emoji}
              </Text>
              <Text style={styles.emptyText}>
                {selectedFilter === 'all' 
                  ? 'No applications yet' 
                  : `No ${selectedFilter} applications`}
              </Text>
              <Text style={styles.emptySubtext}>
                {selectedFilter === 'all'
                  ? 'Start applying to jobs and track them here'
                  : 'Try selecting a different filter'}
              </Text>
              {selectedFilter === 'all' && (
                <TouchableOpacity 
                  style={styles.ctaButton}
                  onPress={() => navigation.navigate('WorkerHome')}
                >
                  <Text style={styles.ctaButtonText}>Browse Jobs</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredApplications.map((application, index) => {
              const statusConfig = getStatusConfig(application.status);
              
              return (
                <View key={application.id} style={styles.applicationCard}>
                  {/* Card Header */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('JobDetails', { jobId: application.jobId })}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                        <View style={styles.cardHeaderText}>
                          <Text style={styles.jobTitle} numberOfLines={1}>
                            {application.jobTitle}
                          </Text>
                          <Text style={styles.companyName} numberOfLines={1}>
                            {application.companyName}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                          {statusConfig.icon} {statusConfig.text}
                        </Text>
                      </View>
                    </View>

                    {/* Card Details */}
                    <View style={styles.cardDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailIcon}>📅</Text>
                        <Text style={styles.detailText}>
                          Applied {application.appliedAt?.toDate().toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Text>
                      </View>
                      {application.salary && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailIcon}>💰</Text>
                          <Text style={styles.detailText}>₹{application.salary}/day</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Status-specific Actions */}
                  {application.status === 'accepted' && (
                    <View style={styles.acceptedSection}>
                      <View style={styles.congratsBox}>
                        <Text style={styles.congratsEmoji}>🎉</Text>
                        <Text style={styles.congratsText}>
                          Congratulations! You've been selected for this job.
                        </Text>
                      </View>
                      
                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity 
                          style={[styles.actionButton, styles.locationButton]}
                          onPress={() => handleViewLocation(application)}
                        >
                          <Text style={styles.actionButtonIcon}>📍</Text>
                          <Text style={styles.actionButtonLabel}>Location</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.actionButton, styles.chatButton]}
                          onPress={() => handleOpenChat(application)}
                        >
                          <Text style={styles.actionButtonIcon}>💬</Text>
                          <Text style={styles.actionButtonLabel}>Chat</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.actionButton, styles.detailsButton]}
                          onPress={() => navigation.navigate('JobDetails', { jobId: application.jobId })}
                        >
                          <Text style={styles.actionButtonIcon}>📋</Text>
                          <Text style={styles.actionButtonLabel}>Details</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {application.status === 'pending' && (
                    <View style={styles.pendingSection}>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoIcon}>⏳</Text>
                        <Text style={styles.infoText}>
                          Your application is being reviewed by the employer
                        </Text>
                      </View>
                    </View>
                  )}

                  {application.status === 'rejected' && (
                    <View style={styles.rejectedSection}>
                      <View style={styles.infoBox}>
                        <Text style={styles.infoIcon}>💼</Text>
                        <Text style={styles.infoText}>
                          Keep trying! More opportunities are waiting for you.
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.secondaryButton}
                        onPress={() => navigation.navigate('WorkerHome')}
                      >
                        <Text style={styles.secondaryButtonText}>Find Similar Jobs</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
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
  headerStats: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 70,
  },
  headerStatsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerStatsLabel: {
    fontSize: 11,
    color: colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filtersSection: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  filterBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
    minWidth: 24,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  filterBadgeTextActive: {
    color: colors.white,
  },
  applicationsSection: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  applicationCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  acceptedSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  congratsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  congratsEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  congratsText: {
    flex: 1,
    fontSize: 14,
    color: colors.successText,
    fontWeight: '600',
    lineHeight: 20,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
  },
  locationButton: {
    backgroundColor: colors.info + '20',
  },
  chatButton: {
    backgroundColor: colors.primary + '20',
  },
  detailsButton: {
    backgroundColor: colors.gray200,
  },
  actionButtonIcon: {
    fontSize: 20,
  },
  actionButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  pendingSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rejectedSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    padding: 12,
    borderRadius: 12,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    lineHeight: 18,
  },
  secondaryButton: {
    backgroundColor: colors.primary + '15',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    backgroundColor: colors.white,
    borderRadius: 16,
    marginTop: 8,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.4,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  ctaButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 24,
  },
});

export default MyJobsScreen;