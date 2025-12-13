// src/screens/auth/LoginScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  Keyboard,
} from 'react-native';
import { auth, db, functions } from '../../services/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation, route }) {
  const { userType } = route.params;

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [otpFocusedIndex, setOtpFocusedIndex] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const otpInputRefs = useRef([]);

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Keyboard listeners
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);

  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleSendOTP = async () => {
    if (phoneNumber.length !== 10) {
      shakeAnimation();
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const sendOTP = httpsCallable(functions, 'sendOTP');
      const result = await sendOTP({
        phoneNumber: '+91' + phoneNumber
      });

      if (result.data.success) {
        setOtpSent(true);

        // Show OTP in development mode
        if (result.data.devOTP) {
          Alert.alert(
            'OTP Sent',
            `Development Mode: OTP is ${result.data.devOTP}`,
            [{ text: 'Got it', style: 'default' }]
          );
        }
      } else {
        throw new Error(result.data.message || 'Failed to send OTP');
      }
    } catch (err) {
      console.error('Send OTP Error:', err);

      let errorMessage = 'Failed to send OTP. Please try again.';
      if (err.code === 'functions/invalid-argument') {
        errorMessage = 'Invalid phone number format';
      } else if (err.message.includes('quota')) {
        errorMessage = 'Too many attempts. Please try again later.';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      shakeAnimation();
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const verifyOTP = httpsCallable(functions, 'verifyOTP');
      const result = await verifyOTP({
        phoneNumber: '+91' + phoneNumber,
        otp: otp
      });

      if (result.data.success && result.data.customToken) {
        const userCredential = await signInWithCustomToken(auth, result.data.customToken);
        const userId = userCredential.user.uid;

        // Check if user profile exists
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          if (userData.userType && userData.userType !== userType) {
            await auth.signOut();
            Alert.alert(
              'Account Type Mismatch',
              `This number is registered as ${userData.userType === 'worker' ? 'Worker' : 'Employer'}. Please use the correct login option.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Switch',
                  onPress: () => {
                    // Clear current state
                    setPhoneNumber('');
                    setOtp('');
                    setOtpSent(false);

                    // Navigate to login with correct user type
                    navigation.replace('Login', { userType: userData.userType });
                  }
                }
              ]
            );
            return;
          }

          // Navigate based on user type
          if (userData.userType === 'worker') {
            navigation.replace('WorkerMain');
          } else {
            navigation.replace('EmployerMain');
          }
        } else {
          // New user
          await setDoc(userDocRef, {
            uid: userId,
            phoneNumber: '+91' + phoneNumber,
            userType: userType,
            createdAt: new Date().toISOString()
          });

          navigation.replace('ProfileSetup', { userType });
        }
      } else {
        throw new Error(result.data.message || 'Verification failed');
      }
    } catch (err) {
      console.error('Verify OTP Error:', err);

      let errorMessage = 'Invalid OTP. Please try again.';
      if (err.code === 'functions/not-found') {
        errorMessage = 'OTP expired. Please request a new one.';
      } else if (err.code === 'functions/deadline-exceeded') {
        errorMessage = 'OTP verification timeout. Please try again.';
      }

      Alert.alert('Verification Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text, index) => {
    const newOtp = otp.split('');
    newOtp[index] = text;
    const joinedOtp = newOtp.join('');
    setOtp(joinedOtp);

    // Auto focus next input
    if (text && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOTP = () => {
    setOtp('');
    otpInputRefs.current[0]?.focus();
    handleSendOTP();
  };

  const handleSwitchUserType = () => {
    Alert.alert(
      'Switch Account Type',
      `Are you sure you want to switch from ${userType === 'worker' ? 'Worker' : 'Employer'} to ${userType === 'worker' ? 'Employer' : 'Worker'} login?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Switch',
          onPress: () => {
            // Clear current state
            setPhoneNumber('');
            setOtp('');
            setOtpSent(false);

            // Get the opposite user type
            const oppositeUserType = userType === 'worker' ? 'employer' : 'worker';

            // Replace current screen with LoginScreen with opposite userType
            navigation.replace('Login', { userType: oppositeUserType });
          },
          style: 'default'
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>🔧</Text>
              </View>
              <Text style={styles.appName}>SkillConnect</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.userTypeBadge,
                userType === 'worker' ? styles.workerBadge : styles.employerBadge
              ]}
              onPress={handleSwitchUserType}
            >
              <Text style={styles.userTypeText}>
                {userType === 'worker' ? '👷 Worker' : '💼 Employer'}
              </Text>
              <Text style={styles.switchText}>Tap to switch</Text>
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <Text style={styles.title}>
              {otpSent ? 'Enter Verification Code' : 'Enter Mobile Number'}
            </Text>

            <Text style={styles.subtitle}>
              {otpSent
                ? `We've sent a 6-digit code to +91 ${phoneNumber}`
                : `We'll send you a one-time password (OTP) to verify your number`
              }
            </Text>

            {!otpSent ? (
              <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.countryCodeContainer}>
                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="99999 99999"
                    placeholderTextColor={colors.textPlaceholder}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    editable={!loading}
                    autoFocus
                    selectionColor={colors.primary}
                  />
                </View>
              </Animated.View>
            ) : (
              <View style={styles.otpContainer}>
                <Text style={styles.otpLabel}>Enter OTP</Text>
                <View style={styles.otpInputsContainer}>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => otpInputRefs.current[index] = ref}
                      style={[
                        styles.otpInput,
                        otpFocusedIndex === index && styles.otpInputFocused,
                        otp[index] && styles.otpInputFilled
                      ]}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={otp[index] || ''}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      onFocus={() => setOtpFocusedIndex(index)}
                      onBlur={() => setOtpFocusedIndex(null)}
                      editable={!loading}
                      selectionColor={colors.primary}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            {!otpSent ? (
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!phoneNumber || phoneNumber.length !== 10) && styles.buttonDisabled
                ]}
                onPress={handleSendOTP}
                disabled={loading || phoneNumber.length !== 10}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    otp.length !== 6 && styles.buttonDisabled
                  ]}
                  onPress={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.secondaryActions}>
                  <TouchableOpacity
                    onPress={handleResendOTP}
                    disabled={loading}
                    style={styles.secondaryButton}
                  >
                    <Text style={[
                      styles.secondaryButtonText,
                      loading && styles.buttonTextDisabled
                    ]}>
                      ↻ Resend OTP
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setOtpSent(false);
                      setOtp('');
                      Keyboard.dismiss();
                    }}
                    disabled={loading}
                    style={styles.secondaryButton}
                  >
                    <Text style={[
                      styles.secondaryButtonText,
                      loading && styles.buttonTextDisabled
                    ]}>
                      ✏️ Change Number
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Switch User Type Button */}
            {!otpSent && !keyboardVisible && (
              <TouchableOpacity
                style={styles.switchTypeButton}
                onPress={handleSwitchUserType}
                disabled={loading}
              >
                <Text style={styles.switchTypeIcon}>🔄</Text>
                <Text style={styles.switchTypeText}>
                  Continue as {userType === 'worker' ? 'Employer' : 'Worker'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Terms & Privacy */}
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.linkText}>Terms of Service</Text> and{' '}
              <Text style={styles.linkText}>Privacy Policy</Text>
            </Text>
          </View>

          {/* Footer */}
          {!keyboardVisible && (
            <View style={styles.footer}>
              <View style={styles.helpContainer}>
                <TouchableOpacity
                  style={styles.helpButton}
                  onPress={() => Alert.alert('Help', 'Contact support@skillconnect.com\n\nPhone: +91 1800-XXX-XXX')}
                >
                  <Text style={styles.helpIcon}>❓</Text>
                  <View style={styles.helpTextContainer}>
                    <Text style={styles.helpTitle}>Need help?</Text>
                    <Text style={styles.helpSubtitle}>Contact our support team</Text>
                  </View>
                  <Text style={styles.helpArrow}>→</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: colors.text,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 24,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userTypeBadge: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 100,
  },
  workerBadge: {
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  employerBadge: {
    backgroundColor: colors.secondaryLight,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  switchText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  mainContent: {
    padding: 30,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 40,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 30,
    overflow: 'hidden',
  },
  countryCodeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: colors.gray100,
    borderRightWidth: 2,
    borderRightColor: colors.border,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
    letterSpacing: 0.5,
  },
  otpContainer: {
    marginBottom: 40,
  },
  otpLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  otpInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  otpInput: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text,
  },
  otpInputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },
  otpInputFilled: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: colors.gray400,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  buttonTextDisabled: {
    color: colors.gray400,
  },
  switchTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchTypeIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  switchTypeText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  termsText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 30,
  },
  helpContainer: {
    backgroundColor: colors.infoLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.info,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  helpTextContainer: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  helpSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  helpArrow: {
    fontSize: 20,
    color: colors.info,
  },
});