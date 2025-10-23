import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useJob } from '../../context/JobContext';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/colors';

const JobDetailsScreen = ({ route, navigation }) => {
  const { jobId } = route.params;
  const { jobs, applyForJob } = useJob();
  const { user, userProfile, logout } = useAuth();
  const [applying, setApplying] = useState(false);

  const job = jobs.find(j => j.id === jobId);
  const hasApplied = job?.applications?.includes(user?.uid);

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

  const handleApply = async () => {
    if (hasApplied) {
      Alert.alert('Already Applied', 'You have already applied for this job.');
      return;
    }

    if (!userProfile?.name || !userProfile?.phoneNumber) {
      Alert.alert('Profile Incomplete', 'Please complete your profile before applying for jobs.');
      navigation.navigate('WorkerProfile');
      return;
    }

    setApplying(true);
    try {
      await applyForJob(jobId, user.uid, userProfile);
      Alert.alert('Success', 'Application submitted successfully! The employer will be notified.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to apply for job');
    }
    setApplying(false);
  };

  if (!job) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text>Job not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.jobHeader}>
          <Text style={styles.title}>{job.title}</Text>
          <Text style={styles.company}>{job.companyName || job.company}</Text>
          <Text style={styles.salary}>₹{job.rate || job.salary} {job.rate ? '/hour' : '/month'}</Text>
          {job.hours && (
            <Text style={styles.totalSalary}>Total: ₹{(job.rate || job.salary) * job.hours}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Description</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>

        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{job.location}</Text>
          </View>
          {job.jobType && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Job Type</Text>
              <Text style={styles.detailValue}>{job.jobType}</Text>
            </View>
          )}
          {job.experienceLevel && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Experience</Text>
              <Text style={styles.detailValue}>{job.experienceLevel}</Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Contact</Text>
            <Text style={styles.detailValue}>{job.employerPhone}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.applyButton,
            (hasApplied || applying) && styles.disabledButton
          ]}
          onPress={handleApply}
          disabled={applying || hasApplied}
        >
          <Text style={styles.applyButtonText}>
            {applying ? 'Applying...' : 
             hasApplied ? 'Already Applied' : 'Apply for this Job'}
          </Text>
        </TouchableOpacity>

        {hasApplied && (
          <View style={styles.appliedNote}>
            <Text style={styles.appliedNoteText}>
              ✓ You have applied for this job. The employer will review your application.
            </Text>
          </View>
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
  backButton: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobHeader: {
    backgroundColor: colors.white,
    padding: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  company: {
    fontSize: 18,
    color: colors.primary,
    marginBottom: 5,
  },
  salary: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 5,
  },
  totalSalary: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.white,
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  details: {
    backgroundColor: colors.white,
    padding: 20,
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  applyButton: {
    backgroundColor: colors.primary,
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: colors.textSecondary,
  },
  applyButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  appliedNote: {
    backgroundColor: colors.success + '20',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  appliedNoteText: {
    color: colors.success,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default JobDetailsScreen;