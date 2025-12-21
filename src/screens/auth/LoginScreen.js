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
  Image
} from 'react-native';
import { auth, db, functions } from '../../services/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { colors } from '../../constants/colors';
import { useLanguage } from '../../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation, route }) {
  const { userType } = route.params;
  const { t, locale } = useLanguage();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [otpFocusedIndex, setOtpFocusedIndex] = useState(null);
  const phoneInputRef = useRef(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const otpInputRefs = useRef([]);

  const translations = {
    en: {
      title: otpSent ? 'Enter Verification Code' : 'Enter Mobile Number',
      subtitle: otpSent 
        ? `Code sent to +91 ${phoneNumber}`
        : 'We\'ll send you an OTP to verify your number',
      phonePlaceholder: 'Enter 10-digit mobile number',
      sendOtp: 'CONTINUE',
      verifyContinue: 'VERIFY OTP',
      resendOtp: 'Resend OTP',
      changeNumber: 'Change Number',
      continueAs: 'Continue as',
      terms: 'By continuing, you agree to our Terms of Service and Privacy Policy',
      needHelp: 'Need help?',
      contactSupport: 'Contact our support team',
      invalidNumber: 'Invalid Number',
      invalidNumberMessage: 'Please enter a valid 10-digit mobile number',
      invalidOtp: 'Invalid OTP',
      invalidOtpMessage: 'Please enter the 6-digit OTP',
      otpSentTitle: 'OTP Sent',
      otpSentMessage: 'Development Mode: OTP is',
      switchAccount: 'Switch Account Type',
      switchMessage: `Are you sure you want to switch from ${userType === 'worker' ? 'Worker' : 'Employer'} to ${userType === 'worker' ? 'Employer' : 'Worker'} login?`,
      switch: 'Switch',
      cancel: 'Cancel',
      verificationFailed: 'Verification Failed',
      error: 'Error',
      enterOtp: 'Enter OTP',
      worker: 'Worker',
      employer: 'Employer',
      tapToSwitch: 'Tap to switch',
      appName: 'Udyogi',
      welcome: 'Welcome to',
      orContinueAs: 'Or continue as',
      didNotReceive: 'Didn\'t receive OTP?',
      resendIn: 'Resend in',
      seconds: 'seconds'
    },
    hi: {
      title: otpSent ? 'सत्यापन कोड दर्ज करें' : 'मोबाइल नंबर दर्ज करें',
      subtitle: otpSent 
        ? `+91 ${phoneNumber} पर कोड भेजा गया`
        : 'हम आपके नंबर को सत्यापित करने के लिए OTP भेजेंगे',
      phonePlaceholder: '10-अंकीय मोबाइल नंबर दर्ज करें',
      sendOtp: 'जारी रखें',
      verifyContinue: 'OTP सत्यापित करें',
      resendOtp: 'OTP फिर से भेजें',
      changeNumber: 'नंबर बदलें',
      continueAs: 'के रूप में जारी रखें',
      terms: 'जारी रखकर, आप हमारी सेवा की शर्तों और गोपनीयता नीति से सहमत होते हैं',
      needHelp: 'मदद चाहिए?',
      contactSupport: 'हमारी सहायता टीम से संपर्क करें',
      invalidNumber: 'अमान्य नंबर',
      invalidNumberMessage: 'कृपया एक वैध 10-अंकीय मोबाइल नंबर दर्ज करें',
      invalidOtp: 'अमान्य OTP',
      invalidOtpMessage: 'कृपया 6-अंकीय OTP दर्ज करें',
      otpSentTitle: 'OTP भेजा गया',
      otpSentMessage: 'डेवलपमेंट मोड: OTP है',
      switchAccount: 'खाता प्रकार बदलें',
      switchMessage: `क्या आप वाकई ${userType === 'worker' ? 'मजदूर' : 'नियोक्ता'} से ${userType === 'worker' ? 'नियोक्ता' : 'मजदूर'} लॉगिन में बदलना चाहते हैं?`,
      switch: 'बदलें',
      cancel: 'रद्द करें',
      verificationFailed: 'सत्यापन विफल',
      error: 'त्रुटि',
      enterOtp: 'OTP दर्ज करें',
      worker: 'मजदूर',
      employer: 'नियोक्ता',
      tapToSwitch: 'बदलने के लिए टैप करें',
      appName: 'उद्योगी',
      welcome: 'आपका स्वागत है',
      orContinueAs: 'या के रूप में जारी रखें',
      didNotReceive: 'OTP प्राप्त नहीं हुआ?',
      resendIn: 'सेकंड में फिर से भेजें',
      seconds: 'सेकंड'
    }
  };

  const tr = translations[locale] || translations.en;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

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

  useEffect(() => {
    // Load saved phone number if exists
    const loadSavedPhone = async () => {
      try {
        const savedPhone = await AsyncStorage.getItem('last_used_phone');
        if (savedPhone) {
          setPhoneNumber(savedPhone);
        }
      } catch (error) {
        console.log('Error loading saved number:', error);
      }
    };
    
    loadSavedPhone();
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
      Alert.alert(tr.invalidNumber, tr.invalidNumberMessage);
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
        // Save phone number for future use
        await AsyncStorage.setItem('last_used_phone', phoneNumber);

        if (result.data.devOTP) {
          Alert.alert(
            tr.otpSentTitle,
            `${tr.otpSentMessage} ${result.data.devOTP}`,
            [{ text: locale === 'hi' ? 'समझ गया' : 'Got it', style: 'default' }]
          );
        }
      } else {
        throw new Error(result.data.message || 'Failed to send OTP');
      }
    } catch (err) {
      console.error('Send OTP Error:', err);

      let errorMessage = locale === 'hi' ? 'OTP भेजने में विफल। कृपया पुनः प्रयास करें।' : 'Failed to send OTP. Please try again.';
      if (err.code === 'functions/invalid-argument') {
        errorMessage = locale === 'hi' ? 'अमान्य फोन नंबर प्रारूप' : 'Invalid phone number format';
      } else if (err.message.includes('quota')) {
        errorMessage = locale === 'hi' ? 'बहुत अधिक प्रयास। कृपया बाद में पुनः प्रयास करें।' : 'Too many attempts. Please try again later.';
      }

      Alert.alert(tr.error, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      shakeAnimation();
      Alert.alert(tr.invalidOtp, tr.invalidOtpMessage);
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

        navigation.replace('Loading');

        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          if (userData.userType && userData.userType !== userType) {
            await auth.signOut();
            const userTypeText = userData.userType === 'worker' 
              ? (locale === 'hi' ? 'मजदूर' : 'Worker')
              : (locale === 'hi' ? 'नियोक्ता' : 'Employer');
            
            Alert.alert(
              locale === 'hi' ? 'खाता प्रकार असंगत' : 'Account Type Mismatch',
              locale === 'hi' 
                ? `यह नंबर ${userTypeText} के रूप में पंजीकृत है। कृपया सही लॉगिन विकल्प का उपयोग करें।`
                : `This number is registered as ${userTypeText}. Please use the correct login option.`,
              [
                { 
                  text: locale === 'hi' ? 'रद्द करें' : 'Cancel', 
                  style: 'cancel' 
                },
                {
                  text: locale === 'hi' ? 'बदलें' : 'Switch',
                  onPress: () => {
                    navigation.replace('Login', { userType: userData.userType });
                  }
                }
              ]
            );
            return;
          }

          if (userData.userType === 'worker') {
            navigation.replace('WorkerMain');
          } else {
            navigation.replace('EmployerMain');
          }
        } else {
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

      let errorMessage = locale === 'hi' ? 'अमान्य OTP। कृपया पुनः प्रयास करें।' : 'Invalid OTP. Please try again.';
      if (err.code === 'functions/not-found') {
        errorMessage = locale === 'hi' ? 'OTP समाप्त हो गया। कृपया एक नया अनुरोध करें।' : 'OTP expired. Please request a new one.';
      } else if (err.code === 'functions/deadline-exceeded') {
        errorMessage = locale === 'hi' ? 'OTP सत्यापन समय समाप्त। कृपया पुनः प्रयास करें।' : 'OTP verification timeout. Please try again.';
      }

      navigation.replace('Login', { userType });
      Alert.alert(tr.verificationFailed, errorMessage);
    }
  };

  const handleOtpChange = (text, index) => {
    const newOtp = otp.split('');
    newOtp[index] = text;
    const joinedOtp = newOtp.join('');
    setOtp(joinedOtp);

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
    const oppositeUserType = userType === 'worker' ? 'employer' : 'worker';
    navigation.replace('Login', { userType: oppositeUserType });
  };

  const handleClearInput = () => {
    setPhoneNumber('');
    phoneInputRef.current?.focus();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Logo Section - Clean and simple like real apps */}
          <View style={styles.logoSection}>
            <Image 
              source={require('../../assets/images/UdyogiLogo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.userTypeContainer}>
              <Text style={styles.userTypeLabel}>
                {userType === 'worker' ? tr.worker : tr.employer}
              </Text>
            </View>
          </View>

          {/* Main Form Section */}
          <View style={styles.formSection}>
            <View style={styles.formHeader}>
              <Text style={styles.title}>{tr.title}</Text>
              <Text style={styles.subtitle}>{tr.subtitle}</Text>
            </View>

            {!otpSent ? (
              <View style={styles.phoneInputContainer}>
                <Animated.View style={[styles.inputContainer, { transform: [{ translateX: shakeAnim }] }]}>
                  <View style={styles.phoneInputWrapper}>
                    <View style={styles.countryCodeWrapper}>
                      <Text style={styles.countryCode}>🇮🇳 +91</Text>
                    </View>
                    <TextInput
                      ref={phoneInputRef}
                      style={styles.phoneInput}
                      placeholder={tr.phonePlaceholder}
                      placeholderTextColor={colors.textPlaceholder}
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      editable={!loading}
                      autoFocus={true}
                      selectionColor={colors.primary}
                    />
                    {phoneNumber.length > 0 && (
                      <TouchableOpacity 
                        style={styles.clearButton}
                        onPress={handleClearInput}
                        disabled={loading}
                      >
                        <Text style={styles.clearButtonText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>

                {/* User Type Toggle - Like Zomato/Swiggy */}
                <View style={styles.userTypeToggleContainer}>
                  <Text style={styles.userTypeToggleLabel}>
                    {tr.continueAs}
                  </Text>
                  <TouchableOpacity
                    style={styles.userTypeToggle}
                    onPress={handleSwitchUserType}
                    disabled={loading}
                  >
                    <View style={[
                      styles.toggleOption,
                      userType === 'worker' && styles.toggleOptionActive
                    ]}>
                      <Text style={[
                        styles.toggleOptionText,
                        userType === 'worker' && styles.toggleOptionTextActive
                      ]}>
                        {locale === 'hi' ? 'मजदूर' : 'Worker'}
                      </Text>
                    </View>
                    <View style={[
                      styles.toggleOption,
                      userType === 'employer' && styles.toggleOptionActive
                    ]}>
                      <Text style={[
                        styles.toggleOptionText,
                        userType === 'employer' && styles.toggleOptionTextActive
                      ]}>
                        {locale === 'hi' ? 'नियोक्ता' : 'Employer'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.otpContainer}>
                <Text style={styles.otpLabel}>{tr.enterOtp}</Text>
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
                
                <View style={styles.otpActions}>
                  <TouchableOpacity
                    onPress={handleResendOTP}
                    disabled={loading}
                  >
                    <Text style={[
                      styles.resendButtonText,
                      loading && styles.resendButtonTextDisabled
                    ]}>
                      {tr.resendOtp}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => {
                      setOtpSent(false);
                      setOtp('');
                      Keyboard.dismiss();
                    }}
                  >
                    <Text style={styles.changeNumberText}>{tr.changeNumber}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!otpSent && (!phoneNumber || phoneNumber.length !== 10)) ||
                (otpSent && otp.length !== 6)
                  ? styles.buttonDisabled
                  : null
              ]}
              onPress={otpSent ? handleVerifyOTP : handleSendOTP}
              disabled={
                loading ||
                (!otpSent && (!phoneNumber || phoneNumber.length !== 10)) ||
                (otpSent && otp.length !== 6)
              }
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {otpSent ? tr.verifyContinue : tr.sendOtp}
                </Text>
              )}
            </TouchableOpacity>

            {/* Terms and Conditions */}
            <Text style={styles.termsText}>
              {tr.terms}
            </Text>
          </View>

          {/* Help Section - Only show when keyboard is hidden */}
          {!keyboardVisible && (
            <View style={styles.helpSection}>
              <TouchableOpacity
                style={styles.helpButton}
                onPress={() => Alert.alert(
                  locale === 'hi' ? 'मदद' : 'Help', 
                  locale === 'hi' 
                    ? 'संपर्क करें: udyogitechnology@gmail.com\n\nफोन: +91 9137-532-150'
                    : 'Contact: udyogitechnology@gmail.com\n\nPhone: +91 9137-532-150'
                )}
                activeOpacity={0.7}
              >
                <Text style={styles.helpIcon}>?</Text>
                <View style={styles.helpTextContainer}>
                  <Text style={styles.helpTitle}>{tr.needHelp}</Text>
                  <Text style={styles.helpSubtitle}>{tr.contactSupport}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 10,
  },
  userTypeContainer: {
    marginTop: 8,
  },
  userTypeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  formSection: {
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  formHeader: {
    width: '100%',
    marginBottom: 32,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  phoneInputContainer: {
    width: '100%',
    marginBottom: 32,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 56,
  },
  countryCodeWrapper: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
    borderRightWidth: 1.5,
    borderRightColor: colors.border,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    minHeight: 56,
  },
  clearButton: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 18,
    color: colors.textMuted,
    opacity: 0.7,
  },
  userTypeToggleContainer: {
    width: '100%',
    alignItems: 'center',
  },
  userTypeToggleLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    fontWeight: '500',
  },
  userTypeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: 4,
    width: '100%',
    maxWidth: 280,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleOptionActive: {
    backgroundColor: colors.white,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  toggleOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  otpContainer: {
    width: '100%',
    marginBottom: 32,
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  otpInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
    marginBottom: 24,
  },
  otpInput: {
    width: 46,
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text,
  },
  otpInputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '20',
  },
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
  },
  changeNumberText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    letterSpacing: 0.5,
  },
  resendButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  resendButtonTextDisabled: {
    color: colors.gray400,
  },
  termsText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
    maxWidth: '90%',
    marginBottom: 16,
  },
  helpSection: {
    width: '100%',
    paddingHorizontal: 24,
    marginTop: 'auto',
    paddingBottom: 20,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helpIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.textSecondary,
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
    marginRight: 12,
  },
  helpTextContainer: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  helpSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
});