// src/screens/worker/LocationFilterScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useJob } from '../../context/JobContext';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/colors';

const LocationFilterScreen = ({ navigation }) => {
  const { currentLocation, fetchJobs, fetchJobsByUserLocation } = useJob();
  const { userProfile } = useAuth();
  const [location, setLocation] = useState(currentLocation || userProfile?.location || '');
  
  const popularCities = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
    'Kolkata', 'Pune', 'Ahmedabad', 'Surat', 'Jaipur'
  ];

  const handleApply = async () => {
    if (location.trim()) {
      await fetchJobs(location.trim());
    } else {
      await fetchJobs(); // Fetch all jobs if no location
    }
    navigation.goBack();
  };

  const handleCitySelect = (city) => {
    setLocation(city);
  };

  const useMyLocation = async () => {
    if (userProfile?.location) {
      setLocation(userProfile.location);
      await fetchJobsByUserLocation(userProfile.location);
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filter by Location</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.label}>Enter City Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Mumbai, Delhi, Bangalore"
          value={location}
          onChangeText={setLocation}
        />

        {userProfile?.location && (
          <TouchableOpacity
            style={styles.myLocationButton}
            onPress={useMyLocation}
          >
            <Text style={styles.myLocationText}>
              Use My Location: {userProfile.location}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Popular Cities</Text>
        <View style={styles.citiesContainer}>
          {popularCities.map((city) => (
            <TouchableOpacity
              key={city}
              style={[
                styles.cityButton,
                location === city && styles.cityButtonSelected
              ]}
              onPress={() => handleCitySelect(city)}
            >
              <Text style={[
                styles.cityText,
                location === city && styles.cityTextSelected
              ]}>
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApply}
        >
          <Text style={styles.applyButtonText}>Apply Filter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.clearButton}
          onPress={async () => {
            await fetchJobs();
            navigation.goBack();
          }}
        >
          <Text style={styles.clearButtonText}>Show All Locations</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 15,
  },
  myLocationButton: {
    backgroundColor: colors.primary + '20',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 25,
  },
  myLocationText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  citiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 30,
  },
  cityButton: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cityText: {
    fontSize: 14,
    color: colors.text,
  },
  cityTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  applyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LocationFilterScreen;