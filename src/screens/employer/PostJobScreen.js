// src/screens/employer/PostJobScreen.js - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { createJobWithTiming } from '../../services/database';
import { colors } from '../../constants/colors';
import CustomDateTimePicker from '../../components/CustomDateTimePicker';
import {
  canPostJob,
  calculateJobPostingFee,
  createPlatformFee,
} from '../../services/platformFeeService';
import {
  isRazorpayAvailable
} from '../../services/razorpay';

export default function PostJobScreen({ navigation, route }) {
  const { user, userProfile } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(userProfile?.location || '');
  const [rate, setRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  
  // Platform fee states
  const [feeInfo, setFeeInfo] = useState(null);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState(null);
  const [processingFee, setProcessingFee] = useState(false);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [pendingFeesExist, setPendingFeesExist] = useState(false);
  
  // Date and Time states
  const [jobDate, setJobDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    checkPostingEligibility();
    checkRazorpayAvailability();
  }, []);

  useEffect(() => {
    if (route.params?.refresh) {
      clearForm();
    }
  }, [route.params?.refresh]);

  const checkRazorpayAvailability = () => {
    const available = isRazorpayAvailable();
    setRazorpayEnabled(available);
  };

  const checkPostingEligibility = async () => {
    try {
      const result = await canPostJob(user.uid);
      
      if (!result.success) {
        Alert.alert('Error', result.error);
        navigation.goBack();
        return;
      }

      if (!result.canPost && result.requiresPayment) {
        // Has blocking pending fees
        Alert.alert(
          '💰 Payment Required',
          `You have pending platform fees totaling ₹${result.totalDue} from completed jobs.\n\nPlease clear these fees before posting new jobs.`,
          [
            {
              text: 'Pay Now',
              onPress: () => {
                navigation.navigate('PlatformFeePayment', {
                  totalAmount: result.totalDue,
                  returnTo: 'PostJob',
                  source: 'eligibility_check'
                });
              }
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => navigation.goBack()
            }
          ],
          { cancelable: false }
        );
        setPendingFeesExist(true);
      } else {
        setPendingFeesExist(false);
      }
    } catch (error) {
      console.error('Error checking posting eligibility:', error);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const formatDateForStorage = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatTimeForStorage = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const isEndTimeAfterStartTime = (start, end) => {
    const startTotalMinutes = start.getHours() * 60 + start.getMinutes();
    const endTotalMinutes = end.getHours() * 60 + end.getMinutes();
    return endTotalMinutes > startTotalMinutes;
  };

  const calculateDuration = () => {
    const startTotalMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endTotalMinutes = endTime.getHours() * 60 + endTime.getMinutes();
    const duration = (endTotalMinutes - startTotalMinutes) / 60;
    return duration > 0 ? duration.toFixed(1) : 0;
  };

  const calculateTotal = () => {
    const duration = calculateDuration();
    return duration > 0 && rate ? Math.round(duration * parseFloat(rate)) : 0;
  };

  const handlePostJob = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter job title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter job description');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter location');
      return;
    }
    if (!rate || rate < 50) {
      Alert.alert('Error', 'Rate must be at least ₹50/hour');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(jobDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      Alert.alert('Error', 'Job date cannot be in the past');
      return;
    }

    if (!isEndTimeAfterStartTime(startTime, endTime)) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    const duration = calculateDuration();
    if (duration < 1) {
      Alert.alert('Error', 'Job duration must be at least 1 hour');
      return;
    }

    // Calculate platform fee
    const totalPayment = calculateTotal();
    const feeResult = await calculateJobPostingFee(totalPayment, user.uid);
    
    if (!feeResult.success) {
      Alert.alert('Error', feeResult.error);
      return;
    }

    setFeeInfo(feeResult);

    // If free or no fee, post directly
    if (feeResult.isFree || feeResult.platformFee === 0) {
      await proceedWithJobPosting(null);
    } else {
      // Show fee modal for payment selection
      setShowFeeModal(true);
    }
  };

  const handleFeePaymentSelection = async (option) => {
    setSelectedPaymentOption(option);
    setShowFeeModal(false);

    if (option === 'now') {
      await handlePayNowAndPost();
    } else {
      await handlePayLaterAndPost();
    }
  };

  const handlePayNowAndPost = async () => {
    setProcessingFee(true);

    try {
      // Calculate everything
      const totalPayment = calculateTotal();
      const duration = calculateDuration();
      
      // Create job data
      const jobData = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        rate: parseInt(rate),
        employerId: user.uid,
        companyName: userProfile?.companyName || userProfile?.name || 'Company',
        employerPhone: userProfile?.phoneNumber || '',
        jobDate: formatDateForStorage(jobDate),
        startTime: formatTimeForStorage(startTime),
        endTime: formatTimeForStorage(endTime),
        category: 'General',
      };

      // Create the job first
      console.log('📝 Creating job...');
      const result = await createJobWithTiming(jobData);
      
      if (!result.success) {
        throw new Error('Failed to create job');
      }

      const jobId = result.jobId;
      
      // Create platform fee record
      const feeData = {
        employerId: user.uid,
        employerName: userProfile?.name || 'Employer',
        jobId: jobId,
        jobTitle: title.trim(),
        amount: feeInfo.platformFee,
        totalJobPayment: totalPayment,
        paymentOption: 'now',
        status: 'pending_payment',
        needsPayment: true
      };

      console.log('💰 Creating fee record...');
      const feeResult = await createPlatformFee(feeData);
      
      if (!feeResult.success) {
        throw new Error('Failed to create fee record');
      }

      // Navigate to payment screen with job data
      console.log('📍 Navigating to payment screen with fee ID:', feeResult.feeId);
      
      navigation.navigate('PlatformFeePayment', {
        feeIds: [feeResult.feeId],
        totalAmount: feeInfo.platformFee,
        immediateFeeAmount: feeInfo.platformFee,
        returnTo: 'PostJobSuccess',
        postJobData: {
          jobId: jobId,
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          jobDate: formatDateForDisplay(jobDate),
          startTime: formatTime(startTime),
          endTime: formatTime(endTime),
          duration: duration,
          rate: parseInt(rate),
          totalPayment: totalPayment,
          platformFee: feeInfo.platformFee
        },
        fromPostJob: true,
        isNewJobPayment: true,
        source: 'post_job'
      });

    } catch (error) {
      console.error('❌ Error in pay now flow:', error);
      Alert.alert('Error', error.message || 'Failed to process payment');
      setShowFeeModal(true);
    } finally {
      setProcessingFee(false);
    }
  };

  const handlePayLaterAndPost = async () => {
    setProcessingFee(true);

    try {
      const totalPayment = calculateTotal();
      const duration = calculateDuration();
      
      // Create job data
      const jobData = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        rate: parseInt(rate),
        employerId: user.uid,
        companyName: userProfile?.companyName || userProfile?.name || 'Company',
        employerPhone: userProfile?.phoneNumber || '',
        jobDate: formatDateForStorage(jobDate),
        startTime: formatTimeForStorage(startTime),
        endTime: formatTimeForStorage(endTime),
        category: 'General',
      };

      // Create the job
      console.log('📝 Creating job...');
      const result = await createJobWithTiming(jobData);
      
      if (!result.success) {
        throw new Error('Failed to create job');
      }

      const jobId = result.jobId;
      
      // Create platform fee record with 'later' option
      if (feeInfo && !feeInfo.isFree && feeInfo.platformFee > 0) {
        const feeData = {
          employerId: user.uid,
          employerName: userProfile?.name || 'Employer',
          jobId: jobId,
          jobTitle: title.trim(),
          amount: feeInfo.platformFee,
          totalJobPayment: totalPayment,
          paymentOption: 'later',
          status: 'pending',
          needsPayment: false // Will be true when job completes
        };

        console.log('💰 Creating deferred fee record...');
        await createPlatformFee(feeData);
      }

      // Navigate to success screen
      navigation.replace('PostJobSuccess', {
        jobData: {
          jobId: jobId,
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          jobDate: formatDateForDisplay(jobDate),
          startTime: formatTime(startTime),
          endTime: formatTime(endTime),
          duration: duration,
          rate: parseInt(rate),
          totalPayment: totalPayment,
          platformFee: feeInfo?.platformFee || 0
        },
        isPaid: false
      });

    } catch (error) {
      console.error('❌ Error in pay later flow:', error);
      Alert.alert('Error', error.message || 'Failed to post job');
    } finally {
      setProcessingFee(false);
    }
  };

  const proceedWithJobPosting = async (feePaymentData) => {
    setLoading(true);

    try {
      const totalPayment = calculateTotal();
      const duration = calculateDuration();
      
      const jobData = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        rate: parseInt(rate),
        employerId: user.uid,
        companyName: userProfile?.companyName || userProfile?.name || 'Company',
        employerPhone: userProfile?.phoneNumber || '',
        jobDate: formatDateForStorage(jobDate),
        startTime: formatTimeForStorage(startTime),
        endTime: formatTimeForStorage(endTime),
        category: 'General',
      };

      const result = await createJobWithTiming(jobData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to post job');
      }

      const jobId = result.jobId;
      
      // Create platform fee record if applicable
      if (feeInfo && !feeInfo.isFree && feeInfo.platformFee > 0) {
        const feeData = {
          employerId: user.uid,
          jobId: jobId,
          jobTitle: title.trim(),
          amount: feeInfo.platformFee,
          totalJobPayment: totalPayment,
          paymentOption: feePaymentData?.paymentOption || 'later',
          status: feePaymentData?.paymentOption === 'now' ? 'paid' : 'pending',
          needsPayment: false
        };

        await createPlatformFee(feeData);
      }

      // Navigate to success screen
      navigation.replace('PostJobSuccess', {
        jobData: {
          jobId: jobId,
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          jobDate: formatDateForDisplay(jobDate),
          startTime: formatTime(startTime),
          endTime: formatTime(endTime),
          duration: duration,
          rate: parseInt(rate),
          totalPayment: totalPayment,
          platformFee: feeInfo?.platformFee || 0
        },
        isPaid: feePaymentData?.paymentOption === 'now'
      });

    } catch (error) {
      console.error('❌ Error in job posting:', error);
      Alert.alert('Error', error.message || 'Failed to post job. Please try again.');
    } finally {
      setLoading(false);
      setProcessingFee(false);
    }
  };

  const clearForm = () => {
    setTitle('');
    setDescription('');
    setLocation(userProfile?.location || '');
    setRate('');
    setJobDate(new Date());
    setStartTime(new Date());
    setEndTime(new Date());
    setFeeInfo(null);
    setShowFeeModal(false);
    setSelectedPaymentOption(null);
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('EmployerHome');
    }
  };

  if (checkingEligibility) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Checking eligibility...</Text>
      </View>
    );
  }

  if (pendingFeesExist) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={handleBackPress}
            style={styles.backButton}
          >
            <Text style={styles.backButtonIcon}>←</Text>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post New Job</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>💰</Text>
          <Text style={styles.errorText}>Please clear pending fees to post new jobs</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={handleBackPress}
            style={styles.backButton}
          >
            <Text style={styles.backButtonIcon}>←</Text>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post New Job</Text>
          <TouchableOpacity 
            onPress={clearForm}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Free Jobs Remaining Banner */}
        {feeInfo?.isFree && (
          <View style={styles.freeBanner}>
            <Text style={styles.freeBannerIcon}>🎉</Text>
            <Text style={styles.freeBannerText}>
              Free job posting! {feeInfo.freeJobsRemaining} free post{feeInfo.freeJobsRemaining !== 1 ? 's' : ''} remaining
            </Text>
          </View>
        )}

        {/* Job Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📋</Text>
            <Text style={styles.cardTitle}>Job Details</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Job Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Factory Helper Needed"
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Description <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the work requirements, responsibilities, and any specific skills needed..."
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Location <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Industrial Area, Phase 1, Bangalore"
              placeholderTextColor={colors.textSecondary}
              value={location}
              onChangeText={setLocation}
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Schedule Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📅</Text>
            <Text style={styles.cardTitle}>Schedule</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Job Date <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity 
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateTimeIcon}>📅</Text>
              <Text style={styles.dateTimeText}>{formatDateForDisplay(jobDate)}</Text>
              <Text style={styles.dateTimeArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeColumn}>
              <Text style={styles.label}>
                Start Time <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity 
                style={styles.dateTimeButton}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Text style={styles.dateTimeIcon}>🕐</Text>
                <Text style={styles.dateTimeText}>{formatTime(startTime)}</Text>
                <Text style={styles.dateTimeArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timeColumn}>
              <Text style={styles.label}>
                End Time <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity 
                style={styles.dateTimeButton}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Text style={styles.dateTimeIcon}>🕐</Text>
                <Text style={styles.dateTimeText}>{formatTime(endTime)}</Text>
                <Text style={styles.dateTimeArrow}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {calculateDuration() > 0 && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationIcon}>⏱️</Text>
              <Text style={styles.durationText}>
                {calculateDuration()} hours total
              </Text>
            </View>
          )}
        </View>

        {/* Payment Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>💰</Text>
            <Text style={styles.cardTitle}>Payment</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Hourly Rate <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.rateInputContainer}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={styles.rateInput}
                placeholder="Rate per hour"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={rate}
                onChangeText={(text) => setRate(text.replace(/[^0-9]/g, ''))}
                returnKeyType="done"
              />
              <Text style={styles.perHourText}>/ hour</Text>
            </View>
            <Text style={styles.hint}>Minimum rate: ₹50/hour</Text>
          </View>

          {calculateDuration() > 0 && rate && (
            <View style={styles.paymentSummary}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Hourly Rate:</Text>
                <Text style={styles.paymentValue}>₹{rate}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Duration:</Text>
                <Text style={styles.paymentValue}>{calculateDuration()} hours</Text>
              </View>
              <View style={styles.paymentDivider} />
              <View style={styles.paymentRow}>
                <Text style={styles.paymentTotalLabel}>Total Payment:</Text>
                <Text style={styles.paymentTotalValue}>₹{calculateTotal()}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Custom Date/Time Pickers */}
        <CustomDateTimePicker
          visible={showDatePicker}
          mode="date"
          value={jobDate}
          minimumDate={new Date()}
          onConfirm={(date) => {
            setJobDate(date);
            setShowDatePicker(false);
          }}
          onCancel={() => setShowDatePicker(false)}
        />

        <CustomDateTimePicker
          visible={showStartTimePicker}
          mode="time"
          value={startTime}
          onConfirm={(time) => {
            setStartTime(time);
            setShowStartTimePicker(false);
          }}
          onCancel={() => setShowStartTimePicker(false)}
        />

        <CustomDateTimePicker
          visible={showEndTimePicker}
          mode="time"
          value={endTime}
          onConfirm={(time) => {
            setEndTime(time);
            setShowEndTimePicker(false);
          }}
          onCancel={() => setShowEndTimePicker(false)}
        />

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.postButton, (loading || processingFee) && styles.disabledButton]}
            onPress={handlePostJob}
            disabled={loading || processingFee}
          >
            {(loading || processingFee) ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Text style={styles.postButtonIcon}>📤</Text>
                <Text style={styles.postButtonText}>Post Job</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleBackPress}
            disabled={loading || processingFee}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerHint}>
          💡 Tip: Provide clear job details and competitive rates to attract more qualified workers.
        </Text>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Platform Fee Modal */}
      <Modal
        visible={showFeeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFeeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💰 Platform Fee</Text>
            
            <View style={styles.feeInfoBox}>
              <Text style={styles.feeAmount}>₹{feeInfo?.platformFee || 0}</Text>
              <Text style={styles.feeDescription}>
                5% platform fee on total payment of ₹{calculateTotal()}
              </Text>
            </View>

            <Text style={styles.modalSubtitle}>Choose Payment Option:</Text>

            <TouchableOpacity
              style={[styles.paymentOptionCard, !razorpayEnabled && styles.disabledOption]}
              onPress={() => handleFeePaymentSelection('now')}
              disabled={!razorpayEnabled || processingFee}
            >
              <View style={styles.optionHeader}>
                <Text style={styles.optionIcon}>💳</Text>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Pay Now</Text>
                  <Text style={styles.optionSubtitle}>
                    {razorpayEnabled 
                      ? 'Instant online payment via UPI/Card'
                      : 'Currently unavailable'}
                  </Text>
                </View>
                {processingFee && selectedPaymentOption === 'now' && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentOptionCard, processingFee && styles.disabledOption]}
              onPress={() => handleFeePaymentSelection('later')}
              disabled={processingFee}
            >
              <View style={styles.optionHeader}>
                <Text style={styles.optionIcon}>⏰</Text>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Pay After Job Completion</Text>
                  <Text style={styles.optionSubtitle}>
                    Post now, pay when job is completed
                  </Text>
                </View>
                {processingFee && selectedPaymentOption === 'later' && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </View>
            </TouchableOpacity>

            <Text style={styles.modalNote}>
              ℹ️ If you choose "Pay Later", payment will be required before posting your next job.
            </Text>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowFeeModal(false)}
              disabled={processingFee}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backButtonIcon: {
    fontSize: 20,
    color: colors.primary,
    marginRight: 4,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  freeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  freeBannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  freeBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dateTimeIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  dateTimeArrow: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeColumn: {
    flex: 1,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info + '20',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  durationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.info,
  },
  rateInputContainer: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rupeeSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 8,
  },
  rateInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  perHourText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  paymentSummary: {
    backgroundColor: colors.primaryLight,
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  paymentValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  paymentDivider: {
    height: 1,
    backgroundColor: colors.primary,
    marginVertical: 8,
    opacity: 0.3,
  },
  paymentTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  paymentTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  actionsContainer: {
    marginTop: 20,
  },
  postButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  postButtonIcon: {
    fontSize: 20,
    color: colors.white,
    marginRight: 8,
  },
  postButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  footerHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 20,
    fontStyle: 'italic',
  },
  bottomSpacing: {
    height: 40,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  feeInfoBox: {
    backgroundColor: colors.primary + '20',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  feeAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  feeDescription: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  paymentOptionCard: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  disabledOption: {
    opacity: 0.5,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modalNote: {
    fontSize: 13,
    color: colors.info,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    lineHeight: 18,
  },
  modalCancelButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});