// src/screens/auth/ProfileSetupScreen.js
import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfile, fetchUserProfile } from '../../services/database';

// ─── Phone validation ─────────────────────────────────────────────────────────
const isValidIndianPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return /^[6-9]\d{9}$/.test(cleaned);
};

// ─── Step indicator ───────────────────────────────────────────────────────────
const StepDot = ({ active, done }) => (
  <View style={[styles.stepDot, active && styles.stepDotActive, done && styles.stepDotDone]}>
    {done && <Text style={styles.stepDotCheck}>✓</Text>}
  </View>
);

export default function ProfileSetupScreen({ navigation, route }) {
  const { userType: routeUserType } = route?.params || {};

  // ── FIX: get uid from userProfile, NOT from user ───────────────────────────
  // In AsyncStorage-only mode (Expo Go + Firebase Auth unavailable),
  // `user` is null. The uid comes from `userProfile` which is populated
  // from AsyncStorage by AuthContext after OTP verification.
  const { user, userProfile, setUserProfile, updateUserProfile: updateContextProfile } = useAuth();

  const uid       = user?.uid || userProfile?.uid;
  const userType  = routeUserType || userProfile?.userType || 'worker';
  const userEmail = user?.email   || userProfile?.email   || '';

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name,        setName]        = useState('');
  const [location,    setLocation]    = useState('');
  const [skills,      setSkills]      = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || userProfile?.phoneNumber || '');
  const [phoneError,  setPhoneError]  = useState('');

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading,          setLoading]          = useState(false);
  const [locationLoading,  setLocationLoading]  = useState(false);
  const [checkingProfile,  setCheckingProfile]  = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [step,             setStep]             = useState(1); // 1 = basic, 2 = details

  // ── Animations ─────────────────────────────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Check existing profile ─────────────────────────────────────────────────
  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        console.log('📋 Checking existing profile for uid:', uid);

        if (!uid) {
          console.warn('⚠️ No uid yet, skipping profile check');
          setCheckingProfile(false);
          getCurrentLocation();
          return;
        }

        const result = await fetchUserProfile(uid);

        if (result.success && result.profile?.name && result.profile?.profileComplete) {
          console.log('✅ Profile already complete, redirecting');
          setUserProfile(result.profile);
          navigation.replace(userType === 'worker' ? 'WorkerMain' : 'EmployerMain');
          return;
        }

        setCheckingProfile(false);
        getCurrentLocation();
      } catch (error) {
        console.error('Error checking profile:', error);
        setCheckingProfile(false);
        getCurrentLocation();
      }
    };

    checkExistingProfile();
  }, [uid]);

  // ── Location ───────────────────────────────────────────────────────────────
  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setLocationLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geo = await Location.reverseGeocodeAsync({
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (geo.length > 0) {
        const { city, subregion, region } = geo[0];
        const cityName  = city || subregion || '';
        const stateName = region || '';
        setLocation(cityName && stateName ? `${cityName}, ${stateName}` : cityName || stateName);
      }
    } catch (e) {
      console.error('Location error:', e);
    } finally {
      setLocationLoading(false);
    }
  };

  // ── Phone validation ───────────────────────────────────────────────────────
  const handlePhoneChange = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(digits);
    if (digits.length > 0 && !isValidIndianPhone(digits)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number');
    } else {
      setPhoneError('');
    }
  };

  // ── Step 1 → Step 2 validation ─────────────────────────────────────────────
  const goToStep2 = () => {
    if (!name.trim()) {
      Alert.alert('Missing Info', 'Please enter your full name'); return;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('Missing Info', 'Phone number is required'); return;
    }
    if (!isValidIndianPhone(phoneNumber)) {
      Alert.alert('Invalid Phone', 'Enter a valid 10-digit Indian mobile number'); return;
    }
    setStep(2);
    Animated.sequence([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 30, duration: 0,   useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!location.trim()) {
      Alert.alert('Missing Info', 'Please enter your location'); return;
    }
    if (userType === 'worker' && !skills.trim()) {
      Alert.alert('Missing Info', 'Please enter at least one skill'); return;
    }
    if (userType === 'employer' && !companyName.trim()) {
      Alert.alert('Missing Info', 'Please enter your company name'); return;
    }

    if (!uid) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const retryUid = user?.uid || userProfile?.uid;
      if (!retryUid) {
        Alert.alert('Error', 'User session expired. Please log in again.');
        navigation.replace('Welcome');
        return;
      }
    }

    const finalUid = user?.uid || userProfile?.uid;

    setLoading(true);
    try {
      const profileData = {
        uid:      finalUid,
        name:     name.trim(),
        location:    location.trim(),
        userType,
        phoneNumber: phoneNumber.trim(),
        email:       userEmail,
        profileComplete: true,
        updatedAt:   new Date().toISOString(),
        ...(userType === 'worker' ? {
          skills:        skills.split(',').map(s => s.trim()).filter(Boolean),
          rating:        0,
          completedJobs: 0,
          totalEarnings: 0,
          totalRatings:  0,
        } : {
          companyName:       companyName.trim(),
          rating:            0,
          totalRatings:      0,
          totalHires:        0,
          totalPayments:     0,
          activeJobs:        0,
          freePostsUsed:     0,
          freePostsAvailable:3,
          totalJobsPosted:   0,
        }),
      };

      const result = await updateUserProfile(finalUid, profileData);

      if (result.success) {
        setUserProfile(profileData);
        updateContextProfile(profileData);
        Alert.alert('🎉 Welcome!', 'Your profile is all set.', [{
          text: 'Get Started',
          onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: userType === 'worker' ? 'WorkerMain' : 'EmployerMain' }],
          }),
        }]);
      } else {
        throw new Error(result.error || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (checkingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Setting up your account…</Text>
      </View>
    );
  }

  const isWorker = userType === 'worker';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerEmoji}>{isWorker ? '👷' : '🏭'}</Text>
          </View>
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
          <Text style={styles.headerSubtitle}>
            {isWorker ? "Tell employers what you're looking for" : "Let workers find you faster"}
          </Text>

          {/* Step indicators */}
          <View style={styles.stepsRow}>
            <StepDot active={step === 1} done={step > 1} />
            <View style={[styles.stepLine, step > 1 && styles.stepLineDone]} />
            <StepDot active={step === 2} done={false} />
          </View>
          <View style={styles.stepsLabels}>
            <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>Basic Info</Text>
            <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>Details</Text>
          </View>
        </View>

        {/* ── Form ── */}
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {step === 1 && (
            <>
              <Text style={styles.sectionTitle}>Personal Information</Text>

              {/* Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="#BDBDBD"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Phone */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>
                  Mobile Number <Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.inputWrapper, phoneError ? styles.inputError : null]}>
                  <Text style={styles.inputIcon}>📱</Text>
                  <Text style={styles.phonePrefix}>+91</Text>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="9876543210"
                    placeholderTextColor="#BDBDBD"
                    value={phoneNumber}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!user?.phoneNumber}
                  />
                  {phoneNumber.length === 10 && isValidIndianPhone(phoneNumber) && (
                    <Ionicons name="checkmark-circle" size={20} color="#34C759" style={styles.validIcon} />
                  )}
                </View>
                {phoneError ? (
                  <Text style={styles.errorText}>{phoneError}</Text>
                ) : (
                  <Text style={styles.hint}>10-digit Indian mobile number (starts with 6–9)</Text>
                )}
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={goToStep2}>
                <Text style={styles.primaryBtnText}>Continue →</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.sectionTitle}>
                {isWorker ? 'Work Details' : 'Business Details'}
              </Text>

              {/* Location */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Location <Text style={styles.required}>*</Text></Text>
                <View style={styles.locationRow}>
                  <View style={[styles.inputWrapper, { flex: 1, marginRight: 10 }]}>
                    <Ionicons name="location-outline" size={18} color="#9E9E9E" style={styles.ionIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="City, State"
                      placeholderTextColor="#BDBDBD"
                      value={location}
                      onChangeText={setLocation}
                    />
                  </View>

                  {/* Detect location button — matches Swiggy/Zomato style */}
                  <TouchableOpacity
                    style={[styles.detectBtn, locationLoading && styles.detectBtnLoading]}
                    onPress={getCurrentLocation}
                    disabled={locationLoading}
                    activeOpacity={0.75}>
                    {locationLoading ? (
                      <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                      <Ionicons name="navigate" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                </View>

                {permissionDenied ? (
                  <View style={styles.hintRow}>
                    <Ionicons name="warning-outline" size={13} color="#FF9500" />
                    <Text style={[styles.hint, styles.hintWarning]}>Location access denied — enter manually</Text>
                  </View>
                ) : (
                  <View style={styles.hintRow}>
                    <Ionicons name="navigate-outline" size={13} color="#9E9E9E" />
                    <Text style={styles.hint}>Tap to use your current location</Text>
                  </View>
                )}
              </View>

              {/* Worker: Skills */}
              {isWorker && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Skills <Text style={styles.required}>*</Text></Text>
                  <View style={[styles.inputWrapper, styles.inputWrapperMulti]}>
                    <Text style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 2 }]}>🔧</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="e.g. Carpentry, Plumbing, Electrician"
                      placeholderTextColor="#BDBDBD"
                      value={skills}
                      onChangeText={setSkills}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                  <Text style={styles.hint}>Separate skills with commas</Text>

                  {/* Skill chips preview */}
                  {skills.trim().length > 0 && (
                    <View style={styles.chipsRow}>
                      {skills.split(',').map(s => s.trim()).filter(Boolean).map((skill, i) => (
                        <View key={i} style={styles.chip}>
                          <Text style={styles.chipText}>{skill}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Employer: Company */}
              {!isWorker && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Company Name <Text style={styles.required}>*</Text></Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>🏢</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your company name"
                      placeholderTextColor="#BDBDBD"
                      value={companyName}
                      onChangeText={setCompanyName}
                    />
                  </View>
                </View>
              )}

              {/* Back + Submit */}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setStep(1)}>
                  <Text style={styles.backBtnText}>← Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, styles.primaryBtnFlex, loading && styles.disabledBtn]}
                  onPress={handleSubmit}
                  disabled={loading}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryBtnText}>Complete Setup ✓</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>

        {/* Footer note */}
        <Text style={styles.footer}>
          Your data is secure and only used to match you with the right opportunities.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F0F4FF' },
  scrollContent: { paddingBottom: 40 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  loadingText:      { marginTop: 14, fontSize: 16, color: '#666', fontWeight: '500' },

  // ── Header ──
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 56,
    paddingBottom: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerBadge: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  headerEmoji:    { fontSize: 38 },
  headerTitle:    { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 6 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 20 },

  stepsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  stepDotActive: { backgroundColor: '#fff', borderColor: '#fff' },
  stepDotDone:   { backgroundColor: '#34C759', borderColor: '#34C759' },
  stepDotCheck:  { fontSize: 13, color: '#fff', fontWeight: '700' },
  stepLine:      { width: 48, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
  stepLineDone:  { backgroundColor: '#34C759' },
  stepsLabels:   { flexDirection: 'row', marginTop: 8, gap: 68 },
  stepLabel:     { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  stepLabelActive: { color: '#fff', fontWeight: '700' },

  // ── Card ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: -16,
    padding: 24,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 20 },

  // ── Fields ──
  fieldGroup:  { marginBottom: 20 },
  label:       { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8 },
  required:    { color: '#FF3B30' },

  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F7F9FF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E0E8FF',
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperMulti: { height: 'auto', alignItems: 'flex-start', paddingVertical: 12 },
  inputError: { borderColor: '#FF3B30' },

  inputIcon:   { fontSize: 17, marginRight: 10 },
  // For Ionicons used inline (location pin inside text field)
  ionIcon:     { marginRight: 10 },
  phonePrefix: { fontSize: 15, fontWeight: '600', color: '#444', marginRight: 6 },
  validIcon:   { marginLeft: 6 },

  input: {
    flex: 1, fontSize: 15, color: '#1A1A2E',
    paddingVertical: 0,
  },
  textArea: {
    height: 68, textAlignVertical: 'top', paddingTop: 2,
  },

  hint:      { fontSize: 12, color: '#9E9E9E', marginTop: 6, fontStyle: 'italic' },
  hintWarning: { color: '#FF9500', marginLeft: 4 },
  errorText: { fontSize: 12, color: '#FF3B30', marginTop: 6, fontWeight: '500' },

  hintRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },

  locationRow: { flexDirection: 'row', alignItems: 'center' },

  // Detect location button — clean, icon-only, like Swiggy/Zomato
  detectBtn: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#EEF3FF',
    borderWidth: 1.5, borderColor: '#C7D7FF',
    alignItems: 'center', justifyContent: 'center',
  },
  detectBtnLoading: {
    backgroundColor: '#F7F9FF',
    borderColor: '#E0E8FF',
  },

  // ── Skill chips ──
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 8 },
  chip: {
    backgroundColor: '#EEF3FF',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#C7D7FF',
  },
  chipText: { fontSize: 12, color: '#3D6DCC', fontWeight: '600' },

  // ── Buttons ──
  btnRow:          { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 },
  primaryBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  primaryBtnFlex: { flex: 1, marginTop: 0 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabledBtn:    { opacity: 0.6 },

  backBtn: {
    paddingVertical: 15, paddingHorizontal: 18,
    backgroundColor: '#F0F4FF',
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E8FF',
  },
  backBtnText: { fontSize: 15, fontWeight: '600', color: '#007AFF' },

  footer: {
    textAlign: 'center', fontSize: 12,
    color: '#BDBDBD', marginTop: 24,
    paddingHorizontal: 24, lineHeight: 18,
  },
});