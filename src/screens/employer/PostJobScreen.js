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

  // Format date for display
  const formatDate = (date) => {
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

    // Validate end time is after start time (FIXED)
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
      companyName: userProfile.companyName || userProfile.name,
      employerPhone: userProfile.phoneNumber,
      jobDate: formatDate(jobDate),
      startTime: formatTime(startTime),
      endTime: formatTime(endTime),
    };

    const result = await createJobWithTiming(jobData);
    setLoading(false);

    if (result.success) {
      Alert.alert(
        'Success', 
        `Job posted successfully!\n\nScheduled for: ${formatDate(jobDate)}\nTime: ${formatTime(startTime)} - ${formatTime(endTime)}\nDuration: ${duration} hours\nTotal Payment: ₹${calculateTotal()}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to post job');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Post New Job</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeader}>Job Details</Text>
        
        <Text style={styles.label}>Job Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Factory Helper Needed"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe the work requirements and responsibilities"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
        />

        <Text style={styles.label}>Location *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Industrial Area, Phase 1"
          value={location}
          onChangeText={setLocation}
        />

        {/* Date & Time Section */}
        <Text style={styles.sectionHeader}>Schedule</Text>
        
        <Text style={styles.label}>Job Date *</Text>
        <TouchableOpacity 
          style={styles.dateTimeButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateTimeIcon}>📅</Text>
          <Text style={styles.dateTimeText}>{formatDate(jobDate)}</Text>
          <Text style={styles.dateTimeArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.timeRow}>
          <View style={styles.timeColumn}>
            <Text style={styles.label}>Start Time *</Text>
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
            <Text style={styles.label}>End Time *</Text>
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

        {/* Payment Section */}
        <Text style={styles.sectionHeader}>Payment</Text>
        
        <Text style={styles.label}>Hourly Rate *</Text>
        <View style={styles.rateInputContainer}>
          <Text style={styles.rupeeSymbol}>₹</Text>
          <TextInput
            style={styles.rateInput}
            placeholder="Rate per hour"
            keyboardType="numeric"
            value={rate}
            onChangeText={setRate}
          />
          <Text style={styles.perHourText}>/hour</Text>
        </View>

        {/* Summary Card */}
        {calculateDuration() > 0 && rate && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Job Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>📅 Date:</Text>
              <Text style={styles.summaryValue}>{formatDate(jobDate)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>🕐 Time:</Text>
              <Text style={styles.summaryValue}>
                {formatTime(startTime)} - {formatTime(endTime)}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>⏱️ Duration:</Text>
              <Text style={styles.summaryValue}>{calculateDuration()} hours</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>💰 Rate:</Text>
              <Text style={styles.summaryValue}>₹{rate}/hour</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total Payment:</Text>
              <Text style={styles.summaryTotalValue}>₹{calculateTotal()}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.postButton, loading && styles.disabledButton]}
          onPress={handlePostJob}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.postButtonIcon}>✓</Text>
              <Text style={styles.postButtonText}>Post Job</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          * All fields are required. Workers will be able to see the job schedule and apply.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
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
  topBarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateTimeIcon: {
    fontSize: 20,
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
  rateInputContainer: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
  summaryCard: {
    backgroundColor: colors.primaryLight,
    padding: 20,
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.primary,
    marginVertical: 12,
    opacity: 0.3,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  summaryTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  postButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
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
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});