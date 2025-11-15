// src/screens/employer/PaymentProcessingScreen.js - FIXED
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
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore'; // FIXED: Import from firestore
import { colors } from '../../constants/colors';
import { processPayment } from '../../services/database';
import { db } from '../../services/firebase';

const PaymentProcessingScreen = ({ route, navigation }) => {
  const { applicationId } = route.params;
  const [application, setApplication] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const appRef = doc(db, 'applications', applicationId);
      const appSnap = await getDoc(appRef);
      
      if (appSnap.exists()) {
        const appData = { id: appSnap.id, ...appSnap.data() };
        setApplication(appData);
        
        // Set calculated payment as default
        setPaymentAmount(
          appData.calculatedPayment?.toString() || 
          appData.expectedPayment?.toString() || 
          ''
        );

        const jobRef = doc(db, 'jobs', appData.jobId);
        const jobSnap = await getDoc(jobRef);
        if (jobSnap.exists()) {
          setJob({ id: jobSnap.id, ...jobSnap.data() });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { id: 'cash', icon: '💵', label: 'Cash', description: 'Pay in cash' },
    { id: 'upi', icon: '📱', label: 'UPI', description: 'Google Pay, PhonePe, etc.' },
    { id: 'bank', icon: '🏦', label: 'Bank Transfer', description: 'Direct bank transfer' },
    { id: 'other', icon: '💳', label: 'Other', description: 'Other payment method' },
  ];

  const handleProcessPayment = async () => {
    // Validation
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    const calculatedAmount = application.calculatedPayment || application.expectedPayment;

    // Warning if amount differs significantly
    if (Math.abs(amount - calculatedAmount) > calculatedAmount * 0.1) {
      Alert.alert(
        'Amount Difference',
        `The entered amount (₹${amount}) differs from the calculated amount (₹${calculatedAmount}). Do you want to continue?`,
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
    Alert.alert(
      'Confirm Payment',
      `Process payment of ₹${amount} to ${application.workerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
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
                'Payment Processed',
                'Payment has been successfully processed and the worker has been notified.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('EmployerHome')
                  }
                ]
              );
            } else {
              Alert.alert('Error', result.error || 'Failed to process payment');
            }
          }
        }
      ]
    );
  };

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
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Payment details not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
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
        <Text style={styles.headerTitle}>Process Payment</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Worker Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment To</Text>
          
          <View style={styles.workerInfo}>
            <View style={styles.workerAvatar}>
              <Text style={styles.workerAvatarText}>
                {application.workerName?.charAt(0) || 'W'}
              </Text>
            </View>
            <View style={styles.workerDetails}>
              <Text style={styles.workerName}>{application.workerName}</Text>
              <Text style={styles.workerPhone}>📞 {application.workerPhone}</Text>
              <Text style={styles.jobTitle}>💼 {job.title}</Text>
            </View>
          </View>
        </View>

        {/* Work Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Work Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date:</Text>
            <Text style={styles.summaryValue}>{job.jobDate}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Scheduled Time:</Text>
            <Text style={styles.summaryValue}>
              {job.startTime} - {job.endTime}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Expected Duration:</Text>
            <Text style={styles.summaryValue}>{job.expectedDuration} hours</Text>
          </View>

          {application.actualWorkDuration && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Actual Duration:</Text>
              <Text style={[styles.summaryValue, styles.highlight]}>
                {application.actualWorkDuration} hours
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Hourly Rate:</Text>
            <Text style={styles.summaryValue}>₹{job.rate}/hour</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Expected Payment:</Text>
            <Text style={styles.summaryValue}>₹{application.expectedPayment}</Text>
          </View>

          {application.calculatedPayment && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.highlight]}>
                Calculated Payment:
              </Text>
              <Text style={[styles.summaryValue, styles.highlightValue]}>
                ₹{application.calculatedPayment}
              </Text>
            </View>
          )}
        </View>

        {/* Payment Amount */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Amount</Text>
          
          <View style={styles.amountInputContainer}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
            />
          </View>

          {paymentAmount && application.calculatedPayment && 
           Math.abs(parseFloat(paymentAmount) - application.calculatedPayment) > 10 && (
            <View style={styles.warningBox}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningText}>
                Amount differs from calculated payment (₹{application.calculatedPayment})
              </Text>
            </View>
          )}
        </View>

        {/* Payment Method Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedMethod === method.id && styles.methodCardSelected
              ]}
              onPress={() => setSelectedMethod(method.id)}
            >
              <Text style={styles.methodIcon}>{method.icon}</Text>
              <View style={styles.methodInfo}>
                <Text style={styles.methodLabel}>{method.label}</Text>
                <Text style={styles.methodDescription}>{method.description}</Text>
              </View>
              <View style={[
                styles.radioButton,
                selectedMethod === method.id && styles.radioButtonSelected
              ]}>
                {selectedMethod === method.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any notes about this payment..."
            multiline
            numberOfLines={3}
            value={paymentNotes}
            onChangeText={setPaymentNotes}
          />
        </View>

        {/* Process Payment Button */}
        <TouchableOpacity
          style={[styles.processButton, processing && styles.processButtonDisabled]}
          onPress={handleProcessPayment}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.processIcon}>💰</Text>
              <Text style={styles.processText}>Process Payment</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Important Note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteIcon}>ℹ️</Text>
          <Text style={styles.noteText}>
            After processing the payment, both you and the worker will receive a confirmation notification. Make sure you've transferred the payment before confirming.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  errorContainer: {
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
    marginBottom: 20,
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
  backButtonText: {
    color: colors.white,
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
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  workerAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  workerDetails: {
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
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  summaryValue: {
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
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
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 12,
  },
  methodCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  methodIcon: {
    fontSize: 32,
    marginRight: 12,
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
  methodDescription: {
    fontSize: 13,
    color: colors.textSecondary,
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
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  notesInput: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  processButton: {
    flexDirection: 'row',
    backgroundColor: colors.success,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  processButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
  processIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  processText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: colors.info + '20',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  noteIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});

export default PaymentProcessingScreen;