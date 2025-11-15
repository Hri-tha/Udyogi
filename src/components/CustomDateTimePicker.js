// src/components/CustomDateTimePicker.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { colors } from '../constants/colors';

const { height } = Dimensions.get('window');

const CustomDateTimePicker = ({ 
  visible, 
  mode, 
  value, 
  onConfirm, 
  onCancel,
  minimumDate 
}) => {
  const [selectedDate, setSelectedDate] = useState(value || new Date());
  const [selectedHour, setSelectedHour] = useState(value?.getHours() || 9);
  const [selectedMinute, setSelectedMinute] = useState(value?.getMinutes() || 0);
  const [selectedPeriod, setSelectedPeriod] = useState(
    (value?.getHours() || 9) >= 12 ? 'PM' : 'AM'
  );

  // Generate dates for next 30 days
  const generateDates = () => {
    const dates = [];
    const today = minimumDate || new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Generate hours (1-12 for 12-hour format)
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Generate minutes (0, 15, 30, 45)
  const minutes = [0, 15, 30, 45];

  const handleConfirm = () => {
    if (mode === 'date') {
      onConfirm(selectedDate);
    } else {
      const newDate = new Date(value || new Date());
      let hour24 = selectedHour;
      if (selectedPeriod === 'PM' && selectedHour !== 12) {
        hour24 = selectedHour + 12;
      } else if (selectedPeriod === 'AM' && selectedHour === 12) {
        hour24 = 0;
      }
      newDate.setHours(hour24, selectedMinute, 0, 0);
      onConfirm(newDate);
    }
  };

  const formatDate = (date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-IN', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {mode === 'date' ? 'Select Date' : 'Select Time'}
            </Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.confirmButton}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          {mode === 'date' && (
            <ScrollView style={styles.scrollView}>
              {generateDates().map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateItem,
                    selectedDate.toDateString() === date.toDateString() && 
                    styles.dateItemSelected
                  ]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text style={[
                    styles.dateItemText,
                    selectedDate.toDateString() === date.toDateString() && 
                    styles.dateItemTextSelected
                  ]}>
                    {formatDate(date)}
                  </Text>
                  <Text style={[
                    styles.dateItemSubtext,
                    selectedDate.toDateString() === date.toDateString() && 
                    styles.dateItemTextSelected
                  ]}>
                    {date.toLocaleDateString('en-IN', { 
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Time Picker */}
          {mode === 'time' && (
            <View style={styles.timePicker}>
              <View style={styles.timePickerRow}>
                {/* Hours */}
                <View style={styles.timeColumn}>
                  <Text style={styles.timeColumnLabel}>Hour</Text>
                  <ScrollView 
                    style={styles.timeScrollView}
                    showsVerticalScrollIndicator={false}
                  >
                    {hours.map((hour) => (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.timeItem,
                          selectedHour === hour && styles.timeItemSelected
                        ]}
                        onPress={() => setSelectedHour(hour)}
                      >
                        <Text style={[
                          styles.timeItemText,
                          selectedHour === hour && styles.timeItemTextSelected
                        ]}>
                          {hour.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Separator */}
                <Text style={styles.timeSeparator}>:</Text>

                {/* Minutes */}
                <View style={styles.timeColumn}>
                  <Text style={styles.timeColumnLabel}>Minute</Text>
                  <ScrollView 
                    style={styles.timeScrollView}
                    showsVerticalScrollIndicator={false}
                  >
                    {minutes.map((minute) => (
                      <TouchableOpacity
                        key={minute}
                        style={[
                          styles.timeItem,
                          selectedMinute === minute && styles.timeItemSelected
                        ]}
                        onPress={() => setSelectedMinute(minute)}
                      >
                        <Text style={[
                          styles.timeItemText,
                          selectedMinute === minute && styles.timeItemTextSelected
                        ]}>
                          {minute.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* AM/PM */}
                <View style={styles.timeColumn}>
                  <Text style={styles.timeColumnLabel}>Period</Text>
                  <View style={styles.periodContainer}>
                    <TouchableOpacity
                      style={[
                        styles.periodButton,
                        selectedPeriod === 'AM' && styles.periodButtonSelected
                      ]}
                      onPress={() => setSelectedPeriod('AM')}
                    >
                      <Text style={[
                        styles.periodText,
                        selectedPeriod === 'AM' && styles.periodTextSelected
                      ]}>
                        AM
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.periodButton,
                        selectedPeriod === 'PM' && styles.periodButtonSelected
                      ]}
                      onPress={() => setSelectedPeriod('PM')}
                    >
                      <Text style={[
                        styles.periodText,
                        selectedPeriod === 'PM' && styles.periodTextSelected
                      ]}>
                        PM
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Preview */}
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>Selected Time:</Text>
                <Text style={styles.previewValue}>
                  {selectedHour.toString().padStart(2, '0')}:
                  {selectedMinute.toString().padStart(2, '0')} {selectedPeriod}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.7,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  cancelButton: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  confirmButton: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
  },
  scrollView: {
    maxHeight: height * 0.5,
  },
  dateItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginHorizontal: 16,
  },
  dateItemSelected: {
    backgroundColor: colors.primary + '15',
    borderRadius: 12,
    borderBottomWidth: 0,
    marginVertical: 4,
  },
  dateItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  dateItemTextSelected: {
    color: colors.primary,
  },
  dateItemSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  timePicker: {
    padding: 20,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  timeColumn: {
    alignItems: 'center',
  },
  timeColumnLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  timeScrollView: {
    maxHeight: 200,
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginHorizontal: 16,
    marginTop: 20,
  },
  timeItem: {
    padding: 12,
    marginVertical: 4,
    minWidth: 60,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeItemSelected: {
    backgroundColor: colors.primary,
  },
  timeItemText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  timeItemTextSelected: {
    color: colors.white,
  },
  periodContainer: {
    marginTop: 8,
  },
  periodButton: {
    padding: 12,
    marginVertical: 4,
    minWidth: 60,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  periodTextSelected: {
    color: colors.white,
  },
  previewContainer: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
});

export default CustomDateTimePicker;