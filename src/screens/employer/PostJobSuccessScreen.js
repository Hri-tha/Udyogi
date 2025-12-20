// src/screens/employer/PostJobSuccessScreen.js - HINDI VERSION
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
import { useLanguage } from '../../context/LanguageContext';

export default function PostJobSuccessScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { locale, t } = useLanguage();
  const { jobData, isPaid = true } = route.params || {};

  // Translations for this screen
  const translations = {
    en: {
      jobPostedSuccessfully: "Job Posted Successfully! 🎉",
      jobPosted: "Job Posted!",
      successTitle: "Success!",
      successText: "Your job has been posted successfully.",
      successTextDetailed: "Your job has been posted successfully and is now visible to workers.",
      platformFeePaid: "Platform fee paid",
      jobDetails: "Job Details",
      jobTitle: "Job Title:",
      description: "Description:",
      date: "Date:",
      time: "Time:",
      duration: "Duration:",
      hourlyRate: "Hourly Rate:",
      totalPayment: "Total Payment:",
      platformFee: "Platform Fee:",
      paid: "(Paid)",
      pending: "(Pending)",
      location: "Location:",
      whatsNext: "What's Next?",
      waitForApplications: "Wait for Applications",
      waitForApplicationsDesc: "Workers will see your job and start applying. You'll receive notifications when applications come in.",
      reviewApplications: "Review Applications",
      reviewApplicationsDesc: "Go to \"Applications\" tab to review worker profiles, ratings, and experience.",
      selectWorker: "Select Worker",
      selectWorkerDesc: "Choose the best worker for your job and send them a confirmation.",
      trackJobProgress: "Track Job Progress",
      trackJobProgressDesc: "Monitor the job status and communicate with the worker through chat.",
      viewMyJobs: "View My Jobs",
      postAnotherJob: "Post Another Job",
      shareThisJob: "Share This Job",
      shareFeature: "Share Feature",
      shareFeatureMessage: "Job sharing feature will be added soon!",
      proTip: "💡 Pro Tip: Check your job post regularly and respond quickly to applications to find the best workers!",
      noDescription: "No description provided",
      notAvailable: "N/A",
      hours: "hours",
      perHour: "/hour",
      loading: "Loading...",
      filter: "Filter",
      sort: "Sort",
      search: "Search",
    },
    hi: {
      jobPostedSuccessfully: "नौकरी सफलतापूर्वक पोस्ट की गई! 🎉",
      jobPosted: "नौकरी पोस्ट की गई!",
      successTitle: "सफलता!",
      successText: "आपकी नौकरी सफलतापूर्वक पोस्ट की गई है।",
      successTextDetailed: "आपकी नौकरी सफलतापूर्वक पोस्ट की गई है और अब कर्मचारियों को दिखाई दे रही है।",
      platformFeePaid: "प्लेटफॉर्म शुल्क चुकाया गया",
      jobDetails: "नौकरी विवरण",
      jobTitle: "नौकरी शीर्षक:",
      description: "विवरण:",
      date: "तारीख:",
      time: "समय:",
      duration: "अवधि:",
      hourlyRate: "प्रति घंटा दर:",
      totalPayment: "कुल भुगतान:",
      platformFee: "प्लेटफॉर्म शुल्क:",
      paid: "(चुकाया गया)",
      pending: "(लंबित)",
      location: "स्थान:",
      whatsNext: "अगले कदम क्या हैं?",
      waitForApplications: "आवेदनों की प्रतीक्षा करें",
      waitForApplicationsDesc: "कर्मचारी आपकी नौकरी देखेंगे और आवेदन करना शुरू कर देंगे। आवेदन आने पर आपको सूचनाएं मिलेंगी।",
      reviewApplications: "आवेदनों की समीक्षा करें",
      reviewApplicationsDesc: "कर्मचारी प्रोफाइल, रेटिंग और अनुभव की समीक्षा करने के लिए \"आवेदन\" टैब पर जाएं।",
      selectWorker: "कर्मचारी चुनें",
      selectWorkerDesc: "अपनी नौकरी के लिए सर्वश्रेष्ठ कर्मचारी चुनें और उन्हें पुष्टि भेजें।",
      trackJobProgress: "नौकरी प्रगति ट्रैक करें",
      trackJobProgressDesc: "नौकरी की स्थिति की निगरानी करें और चैट के माध्यम से कर्मचारी से संवाद करें।",
      viewMyJobs: "मेरी नौकरियां देखें",
      postAnotherJob: "एक और नौकरी पोस्ट करें",
      shareThisJob: "इस नौकरी को साझा करें",
      shareFeature: "साझा करें सुविधा",
      shareFeatureMessage: "नौकरी साझा करने की सुविधा जल्द ही जोड़ी जाएगी!",
      proTip: "💡 पेशेवर सुझाव: सर्वश्रेष्ठ कर्मचारियों को खोजने के लिए नियमित रूप से अपनी नौकरी पोस्ट की जांच करें और आवेदनों का त्वरित जवाब दें!",
      noDescription: "कोई विवरण प्रदान नहीं किया गया",
      notAvailable: "उपलब्ध नहीं",
      hours: "घंटे",
      perHour: "/घंटा",
      loading: "लोड हो रहा है...",
      filter: "फ़िल्टर",
      sort: "क्रमबद्ध करें",
      search: "खोजें",
    }
  };

  const tr = translations[locale] || translations.en;

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
          <Text style={styles.headerTitle}>{tr.jobPosted}</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>{tr.successTitle}</Text>
            <Text style={styles.successText}>
              {tr.successText}
            </Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.viewJobsButton}
              onPress={handleViewJobs}
            >
              <Text style={styles.viewJobsButtonText}>{tr.viewMyJobs}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.postAnotherButton}
              onPress={handlePostAnother}
            >
              <Text style={styles.postAnotherButtonText}>{tr.postAnotherJob}</Text>
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
        <Text style={styles.headerTitle}>{tr.jobPostedSuccessfully}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Success Banner */}
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>{tr.jobPosted}</Text>
          <Text style={styles.successText}>
            {tr.successTextDetailed}
          </Text>
          
          {isPaid && (
            <View style={styles.paymentStatus}>
              <Text style={styles.paymentStatusIcon}>💰</Text>
              <Text style={styles.paymentStatusText}>{tr.platformFeePaid}</Text>
            </View>
          )}
        </View>

        {/* Job Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>{tr.jobDetails}</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{tr.jobTitle}</Text>
            <Text style={styles.detailValue}>{jobData.title}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{tr.description}</Text>
            <Text style={styles.detailValue} numberOfLines={2}>
              {jobData.description || tr.noDescription}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{tr.date}</Text>
            <Text style={styles.detailValue}>{jobData.jobDate}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{tr.time}</Text>
            <Text style={styles.detailValue}>
              {jobData.startTime} - {jobData.endTime}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{tr.duration}</Text>
            <Text style={styles.detailValue}>
              {jobData.duration || tr.notAvailable} {tr.hours}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{tr.hourlyRate}</Text>
            <Text style={styles.detailValue}>
              ₹{jobData.rate || tr.notAvailable}{tr.perHour}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{tr.totalPayment}</Text>
            <Text style={styles.detailValue}>
              ₹{jobData.totalPayment || tr.notAvailable}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{tr.platformFee}</Text>
            <Text style={[styles.detailValue, { color: isPaid ? colors.success : colors.warning }]}>
              ₹{jobData.platformFee || '0'} {isPaid ? tr.paid : tr.pending}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{tr.location}</Text>
            <Text style={styles.detailValue}>{jobData.location || tr.notAvailable}</Text>
          </View>
        </View>

        {/* Next Steps */}
        <View style={styles.nextStepsCard}>
          <Text style={styles.nextStepsTitle}>{tr.whatsNext}</Text>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{tr.waitForApplications}</Text>
              <Text style={styles.stepText}>
                {tr.waitForApplicationsDesc}
              </Text>
            </View>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{tr.reviewApplications}</Text>
              <Text style={styles.stepText}>
                {tr.reviewApplicationsDesc}
              </Text>
            </View>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{tr.selectWorker}</Text>
              <Text style={styles.stepText}>
                {tr.selectWorkerDesc}
              </Text>
            </View>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{tr.trackJobProgress}</Text>
              <Text style={styles.stepText}>
                {tr.trackJobProgressDesc}
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
            <Text style={styles.viewJobsButtonText}>{tr.viewMyJobs}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.postAnotherButton}
            onPress={handlePostAnother}
          >
            <Text style={styles.postAnotherButtonText}>{tr.postAnotherJob}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => {
              Alert.alert(tr.shareFeature, tr.shareFeatureMessage);
            }}
          >
            <Text style={styles.shareButtonText}>{tr.shareThisJob}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.tipText}>
          {tr.proTip}
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