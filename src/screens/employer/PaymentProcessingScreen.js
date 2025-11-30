// src/screens/employer/PaymentProcessingScreen.js - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { colors } from '../../constants/colors';
import { 
  processPayment, 
  processOnlinePayment, 
  fixCompletedJobPayment 
} from '../../services/database';
import {
  initiateRazorpayPayment,
  verifyRazorpayPayment,
  isRazorpayAvailable
} from '../../services/razorpay';
import { db } from '../../services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const PaymentProcessingScreen = ({ route, navigation }) => {
  const { applicationId } = route.params;
  const [application, setApplication] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [actualPayment, setActualPayment] = useState(0);
  const [workDuration, setWorkDuration] = useState(0);
  const [needsFix, setNeedsFix] = useState(false);
  const [error, setError] = useState(null);
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    loadData();
    checkRazorpayAvailability();
  }, []);

  // Real-time listener for application updates
  useEffect(() => {
    if (applicationId) {
      const appRef = doc(db, 'applications', applicationId);
      const unsubscribe = onSnapshot(appRef, (docSnap) => {
        if (docSnap.exists()) {
          const updatedApp = { id: docSnap.id, ...docSnap.data() };
          console.log('Real-time application update received:', updatedApp);
          setApplication(updatedApp);
          
          // Recalculate payment if work completion data changes
          if (updatedApp.workCompletedTimestamp) {
            const calculatedActualPayment = calculateActualPayment(updatedApp);
            setActualPayment(calculatedActualPayment);
            
            const workDurationHours = calculateWorkDurationHours(updatedApp);
            setWorkDuration(workDurationHours);
            
            // Update payment amount if needed
            if (!paymentAmount || paymentAmount === '0') {
              setPaymentAmount(calculatedActualPayment.toString());
            }
          }
        }
      });

      return () => unsubscribe();
    }
  }, [applicationId]);

  // Add timeout for loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log('Loading timeout reached - 30 seconds');
        setTimeoutReached(true);
        setLoading(false);
      }
    }, 30000); // 30 second timeout

    return () => clearTimeout(timer);
  }, [loading]);

  const checkRazorpayAvailability = () => {
    try {
      const available = isRazorpayAvailable();
      setRazorpayEnabled(available);

      if (!available) {
        console.warn('Razorpay SDK not available - online payments disabled');
      } else {
        console.log('Razorpay SDK is available');
      }
    } catch (error) {
      console.error('Error checking Razorpay availability:', error);
      setRazorpayEnabled(false);
    }
  };

  // Helper function for payment calculation
  // const calculatePaymentFromDuration = (durationMinutes, hourlyRate) => {
  //   let calculatedPayment = 0;

  //   if (durationMinutes < 60) {
  //     // For work less than 1 hour, pay proportionally with minimum payment
  //     const proportion = durationMinutes / 60;
  //     calculatedPayment = Math.round(hourlyRate * proportion);

  //     // Ensure minimum payment (at least 15 minutes worth of work)
  //     const minPayment = Math.round(hourlyRate * 0.25); // 15 minutes = 0.25 hours
  //     if (calculatedPayment < minPayment && durationMinutes > 0) {
  //       calculatedPayment = minPayment;
  //     }
  //   } else {
  //     // For 1 hour or more, pay normally
  //     const durationHours = durationMinutes / 60;
  //     calculatedPayment = Math.round(durationHours * hourlyRate);
  //   }

  //   // Ensure payment is at least 1 rupee
  //   return Math.max(1, calculatedPayment);
  // };
  // In PaymentProcessingScreen - FIXED helper function
const calculatePaymentFromDuration = (durationMinutes, hourlyRate) => {
  // CORRECTED CALCULATION: Simple per-minute calculation
  const ratePerMinute = hourlyRate / 60;
  let calculatedPayment = Math.round(durationMinutes * ratePerMinute);
  
  // Ensure payment is at least 1 rupee
  return Math.max(1, calculatedPayment);
};

  // Helper function to calculate work duration in hours
  const calculateWorkDurationHours = (appData) => {
    if (appData.workStartedTimestamp && appData.workCompletedTimestamp) {
      const durationMs = appData.workCompletedTimestamp - appData.workStartedTimestamp;
      return durationMs / (1000 * 60 * 60);
    } else if (appData.actualWorkDuration) {
      return appData.actualWorkDuration;
    } else if (appData.actualWorkMinutes) {
      return appData.actualWorkMinutes / 60;
    } else if (appData.journeyStatus === 'completed' && appData.workStartedTimestamp) {
      // Fallback: calculate from start time to current time
      const currentTime = new Date().getTime();
      const durationMs = currentTime - appData.workStartedTimestamp;
      return durationMs / (1000 * 60 * 60);
    }
    return 0;
  };

  const calculateActualPayment = (appData) => {
    try {
      console.log('=== CALCULATE ACTUAL PAYMENT DEBUG ===');
      console.log('All relevant data:', {
        workStartedTimestamp: appData.workStartedTimestamp,
        workCompletedTimestamp: appData.workCompletedTimestamp,
        calculatedPayment: appData.calculatedPayment,
        actualWorkDuration: appData.actualWorkDuration,
        actualWorkMinutes: appData.actualWorkMinutes,
        hourlyRate: appData.hourlyRate,
        expectedPayment: appData.expectedPayment,
        journeyStatus: appData.journeyStatus
      });

      // Priority 1: Use calculated payment from database (set by updateWorkerJourneyStatus)
      if (appData.calculatedPayment !== undefined && appData.calculatedPayment !== null && appData.calculatedPayment > 0) {
        console.log('Using database calculated payment:', appData.calculatedPayment);
        return appData.calculatedPayment;
      }

      // Priority 2: Calculate from actual work timestamps
      if (appData.workStartedTimestamp && appData.workCompletedTimestamp) {
        const durationMs = appData.workCompletedTimestamp - appData.workStartedTimestamp;
        const durationMinutes = durationMs / (1000 * 60);
        const durationHours = durationMinutes / 60;

        const hourlyRate = appData.hourlyRate || 0;
        let calculatedPayment = calculatePaymentFromDuration(durationMinutes, hourlyRate);

        console.log('Calculated from timestamps:', {
          durationMinutes,
          durationHours,
          hourlyRate,
          calculatedPayment
        });

        return calculatedPayment;
      }

      // Priority 3: Check if we have actualWorkDuration (set by updateWorkerJourneyStatus)
      if (appData.actualWorkDuration && appData.actualWorkDuration > 0) {
        const durationHours = appData.actualWorkDuration;
        const durationMinutes = durationHours * 60;
        const hourlyRate = appData.hourlyRate || 0;
        let calculatedPayment = calculatePaymentFromDuration(durationMinutes, hourlyRate);

        console.log('Calculated from actualWorkDuration:', {
          durationHours,
          durationMinutes,
          hourlyRate,
          calculatedPayment
        });

        return calculatedPayment;
      }

      // Priority 4: Check if job is marked as completed but missing completion timestamp
      // This is a fallback for existing jobs that were completed before the fix
      if (appData.journeyStatus === 'completed' && appData.workStartedTimestamp && !appData.workCompletedTimestamp) {
        console.log('Job completed but missing completion timestamp. Using fallback calculation.');

        // Use current time as completion time for calculation
        const currentTime = new Date().getTime();
        const durationMs = currentTime - appData.workStartedTimestamp;
        const durationMinutes = durationMs / (1000 * 60);
        const durationHours = durationMinutes / 60;

        const hourlyRate = appData.hourlyRate || 0;
        let calculatedPayment = calculatePaymentFromDuration(durationMinutes, hourlyRate);

        console.log('Fallback calculation (current time as completion):', {
          durationMinutes,
          durationHours,
          hourlyRate,
          calculatedPayment
        });

        return calculatedPayment;
      }

      // Final fallback: Expected payment
      console.log('Using expected payment as fallback:', appData.expectedPayment);
      return appData.expectedPayment || 0;

    } catch (error) {
      console.error('Payment calculation error:', error);
      return appData.expectedPayment || 0;
    }
  };

  const loadData = async () => {
    try {
      setError(null);
      console.log('=== STARTING LOAD DATA ===');
      console.log('Application ID:', applicationId);

      if (!applicationId) {
        throw new Error('No application ID provided');
      }

      const appRef = doc(db, 'applications', applicationId);
      console.log('Firestore document reference created');

      const appSnap = await getDoc(appRef);
      console.log('Firestore document fetched:', appSnap.exists());

      if (appSnap.exists()) {
        const appData = { id: appSnap.id, ...appSnap.data() };
        console.log('Application data loaded successfully');
        setApplication(appData);

        // Check if this job needs fixing (completed but missing completion timestamp)
        const shouldFix = appData.journeyStatus === 'completed' &&
          appData.workStartedTimestamp &&
          !appData.workCompletedTimestamp;

        setNeedsFix(shouldFix);

        if (shouldFix) {
          console.log('Job needs fixing - missing completion timestamp');
        }

        // Calculate actual payment based on work hours
        const calculatedActualPayment = calculateActualPayment(appData);
        console.log('Calculated actual payment:', calculatedActualPayment);
        setActualPayment(calculatedActualPayment);

        // Calculate work duration for display
        let workDurationHours = calculateWorkDurationHours(appData);
        setWorkDuration(workDurationHours);

        console.log('=== FINAL PAYMENT DETAILS ===');
        console.log('Expected Payment:', appData.expectedPayment);
        console.log('Calculated Payment:', appData.calculatedPayment);
        console.log('Actual Payment (calculated):', calculatedActualPayment);
        console.log('Work Duration (hours):', workDurationHours);
        console.log('Hourly Rate:', appData.hourlyRate);
        console.log('Journey Status:', appData.journeyStatus);
        console.log('Work Started:', appData.workStartedTimestamp);
        console.log('Work Completed:', appData.workCompletedTimestamp);
        console.log('Needs Fix:', shouldFix);
        console.log('========================');

        // Set actual payment as default amount
        const paymentAmountValue = calculatedActualPayment > 0 ? calculatedActualPayment.toString() : (appData.expectedPayment || '').toString();
        setPaymentAmount(paymentAmountValue);
        console.log('Payment amount set to:', paymentAmountValue);

        // Load job data
        const jobRef = doc(db, 'jobs', appData.jobId);
        const jobSnap = await getDoc(jobRef);
        if (jobSnap.exists()) {
          setJob({ id: jobSnap.id, ...jobSnap.data() });
          console.log('Job data loaded successfully');
        } else {
          console.log('Job not found');
        }
      } else {
        console.log('Application not found in Firestore');
        setError('Application not found');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const paymentMethods = [
    {
      id: 'cash',
      icon: '💵',
      label: 'Cash Payment',
      description: 'Pay directly in cash to the worker',
      color: '#4CAF50',
      gradient: ['#4CAF50', '#45a049'],
      disabled: false
    },
    {
      id: 'online',
      icon: '📱',
      label: 'Online Payment',
      description: razorpayEnabled
        ? 'Secure payment via UPI, Cards & Net Banking'
        : 'Online payment currently unavailable',
      color: '#2196F3',
      gradient: ['#2196F3', '#1976D2'],
      disabled: !razorpayEnabled
    },
    {
      id: 'upi',
      icon: '💳',
      label: 'UPI Transfer',
      description: 'Transfer via UPI to worker\'s account',
      color: '#9C27B0',
      gradient: ['#9C27B0', '#7B1FA2'],
      disabled: false
    },
    {
      id: 'bank',
      icon: '🏦',
      label: 'Bank Transfer',
      description: 'Direct bank account transfer',
      color: '#FF9800',
      gradient: ['#FF9800', '#F57C00'],
      disabled: false
    },
  ];

  const handleProcessPayment = async () => {
    // Use calculated payment as the default and force it
    const amount = actualPayment; // Always use calculated payment

    if (amount <= 0 || isNaN(amount)) {
      Alert.alert('Invalid Amount', 'Cannot process payment with invalid amount');
      return;
    }

    console.log('Processing payment with calculated amount:', {
      calculatedAmount: actualPayment,
      workDuration: workDuration,
      hourlyRate: hourlyRate
    });

    // Show confirmation with actual work details
    Alert.alert(
      'Confirm Payment',
      `You are about to pay ₹${amount} for ${formatDuration(workDuration)} of work at ₹${hourlyRate}/hour.\n\nThis amount is calculated based on actual work duration.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Payment',
          onPress: () => confirmPayment(amount)
        }
      ]
    );
  };

  const confirmPayment = async (amount) => {
    if (selectedMethod === 'online') {
      if (!razorpayEnabled) {
        Alert.alert(
          'Online Payment Unavailable',
          'Online payments are currently not available. Please use cash payment.',
          [{ text: 'OK' }]
        );
        return;
      }
      await handleOnlinePayment(amount);
    } else {
      await handleOfflinePayment(amount);
    }
  };

  const handleOnlinePayment = async (amount) => {
    setProcessing(true);

    try {
      console.log('Initiating online payment for amount:', amount);

      const paymentData = {
        amount: amount * 100, // Convert to paise for Razorpay
        description: `Payment for job: ${job?.title || 'Job'}`,
        employerName: application.employerName || 'Employer',
        workerName: application.workerName || 'Worker',
        jobTitle: job?.title || 'Job',
        applicationId: applicationId,
        employerId: application.employerId,
        workerId: application.workerId
      };

      const razorpayResult = await initiateRazorpayPayment(paymentData);

      console.log('Razorpay result:', razorpayResult);

      if (razorpayResult.success) {
        // Verify payment
        const verificationResult = await verifyRazorpayPayment(razorpayResult);

        console.log('Verification result:', verificationResult);

        if (verificationResult.success && verificationResult.verified) {
          // Process successful online payment
          const processResult = await processOnlinePayment(applicationId, {
            ...razorpayResult,
            verified: true,
            amount: amount // Use the original amount in rupees
          });

          if (processResult.success) {
            Alert.alert(
              '🎉 Payment Successful',
              `Online payment of ₹${amount} processed successfully!\n\nThe worker has been notified.`,
              [{
                text: 'Done',
                onPress: () => navigation.navigate('EmployerHome')
              }]
            );
          } else {
            Alert.alert(
              'Payment Issue',
              'Payment was processed by Razorpay but failed to update in our system.\n\nPlease contact support with Payment ID: ' + razorpayResult.paymentId,
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          }
        } else {
          Alert.alert(
            'Payment Failed',
            'Payment verification failed. Please try again or contact support.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Payment failed or cancelled
        if (razorpayResult.code === 0 || razorpayResult.code === 2) {
          // User cancelled - silent, just log
          console.log('Payment cancelled by user');
        } else {
          Alert.alert(
            'Payment Failed',
            razorpayResult.error || 'Payment could not be completed. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Online Payment Error:', error);
      Alert.alert(
        'Error',
        'Failed to process online payment. Please try again or use an alternative payment method.',
        [{ text: 'OK' }]
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleOfflinePayment = async (amount) => {
    const methodName = paymentMethods.find(m => m.id === selectedMethod)?.label || selectedMethod;

    Alert.alert(
      `Confirm ${methodName}`,
      `Are you sure you want to record ${methodName.toLowerCase()} of ₹${amount} to ${application.workerName}?\n\n⚠️ Make sure you have completed the payment before confirming.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, I have paid',
          onPress: async () => {
            setProcessing(true);

            const paymentData = {
              amount: amount,
              method: selectedMethod,
              notes: paymentNotes.trim(),
            };

            const result = await processPayment(applicationId, paymentData);

            setProcessing(false);

            if (result.success) {
              Alert.alert(
                '✅ Payment Recorded',
                `${methodName} of ₹${amount} has been successfully recorded.\n\nThe worker has been notified and the job is marked as completed.`,
                [{
                  text: 'Done',
                  onPress: () => navigation.navigate('EmployerHome')
                }]
              );
            } else {
              Alert.alert('Error', result.error || 'Failed to record payment. Please try again.');
            }
          }
        }
      ]
    );
  };

  const PaymentMethodCard = ({ method, isSelected, onPress }) => (
    <TouchableOpacity
      style={[
        styles.methodCard,
        isSelected && [styles.methodCardSelected, { borderColor: method.color }],
        method.disabled && styles.methodCardDisabled
      ]}
      onPress={method.disabled ? null : onPress}
      activeOpacity={method.disabled ? 1 : 0.7}
      disabled={method.disabled}
    >
      <LinearGradient
        colors={
          method.disabled
            ? ['#e0e0e0', '#cccccc']
            : isSelected
              ? method.gradient
              : ['#f8f9fa', '#e9ecef']
        }
        style={styles.methodIconContainer}
      >
        <Text style={[
          styles.methodIcon,
          method.disabled && styles.methodIconDisabled
        ]}>
          {method.icon}
        </Text>
      </LinearGradient>

      <View style={styles.methodInfo}>
        <Text style={[
          styles.methodLabel,
          isSelected && !method.disabled && { color: method.color },
          method.disabled && styles.methodLabelDisabled
        ]}>
          {method.label}
        </Text>
        <Text style={[
          styles.methodDescription,
          method.disabled && styles.methodDescriptionDisabled
        ]}>
          {method.description}
        </Text>

        {method.id === 'online' && isSelected && !method.disabled && (
          <View style={styles.onlinePaymentInfo}>
            <Feather name="shield" size={12} color="#2196F3" />
            <Text style={styles.onlinePaymentText}>
              Secured by Razorpay • UPI • Cards • Net Banking
            </Text>
          </View>
        )}

        {method.disabled && method.id === 'online' && (
          <View style={styles.disabledInfo}>
            <MaterialIcons name="info-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.disabledInfoText}>
              Requires app update
            </Text>
          </View>
        )}
      </View>

      <View style={[
        styles.radioButton,
        isSelected && [styles.radioButtonSelected, { borderColor: method.color }],
        method.disabled && styles.radioButtonDisabled
      ]}>
        {isSelected && !method.disabled && (
          <View style={[styles.radioButtonInner, { backgroundColor: method.color }]} />
        )}
      </View>
    </TouchableOpacity>
  );

  const formatDuration = (hours) => {
    if (!hours || hours === 0) {
      // Check if we have actual work minutes
      if (application?.actualWorkMinutes && application.actualWorkMinutes > 0) {
        const minutes = application.actualWorkMinutes;
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
      return '0 minutes';
    }

    const totalMinutes = Math.round(hours * 60);
    const wholeHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (wholeHours === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (minutes === 0) {
      return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
    } else {
      return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  if (loading && !timeoutReached) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading payment details...</Text>
        <Text style={styles.loadingSubText}>This may take a few moments</Text>
      </View>
    );
  }

  if (timeoutReached || error) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.primary, '#4A90E2']}
          style={styles.gradientHeader}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerBackButton}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Process Payment</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.warning} />
          <Text style={styles.errorTitle}>
            {timeoutReached ? 'Loading Timeout' : 'Error Loading Data'}
          </Text>
          <Text style={styles.errorText}>
            {timeoutReached 
              ? 'Taking too long to load payment details. Please check your connection and try again.'
              : error || 'Failed to load payment details.'
            }
          </Text>
          <View style={styles.errorButtons}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setLoading(true);
                setTimeoutReached(false);
                setError(null);
                loadData();
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!application || !job) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.primary, '#4A90E2']}
          style={styles.gradientHeader}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerBackButton}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Process Payment</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.errorText}>Payment details not found</Text>
          <TouchableOpacity
            style={styles.errorBackButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const hourlyRate = application.hourlyRate || job.rate || 0;
  const hasActualWorkData = application.workStartedTimestamp && application.workCompletedTimestamp;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, '#4A90E2']}
        style={styles.gradientHeader}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerBackButton}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Process Payment</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Worker Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="person" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Payment To</Text>
          </View>

          <View style={styles.workerInfo}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.workerAvatar}
            >
              <Text style={styles.workerAvatarText}>
                {application.workerName?.charAt(0)?.toUpperCase() || 'W'}
              </Text>
            </LinearGradient>
            <View style={styles.workerDetails}>
              <Text style={styles.workerName}>{application.workerName}</Text>
              <View style={styles.workerContact}>
                <Feather name="phone" size={14} color={colors.textSecondary} />
                <Text style={styles.workerPhone}>{application.workerPhone}</Text>
              </View>
              <View style={styles.workerContact}>
                <MaterialIcons name="work" size={14} color={colors.primary} />
                <Text style={styles.jobTitleText}>{job.title}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Fix Job Data Card - Show only for jobs that need fixing */}
        {needsFix && (
          <View style={styles.fixCard}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="build" size={20} color={colors.warning} />
              <Text style={styles.cardTitle}>Fix Job Data</Text>
            </View>
            <Text style={styles.infoText}>
              This job is marked as completed but is missing completion time data. 
              The current payment calculation (₹{actualPayment}) is based on temporary fallback.
            </Text>
            <TouchableOpacity 
              style={styles.fixButton}
              onPress={async () => {
                setProcessing(true);
                const result = await fixCompletedJobPayment(applicationId);
                setProcessing(false);
                
                if (result.success) {
                  Alert.alert(
                    '✅ Job Data Fixed',
                    `Payment calculation updated to ₹${result.calculatedPayment} for ${result.workDuration.toFixed(2)} hours of work.`,
                    [{ text: 'OK', onPress: () => loadData() }]
                  );
                } else {
                  Alert.alert('Error', result.error || 'Failed to fix job data');
                }
              }}
            >
              <Text style={styles.fixButtonText}>
                {processing ? 'Fixing...' : 'Fix Job Data & Save Calculation'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Work Summary Card - UPDATED WITH ACTUAL CALCULATION */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="payments" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Payment Calculation</Text>
          </View>

          {hasActualWorkData ? (
            <>
              <Text style={styles.recommendedAmount}>
                Calculated Payment: ₹{actualPayment} (based on {formatDuration(workDuration)} of work)
              </Text>

              <View style={styles.paymentSummary}>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Work Duration:</Text>
                  <Text style={styles.paymentValue}>{formatDuration(workDuration)}</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Hourly Rate:</Text>
                  <Text style={styles.paymentValue}>₹{hourlyRate}/hour</Text>
                </View>
                <View style={[styles.paymentRow, styles.calculatedPaymentRow]}>
                  <Text style={[styles.paymentLabel, styles.highlight]}>Calculated Amount:</Text>
                  <Text style={[styles.paymentValue, styles.highlightValue]}>₹{actualPayment}</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.recommendedAmount}>
              Expected Payment: ₹{application.expectedPayment || 0} (based on scheduled hours)
            </Text>
          )}

          <View style={styles.infoBox}>
            <Feather name="info" size={16} color={colors.info} />
            <Text style={styles.infoText}>
              {hasActualWorkData
                ? `Payment calculated based on actual work time: ${formatDuration(workDuration)} at ₹${hourlyRate}/hour`
                : 'Payment based on scheduled hours as actual work duration is not available.'
              }
            </Text>
          </View>
        </View>

        {/* Payment Amount Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="payments" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Payment Amount</Text>
          </View>

          <Text style={styles.recommendedAmount}>
            {hasActualWorkData
              ? `Recommended: ₹${actualPayment} (based on actual work hours)`
              : `Expected: ₹${application.expectedPayment || 0} (based on scheduled hours)`
            }
          </Text>

          <View style={styles.amountInputContainer}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder={`Enter amount (recommended: ${hasActualWorkData ? actualPayment : application.expectedPayment || 0})`}
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Show warning if amount differs from calculated */}
          {paymentAmount && actualPayment > 0 && Math.abs(parseFloat(paymentAmount) - actualPayment) > 10 && (
            <View style={styles.warningBox}>
              <MaterialIcons name="warning" size={20} color={colors.warning} />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Amount Difference</Text>
                <Text style={styles.warningText}>
                  This amount differs from calculated payment (₹{actualPayment})
                </Text>
              </View>
            </View>
          )}

          {/* Info about payment calculation */}
          <View style={styles.infoBox}>
            <Feather name="info" size={16} color={colors.info} />
            <Text style={styles.infoText}>
              {hasActualWorkData
                ? 'Payment is calculated based on actual work hours completed by the worker.'
                : 'Payment is based on scheduled work hours as actual work duration is not available.'
              }
            </Text>
          </View>
        </View>

        {/* Payment Method Selection */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="payment" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Payment Method</Text>
          </View>

          {paymentMethods.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              isSelected={selectedMethod === method.id}
              onPress={() => setSelectedMethod(method.id)}
            />
          ))}
        </View>

        {/* Payment Notes */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="notes" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Payment Notes (Optional)</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any notes about this payment..."
            multiline
            numberOfLines={3}
            value={paymentNotes}
            onChangeText={setPaymentNotes}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Process Payment Button */}
        <TouchableOpacity
          style={[
            styles.processButton,
            processing && styles.processButtonDisabled,
            selectedMethod === 'online' && !paymentMethods.find(m => m.id === 'online')?.disabled && styles.onlinePaymentButton
          ]}
          onPress={handleProcessPayment}
          disabled={processing}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              processing
                ? ['#ccc', '#999']
                : selectedMethod === 'online'
                  ? ['#667eea', '#764ba2']
                  : ['#4CAF50', '#45a049']
            }
            style={styles.processButtonGradient}
          >
            {processing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialIcons
                  name={
                    selectedMethod === 'online' ? "credit-card" :
                      selectedMethod === 'cash' ? "attach-money" :
                        selectedMethod === 'upi' ? "smartphone" :
                          "account-balance"
                  }
                  size={22}
                  color="#fff"
                />
                <Text style={styles.processText}>
                  {selectedMethod === 'online'
                    ? `Pay ₹${paymentAmount || actualPayment} Online`
                    : `Pay ₹${paymentAmount || actualPayment}`}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Security Note for Online Payments */}
        {selectedMethod === 'online' && razorpayEnabled && (
          <View style={styles.securityNote}>
            <View style={styles.securityHeader}>
              <Feather name="shield" size={18} color="#4CAF50" />
              <Text style={styles.securityTitle}>Secure Online Payment</Text>
            </View>
            <Text style={styles.securityDescription}>
              Your payment is secured with Razorpay. All transactions are encrypted and protected. Supports UPI, Credit/Debit Cards, Net Banking, and Wallets.
            </Text>
          </View>
        )}

        {/* Important Note */}
        <View style={styles.noteCard}>
          <MaterialIcons name="info" size={20} color={colors.info} />
          <View style={styles.noteContent}>
            <Text style={styles.noteTitle}>Important</Text>
            <Text style={styles.noteText}>
              After processing the payment, both you and the worker will receive a confirmation notification. The job will be marked as completed and earnings will be updated.
              {selectedMethod !== 'online' && '\n\n⚠️ Make sure you have completed the payment before confirming.'}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  gradientHeader: {
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerBackButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: colors.textSecondary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBackButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorBackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  fixCard: {
    backgroundColor: '#FFF3E0',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 8,
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  workerAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  workerDetails: {
    flex: 1,
  },
  workerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  workerContact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  workerPhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  jobTitleText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  paymentSummary: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calculatedPaymentRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  paymentLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  paymentValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  highlight: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  highlightValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  recommendedAmount: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    backgroundColor: colors.success + '15',
    padding: 8,
    borderRadius: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  rupeeSymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '15',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningContent: {
    flex: 1,
    marginLeft: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.warning,
    marginBottom: 2,
  },
  warningText: {
    fontSize: 13,
    color: colors.warning,
    lineHeight: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info + '10',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 12,
    color: colors.info,
    marginLeft: 8,
    flex: 1,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  methodCardSelected: {
    backgroundColor: colors.primary + '08',
    borderWidth: 2,
  },
  methodCardDisabled: {
    opacity: 0.5,
    backgroundColor: '#f5f5f5',
  },
  methodIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodIcon: {
    fontSize: 20,
  },
  methodIconDisabled: {
    opacity: 0.5,
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  methodLabelDisabled: {
    color: colors.textSecondary,
  },
  methodDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  methodDescriptionDisabled: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  onlinePaymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  onlinePaymentText: {
    fontSize: 11,
    color: '#2196F3',
    marginLeft: 4,
    fontWeight: '500',
  },
  disabledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  disabledInfoText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  amountInputDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: colors.border,
  },
  lockIcon: {
    marginLeft: 8,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.primary,
  },
  radioButtonDisabled: {
    borderColor: colors.border,
    opacity: 0.5,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  notesInput: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  processButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  processButtonGradient: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processButtonDisabled: {
    opacity: 0.6,
  },
  onlinePaymentButton: {
    shadowColor: '#667eea',
  },
  processText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  securityNote: {
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 8,
  },
  securityDescription: {
    fontSize: 13,
    color: '#4CAF50',
    lineHeight: 18,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: colors.info + '15',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  noteContent: {
    flex: 1,
    marginLeft: 12,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.info,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  fixButton: {
    backgroundColor: colors.warning,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  fixButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default PaymentProcessingScreen;