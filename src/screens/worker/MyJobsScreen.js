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
import { fetchWorkerApplications } from '../../services/database';

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
      // Load applications from database
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return colors.success;
      case 'rejected': return colors.error;
      default: return colors.warning;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'accepted': return 'Accepted 🎉';
      case 'rejected': return 'Rejected';
      case 'pending': return 'Under Review';
      default: return status;
    }
  };

  const handleViewLocation = (application) => {
    if (application.employerLocation) {
      navigation.navigate('JobLocation', { 
        application,
        isEmployer: false 
      });
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
          {myApplications.length} job application{myApplications.length !== 1 ? 's' : ''}
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
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No applications yet</Text>
            <Text style={styles.emptySubtext}>
              Apply for jobs to see them here
            </Text>
            <TouchableOpacity 
              style={styles.browseButton}
              onPress={() => navigation.navigate('WorkerHome')}
            >
              <Text style={styles.browseButtonText}>Browse Jobs</Text>
            </TouchableOpacity>
          </View>
        ) : (
          myApplications.map((application) => (
            <View key={application.id} style={styles.applicationCard}>
              <TouchableOpacity
                onPress={() => navigation.navigate('JobDetails', { jobId: application.jobId })}
              >
                <View style={styles.applicationHeader}>
                  <Text style={styles.jobTitle}>{application.jobTitle}</Text>
                  <Text style={[styles.status, { color: getStatusColor(application.status) }]}>
                    {getStatusText(application.status)}
                  </Text>
                </View>
                <View style={styles.applicationDetails}>
                  <Text style={styles.company}>{application.companyName}</Text>
                  <Text style={styles.location}>
                    Applied: {application.appliedAt?.toDate().toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
              
              {application.status === 'accepted' && (
                <View style={styles.acceptedInfo}>
                  <Text style={styles.acceptedText}>
                    🎉 Congratulations! Your application has been accepted.
                  </Text>
                  
                  {/* Location and Chat Buttons - ADDED HERE */}
                  <View style={styles.actionButtons}>
                    {application.locationShared && (
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.locationButton]}
                        onPress={() => handleViewLocation(application)}
                      >
                        <Text style={styles.actionButtonText}>📍 View Location</Text>
                      </TouchableOpacity>
                    )}

                    {application.chatEnabled && (
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.chatButton]}
                        onPress={() => handleOpenChat(application)}
                      >
                        <Text style={styles.actionButtonText}>💬 Chat with Employer</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.contactText}>
                    The employer has shared their location. You can now view it and chat with them.
                  </Text>
                </View>
              )}

              {application.status === 'rejected' && (
                <View style={styles.rejectedInfo}>
                  <Text style={styles.rejectedText}>
                    Unfortunately, your application was not selected.
                  </Text>
                  <TouchableOpacity 
                    style={styles.browseButton}
                    onPress={() => navigation.navigate('WorkerHome')}
                  >
                    <Text style={styles.browseButtonText}>Browse More Jobs</Text>
                  </TouchableOpacity>
                </View>
              )}

              {application.status === 'pending' && (
                <View style={styles.pendingInfo}>
                  <Text style={styles.pendingText}>
                    ⏳ Your application is under review by the employer.
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
    backgroundColor: colors.white,
    borderRadius: 16,
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 20,
    lineHeight: 20,
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  applicationCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 5,
  },
  applicationDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  location: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.background,
    alignSelf: 'flex-start',
  },
  acceptedInfo: {
    backgroundColor: colors.success + '15',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  acceptedText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  contactText: {
    color: colors.success,
    fontSize: 12,
    opacity: 0.8,
    marginTop: 8,
  },
  rejectedInfo: {
    backgroundColor: colors.error + '15',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    alignItems: 'center',
  },
  rejectedText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  pendingInfo: {
    backgroundColor: colors.warning + '15',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  pendingText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  // NEW STYLES FOR LOCATION AND CHAT BUTTONS
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  locationButton: {
    backgroundColor: colors.info,
  },
  chatButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default MyJobsScreen;