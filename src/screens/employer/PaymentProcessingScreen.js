// src/screens/employer/PaymentProcessingScreen.js - COMPLETE FINAL VERSION
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
import { doc, getDoc } from 'firebase/firestore';
import { colors } from '../../constants/colors';
import { processPayment, processOnlinePayment } from '../../services/database';
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
  const [razorpayEnabled, setRazorpayEnabled] = useState(false); // Start as false

  useEffect(() => {
    loadData();
    checkRazorpayAvailability();
  }, []);

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

  const loadData = async () => {
    try {
      const appRef = doc(db, 'applications', applicationId);
      const appSnap = await getDoc(appRef);
      
      if (appSnap.exists()) {
        const appData = { id: appSnap.id, ...appSnap.data() };
        setApplication(appData);
        
        console.log('Application data loaded:', {
          calculatedPayment: appData.calculatedPayment,
          expectedPayment: appData.expectedPayment,
          hourlyRate: appData.hourlyRate,
          status: appData.status,
          journeyStatus: appData.journeyStatus
        });
        
        // Set calculated payment as default, with fallback
        const defaultAmount = appData.calculatedPayment || appData.expectedPayment || 0;
        setPaymentAmount(defaultAmount > 0 ? defaultAmount.toString() : '');

        const jobRef = doc(db, 'jobs', appData.jobId);
        const jobSnap = await getDoc(jobRef);
        if (jobSnap.exists()) {
          setJob({ id: jobSnap.id, ...jobSnap.data() });
        }
      } else {
        Alert.alert('Error', 'Application not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load payment details');
    } finally {
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
    // Validation
    if (!paymentAmount || parseFloat(paymentAmount) <= 0 || isNaN(parseFloat(paymentAmount))) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    const calculatedAmount = application.calculatedPayment || application.expectedPayment || 0;

    // Warning if amount differs significantly (only if calculatedAmount exists)
    if (calculatedAmount > 0 && Math.abs(amount - calculatedAmount) > calculatedAmount * 0.1) {
      Alert.alert(
        'Amount Difference',
        `The entered amount (₹${amount}) differs from the ${application.calculatedPayment ? 'calculated' : 'expected'} amount (₹${calculatedAmount}).\n\nDo you want to continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => confirmPayment(amount) }
        ]
      );
    } else {
      confirmPayment(amount);
    }
  };

  const confirmPayment = async (amount) => {
    if (selectedMethod === 'online') {
      if (!razorpayEnabled) {
        Alert.alert(
          'Online Payment Unavailable',
          'Online payments are currently not available. Please use an alternative payment method.\n\nNote: Online payments require the react-native-razorpay package to be properly installed.',
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
        amount: amount,
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
            verified: true
          });

          if (processResult.success) {
            Alert.alert(
              '🎉 Payment Successful',
              `Online payment of ₹${amount} processed successfully!\n\nPayment ID: ${razorpayResult.paymentId}\n\nThe worker has been notified.`,
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading payment details...</Text>
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

        {/* Work Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="summarize" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Work Summary</Text>
          </View>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <MaterialIcons name="calendar-today" size={18} color={colors.textSecondary} />
              <Text style={styles.summaryValue}>{job.jobDate}</Text>
              <Text style={styles.summaryLabel}>Date</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <MaterialIcons name="access-time" size={18} color={colors.textSecondary} />
              <Text style={styles.summaryValue}>
                {job.startTime} - {job.endTime}
              </Text>
              <Text style={styles.summaryLabel}>Time</Text>
            </View>
            
            <View style={styles.summaryItem}>
              <FontAwesome5 name="money-bill-wave" size={16} color={colors.textSecondary} />
              <Text style={styles.summaryValue}>₹{job.rate}/hr</Text>
              <Text style={styles.summaryLabel}>Rate</Text>
            </View>
          </View>

          <View style={styles.paymentSummary}>
            {application.expectedPayment > 0 && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Expected Payment:</Text>
                <Text style={styles.paymentValue}>₹{application.expectedPayment}</Text>
              </View>
            )}
            
            {application.actualWorkDuration && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Actual Duration:</Text>
                <Text style={styles.paymentValue}>{application.actualWorkDuration} hours</Text>
              </View>
            )}
            
            {application.calculatedPayment && (
              <View style={[styles.paymentRow, styles.calculatedPaymentRow]}>
                <Text style={[styles.paymentLabel, styles.highlight]}>
                  Calculated Payment:
                </Text>
                <Text style={[styles.paymentValue, styles.highlightValue]}>
                  ₹{application.calculatedPayment}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment Amount */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="payments" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Payment Amount</Text>
          </View>
          
          <View style={styles.amountInputContainer}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="Enter payment amount"
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {paymentAmount && application.calculatedPayment && 
           Math.abs(parseFloat(paymentAmount) - application.calculatedPayment) > 10 && (
            <View style={styles.warningBox}>
              <MaterialIcons name="warning" size={20} color={colors.warning} />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Amount Difference</Text>
                <Text style={styles.warningText}>
                  This amount differs from calculated payment (₹{application.calculatedPayment})
                </Text>
              </View>
            </View>
          )}
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
                    ? 'Pay Online with Razorpay' 
                    : `Process ${paymentMethods.find(m => m.id === selectedMethod)?.label}`}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 24,
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
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 6,
    marginBottom: 2,
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  paymentSummary: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
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
});

export default PaymentProcessingScreen;