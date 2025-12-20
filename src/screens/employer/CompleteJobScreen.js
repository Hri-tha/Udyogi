// src/screens/employer/CompleteJobScreen.js - HINDI VERSION
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
import { useLanguage } from '../../context/LanguageContext';
import { 
  completeJob, 
  fetchJobById,
  checkCanRate 
} from '../../services/database';
import RatingModal from '../../components/RatingModal';

const CompleteJobScreen = ({ route, navigation }) => {
  const { applicationId, jobId, workerId, workerName } = route.params;
  const { locale, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [jobDetails, setJobDetails] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Translations for this screen
  const translations = {
    en: {
      back: "Back",
      completeJob: "Complete Job",
      loading: "Loading...",
      jobDetails: "Job Details",
      jobTitle: "Job Title",
      worker: "Worker",
      location: "Location",
      rate: "Rate",
      perHour: "/hour",
      beforeCompleting: "Before Completing",
      checklistIntro: "Please ensure the following before marking this job as complete:",
      checklist1: "Worker has finished all assigned tasks",
      checklist2: "Quality of work meets your expectations",
      checklist3: "All payments have been settled",
      checklist4: "No pending issues or concerns",
      whatHappensNext: "What Happens Next?",
      step1Title: "Job Closes",
      step1Desc: "The job listing will be marked as completed and closed",
      step2Title: "Stats Update",
      step2Desc: "Both your and worker's completion statistics will be updated",
      step3Title: "Rate & Review",
      step3Desc: "You'll be prompted to rate the worker's performance",
      markJobComplete: "Mark Job as Complete",
      completeJobAlert: "Complete Job",
      completeJobConfirm: "Are you sure you want to mark this job as completed?",
      completeJobPoints: "This will:\n• Close the job\n• Update completion statistics\n• Allow you to rate",
      cancel: "Cancel",
      complete: "Complete",
      success: "Success",
      jobCompletedSuccess: "Job marked as completed!",
      rateWorkerNow: "Rate Worker Now",
      rateLater: "Rate Later",
      error: "Error",
      failedToComplete: "Failed to complete job",
      thankYou: "Thank You!",
      ratingSubmitted: "Your rating has been submitted successfully.",
      ok: "OK",
    },
    hi: {
      back: "पीछे",
      completeJob: "नौकरी पूर्ण करें",
      loading: "लोड हो रहा है...",
      jobDetails: "नौकरी विवरण",
      jobTitle: "नौकरी शीर्षक",
      worker: "कर्मचारी",
      location: "स्थान",
      rate: "दर",
      perHour: "/घंटा",
      beforeCompleting: "पूर्ण करने से पहले",
      checklistIntro: "कृपया इस नौकरी को पूर्ण चिह्नित करने से पहले निम्नलिखित सुनिश्चित करें:",
      checklist1: "कर्मचारी ने सभी सौंपे गए कार्य पूरे कर लिए हैं",
      checklist2: "कार्य की गुणवत्ता आपकी अपेक्षाओं को पूरा करती है",
      checklist3: "सभी भुगतान निपटा दिए गए हैं",
      checklist4: "कोई लंबित मुद्दे या चिंताएं नहीं हैं",
      whatHappensNext: "आगे क्या होगा?",
      step1Title: "नौकरी बंद होगी",
      step1Desc: "नौकरी लिस्टिंग पूर्ण और बंद के रूप में चिह्नित की जाएगी",
      step2Title: "आंकड़े अपडेट होंगे",
      step2Desc: "आपके और कर्मचारी दोनों के पूर्णता आंकड़े अपडेट होंगे",
      step3Title: "रेटिंग और समीक्षा",
      step3Desc: "आपको कर्मचारी के प्रदर्शन को रेट करने के लिए प्रेरित किया जाएगा",
      markJobComplete: "नौकरी को पूर्ण चिह्नित करें",
      completeJobAlert: "नौकरी पूर्ण करें",
      completeJobConfirm: "क्या आप निश्चित रूप से इस नौकरी को पूर्ण चिह्नित करना चाहते हैं?",
      completeJobPoints: "यह करेगा:\n• नौकरी बंद करेगा\n• पूर्णता आंकड़े अपडेट करेगा\n• आपको रेट करने की अनुमति देगा",
      cancel: "रद्द करें",
      complete: "पूर्ण करें",
      success: "सफल",
      jobCompletedSuccess: "नौकरी पूर्ण चिह्नित की गई!",
      rateWorkerNow: "अभी कर्मचारी रेट करें",
      rateLater: "बाद में रेट करें",
      error: "त्रुटि",
      failedToComplete: "नौकरी पूर्ण करने में विफल",
      thankYou: "धन्यवाद!",
      ratingSubmitted: "आपकी रेटिंग सफलतापूर्वक सबमिट हो गई है।",
      ok: "ठीक है",
    }
  };

  const tr = translations[locale] || translations.en;

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
      tr.completeJobAlert,
      `${tr.completeJobConfirm}\n\n${tr.completeJobPoints} ${workerName}`,
      [
        { text: tr.cancel, style: 'cancel' },
        {
          text: tr.complete,
          style: 'default',
          onPress: async () => {
            setCompleting(true);
            const result = await completeJob(applicationId);
            setCompleting(false);

            if (result.success) {
              Alert.alert(
                tr.success,
                tr.jobCompletedSuccess,
                [
                  {
                    text: tr.rateWorkerNow,
                    onPress: () => setShowRatingModal(true)
                  },
                  {
                    text: tr.rateLater,
                    onPress: () => navigation.goBack()
                  }
                ]
              );
            } else {
              Alert.alert(tr.error, result.error || tr.failedToComplete);
            }
          }
        }
      ]
    );
  };

  const handleRatingSubmitted = () => {
    Alert.alert(
      tr.thankYou,
      tr.ratingSubmitted,
      [{ text: tr.ok, onPress: () => navigation.goBack() }]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{tr.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← {tr.back}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tr.completeJob}</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Job Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr.jobDetails}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{tr.jobTitle}:</Text>
            <Text style={styles.infoValue}>{jobDetails?.title}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{tr.worker}:</Text>
            <Text style={styles.infoValue}>{workerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{tr.location}:</Text>
            <Text style={styles.infoValue}>{jobDetails?.location}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{tr.rate}:</Text>
            <Text style={styles.infoValue}>₹{jobDetails?.rate}{tr.perHour}</Text>
          </View>
        </View>

        {/* Completion Checklist */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr.beforeCompleting}</Text>
          <Text style={styles.checklistIntro}>
            {tr.checklistIntro}
          </Text>
          
          <View style={styles.checklistItem}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.checkText}>{tr.checklist1}</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.checkText}>{tr.checklist2}</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.checkText}>{tr.checklist3}</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.checkText}>{tr.checklist4}</Text>
          </View>
        </View>

        {/* What Happens Next */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr.whatHappensNext}</Text>
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{tr.step1Title}</Text>
              <Text style={styles.stepDescription}>
                {tr.step1Desc}
              </Text>
            </View>
          </View>
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{tr.step2Title}</Text>
              <Text style={styles.stepDescription}>
                {tr.step2Desc}
              </Text>
            </View>
          </View>
          <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{tr.step3Title}</Text>
              <Text style={styles.stepDescription}>
                {tr.step3Desc}
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
              <Text style={styles.completeButtonText}>{tr.markJobComplete}</Text>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
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