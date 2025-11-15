// src/screens/worker/JobDetailsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useJob } from '../../context/JobContext';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/colors';
import { fetchWorkerApplications } from '../../services/database';

const JobDetailsScreen = ({ route, navigation }) => {
  const { jobId } = route.params;
  const { jobs, applyForJob } = useJob();
  const { user, userProfile } = useAuth();
  const [applying, setApplying] = useState(false);
  const [myApplication, setMyApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  const job = jobs.find(j => j.id === jobId);

  useEffect(() => {
    checkApplicationStatus();
  }, [jobId]);

  const checkApplicationStatus = async () => {
    try {
      const result = await fetchWorkerApplications(user.uid);
      if (result.success) {
        // Find if worker has applied to this specific job
        const application = result.applications.find(app => app.jobId === jobId);
        setMyApplication(application || null);
        console.log('📋 Application status:', application ? application.status : 'not applied');
      }
    } catch (error) {
      console.error('Error checking application:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (myApplication) {
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
      // Refresh application status
      await checkApplicationStatus();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to apply for job');
    }
    setApplying(false);
  };

  const handleTrackJob = () => {
    if (myApplication && myApplication.status === 'accepted') {
      navigation.navigate('JobTracking', {
        applicationId: myApplication.id
      });
    }
  };

  if (!job) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Job not found</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const startTime = job.startTime ? String(job.startTime) : '';
  const endTime = job.endTime ? String(job.endTime) : '';
  const timeDisplay = startTime && endTime ? `${startTime} - ${endTime}` : 'Not specified';

  // Determine application status
  const hasApplied = myApplication !== null;
  const isAccepted = myApplication?.status === 'accepted';
  const isPending = myApplication?.status === 'pending';
  const isRejected = myApplication?.status === 'rejected';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.card}>
          <Text style={styles.title}>{String(job.title || 'Job')}</Text>
          <Text style={styles.company}>{String(job.companyName || 'Company')}</Text>
          <Text style={styles.salary}>₹{String(job.rate || job.salary || '0')}/hr</Text>
        </View>

        {job.jobDate && (
          <View style={styles.card}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{String(job.jobDate)}</Text>
          </View>
        )}

        {(job.startTime || job.endTime) && (
          <View style={styles.card}>
            <Text style={styles.label}>Time</Text>
            <Text style={styles.value}>{timeDisplay}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>{String(job.description || 'No description')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{String(job.location || 'Not specified')}</Text>
        </View>

        {job.category && (
          <View style={styles.card}>
            <Text style={styles.label}>Category</Text>
            <Text style={styles.value}>{String(job.category)}</Text>
          </View>
        )}

        {/* Application Status Banner */}
        {hasApplied && (
          <View style={[
            styles.statusBanner,
            isAccepted && styles.acceptedBanner,
            isPending && styles.pendingBanner,
            isRejected && styles.rejectedBanner
          ]}>
            <Text style={styles.statusIcon}>
              {isAccepted ? '✅' : isPending ? '⏳' : '❌'}
            </Text>
            <View style={styles.statusContent}>
              <Text style={styles.statusTitle}>
                {isAccepted ? 'Application Accepted!' : 
                 isPending ? 'Application Pending' : 
                 'Application Rejected'}
              </Text>
              <Text style={styles.statusText}>
                {isAccepted ? 'Congratulations! You can track your job progress below.' : 
                 isPending ? 'Your application is being reviewed by the employer.' : 
                 'Unfortunately, your application was not accepted.'}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {!hasApplied && (
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApply}
            disabled={applying}
          >
            <Text style={styles.applyButtonText}>
              {applying ? 'Applying...' : 'Apply for Job'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Track Job Button for Accepted Applications */}
        {isAccepted && (
          <TouchableOpacity
            style={styles.trackButton}
            onPress={handleTrackJob}
          >
            <Text style={styles.trackButtonIcon}>📱</Text>
            <Text style={styles.trackButtonText}>Track Job Progress</Text>
          </TouchableOpacity>
        )}

        {/* Already Applied Message for Pending */}
        {isPending && (
          <View style={styles.pendingMessage}>
            <Text style={styles.pendingMessageText}>
              Your application is pending. The employer will review it soon.
            </Text>
          </View>
        )}

        {/* Rejected Message */}
        {isRejected && (
          <View style={styles.rejectedMessage}>
            <Text style={styles.rejectedMessageText}>
              Don't worry! Keep applying to other jobs.
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('WorkerHome')}
            >
              <Text style={styles.browseButtonText}>Browse More Jobs</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 10,
    borderRadius: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.text,
  },
  company: {
    fontSize: 18,
    color: colors.primary,
    marginBottom: 10,
  },
  salary: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    color: '#000',
  },
  statusBanner: {
    flexDirection: 'row',
    margin: 10,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  acceptedBanner: {
    backgroundColor: colors.success + '20',
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  pendingBanner: {
    backgroundColor: colors.warning + '20',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  rejectedBanner: {
    backgroundColor: colors.error + '20',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  applyButton: {
    backgroundColor: colors.primary,
    margin: 10,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  trackButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    margin: 10,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pendingMessage: {
    margin: 10,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.warning + '20',
    alignItems: 'center',
  },
  pendingMessageText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  rejectedMessage: {
    margin: 10,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.error + '20',
    alignItems: 'center',
  },
  rejectedMessageText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default JobDetailsScreen;