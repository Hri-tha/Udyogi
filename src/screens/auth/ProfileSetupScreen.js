import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';

export default function ProfileSetupScreen({ navigation, route }) {
  const { userType } = route?.params || { userType: 'worker' };
  const { user, updateUserProfile } = useAuth();
  
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [skills, setSkills] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    
    try {
      // Request permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setPermissionDenied(true);
        setLocationLoading(false);
        Alert.alert(
          'Location Permission Denied',
          'Please enable location services or enter your location manually for better job matching.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get current position
      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get city and state
      let geocode = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (geocode.length > 0) {
        const address = geocode[0];
        const city = address.city || address.subregion || '';
        const state = address.region || '';
        
        if (city && state) {
          setLocation(`${city}, ${state}`);
        } else if (city) {
          setLocation(city);
        } else if (state) {
          setLocation(state);
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Could not detect your location. Please enter manually.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Error', 'Please enter your location');
      return;
    }

    if (userType === 'worker' && !skills.trim()) {
      Alert.alert('Error', 'Please enter your skills');
      return;
    }

    if (userType === 'employer' && !companyName.trim()) {
      Alert.alert('Error', 'Please enter your company name');
      return;
    }

    setLoading(true);

    const profileData = {
      name: name.trim(),
      location: location.trim(),
      userType,
      phoneNumber: user.phoneNumber,
      createdAt: new Date().toISOString(),
      ...(userType === 'worker' && {
        skills: skills.split(',').map(s => s.trim()).filter(s => s),
        rating: 0,
        completedJobs: 0,
        totalEarnings: 0,
      }),
      ...(userType === 'employer' && {
        companyName: companyName.trim(),
        rating: 0,
        totalHires: 0,
        activeJobs: 0,
      }),
    };

    const result = await updateUserProfile(profileData);
    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Profile created successfully!');
    } else {
      Alert.alert('Error', result.error || 'Failed to create profile');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.logo}>
          {userType === 'worker' ? '👷' : '🏭'}
        </Text>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>
          {userType === 'worker' 
            ? 'Tell us about your skills' 
            : 'Tell us about your company'}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Location *</Text>
        <View style={styles.locationContainer}>
          <TextInput
            style={[styles.input, styles.locationInput]}
            placeholder="City, State"
            value={location}
            onChangeText={setLocation}
          />
          <TouchableOpacity
            style={styles.locationButton}
            onPress={getCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.locationButtonText}>📍</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          {permissionDenied 
            ? 'Location access denied. Please enter manually.'
            : 'Tap the pin to detect your location automatically'
          }
        </Text>

        {userType === 'worker' ? (
          <>
            <Text style={styles.label}>Skills *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., Carpentry, Plumbing, Loading, Electrician, Painter"
              value={skills}
              onChangeText={setSkills}
              multiline
              numberOfLines={3}
            />
            <Text style={styles.hint}>
              Separate multiple skills with commas
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.label}>Company Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your company name"
              value={companyName}
              onChangeText={setCompanyName}
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Complete Setup</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    backgroundColor: '#fff',
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInput: {
    flex: 1,
    marginRight: 10,
  },
  locationButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  locationButtonText: {
    fontSize: 18,
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
    height: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 13,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});