// src/screens/worker/JobLocationScreen.js - HINDI VERSION
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Linking,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../constants/colors';

export default function JobLocationScreen({ route, navigation }) {
  const { application } = route.params;
  const { user } = useAuth();
  const { locale, t } = useLanguage();
  
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  // Translations for this screen
  const translations = {
    en: {
      headerTitle: 'Job Location',
      backButton: '← Back',
      loadingText: 'Loading location...',
      locationNotAvailable: 'Location Not Available',
      locationNotShared: 'The employer hasn\'t shared the location yet or there was an error loading it.',
      jobTitle: 'Job Title',
      workLocation: 'Work Location',
      getDirections: '🚗 Get Directions',
      beforeYouGo: 'Before You Go',
      confirmArrival: 'Confirm your arrival time with the employer',
      keepPhoneCharged: 'Keep your phone charged and accessible',
      askSupervisor: 'Ask for the site supervisor when you arrive',
      loadingMap: 'Loading map...',
      openInMaps: 'Open in Maps',
      navigateTo: 'Navigate to: {location}',
      cancel: 'Cancel',
      chat: '💬',
      error: 'Error',
      failedToLoad: 'Failed to load location',
      openMaps: 'Open Maps',
      coordinates: 'Coordinates',
      additionalInfo: 'Additional Information',
      success: 'Success',
      directionsOpened: 'Directions opened in maps app',
      mapError: 'Unable to open maps. Please install a maps app.',
    },
    hi: {
      headerTitle: 'नौकरी स्थान',
      backButton: '← वापस',
      loadingText: 'स्थान लोड हो रहा है...',
      locationNotAvailable: 'स्थान उपलब्ध नहीं',
      locationNotShared: 'नियोक्ता ने अभी तक स्थान साझा नहीं किया है या लोड करने में त्रुटि हुई।',
      jobTitle: 'नौकरी शीर्षक',
      workLocation: 'काम का स्थान',
      getDirections: '🚗 दिशा-निर्देश प्राप्त करें',
      beforeYouGo: 'जाने से पहले',
      confirmArrival: 'नियोक्ता के साथ अपने आगमन समय की पुष्टि करें',
      keepPhoneCharged: 'अपना फोन चार्ज रखें और सुलभ रखें',
      askSupervisor: 'पहुंचने पर साइट सुपरवाइजर से पूछें',
      loadingMap: 'मानचित्र लोड हो रहा है...',
      openInMaps: 'मानचित्र में खोलें',
      navigateTo: 'नेविगेट करें: {location}',
      cancel: 'रद्द करें',
      chat: '💬',
      error: 'त्रुटि',
      failedToLoad: 'स्थान लोड करने में विफल',
      openMaps: 'मानचित्र खोलें',
      coordinates: 'निर्देशांक',
      additionalInfo: 'अतिरिक्त जानकारी',
      success: 'सफल',
      directionsOpened: 'मानचित्र ऐप में दिशाएं खोली गईं',
      mapError: 'मानचित्र खोलने में असमर्थ। कृपया एक मानचित्र ऐप इंस्टॉल करें।',
    }
  };

  const tr = translations[locale] || translations.en;

  useEffect(() => {
    loadLocation();
  }, []);

  const loadLocation = async () => {
    try {
      if (application.employerLocation) {
        setLocation(application.employerLocation);
      } else if (application.meetingLocation) {
        setLocation(application.meetingLocation);
      }
    } catch (error) {
      console.error('Error loading location:', error);
      Alert.alert(tr.error, tr.failedToLoad);
    } finally {
      setLoading(false);
    }
  };

  const openInMaps = async () => {
    if (!location) return;
    
    const { latitude, longitude, address } = location;
    const destination = address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    
    Alert.alert(
      tr.openInMaps,
      tr.navigateTo.replace('{location}', destination),
      [
        { text: tr.cancel, style: 'cancel' },
        { 
          text: tr.openMaps, 
          onPress: async () => {
            try {
              const supported = await Linking.canOpenURL(url);
              if (supported) {
                await Linking.openURL(url);
              } else {
                Alert.alert(tr.error, tr.mapError);
              }
            } catch (error) {
              console.error('Error opening maps:', error);
              Alert.alert(tr.error, tr.failedToLoad);
            }
          }
        }
      ]
    );
  };

  const handleChat = () => {
    navigation.navigate('ChatScreen', {
      applicationId: application.id,
      otherUser: application.employerId,
      jobTitle: application.jobTitle
    });
  };

  const getAddressDisplay = () => {
    if (!location) return '';
    if (location.address) return location.address;
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{tr.loadingText}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>{tr.backButton}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{tr.headerTitle}</Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📍</Text>
          <Text style={styles.errorTitle}>{tr.locationNotAvailable}</Text>
          <Text style={styles.errorMessage}>
            {tr.locationNotShared}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>{tr.backButton}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tr.headerTitle}</Text>
        <TouchableOpacity onPress={handleChat}>
          <Text style={styles.chatButton}>{tr.chat}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Location Details */}
        <View style={styles.locationCard}>
          <Text style={styles.jobTitle}>{application.jobTitle}</Text>
          <Text style={styles.companyName}>{application.companyName}</Text>
          
          <View style={styles.addressSection}>
            <Text style={styles.addressIcon}>📍</Text>
            <View style={styles.addressText}>
              <Text style={styles.addressTitle}>{tr.workLocation}</Text>
              <Text style={styles.address}>
                {getAddressDisplay()}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.navigateButton} onPress={openInMaps}>
            <Text style={styles.navigateButtonText}>{tr.getDirections}</Text>
          </TouchableOpacity>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onMapReady={() => setMapReady(true)}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title={tr.workLocation}
              description={application.companyName}
              pinColor={colors.primary}
            />
          </MapView>
          
          {!mapReady && (
            <View style={styles.mapOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.mapLoadingText}>{tr.loadingMap}</Text>
            </View>
          )}
        </View>

        {/* Additional Information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{tr.beforeYouGo}</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>✅</Text>
            <Text style={styles.infoText}>{tr.confirmArrival}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>📞</Text>
            <Text style={styles.infoText}>{tr.keepPhoneCharged}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>👥</Text>
            <Text style={styles.infoText}>{tr.askSupervisor}</Text>
          </View>
        </View>

        {/* Safety Tips */}
        <View style={[styles.infoCard, { marginTop: 0 }]}>
          <Text style={styles.infoTitle}>
            {locale === 'hi' ? 'सुरक्षा युक्तियाँ' : 'Safety Tips'}
          </Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>🛡️</Text>
            <Text style={styles.infoText}>
              {locale === 'hi' 
                ? 'सार्वजनिक स्थान पर मिलें और अनुभव साझा करें'
                : 'Meet in public places and share your experience'}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>📱</Text>
            <Text style={styles.infoText}>
              {locale === 'hi' 
                ? 'आपात स्थिति के लिए आपातकालीन संपर्क साझा करें'
                : 'Share emergency contact for emergencies'}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>⏰</Text>
            <Text style={styles.infoText}>
              {locale === 'hi' 
                ? 'समय पर पहुंचें और व्यावसायिक रहें'
                : 'Arrive on time and remain professional'}
            </Text>
          </View>
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
  content: {
    flex: 1,
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
    marginBottom: 20,
    opacity: 0.5,
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
    marginBottom: 10,
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
    marginBottom: 20,
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
  navigateButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  navigateButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapContainer: {
    height: 300,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoCard: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginTop: 20,
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
});