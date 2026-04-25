// src/screens/worker/WorkerHomeScreen.js - HINDI VERSION
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
import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../constants/colors';
import { fetchWorkerApplications, fetchFutureJobs } from '../../services/database';

const { width } = Dimensions.get('window');

// Hindi job categories
const HINDI_CATEGORIES = [
  { id: 'all', label: 'सभी', icon: '💼', english: 'All' },
  { id: 'daily-worker', label: 'दैनिक मजदूर', icon: '🔨', english: 'Daily Worker' },
  { id: 'barber', label: 'नाई', icon: '💈', english: 'Barber' },
  { id: 'tailor', label: 'दर्जी', icon: '🧵', english: 'Tailor' },
  { id: 'coder', label: 'कोडर', icon: '💻', english: 'Coder' },
  { id: 'driver', label: 'ड्राइवर', icon: '🚗', english: 'Driver' },
  { id: 'cleaner', label: 'सफाईकर्मी', icon: '🧹', english: 'Cleaner' },
  { id: 'cook', label: 'रसोइया', icon: '👨‍🍳', english: 'Cook' },
  { id: 'delivery', label: 'डिलीवरी', icon: '📦', english: 'Delivery' },
];

function WorkerHomeScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  const { currentLocation, fetchJobsByUserLocation } = useJob();
  const { locale, t } = useLanguage();
  
  const [refreshing, setRefreshing] = useState(false);
  const [myApplications, setMyApplications] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Translations for this screen
  const translations = {
    en: {
      welcome: 'Welcome back! 👋',
      findJob: 'Find Your Next Job',
      upcomingOpportunities: 'upcoming opportunities',
      searchPlaceholder: 'Title, skills, or company',
      location: 'Location',
      allIndia: 'All India',
      showingJobs: 'Showing jobs across India',
      browseByCategory: 'Browse by Category',
      allCategories: 'All categories',
      activeFilters: 'Active filters:',
      clearAll: 'Clear all',
      available: 'Available',
      pending: 'Pending',
      accepted: 'Accepted',
      jobs: 'jobs',
      alreadyApplied: 'already applied',
      applyNow: 'Apply Now',
      noUpcomingJobs: 'No Upcoming Jobs',
      noJobsFound: 'No Jobs Found',
      noJobsDesc: 'New upcoming opportunities will appear here. Check back later!',
      noJobsFilterDesc: 'Try adjusting your search or filters to find more jobs.',
      noJobsLocationDesc: 'No jobs found in {location}. Try changing location or check back later.',
      clearFilters: 'Clear Filters',
      showAllIndiaJobs: 'Show All India Jobs',
      viewApplications: 'View My Applications',
      settingLocation: 'Setting up your location...',
      findingJobs: 'Finding jobs for you...',
      perHour: 'per hour',
      duration: 'duration',
      hourlyWork: 'Hourly work',
      anyExperience: 'Any Experience',
      dateNotSet: 'Date not set',
      dateFlexible: 'Date Flexible',
      today: 'Today',
      tomorrow: 'Tomorrow',
      new: 'NEW',
      jobIn: 'jobs in',
      opportunities: 'opportunities',
      filter: 'Filter',
      search: 'Search',
      trendingJobs: 'Trending Jobs',
      recommendedForYou: 'Recommended for you',
      featuredJobs: 'Featured Jobs',
      quickApply: 'Quick Apply',
      viewDetails: 'View Details',
      salary: 'Salary',
      experience: 'Experience',
      jobType: 'Job Type',
    },
    hi: {
      welcome: 'वापसी पर स्वागत है! 👋',
      findJob: 'अपनी अगली नौकरी खोजें',
      upcomingOpportunities: 'आने वाले अवसर',
      searchPlaceholder: 'नौकरी शीर्षक, कौशल, या कंपनी',
      location: 'स्थान',
      allIndia: 'पूरे भारत में',
      showingJobs: 'पूरे भारत में नौकरियां दिखाई जा रही हैं',
      browseByCategory: 'श्रेणी के अनुसार ब्राउज़ करें',
      allCategories: 'सभी श्रेणियां',
      activeFilters: 'सक्रिय फ़िल्टर्स:',
      clearAll: 'सभी साफ करें',
      available: 'उपलब्ध',
      pending: 'लंबित',
      accepted: 'स्वीकृत',
      jobs: 'नौकरियां',
      alreadyApplied: 'पहले ही आवेदन किया है',
      applyNow: 'अभी आवेदन करें',
      noUpcomingJobs: 'कोई आगामी नौकरी नहीं',
      noJobsFound: 'कोई नौकरी नहीं मिली',
      noJobsDesc: 'नए आगामी अवसर यहां दिखाई देंगे। बाद में पुनः जांचें!',
      noJobsFilterDesc: 'अधिक नौकरियां खोजने के लिए अपनी खोज या फ़िल्टर समायोजित करें।',
      noJobsLocationDesc: '{location} में कोई नौकरी नहीं मिली। स्थान बदलने का प्रयास करें या बाद में पुनः जांचें।',
      clearFilters: 'फ़िल्टर साफ करें',
      showAllIndiaJobs: 'पूरे भारत की नौकरियां दिखाएं',
      viewApplications: 'मेरे आवेदन देखें',
      settingLocation: 'आपका स्थान सेटअप हो रहा है...',
      findingJobs: 'आपके लिए नौकरियां ढूंढ रहे हैं...',
      perHour: 'प्रति घंटा',
      duration: 'अवधि',
      hourlyWork: 'घंटे का काम',
      anyExperience: 'कोई भी अनुभव',
      dateNotSet: 'तारीख सेट नहीं है',
      dateFlexible: 'तारीख लचीली है',
      today: 'आज',
      tomorrow: 'कल',
      new: 'नया',
      jobIn: 'नौकरियां',
      opportunities: 'अवसर',
      filter: 'फ़िल्टर',
      search: 'खोजें',
      trendingJobs: 'ट्रेंडिंग नौकरियां',
      recommendedForYou: 'आपके लिए सिफारिशें',
      featuredJobs: 'फ़ीचर्ड नौकरियां',
      quickApply: 'त्वरित आवेदन',
      viewDetails: 'विवरण देखें',
      salary: 'वेतन',
      experience: 'अनुभव',
      jobType: 'नौकरी प्रकार',
    }
  };

  const tr = translations[locale] || translations.en;
  const categories = locale === 'hi' ? HINDI_CATEGORIES : HINDI_CATEGORIES.map(cat => ({...cat, label: cat.english}));

  useEffect(() => {
    loadData();
    autoSelectUserLocation();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 Screen focused - reloading applications and jobs');
      loadData();
    });

    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadFutureJobs(), loadApplications()]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(
        locale === 'hi' ? 'त्रुटि' : 'Error',
        locale === 'hi' ? 'नौकरियां लोड करने में विफल' : 'Failed to load jobs'
      );
    } finally {
      setLoading(false);
    }
  };

  const autoSelectUserLocation = async () => {
    try {
      if (userProfile?.location && !currentLocation) {
        setLocationLoading(true);
        console.log('📍 Auto-selecting user location:', userProfile.location);
        await fetchJobsByUserLocation(userProfile.location);
        console.log('✅ Location auto-selected successfully');
      }
    } catch (error) {
      console.error('Error auto-selecting location:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  const loadFutureJobs = async () => {
    try {
      const filters = {};
      if (currentLocation) {
        filters.location = currentLocation;
      }
      
      const result = await fetchFutureJobs(filters);
      if (result.success) {
        setJobs(result.jobs);
        console.log('✅ Loaded future jobs:', result.jobs.length);
      } else {
        console.error('Failed to load future jobs:', result.error);
      }
    } catch (error) {
      console.error('Error loading future jobs:', error);
    }
  };

  const loadApplications = async () => {
    try {
      const result = await fetchWorkerApplications(user.uid);
      if (result.success) {
        setMyApplications(result.applications);
        console.log('✅ Loaded applications:', result.applications.length);
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

  // Only show future jobs that are open and not applied to
  const availableJobs = jobs.filter(job => {
    const isOpen = job.status === 'open';
    const notApplied = !appliedJobIds.includes(job.id);
    
    return isOpen && notApplied;
  });

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
        const skills = job.skillsRequired?.toLowerCase() || '';
        
        return title.includes(query) || 
               company.includes(query) || 
               location.includes(query) || 
               category.includes(query) || 
               jobType.includes(query) ||
               description.includes(query) ||
               skills.includes(query);
      });
    }

    return filtered;
  };

  const filteredJobs = getFilteredJobs();

  // Fixed date formatting function - only for job cards
  const formatJobDate = (jobDate, startTime) => {
    if (!jobDate || jobDate === 'Invalid Date' || jobDate === 'null' || jobDate === 'undefined') {
      return tr.dateFlexible;
    }
    
    try {
      const date = new Date(jobDate);
      
      if (isNaN(date.getTime())) {
        return tr.dateFlexible;
      }
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      today.setHours(0, 0, 0, 0);
      tomorrow.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      
      if (date.getTime() === today.getTime()) {
        return `${tr.today}${startTime ? `, ${startTime}` : ''}`;
      } else if (date.getTime() === tomorrow.getTime()) {
        return `${tr.tomorrow}${startTime ? `, ${startTime}` : ''}`;
      } else {
        const options = { 
          day: 'numeric', 
          month: 'short' 
        };
        
        let formattedDate;
        if (locale === 'hi') {
          const monthNames = [
            'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
            'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
          ];
          const day = date.getDate();
          const month = monthNames[date.getMonth()];
          formattedDate = `${day} ${month}`;
        } else {
          formattedDate = date.toLocaleDateString('en-IN', options);
        }
        
        return `${formattedDate}${startTime ? `, ${startTime}` : ''}`;
      }
    } catch (error) {
      console.error('Error formatting date:', error, jobDate);
      return tr.dateFlexible;
    }
  };

  const CategoryChip = ({ label, value, icon, isActive, onPress }) => (
    <TouchableOpacity
      style={[styles.categoryChip, isActive && styles.categoryChipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.categoryChipIcon}>{icon}</Text>
      <Text style={[styles.categoryChipLabel, isActive && styles.categoryChipLabelActive]}>
        {label}
      </Text>
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
        <Text style={styles.quickStatLabel} numberOfLines={1} adjustsFontSizeToFit>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderJobCard = (job, index) => {
    const isNew = new Date() - new Date(job.createdAt) < 7 * 24 * 60 * 60 * 1000;
    const salary = job.rate || job.salary;
    const experience = job.experienceLevel || '0-2 years';
    
    return (
      <TouchableOpacity
        key={job.id}
        style={styles.jobCard}
        onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
        activeOpacity={0.7}
      >
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
                  <Text style={styles.newBadgeText}>{tr.new}</Text>
                </View>
              )}
            </View>
            <Text style={styles.jobCompany} numberOfLines={1}>
              {job.companyName || job.company || 'Unknown Company'}
            </Text>
            <View style={styles.jobLocationRow}>
              <Text style={styles.jobLocationIcon}>📍</Text>
              <Text style={styles.jobLocation} numberOfLines={1}>
                {job.location?.split(',')[0] || job.location || tr.allIndia}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.jobDetailsRow}>
          <View style={styles.jobDetail}>
            <Text style={styles.jobDetailIcon}>💰</Text>
            <Text style={styles.jobDetailText}>
              ₹{salary} <Text style={styles.jobDetailSubtext}>/{tr.perHour}</Text>
            </Text>
          </View>
          <View style={styles.jobDetail}>
            <Text style={styles.jobDetailIcon}>⏰</Text>
            <Text style={styles.jobDetailText}>
              {job.duration || 'Flexible'}
            </Text>
          </View>
          <View style={styles.jobDetail}>
            <Text style={styles.jobDetailIcon}>📅</Text>
            <Text style={styles.jobDetailText}>
              {formatJobDate(job.jobDate, job.startTime)}
            </Text>
          </View>
        </View>

        <View style={styles.jobTags}>
          {job.category && (
            <View style={styles.jobTag}>
              <Text style={styles.jobTagText}>{job.category}</Text>
            </View>
          )}
          <View style={styles.jobTag}>
            <Text style={styles.jobTagText}>{job.jobType || tr.hourlyWork}</Text>
          </View>
          <View style={styles.jobTag}>
            <Text style={styles.jobTagText}>{experience}</Text>
          </View>
        </View>

        <View style={styles.jobActions}>
          <TouchableOpacity
            style={styles.quickApplyButton}
            onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
          >
            <Text style={styles.quickApplyText}>{tr.quickApply}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
          >
            <Text style={styles.viewDetailsText}>{tr.viewDetails}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>
        {searchQuery !== '' || selectedCategory !== 'all' ? '🔍' : '📅'}
      </Text>
      <Text style={styles.emptyTitle}>
        {searchQuery !== '' || selectedCategory !== 'all'
          ? tr.noJobsFound 
          : tr.noUpcomingJobs}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery !== '' || selectedCategory !== 'all'
          ? tr.noJobsFilterDesc
          : currentLocation 
            ? tr.noJobsLocationDesc.replace('{location}', currentLocation)
            : tr.noJobsDesc}
      </Text>
      <View style={styles.emptyButtons}>
        {(searchQuery !== '' || selectedCategory !== 'all') && (
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
          >
            <Text style={styles.emptyButtonText}>{tr.clearFilters}</Text>
          </TouchableOpacity>
        )}
        {currentLocation ? (
          <TouchableOpacity 
            style={styles.emptyButtonAlt}
            onPress={async () => {
              setLocationLoading(true);
              await fetchJobsByUserLocation('');
              setLocationLoading(false);
            }}
          >
            <Text style={styles.emptyButtonAltText}>{tr.showAllIndiaJobs}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.emptyButtonAlt}
            onPress={() => navigation.navigate('WorkerMain', { screen: 'MyJobs' })}
          >
            <Text style={styles.emptyButtonAltText}>{tr.viewApplications}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.welcomeText}>{tr.welcome}</Text>
            <Text style={styles.userName}>{userProfile?.name || (locale === 'hi' ? 'मजदूर' : 'Worker')}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('WorkerMain', { screen: 'Profile' })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userProfile?.name?.charAt(0) || (locale === 'hi' ? 'म' : 'W')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Integrated Search and Filter Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={tr.searchPlaceholder}
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
          <TouchableOpacity 
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Text style={[styles.filterIcon, showFilters && styles.filterIconActive]}>
              ⚙️
            </Text>
            <Text style={[styles.filterText, showFilters && styles.filterTextActive]}>
              {tr.filter}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <QuickStatCard
            icon="💼"
            value={availableJobs.length}
            label={tr.available}
            color={colors.primary}
            onPress={() => setSelectedCategory('all')}
          />
          <QuickStatCard
            icon="⏳"
            value={myApplications.filter(app => app.status === 'pending').length}
            label={tr.pending}
            color={colors.warning}
            onPress={() =>navigation.navigate('WorkerMain', { screen: 'MyJobs' })}
          />
          <QuickStatCard
            icon="✓"
            value={myApplications.filter(app => app.status === 'accepted').length}
            label={tr.accepted}
            color={colors.success}
            onPress={() => navigation.navigate('WorkerMain', { screen: 'MyJobs' })}
          />
        </View>

        {/* Location Display */}
        <TouchableOpacity 
          style={styles.locationContainer}
          onPress={() => navigation.navigate('LocationFilter')}
        >
          <Text style={styles.locationIcon}>📍</Text>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>{tr.location}</Text>
            <Text style={styles.locationValue} numberOfLines={1}>
              {currentLocation || tr.allIndia}
            </Text>
          </View>
          <Text style={styles.locationArrow}>›</Text>
        </TouchableOpacity>
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
        {/* Category Filters - Only show when filters are active or as horizontal scroll */}
        <View style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>{tr.browseByCategory}</Text>
            <TouchableOpacity 
              onPress={() => setSelectedCategory('all')}
              style={styles.clearCategoriesButton}
            >
              <Text style={styles.clearCategoriesText}>
                {selectedCategory !== 'all' ? tr.clearAll : ''}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map(category => (
              <CategoryChip
                key={category.id}
                label={category.label}
                value={category.id}
                icon={category.icon}
                isActive={selectedCategory === category.id}
                onPress={() => setSelectedCategory(category.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Active Filters */}
        {(selectedCategory !== 'all' || searchQuery !== '') && (
          <View style={styles.activeFilters}>
            <Text style={styles.activeFiltersLabel}>{tr.activeFilters}:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.activeFiltersScroll}
            >
              <View style={styles.activeFiltersContent}>
                {selectedCategory !== 'all' && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterText}>
                      {categories.find(c => c.id === selectedCategory)?.label}
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
                    <Text style={styles.activeFilterText}>
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
              </View>
            </ScrollView>
          </View>
        )}

        {/* Jobs Section */}
        <View style={styles.jobsSection}>
          <View style={styles.jobsHeader}>
            <Text style={styles.jobsTitle}>
              {filteredJobs.length > 0 ? `${tr.recommendedForYou}` : ''}
            </Text>
            {filteredJobs.length > 0 && (
              <Text style={styles.jobsCount}>
                {filteredJobs.length} {tr.jobs} {currentLocation && `in ${currentLocation.split(',')[0]}`}
              </Text>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>
                {locationLoading ? tr.settingLocation : tr.findingJobs}
              </Text>
            </View>
          ) : filteredJobs.length === 0 ? (
            <EmptyState />
          ) : (
            filteredJobs.map((job, index) => renderJobCard(job, index))
          )}
        </View>

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
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
    color: colors.textSecondary,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 80,
  },
  filterButtonActive: {
    backgroundColor: colors.white,
    borderColor: colors.white,
  },
  filterIcon: {
    fontSize: 18,
    marginRight: 6,
    color: colors.white,
  },
  filterIconActive: {
    color: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  filterTextActive: {
    color: colors.primary,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickStatCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderLeftWidth: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 70,
  },
  quickStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  quickStatIconText: {
    fontSize: 18,
  },
  quickStatContent: {
    flex: 1,
    minWidth: 0, // This helps with text wrapping
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  locationIcon: {
    fontSize: 16,
    color: colors.white,
    marginRight: 10,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.8,
    marginBottom: 2,
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  locationArrow: {
    fontSize: 20,
    color: colors.white,
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
  },
  categorySection: {
    paddingTop: 20,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  clearCategoriesButton: {
    padding: 4,
  },
  clearCategoriesText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  categoryScroll: {
    paddingBottom: 20,
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minWidth: 100,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryChipIcon: {
    fontSize: 16,
    marginRight: 8,
    color: colors.text,
  },
  categoryChipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  categoryChipLabelActive: {
    color: colors.white,
  },
  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  activeFiltersLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    marginRight: 12,
  },
  activeFiltersScroll: {
    flex: 1,
  },
  activeFiltersContent: {
    flexDirection: 'row',
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeFilterText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginRight: 6,
    maxWidth: 150,
  },
  removeFilterButton: {
    padding: 2,
  },
  removeFilterIcon: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
  },
  jobsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  jobsHeader: {
    marginBottom: 20,
  },
  jobsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  jobsCount: {
    fontSize: 14,
    color: colors.textSecondary,
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
    padding: 40,
    backgroundColor: colors.white,
    borderRadius: 16,
    marginTop: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  emptyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyButtonAlt: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    minWidth: 120,
  },
  emptyButtonAltText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  companyLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  newBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
  },
  jobCompany: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 6,
  },
  jobLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobLocationIcon: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 6,
  },
  jobLocation: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  jobDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border + '30',
  },
  jobDetail: {
    alignItems: 'center',
    flex: 1,
  },
  jobDetailIcon: {
    fontSize: 16,
    color: colors.primary,
    marginBottom: 4,
  },
  jobDetailText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  jobDetailSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: 'normal',
  },
  jobTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
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
  jobActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickApplyButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickApplyText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.white,
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: colors.white,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  viewDetailsText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default WorkerHomeScreen;