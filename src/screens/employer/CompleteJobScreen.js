// src/screens/employer/CompleteJobScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../constants/colors';
import { 
  completeJob, 
  fetchJobById,
  checkCanRate 
} from '../../services/database';
import RatingModal from '../../components/RatingModal';

const CompleteJobScreen = ({ route, navigation }) => {
  const { applicationId, jobId, workerId, workerName } = route.params;
  const [loading, setLoading] = useState(true);
  const [jobDetails, setJobDetails] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    loadJobDetails();
  }, []);

  const loadJobDetails = async () => {
    const result = await fetchJobById(jobId);
    if (result.success) {
      setJobDetails(result.job);
    }
    setLoading(false);
  };

  const handleCompleteJob = async () => {
    Alert.alert(
      'Complete Job',
      `Are you sure you want to mark this job as completed?\n\nThis will:\n• Close the job\n• Update completion statistics\n• Allow you to rate ${workerName}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: async () => {
            setCompleting(true);
            const result = await completeJob(applicationId);
            setCompleting(false);

            if (result.success) {
              Alert.alert(
                'Success',
                'Job marked as completed!',
                [
                  {
                    text: 'Rate Worker Now',
                    onPress: () => setShowRatingModal(true)
                  },
                  {
                    text: 'Rate Later',
                    onPress: () => navigation.goBack()
                  }
                ]
              );
            } else {
              Alert.alert('Error', result.error || 'Failed to complete job');
            }
          }
        }
      ]
    );
  };

  const handleRatingSubmitted = () => {
    Alert.alert(
      'Thank You!',
      'Your rating has been submitted successfully.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
        <Text style={styles.headerTitle}>Complete Job</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Job Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Job Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Job Title:</Text>
            <Text style={styles.infoValue}>{jobDetails?.title}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Worker:</Text>
            <Text style={styles.infoValue}>{workerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={styles.infoValue}>{jobDetails?.location}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rate:</Text>
            <Text style={styles.infoValue}>₹{jobDetails?.rate}/hour</Text>
          </View>
        </View>

        {/* Completion Checklist */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Before Completing</Text>
          <Text style={styles.checklistIntro}>
            Please ensure the following before marking this job as complete:
          </Text>
          
          <View style={styles.checklistItem}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.checkText}>Worker has finished all assigned tasks</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.checkText}>Quality of work meets your expectations</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.checkText}>All payments have been settled</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.checkText}>No pending issues or concerns</Text>
          </View>
        </View>

        {/* What Happens Next */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What Happens Next?</Text>
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Job Closes</Text>
              <Text style={styles.stepDescription}>
                The job listing will be marked as completed and closed
              </Text>
            </View>
          </View>
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Stats Update</Text>
              <Text style={styles.stepDescription}>
                Both your and worker's completion statistics will be updated
              </Text>
            </View>
          </View>
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Rate & Review</Text>
              <Text style={styles.stepDescription}>
                You'll be prompted to rate the worker's performance
              </Text>
            </View>
          </View>
        </View>

        {/* Complete Button */}
        <TouchableOpacity
          style={[styles.completeButton, completing && styles.completeButtonDisabled]}
          onPress={handleCompleteJob}
          disabled={completing}
        >
          {completing ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.completeIcon}>✓</Text>
              <Text style={styles.completeButtonText}>Mark Job as Complete</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Rating Modal */}
      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleRatingSubmitted}
        ratingType="worker"
        ratingData={{
          jobId: jobId,
          jobTitle: jobDetails?.title,
          workerId: workerId,
          workerName: workerName,
          employerId: jobDetails?.employerId,
          employerName: jobDetails?.companyName,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 20,
  },
  card: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  infoLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  checklistIntro: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkIcon: {
    fontSize: 18,
    color: colors.success,
    marginRight: 12,
    fontWeight: 'bold',
  },
  checkText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  completeButton: {
    flexDirection: 'row',
    backgroundColor: colors.success,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  completeButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
  completeIcon: {
    fontSize: 20,
    color: colors.white,
    marginRight: 8,
  },
  completeButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.white,
  },
});

export default CompleteJobScreen;