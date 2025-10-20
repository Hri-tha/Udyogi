import React, { useState, useEffect, useContext } from 'react';
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
import JobCard from '../../components/JobCard';
import { colors } from '../../constants/colors';

const WorkerHomeScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const { jobs, fetchJobs, applyForJob } = useJob();
  const { user, userProfile, logout } = useAuth();

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

  const handleApplyJob = async (jobId) => {
    try {
      await applyForJob(jobId, user.uid);
      Alert.alert('Success', 'Job application submitted!');
    } catch (error) {
      Alert.alert('Error', 'Failed to apply for job');
    }
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

  const availableJobs = jobs.filter(job => job.status === 'active');

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.nameText}>{userProfile?.name || 'Worker'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentHeader}>
        <Text style={styles.title}>Available Jobs</Text>
        <Text style={styles.subtitle}>
          Find your next opportunity from {availableJobs.length} available jobs
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {availableJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No jobs available at the moment</Text>
            <Text style={styles.emptySubtext}>
              Check back later for new opportunities
            </Text>
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
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
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
  },
});

export default WorkerHomeScreen;