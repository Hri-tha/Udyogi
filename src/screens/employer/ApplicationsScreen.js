import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useJob } from '../../context/JobContext';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/colors';

const ApplicationsScreen = ({ route, navigation }) => {
  const { jobId } = route.params;
  const { getJobApplications, respondToApplication } = useJob();
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadApplications = async () => {
    try {
      const result = await getJobApplications(jobId);
      if (result.success) {
        setApplications(result.applications);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [jobId]);

  const handleRespond = async (applicationId, workerId, workerName, status) => {
    try {
      const application = applications.find(app => app.id === applicationId);
      await respondToApplication(applicationId, status, user.uid, workerId, application.jobTitle);
      
      Alert.alert('Success', `Application ${status} successfully`);
      await loadApplications(); // Reload applications
    } catch (error) {
      Alert.alert('Error', 'Failed to update application');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return colors.success;
      case 'rejected': return colors.error;
      default: return colors.warning;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Applications</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Applications</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statsCard}>
          <Text style={styles.statsText}>
            {applications.length} application{applications.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {applications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No applications yet</Text>
            <Text style={styles.emptySubtext}>
              Applications will appear here when workers apply
            </Text>
          </View>
        ) : (
          applications.map((application) => (
            <View key={application.id} style={styles.applicationCard}>
              <View style={styles.applicationHeader}>
                <Text style={styles.workerName}>{application.workerName}</Text>
                <Text style={[styles.status, { color: getStatusColor(application.status) }]}>
                  {application.status.toUpperCase()}
                </Text>
              </View>
              
              <Text style={styles.workerPhone}>📞 {application.workerPhone}</Text>
              <Text style={styles.jobTitle}>Job: {application.jobTitle}</Text>
              <Text style={styles.appliedDate}>
                Applied: {application.appliedAt?.toDate().toLocaleDateString()}
              </Text>

              {application.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => 
                      handleRespond(application.id, application.workerId, application.workerName, 'accepted')
                    }
                  >
                    <Text style={styles.actionButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => 
                      handleRespond(application.id, application.workerId, application.workerName, 'rejected')
                    }
                  >
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {application.status === 'accepted' && (
                <View style={styles.contactInfo}>
                  <Text style={styles.contactTitle}>Worker Contact Information:</Text>
                  <Text style={styles.contactDetail}>Name: {application.workerName}</Text>
                  <Text style={styles.contactDetail}>Phone: {application.workerPhone}</Text>
                  <Text style={styles.contactNote}>
                    Please contact the worker to coordinate the job details.
                  </Text>
                </View>
              )}
            </View>
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
    paddingTop: 50,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCard: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  statsText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  workerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  workerPhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  jobTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  appliedDate: {
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.7,
    marginBottom: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  contactInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: colors.background,
    borderRadius: 6,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  contactDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 3,
  },
  contactNote: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 5,
  },
});

export default ApplicationsScreen;