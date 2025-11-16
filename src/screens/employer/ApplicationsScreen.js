// src/screens/employer/ApplicationsScreen.js - FIXED
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
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { 
  updateApplicationStatus, 
  fetchJobApplications,
  fetchEmployerJobs 
} from '../../services/database';
import { colors } from '../../constants/colors';

const ApplicationsScreen = ({ route, navigation }) => {
  const { jobId } = route.params || {};
  const { user, userProfile } = useAuth();
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(jobId);
  const [loading, setLoading] = useState(true);
  const [showJobSelector, setShowJobSelector] = useState(!jobId);
  const [processingApplication, setProcessingApplication] = useState(null);

  useEffect(() => {
    console.log('ApplicationsScreen mounted with jobId:', jobId);
    if (jobId) {
      loadApplications(jobId);
    } else {
      loadEmployerJobs();
    }
  }, [jobId, user?.uid]);

  const loadEmployerJobs = async () => {
    try {
      if (!user?.uid) {
        console.log('No user ID available');
        setLoading(false);
        return;
      }

      console.log('Loading employer jobs for:', user.uid);
      const result = await fetchEmployerJobs(user.uid);
      console.log('Employer jobs result:', result);
      
      if (result.success) {
        // Get all jobs and fetch their applications
        const jobsWithApps = [];
        
        for (const job of result.jobs) {
          const appsResult = await fetchJobApplications(job.id);
          if (appsResult.success && appsResult.applications.length > 0) {
            jobsWithApps.push({
              ...job,
              applications: appsResult.applications
            });
          }
        }
        
        console.log('Jobs with applications:', jobsWithApps.length);
        setJobs(jobsWithApps);
      } else {
        console.error('Failed to fetch jobs:', result.error);
        Alert.alert('Error', 'Failed to load jobs: ' + result.error);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      Alert.alert('Error', 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async (targetJobId) => {
    try {
      setLoading(true);
      console.log('Loading applications for job:', targetJobId);
      
      const result = await fetchJobApplications(targetJobId);
      console.log('Applications result:', result);
      
      if (result.success) {
        console.log('Found applications:', result.applications.length);
        setApplications(result.applications);
        setSelectedJobId(targetJobId);
        setShowJobSelector(false);
      } else {
        console.error('Failed to fetch applications:', result.error);
        Alert.alert('Error', result.error || 'Failed to load applications');
      }
    } catch (error) {
      console.error('Error in loadApplications:', error);
      Alert.alert('Error', 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptApplication = async (application) => {
    console.log('Accepting application:', application.id);
    setProcessingApplication(application.id);
    
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'We need your location to share the work location with the worker.'
        );
        setProcessingApplication(null);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      let geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const address = geocode.length > 0 
        ? `${geocode[0].name || ''} ${geocode[0].street || ''}, ${geocode[0].city || ''}, ${geocode[0].region || ''}`
        : userProfile?.location || 'Work Location';

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address.trim(),
        sharedAt: new Date().toISOString()
      };

      console.log('Updating application status with location:', locationData);
      const result = await updateApplicationStatus(
        application.id, 
        'accepted', 
        locationData
      );

      if (result.success) {
        Alert.alert(
          'Success', 
          'Application accepted! Location shared and chat enabled with the worker.'
        );
        await loadApplications(selectedJobId);
      } else {
        console.error('Failed to accept application:', result.error);
        Alert.alert('Error', result.error || 'Failed to accept application');
      }
    } catch (error) {
      console.error('Error accepting application:', error);
      Alert.alert('Error', 'Failed to accept application. Please try again.');
    } finally {
      setProcessingApplication(null);
    }
  };

  const handleRejectApplication = async (applicationId, workerId, workerName) => {
    try {
      console.log('Rejecting application:', applicationId);
      
      const result = await updateApplicationStatus(applicationId, 'rejected');
      
      if (result.success) {
        Alert.alert('Success', 'Application rejected');
        await loadApplications(selectedJobId);
      } else {
        Alert.alert('Error', result.error || 'Failed to reject application');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      Alert.alert('Error', 'Failed to reject application');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return colors.success;
      case 'rejected': return colors.error;
      default: return colors.warning;
    }
  };

  const handleViewLocation = (application) => {
    if (application.employerLocation) {
      navigation.navigate('JobLocation', { 
        application,
        isEmployer: true 
      });
    }
  };

  const handleOpenChat = (application) => {
    if (application.chatEnabled) {
      navigation.navigate('ChatScreen', {
        applicationId: application.id,
        otherUser: application.workerId,
        jobTitle: application.jobTitle,
        otherUserName: application.workerName
      });
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
          <Text style={styles.loadingText}>Loading applications...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (showJobSelector) {
            navigation.goBack();
          } else {
            setShowJobSelector(true);
            setApplications([]);
          }
        }}>
          <Text style={styles.backButton}>
            {showJobSelector ? '← Back' : '← All Jobs'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {showJobSelector ? 'Select Job' : 'Applications'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {showJobSelector ? (
          // Job Selection View
          <View>
            <Text style={styles.sectionTitle}>Select a job to view applications</Text>
            {jobs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>No jobs with applications</Text>
                <Text style={styles.emptySubtext}>
                  Applications will appear here when workers apply to your jobs
                </Text>
              </View>
            ) : (
              jobs.map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  onPress={() => {
                    console.log('Selected job:', job.id, 'with', job.applications?.length, 'applications');
                    loadApplications(job.id);
                  }}
                >
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <Text style={styles.jobLocation}>📍 {job.location}</Text>
                  <Text style={styles.applicationCount}>
                    {job.applications?.length || 0} application{job.applications?.length !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          // Applications View
          <>
            <View style={styles.statsCard}>
              <Text style={styles.statsText}>
                {applications.length} application{applications.length !== 1 ? 's' : ''}
              </Text>
              {selectedJobId && applications.length > 0 && (
                <Text style={styles.jobName}>
                  {applications[0]?.jobTitle || 'Job Applications'}
                </Text>
              )}
            </View>

            {applications.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyText}>No applications yet</Text>
                <Text style={styles.emptySubtext}>
                  Applications will appear here when workers apply
                </Text>
              </View>
            ) : (
              applications.map((application) => (
                <View key={application.id} style={styles.applicationCard}>
                  <View style={styles.applicationHeader}>
                    <View style={styles.workerInfo}>
                      <Text style={styles.workerName}>{application.workerName}</Text>
                      <Text style={styles.workerPhone}>📞 {application.workerPhone}</Text>
                    </View>
                    <Text style={[styles.status, { color: getStatusColor(application.status) }]}>
                      {application.status.toUpperCase()}
                    </Text>
                  </View>
                  
                  <Text style={styles.jobTitle}>💼 {application.jobTitle}</Text>
                  <Text style={styles.appliedDate}>
                    📅 Applied: {application.appliedAt?.toDate().toLocaleDateString()}
                  </Text>

                  {/* Journey Status Badge */}
                  {application.journeyStatus && application.journeyStatus !== 'accepted' && (
                    <View style={styles.journeyStatusBadge}>
                      <Text style={styles.journeyStatusText}>
                        {application.journeyStatus === 'onTheWay' ? '🚗 On The Way' :
                         application.journeyStatus === 'reached' ? '📍 Arrived' :
                         application.journeyStatus === 'started' ? '⚡ Working' :
                         application.journeyStatus === 'completed' ? '✅ Completed' : ''}
                      </Text>
                    </View>
                  )}

                  {application.status === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.acceptButton, 
                               processingApplication === application.id && styles.disabledButton]}
                        onPress={() => handleAcceptApplication(application)}
                        disabled={processingApplication === application.id}
                      >
                        {processingApplication === application.id ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Text style={styles.actionButtonText}>✅ Accept</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => 
                          handleRejectApplication(application.id, application.workerId, application.workerName)
                        }
                      >
                        <Text style={styles.actionButtonText}>❌ Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {application.status === 'accepted' && (
                    <View style={styles.acceptedActions}>
                      <Text style={styles.acceptedTitle}>✅ Application Accepted</Text>
                      
                      {/* TRACK JOB PROGRESS BUTTON */}
                      <TouchableOpacity
                        style={[styles.actionButton, styles.trackButton]}
                        onPress={() => {
                          console.log('Navigating to job tracking for:', application.id);
                          navigation.navigate('EmployerJobTracking', { 
                            applicationId: application.id 
                          });
                        }}
                      >
                        <Text style={styles.actionButtonText}>📊 Track Job Progress</Text>
                      </TouchableOpacity>

                      {application.locationShared && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.locationButton]}
                          onPress={() => handleViewLocation(application)}
                        >
                          <Text style={styles.actionButtonText}>📍 View Shared Location</Text>
                        </TouchableOpacity>
                      )}

                      {application.chatEnabled && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.chatButton]}
                          onPress={() => handleOpenChat(application)}
                        >
                          <Text style={styles.actionButtonText}>💬 Open Chat</Text>
                        </TouchableOpacity>
                      )}

                      <View style={styles.contactInfo}>
                        <Text style={styles.contactTitle}>Worker Contact Information:</Text>
                        <Text style={styles.contactDetail}>👤 Name: {application.workerName}</Text>
                        <Text style={styles.contactDetail}>📞 Phone: {application.workerPhone}</Text>
                        <Text style={styles.contactNote}>
                          Please contact the worker to coordinate the job details.
                        </Text>
                      </View>
                    </View>
                  )}

                  {application.status === 'rejected' && (
                    <View style={styles.rejectedInfo}>
                      <Text style={styles.rejectedText}>❌ Application Rejected</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  jobName: {
    color: colors.white,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.9,
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
    lineHeight: 20,
  },
  jobCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  applicationCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  workerPhone: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  jobTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  appliedDate: {
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.7,
    marginBottom: 12,
  },
  journeyStatusBadge: {
    backgroundColor: colors.info + '20',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  journeyStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.info,
  },
  jobLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  applicationCount: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    marginBottom: 8,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  trackButton: {
    backgroundColor: colors.info,
    marginHorizontal: 0,
  },
  locationButton: {
    backgroundColor: colors.warning,
    marginHorizontal: 0,
  },
  chatButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 0,
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  acceptedActions: {
    marginTop: 12,
  },
  acceptedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
    marginBottom: 12,
    textAlign: 'center',
  },
  contactInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  contactDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  contactNote: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  rejectedInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.error + '15',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  rejectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
    textAlign: 'center',
  },
});

export default ApplicationsScreen;