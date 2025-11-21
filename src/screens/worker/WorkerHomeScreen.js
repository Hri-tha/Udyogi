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
  TextInput,
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
      'search': '🔍',
      'close': '✕',
    };
    return iconMap[iconName] || '❓';
  };

  return (
    <Text style={[{ fontSize: size, color: color }, style]}>
      {getIconChar(name)}
    </Text>
  );
};

// Improved job categories with better sizing
const DEFAULT_CATEGORIES = [
  { id: 'all', label: 'All', icon: '💼' },
  { id: 'daily-worker', label: 'Daily Worker', icon: '🔨' },
  { id: 'barber', label: 'Barber', icon: '💈' },
  { id: 'tailor', label: 'Tailor', icon: '🧵' },
  { id: 'coder', label: 'Coder', icon: '💻' },
  { id: 'driver', label: 'Driver', icon: '🚗' },
  { id: 'cleaner', label: 'Cleaner', icon: '🧹' },
  { id: 'cook', label: 'Cook', icon: '👨‍🍳' },
  { id: 'delivery', label: 'Delivery', icon: '📦' },
];

export default function WorkerHomeScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  const { jobs, loading, fetchJobs, currentLocation } = useJob();
  const [refreshing, setRefreshing] = useState(false);
  const [myApplications, setMyApplications] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 Screen focused - reloading applications');
      loadApplications();
    });

    return unsubscribe;
  }, [navigation]);

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
        console.log('✅ Loaded applications:', result.applications.length);
        console.log('📋 Application Job IDs:', result.applications.map(a => `${a.jobId} (${a.status})`));
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

  const appliedJobIds = myApplications.map(app => app.jobId);

  const availableJobs = jobs.filter(job => {
    const isOpen = job.status === 'open';
    const notApplied = !appliedJobIds.includes(job.id);
    
    if (isOpen && !notApplied) {
      console.log(`🚫 Hiding applied job: "${job.title}" (ID: ${job.id})`);
    }
    
    return isOpen && notApplied;
  });

  console.log('═══════════════════════════════════════');
  console.log('📊 JOB FILTERING DEBUG:');
  console.log('   Total Jobs in System:', jobs.length);
  console.log('   Total Applications:', myApplications.length);
  console.log('   Applied Job IDs:', appliedJobIds);
  console.log('   Available Jobs (after filter):', availableJobs.length);
  console.log('   Available Job Titles:', availableJobs.map(j => j.title));
  console.log('═══════════════════════════════════════');

  const pendingJobIds = myApplications
    .filter(app => app.status === 'pending')
    .map(app => app.jobId);
  
  const acceptedJobIds = myApplications
    .filter(app => app.status === 'accepted')
    .map(app => app.jobId);

  const getFilteredJobs = () => {
    let filtered = availableJobs;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(job => {
        const jobCategory = job.category?.toLowerCase() || '';
        const jobTitle = job.title?.toLowerCase() || '';
        const jobType = job.jobType?.toLowerCase() || '';
        const searchTerm = selectedCategory.toLowerCase();
        
        return jobCategory.includes(searchTerm) || 
               jobTitle.includes(searchTerm) || 
               jobType.includes(searchTerm);
      });
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(job => {
        const title = job.title?.toLowerCase() || '';
        const company = job.companyName?.toLowerCase() || job.company?.toLowerCase() || '';
        const location = job.location?.toLowerCase() || '';
        const category = job.category?.toLowerCase() || '';
        const jobType = job.jobType?.toLowerCase() || '';
        const description = job.description?.toLowerCase() || '';
        
        return title.includes(query) || 
               company.includes(query) || 
               location.includes(query) || 
               category.includes(query) || 
               jobType.includes(query) ||
               description.includes(query);
      });
    }

    return filtered;
  };

  const filteredJobs = getFilteredJobs();

  // Improved Category Button Component
  const CategoryButton = ({ label, value, icon, count }) => {
    const isActive = selectedCategory === value;
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryButton,
          isActive && styles.categoryButtonActive
        ]}
        onPress={() => {
          setSelectedCategory(value);
          setSearchQuery('');
        }}
        activeOpacity={0.7}
      >
        <View style={[
          styles.categoryIconContainer,
          isActive && styles.categoryIconContainerActive
        ]}>
          <Text style={styles.categoryIcon}>{icon}</Text>
        </View>
        <Text style={[
          styles.categoryLabel,
          isActive && styles.categoryLabelActive
        ]}>
          {label}
        </Text>
        {value === 'all' && (
          <View style={[
            styles.categoryBadge,
            isActive && styles.categoryBadgeActive
          ]}>
            <Text style={[
              styles.categoryBadgeText,
              isActive && styles.categoryBadgeTextActive
            ]}>
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
              onPress={() => setSelectedCategory('all')}
            />
            <QuickStatCard
              icon="⏳"
              value={pendingJobIds.length}
              label="Pending"
              color={colors.warning}
              onPress={() => navigation.navigate('MyJobs')}
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
        {/* Search and Location Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchHeader}>
            <View style={styles.searchHeaderLeft}>
              <Text style={styles.sectionTitle}>Find Your Next Job</Text>
              <Text style={styles.sectionSubtitle}>
                {filteredJobs.length} opportunities waiting
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

          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <View style={styles.searchInputWrapper}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search jobs, companies, categories..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setShowSearch(true)}
              />
              {searchQuery !== '' && (
                <TouchableOpacity 
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Location Filter */}
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

        {/* Improved Category Filter */}
        <View style={styles.categorySection}>
          <View style={styles.categorySectionHeader}>
            <Text style={styles.categorySectionTitle}>Browse by Category</Text>
            <Text style={styles.categorySectionSubtitle}>
              {selectedCategory === 'all' ? 'All categories' : DEFAULT_CATEGORIES.find(c => c.id === selectedCategory)?.label}
            </Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {DEFAULT_CATEGORIES.map(category => (
              <CategoryButton
                key={category.id}
                label={category.label}
                value={category.id}
                icon={category.icon}
                count={availableJobs.length}
              />
            ))}
          </ScrollView>
        </View>

        {/* Active Filters Display */}
        {(selectedCategory !== 'all' || searchQuery !== '') && (
          <View style={styles.activeFiltersContainer}>
            <Text style={styles.activeFiltersText}>Active filters:</Text>
            <View style={styles.activeFiltersRow}>
              {selectedCategory !== 'all' && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterText}>
                    {DEFAULT_CATEGORIES.find(c => c.id === selectedCategory)?.label}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setSelectedCategory('all')}
                    style={styles.removeFilterButton}
                  >
                    <Text style={styles.removeFilterIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              {searchQuery !== '' && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterText} numberOfLines={1}>
                    "{searchQuery}"
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setSearchQuery('')}
                    style={styles.removeFilterButton}
                  >
                    <Text style={styles.removeFilterIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity 
                onPress={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                style={styles.clearAllButton}
              >
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Jobs List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Finding perfect jobs for you...</Text>
          </View>
        ) : filteredJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>
              {searchQuery !== '' || selectedCategory !== 'all' ? '🔍' : '💼'}
            </Text>
            <Text style={styles.emptyTitle}>
              {searchQuery !== '' || selectedCategory !== 'all'
                ? 'No Jobs Found' 
                : 'No Jobs Available'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery !== '' || selectedCategory !== 'all'
                ? 'Try adjusting your search or filters to find more jobs.'
                : currentLocation 
                  ? `No jobs found in ${currentLocation}. Try changing location.`
                  : 'New opportunities will appear here soon. Check back later!'}
            </Text>
            {(searchQuery !== '' || selectedCategory !== 'all') ? (
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              >
                <Text style={styles.emptyButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => navigation.navigate('MyJobs')}
              >
                <Text style={styles.emptyButtonText}>View My Applications</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.jobsContainer}>
            <View style={styles.jobsHeader}>
              <Text style={styles.jobsHeaderText}>
                {filteredJobs.length} Job{filteredJobs.length !== 1 ? 's' : ''} Available
              </Text>
              <Text style={styles.jobsHeaderSubtext}>
                {myApplications.length > 0 && `${myApplications.length} already applied`}
              </Text>
            </View>
            {filteredJobs.map((job, index) => {
              const isNew = new Date() - new Date(job.createdAt) < 7 * 24 * 60 * 60 * 1000;
              
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
                    {job.category && (
                      <View style={styles.jobTag}>
                        <Text style={styles.jobTagText}>{job.category}</Text>
                      </View>
                    )}
                    <View style={styles.jobTag}>
                      <Text style={styles.jobTagText}>{job.jobType || 'Hourly work'}</Text>
                    </View>
                    <View style={styles.jobTag}>
                      <Text style={styles.jobTagText}>
                        {job.experienceLevel || 'Any Experience'}
                      </Text>
                    </View>
                  </View>

                  {/* Action Button */}
                  <TouchableOpacity
                    style={styles.jobActionButton}
                    onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
                  >
                    <Text style={styles.jobActionText}>Apply Now</Text>
                    <Text style={styles.jobActionArrow}>→</Text>
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
  searchSection: {
    padding: 20,
    paddingBottom: 10,
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchHeaderLeft: {
    flex: 1,
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
  searchBarContainer: {
    marginBottom: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 16,
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 16,
    color: colors.textSecondary,
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
  
  // IMPROVED CATEGORY SECTION
  categorySection: {
    paddingVertical: 20,
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categorySectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categorySectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  categorySectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryScroll: {
    paddingHorizontal: 12,
    gap: 10,
  },
  categoryButton: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 90,
    maxWidth: 90,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  categoryIcon: {
    fontSize: 22,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: colors.white,
  },
  categoryBadge: {
    marginTop: 4,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
  },
  categoryBadgeTextActive: {
    color: colors.white,
  },
  
  activeFiltersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.primaryLight,
  },
  activeFiltersText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 20,
    maxWidth: width * 0.5,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  activeFilterText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginRight: 6,
  },
  removeFilterButton: {
    padding: 2,
  },
  removeFilterIcon: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
  },
  clearAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearAllText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
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
  jobsHeader: {
    marginBottom: 16,
  },
  jobsHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  jobsHeaderSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
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
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  jobTag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  jobTagText: {
    fontSize: 11,
    color: colors.primary,
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
  jobActionText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.white,
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