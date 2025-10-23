// src/screens/worker/WorkerHomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useJob } from '../../context/JobContext';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/colors';
import JobCard from '../../components/JobCard';

const WorkerHomeScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const { 
    jobs, 
    loading, 
    currentLocation, 
    fetchJobs, 
    fetchJobsByUserLocation, 
    applyForJob 
  } = useJob();
  const { user, userProfile } = useAuth();

  useEffect(() => {
    // Load jobs based on user's location when component mounts
    if (userProfile?.location) {
      fetchJobsByUserLocation(userProfile.location);
    } else {
      fetchJobs(); // Fetch all jobs if no user location
    }
  }, [userProfile]);

  const loadJobs = async () => {
    try {
      if (currentLocation) {
        await fetchJobs(currentLocation);
      } else {
        await fetchJobs();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load jobs');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const handleApplyJob = async (jobId) => {
    try {
      await applyForJob(jobId, user.uid);
      Alert.alert('Success', 'Job application submitted!');
    } catch (error) {
      Alert.alert('Error', 'Failed to apply for job');
    }
  };

  const handleProfilePress = () => {
    navigation.navigate('WorkerProfile');
  };

  const availableJobs = jobs.filter(job => job.status === 'open' || job.status === 'active');

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.nameText}>{userProfile?.name || 'Worker'}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={handleProfilePress}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {userProfile?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.contentHeader}>
        <Text style={styles.title}>Available Jobs</Text>
        <Text style={styles.subtitle}>
          Find your next opportunity from {availableJobs.length} available jobs
        </Text>
        
        {/* Location Filter Section */}
        <View style={styles.locationSection}>
          <Text style={styles.locationLabel}>Showing jobs in:</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationText}>
              {currentLocation || userProfile?.location || 'All locations'}
            </Text>
            <TouchableOpacity 
              style={styles.changeLocationButton}
              onPress={() => navigation.navigate('LocationFilter')}
            >
              <Text style={styles.changeLocationText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {availableJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {currentLocation || userProfile?.location 
                ? `No jobs available in ${currentLocation || userProfile?.location}`
                : 'No jobs available at the moment'
              }
            </Text>
            <Text style={styles.emptySubtext}>
              {currentLocation || userProfile?.location 
                ? 'Try changing your location or check back later'
                : 'Check back later for new opportunities'
              }
            </Text>
            {(currentLocation || userProfile?.location) && (
              <TouchableOpacity 
                style={styles.clearFilterButton}
                onPress={() => fetchJobs()}
              >
                <Text style={styles.clearFilterText}>Show all locations</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          availableJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
              onApply={() => handleApplyJob(job.id)}
              showApplyButton={true}
            />
          ))
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: colors.primary,
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 2,
  },
  profileButton: {
    padding: 5,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  profileAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  contentHeader: {
    padding: 20,
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
    marginBottom: 15,
  },
  locationSection: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 15,
    borderRadius: 10,
  },
  locationLabel: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    flex: 1,
  },
  changeLocationButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  changeLocationText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 20,
  },
  clearFilterButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  clearFilterText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default WorkerHomeScreen;