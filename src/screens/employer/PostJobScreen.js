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
import { createJob } from '../../services/database';

export default function PostJobScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(userProfile?.location || '');
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState('');
  const [loading, setLoading] = useState(false);

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
    if (!hours || hours <= 0) {
      Alert.alert('Error', 'Please enter valid hours');
      return;
    }
    if (!rate || rate < 50) {
      Alert.alert('Error', 'Rate must be at least ₹50/hour');
      return;
    }

    setLoading(true);

    const jobData = {
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      hours: parseInt(hours),
      rate: parseInt(rate),
      employerId: user.uid,
      companyName: userProfile.companyName || userProfile.name,
      employerPhone: userProfile.phoneNumber,
    };

    const result = await createJob(jobData);
    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Job posted successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
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

      <ScrollView style={styles.content}>
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

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Hours *</Text>
            <TextInput
              style={styles.input}
              placeholder="Hours"
              keyboardType="numeric"
              value={hours}
              onChangeText={setHours}
            />
          </View>

          <View style={styles.halfInput}>
            <Text style={styles.label}>Rate per Hour *</Text>
            <TextInput
              style={styles.input}
              placeholder="₹ per hour"
              keyboardType="numeric"
              value={rate}
              onChangeText={setRate}
            />
          </View>
        </View>

        {hours && rate && (
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Payment</Text>
            <Text style={styles.totalValue}>
              ₹{parseInt(hours || 0) * parseInt(rate || 0)}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.postButton, loading && styles.disabledButton]}
          onPress={handlePostJob}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.postButtonText}>Post Job</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          * All fields are required. Workers will be able to apply once you post.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 1,
    marginRight: 10,
  },
  totalCard: {
    backgroundColor: '#e7f3ff',
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  postButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginBottom: 40,
  },
});