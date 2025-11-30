// src/screens/employer/PostJobScreen.js
import React, { useState } from 'react';
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
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { createJobWithTiming } from '../../services/database';
import { colors } from '../../constants/colors';
import CustomDateTimePicker from '../../components/CustomDateTimePicker';

export default function PostJobScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(userProfile?.location || '');
  const [rate, setRate] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Date and Time states
  const [jobDate, setJobDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Format date for storage (YYYY-MM-DD format) - FIXED
  const formatDateForStorage = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format date for display
  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format time for display
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Format time for storage (HH:mm format)
  const formatTimeForStorage = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Helper function to compare only time portions
  const isEndTimeAfterStartTime = (start, end) => {
    const startTotalMinutes = start.getHours() * 60 + start.getMinutes();
    const endTotalMinutes = end.getHours() * 60 + end.getMinutes();
    return endTotalMinutes > startTotalMinutes;
  };

  // Calculate duration and total payment
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

    // Validate date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(jobDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      Alert.alert('Error', 'Job date cannot be in the past');
      return;
    }

    // Validate end time is after start time
    if (!isEndTimeAfterStartTime(startTime, endTime)) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    const duration = calculateDuration();
    if (duration < 1) {
      Alert.alert('Error', 'Job duration must be at least 1 hour');
      return;
    }

    setLoading(true);

    const jobData = {
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      rate: parseInt(rate),
      employerId: user.uid,
      companyName: userProfile?.companyName || userProfile?.name || 'Company',
      employerPhone: userProfile?.phoneNumber || '',
      jobDate: formatDateForStorage(jobDate), // Use correct format for storage
      startTime: formatTimeForStorage(startTime),
      endTime: formatTimeForStorage(endTime),
      category: 'General', // Default category
    };

    console.log('Posting job with data:', jobData);

    const result = await createJobWithTiming(jobData);
    setLoading(false);

    if (result.success) {
      Alert.alert(
        '🎉 Success!', 
        `Job posted successfully!\n\n📅 Date: ${formatDateForDisplay(jobDate)}\n🕐 Time: ${formatTime(startTime)} - ${formatTime(endTime)}\n⏱️ Duration: ${duration} hours\n💰 Total Payment: ₹${calculateTotal()}`,
        [
          {
            text: 'View Jobs',
            onPress: () => navigation.navigate('EmployerHome'),
          },
          {
            text: 'Post Another',
            style: 'cancel',
          },
        ]
      );
    } else {
      Alert.alert('❌ Error', result.error || 'Failed to post job. Please try again.');
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
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
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
      >
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

          {/* Duration Display */}
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
              />
              <Text style={styles.perHourText}>/ hour</Text>
            </View>
            <Text style={styles.hint}>Minimum rate: ₹50/hour</Text>
          </View>

          {/* Payment Summary */}
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
            style={[styles.postButton, loading && styles.disabledButton]}
            onPress={handlePostJob}
            disabled={loading}
          >
            {loading ? (
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
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerHint}>
          💡 Tip: Provide clear job details and competitive rates to attract more qualified workers.
        </Text>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingTop: 50,
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
    color: colors.textSecondary,
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
    fontWeight: '300',
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
});