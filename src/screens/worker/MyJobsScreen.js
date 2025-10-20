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
import { colors } from '../../constants/colors';

const MyJobsScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [myApplications, setMyApplications] = useState([]);
  const { jobs, fetchJobs } = useJob();
  const { user, userProfile, logout } = useAuth();

  useEffect(() => {
    loadApplications();
  }, [jobs]);

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

  const loadApplications = async () => {
    try {
      await fetchJobs();
      // Filter jobs where current user has applied
      const applications = jobs.filter(job => 
        job.applications && job.applications.includes(user.uid)
      );
      setMyApplications(applications);
    } catch (error) {
      Alert.alert('Error', 'Failed to load applications');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return colors.success;
      case 'rejected': return colors.error;
      default: return colors.warning;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>My Applications</Text>
          <Text style={styles.nameText}>{userProfile?.name || 'Worker'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentHeader}>
        <Text style={styles.title}>Job Applications</Text>
        <Text style={styles.subtitle}>
          {myApplications.length} job applications
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {myApplications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No applications yet</Text>
            <Text style={styles.emptySubtext}>
              Apply for jobs to see them here
            </Text>
          </View>
        ) : (
          myApplications.map((job) => (
            <TouchableOpacity
              key={job.id}
              style={styles.applicationCard}
              onPress={() => navigation.navigate('JobDetails', { jobId: job.id })}
            >
              <View style={styles.applicationHeader}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <Text style={styles.company}>{job.company}</Text>
              </View>
              <View style={styles.applicationDetails}>
                <Text style={styles.salary}>₹{job.salary}/month</Text>
                <Text style={styles.location}>{job.location}</Text>
              </View>
              <View style={styles.statusContainer}>
                <Text style={[styles.status, { color: getStatusColor(job.applicationStatus) }]}>
                  {job.applicationStatus || 'Applied'}
                </Text>
              </View>
            </TouchableOpacity>
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
  applicationCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  applicationHeader: {
    marginBottom: 10,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  company: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  applicationDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  salary: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
  },
  location: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default MyJobsScreen;