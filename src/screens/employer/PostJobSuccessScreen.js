// src/screens/employer/PostJobSuccessScreen.js
import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { colors } from '../../constants/colors';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function PostJobSuccessScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { jobData, isPaid = true } = route.params || {};

  // Optional: Log the received data for debugging
  useEffect(() => {
    console.log('🎉 PostJobSuccessScreen mounted with data:', jobData);
  }, []);

  const handleViewJobs = () => {
    navigation.replace('EmployerMain', { screen: 'EmployerHome' });
  };

  const handlePostAnother = () => {
    navigation.replace('PostJob');
  };

  if (!jobData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Job Posted!</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successText}>
              Your job has been posted successfully.
            </Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.viewJobsButton}
              onPress={handleViewJobs}
            >
              <Text style={styles.viewJobsButtonText}>View My Jobs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.postAnotherButton}
              onPress={handlePostAnother}
            >
              <Text style={styles.postAnotherButtonText}>Post Another Job</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job Posted Successfully! 🎉</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Success Banner */}
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Job Posted!</Text>
          <Text style={styles.successText}>
            Your job has been posted successfully and is now visible to workers.
          </Text>
          
          {isPaid && (
            <View style={styles.paymentStatus}>
              <Text style={styles.paymentStatusIcon}>💰</Text>
              <Text style={styles.paymentStatusText}>Platform fee paid</Text>
            </View>
          )}
        </View>

        {/* Job Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Job Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Job Title:</Text>
            <Text style={styles.detailValue}>{jobData.title}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Description:</Text>
            <Text style={styles.detailValue} numberOfLines={2}>
              {jobData.description || 'No description provided'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{jobData.jobDate}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>
              {jobData.startTime} - {jobData.endTime}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration:</Text>
            <Text style={styles.detailValue}>
              {jobData.duration || 'N/A'} hours
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Hourly Rate:</Text>
            <Text style={styles.detailValue}>
              ₹{jobData.rate || 'N/A'}/hour
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Payment:</Text>
            <Text style={styles.detailValue}>
              ₹{jobData.totalPayment || 'N/A'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Platform Fee:</Text>
            <Text style={[styles.detailValue, { color: isPaid ? colors.success : colors.warning }]}>
              ₹{jobData.platformFee || '0'} {isPaid ? '(Paid)' : '(Pending)'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>{jobData.location || 'N/A'}</Text>
          </View>
        </View>

        {/* Next Steps */}
        <View style={styles.nextStepsCard}>
          <Text style={styles.nextStepsTitle}>What's Next?</Text>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Wait for Applications</Text>
              <Text style={styles.stepText}>
                Workers will see your job and start applying. You'll receive notifications when applications come in.
              </Text>
            </View>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Review Applications</Text>
              <Text style={styles.stepText}>
                Go to "Applications" tab to review worker profiles, ratings, and experience.
              </Text>
            </View>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Select Worker</Text>
              <Text style={styles.stepText}>
                Choose the best worker for your job and send them a confirmation.
              </Text>
            </View>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Track Job Progress</Text>
              <Text style={styles.stepText}>
                Monitor the job status and communicate with the worker through chat.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.viewJobsButton}
            onPress={handleViewJobs}
          >
            <Text style={styles.viewJobsButtonText}>View My Jobs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.postAnotherButton}
            onPress={handlePostAnother}
          >
            <Text style={styles.postAnotherButtonText}>Post Another Job</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => {
              Alert.alert('Share Feature', 'Job sharing feature will be added soon!');
            }}
          >
            <Text style={styles.shareButtonText}>Share This Job</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.tipText}>
          💡 Pro Tip: Check your job post regularly and respond quickly to applications to find the best workers!
        </Text>
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
    backgroundColor: colors.white,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  successCard: {
    backgroundColor: colors.success + '20',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '40',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  paymentStatusIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  detailsCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  nextStepsCard: {
    backgroundColor: colors.info + '15',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.info,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
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
  stepText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actions: {
    marginTop: 10,
    marginBottom: 20,
  },
  viewJobsButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  viewJobsButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  postAnotherButton: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  postAnotherButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    backgroundColor: colors.secondary + '20',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  shareButtonText: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  tipText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 20,
    fontStyle: 'italic',
  },
});