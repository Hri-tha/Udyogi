// src/screens/shared/JobLocationScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  Linking,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/colors';

const { width, height } = Dimensions.get('window');

export default function JobLocationScreen({ route, navigation }) {
  const { application, isEmployer } = route.params;
  const { user } = useAuth();

  const location = application.employerLocation || application.meetingLocation;

  if (!location) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Location</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📍</Text>
          <Text style={styles.errorTitle}>Location Not Available</Text>
          <Text style={styles.errorMessage}>
            The location information is not available.
          </Text>
        </View>
      </View>
    );
  }

  const { latitude, longitude, address } = location;

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open Google Maps');
    });
  };

  const openInAppleMaps = () => {
    const url = `http://maps.apple.com/?q=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open Maps');
    });
  };

  const getDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open directions');
    });
  };

  const handleChat = () => {
    if (application.chatEnabled) {
      navigation.navigate('ChatScreen', {
        applicationId: application.id,
        otherUser: isEmployer ? application.workerId : application.employerId,
        jobTitle: application.jobTitle,
        otherUserName: isEmployer ? application.workerName : application.companyName
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Location</Text>
        {application.chatEnabled && (
          <TouchableOpacity onPress={handleChat}>
            <Text style={styles.chatButton}>💬</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Location Details */}
        <View style={styles.locationCard}>
          <Text style={styles.jobTitle}>{application.jobTitle}</Text>
          <Text style={styles.companyName}>
            {isEmployer ? application.workerName : application.companyName}
          </Text>
          
          <View style={styles.addressSection}>
            <Text style={styles.addressIcon}>📍</Text>
            <View style={styles.addressText}>
              <Text style={styles.addressTitle}>Work Location</Text>
              <Text style={styles.address}>
                {address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
              </Text>
            </View>
          </View>

          <View style={styles.coordinates}>
            <Text style={styles.coordinateText}>
              Latitude: {latitude.toFixed(6)}
            </Text>
            <Text style={styles.coordinateText}>
              Longitude: {longitude.toFixed(6)}
            </Text>
          </View>

          <View style={styles.directionButtons}>
            <TouchableOpacity style={styles.directionButton} onPress={openInGoogleMaps}>
              <Text style={styles.directionButtonText}>🗺️ Open in Google Maps</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.directionButton} onPress={openInAppleMaps}>
              <Text style={styles.directionButtonText}>🗺️ Open in Apple Maps</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.directionButton} onPress={getDirections}>
              <Text style={styles.directionButtonText}>🚗 Get Directions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Map Preview using Static Image */}
        <View style={styles.mapPreviewContainer}>
          <View style={styles.mapPreview}>
            <Text style={styles.mapPreviewIcon}>🗺️</Text>
            <Text style={styles.mapPreviewText}>Map Location</Text>
            <Text style={styles.mapPreviewSubtext}>
              Tap the buttons above to open in your preferred maps app
            </Text>
          </View>
        </View>

        {/* Additional Information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Before You Go</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>✅</Text>
            <Text style={styles.infoText}>
              {isEmployer 
                ? 'Confirm the worker\'s arrival time' 
                : 'Confirm your arrival time with the employer'
              }
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>📞</Text>
            <Text style={styles.infoText}>
              Keep your phone charged and accessible
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>👥</Text>
            <Text style={styles.infoText}>
              {isEmployer 
                ? 'Be available to guide the worker when they arrive'
                : 'Ask for the site supervisor when you arrive'
              }
            </Text>
          </View>

          {application.chatEnabled && (
            <TouchableOpacity style={styles.chatActionButton} onPress={handleChat}>
              <Text style={styles.chatActionText}>💬 Open Chat with {isEmployer ? application.workerName : application.companyName}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

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
  chatButton: {
    fontSize: 20,
  },
  headerRight: {
    width: 30,
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  locationCard: {
    backgroundColor: colors.white,
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 16,
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  addressIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  coordinates: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  coordinateText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  directionButtons: {
    gap: 10,
  },
  directionButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  directionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapPreviewContainer: {
    margin: 20,
  },
  mapPreview: {
    backgroundColor: colors.white,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mapPreviewIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  mapPreviewText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  mapPreviewSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: colors.white,
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  chatActionButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  chatActionText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});