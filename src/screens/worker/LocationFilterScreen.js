// src/screens/worker/LocationFilterScreen.js - PROFESSIONAL VERSION
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  SectionList,
  ActivityIndicator,
} from 'react-native';
import { useJob } from '../../context/JobContext';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/colors';

const { width, height } = Dimensions.get('window');

// Comprehensive Indian cities data with sections
const INDIAN_CITIES_DATA = [
  {
    title: '📍 Current & Nearby',
    data: ['Use Current Location', 'Nearby Cities'],
  },
  {
    title: '🏙️ Metropolitan Cities',
    data: [
      'Mumbai, Maharashtra',
      'Delhi, Delhi',
      'Bangalore, Karnataka',
      'Hyderabad, Telangana',
      'Chennai, Tamil Nadu',
      'Kolkata, West Bengal',
    ],
  },
  {
    title: '🏛️ State Capitals',
    data: [
      'Lucknow, Uttar Pradesh',
      'Patna, Bihar',
      'Bhopal, Madhya Pradesh',
      'Chandigarh, Chandigarh',
      'Dehradun, Uttarakhand',
      'Ranchi, Jharkhand',
      'Bhubaneswar, Odisha',
      'Guwahati, Assam',
      'Thiruvananthapuram, Kerala',
      'Gandhinagar, Gujarat',
      'Raipur, Chhattisgarh',
      'Shimla, Himachal Pradesh',
      'Jaipur, Rajasthan',
      'Gangtok, Sikkim',
      'Kohima, Nagaland',
    ],
  },
  {
    title: '🏢 Major Cities',
    data: [
      'Pune, Maharashtra',
      'Ahmedabad, Gujarat',
      'Surat, Gujarat',
      'Nagpur, Maharashtra',
      'Indore, Madhya Pradesh',
      'Vadodara, Gujarat',
      'Coimbatore, Tamil Nadu',
      'Kochi, Kerala',
      'Visakhapatnam, Andhra Pradesh',
      'Ludhiana, Punjab',
      'Agra, Uttar Pradesh',
      'Nashik, Maharashtra',
      'Faridabad, Haryana',
      'Meerut, Uttar Pradesh',
      'Rajkot, Gujarat',
      'Kalyan, Maharashtra',
      'Varanasi, Uttar Pradesh',
      'Srinagar, Jammu & Kashmir',
      'Aurangabad, Maharashtra',
      'Solapur, Maharashtra',
    ],
  },
  {
    title: '🏘️ Tier 2 & 3 Cities',
    data: [
      'Darbhanga, Bihar',
      'Gorakhpur, Uttar Pradesh',
      'Jabalpur, Madhya Pradesh',
      'Gwalior, Madhya Pradesh',
      'Jodhpur, Rajasthan',
      'Kota, Rajasthan',
      'Bikaner, Rajasthan',
      'Ajmer, Rajasthan',
      'Udaipur, Rajasthan',
      'Amritsar, Punjab',
      'Jalandhar, Punjab',
      'Bareilly, Uttar Pradesh',
      'Aligarh, Uttar Pradesh',
      'Moradabad, Uttar Pradesh',
      'Saharanpur, Uttar Pradesh',
      'Jammu, Jammu & Kashmir',
      'Mysore, Karnataka',
      'Mangalore, Karnataka',
      'Hubli, Karnataka',
      'Belgaum, Karnataka',
      'Tiruchirappalli, Tamil Nadu',
      'Salem, Tamil Nadu',
      'Tirunelveli, Tamil Nadu',
      'Madurai, Tamil Nadu',
      'Erode, Tamil Nadu',
      'Vijayawada, Andhra Pradesh',
      'Guntur, Andhra Pradesh',
      'Nellore, Andhra Pradesh',
      'Kakinada, Andhra Pradesh',
      'Warangal, Telangana',
      'Nizamabad, Telangana',
      'Mira-Bhayandar, Maharashtra',
      'Bhiwandi, Maharashtra',
      'Thane, Maharashtra',
      'Kalyan-Dombivli, Maharashtra',
      'Vasai-Virar, Maharashtra',
      'Malegaon, Maharashtra',
      'Nanded, Maharashtra',
      'Kolhapur, Maharashtra',
      'Sangli, Maharashtra',
      'Jalgaon, Maharashtra',
      'Akola, Maharashtra',
      'Latur, Maharashtra',
      'Dhule, Maharashtra',
      'Ahmednagar, Maharashtra',
      'Ichalkaranji, Maharashtra',
      'Parbhani, Maharashtra',
      'Panipat, Haryana',
      'Karnal, Haryana',
      'Hisar, Haryana',
      'Yamunanagar, Haryana',
      'Rohtak, Haryana',
      'Bhiwani, Haryana',
      'Sonipat, Haryana',
      'Ambala, Haryana',
      'Sirsa, Haryana',
      'Gurugram, Haryana',
      'Faridabad, Haryana',
    ],
  },
];

const LocationFilterScreen = ({ navigation }) => {
  const { currentLocation, fetchJobs, fetchJobsByUserLocation } = useJob();
  const { userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(currentLocation || userProfile?.location || '');
  const [loading, setLoading] = useState(false);

  // Filter cities based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return INDIAN_CITIES_DATA;
    }

    const query = searchQuery.toLowerCase().trim();
    const filteredSections = INDIAN_CITIES_DATA.map(section => ({
      ...section,
      data: section.data.filter(city => 
        city.toLowerCase().includes(query)
      ),
    })).filter(section => section.data.length > 0);

    return filteredSections;
  }, [searchQuery]);

  const handleLocationSelect = async (location) => {
    if (location === 'Use Current Location') {
      // Handle current location logic
      if (userProfile?.location) {
        setLoading(true);
        setSelectedLocation(userProfile.location);
        await fetchJobsByUserLocation(userProfile.location);
        setLoading(false);
        navigation.goBack();
      }
      return;
    }

    if (location === 'Nearby Cities') {
      // Handle nearby cities logic
      return;
    }

    setSelectedLocation(location);
  };

  const handleApply = async () => {
    setLoading(true);
    if (selectedLocation && selectedLocation !== 'Use Current Location' && selectedLocation !== 'Nearby Cities') {
      await fetchJobs(selectedLocation);
    } else {
      await fetchJobs();
    }
    setLoading(false);
    navigation.goBack();
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const clearLocation = () => {
    setSelectedLocation('');
  };

  const getLocationIcon = (location) => {
    if (location === 'Use Current Location') return '📍';
    if (location === 'Nearby Cities') return '🌍';
    
    if (location.includes('Mumbai') || location.includes('Delhi') || location.includes('Bangalore')) return '🏙️';
    if (location.includes('Patna') || location.includes('Lucknow') || location.includes('Bhopal')) return '🏛️';
    if (location.includes('Pune') || location.includes('Ahmedabad') || location.includes('Chennai')) return '🏢';
    return '🏘️';
  };

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const renderLocationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.locationItem,
        selectedLocation === item && styles.locationItemSelected
      ]}
      onPress={() => handleLocationSelect(item)}
    >
      <View style={styles.locationItemLeft}>
        <Text style={styles.locationIcon}>{getLocationIcon(item)}</Text>
        <View style={styles.locationTextContainer}>
          <Text style={[
            styles.locationName,
            selectedLocation === item && styles.locationNameSelected
          ]}>
            {item.split(',')[0]}
          </Text>
          {item.includes(',') && (
            <Text style={styles.locationState}>
              {item.split(',')[1].trim()}
            </Text>
          )}
        </View>
      </View>
      
      {selectedLocation === item && (
        <View style={styles.selectedCheckmark}>
          <Text style={styles.checkmarkIcon}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Select Location</Text>
          <Text style={styles.headerSubtitle}>
            {selectedLocation ? `Selected: ${selectedLocation.split(',')[0]}` : 'Choose your city'}
          </Text>
        </View>
        <TouchableOpacity onPress={clearLocation} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for your city..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="words"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearSearchButton}>
              <Text style={styles.clearSearchIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => handleLocationSelect('Use Current Location')}
        >
          <Text style={styles.quickActionIcon}>📍</Text>
          <Text style={styles.quickActionText}>Current Location</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={async () => {
            setSelectedLocation('');
            await fetchJobs();
            navigation.goBack();
          }}
        >
          <Text style={styles.quickActionIcon}>🌍</Text>
          <Text style={styles.quickActionText}>All India</Text>
        </TouchableOpacity>
      </View>

      {/* Current Location Display */}
      {currentLocation && (
        <View style={styles.currentLocationSection}>
          <Text style={styles.currentLocationLabel}>Currently Viewing</Text>
          <Text style={styles.currentLocationText}>{currentLocation}</Text>
        </View>
      )}

      {/* Locations List */}
      <View style={styles.listContainer}>
        <SectionList
          sections={filteredData}
          keyExtractor={(item, index) => item + index}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderLocationItem}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      </View>

      {/* Apply Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.applyButton,
            loading && styles.applyButtonDisabled
          ]}
          onPress={handleApply}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Text style={styles.applyButtonText}>
                {selectedLocation ? `Show Jobs in ${selectedLocation.split(',')[0]}` : 'Show All Jobs'}
              </Text>
              <Text style={styles.applyButtonArrow}>→</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: 'bold',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  searchSection: {
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
    color: colors.textSecondary,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
  },
  clearSearchButton: {
    padding: 4,
  },
  clearSearchIcon: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: colors.white,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '08',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  quickActionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  currentLocationSection: {
    backgroundColor: colors.primary + '05',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  currentLocationLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  currentLocationText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  locationItemSelected: {
    backgroundColor: colors.primary + '08',
  },
  locationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  locationNameSelected: {
    color: colors.primary,
  },
  locationState: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  selectedCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkIcon: {
    fontSize: 14,
    color: colors.white,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonDisabled: {
    opacity: 0.7,
  },
  applyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  applyButtonArrow: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LocationFilterScreen;