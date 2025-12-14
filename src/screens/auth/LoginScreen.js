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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const otpInputRefs = useRef([]);

  const translations = {
    en: {
      title: otpSent ? 'Enter Verification Code' : 'Welcome Back',
      subtitle: otpSent 
        ? `We've sent a 6-digit code to +91 ${phoneNumber}`
        : 'Enter your mobile number to continue',
      phonePlaceholder: 'Enter mobile number',
      sendOtp: 'Send OTP',
      verifyContinue: 'Verify & Continue',
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
      orContinueAs: 'Or continue as'
    },
    hi: {
      title: otpSent ? 'सत्यापन कोड दर्ज करें' : 'वापसी पर स्वागत है',
      subtitle: otpSent 
        ? `हमने +91 ${phoneNumber} पर 6-अंकीय कोड भेजा है`
        : 'जारी रखने के लिए अपना मोबाइल नंबर दर्ज करें',
      phonePlaceholder: 'मोबाइल नंबर दर्ज करें',
      sendOtp: 'OTP भेजें',
      verifyContinue: 'सत्यापित करें और जारी रखें',
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
      orContinueAs: 'या के रूप में जारी रखें'
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
    Alert.alert(
      tr.switchAccount,
      tr.switchMessage,
      [
        {
          text: tr.cancel,
          style: 'cancel'
        },
        {
          text: tr.switch,
          onPress: () => {
            setPhoneNumber('');
            setOtp('');
            setOtpSent(false);

            const oppositeUserType = userType === 'worker' ? 'employer' : 'worker';

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
          {/* Logo and App Name Section */}
          <View style={styles.logoSection}>
            <Image 
              source={require('../../assets/images/UdyogiLogo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.welcomeText}>{tr.welcome}</Text>
            <Text style={styles.appName}>{tr.appName}</Text>
            <Text style={styles.tagline}>
              {userType === 'worker' 
                ? (locale === 'hi' ? 'नौकरी खोजें, आगे बढ़ें' : 'Find Jobs, Grow Forward')
                : (locale === 'hi' ? 'प्रतिभा खोजें, व्यवसाय बढ़ाएं' : 'Find Talent, Grow Business')
              }
            </Text>
          </View>

          {/* Main Form Section */}
          <View style={styles.formSection}>
            {/* User Type Badge */}
            <TouchableOpacity
              style={[
                styles.userTypeBadge,
                userType === 'worker' ? styles.workerBadge : styles.employerBadge
              ]}
              onPress={handleSwitchUserType}
              activeOpacity={0.7}
            >
              <View style={styles.badgeContent}>
                <Text style={styles.badgeIcon}>
                  {userType === 'worker' ? '👷' : '💼'}
                </Text>
                <View style={styles.badgeTextContainer}>
                  <Text style={styles.badgeTitle}>
                    {userType === 'worker' ? tr.worker : tr.employer}
                  </Text>
                  <Text style={styles.badgeSubtitle}>{tr.tapToSwitch}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.formHeader}>
              <Text style={styles.title}>{tr.title}</Text>
              <Text style={styles.subtitle}>{tr.subtitle}</Text>
            </View>

            {!otpSent ? (
              <Animated.View style={[styles.inputContainer, { transform: [{ translateX: shakeAnim }] }]}>
                <View style={styles.phoneInputWrapper}>
                  <View style={styles.countryCodeWrapper}>
                    <Text style={styles.countryCode}>🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder={tr.phonePlaceholder}
                    placeholderTextColor={colors.textPlaceholder}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    editable={!loading}
                    autoFocus={!keyboardVisible}
                    selectionColor={colors.primary}
                  />
                </View>
              </Animated.View>
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
                {otpSent && (
                  <TouchableOpacity
                    onPress={() => {
                      setOtpSent(false);
                      setOtp('');
                      Keyboard.dismiss();
                    }}
                    style={styles.changeNumberButton}
                  >
                    <Text style={styles.changeNumberText}>✏️ {tr.changeNumber}</Text>
                  </TouchableOpacity>
                )}
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

            {otpSent && (
              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>
                  {locale === 'hi' ? 'कोड नहीं मिला?' : "Didn't receive code?"}
                </Text>
                <TouchableOpacity onPress={handleResendOTP} disabled={loading}>
                  <Text style={[
                    styles.resendButtonText,
                    loading && styles.resendButtonTextDisabled
                  ]}>
                    {tr.resendOtp}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Switch User Type Option */}
            {!otpSent && !keyboardVisible && (
              <View style={styles.switchTypeContainer}>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>{tr.orContinueAs}</Text>
                  <View style={styles.dividerLine} />
                </View>
                <TouchableOpacity
                  style={styles.switchTypeButton}
                  onPress={handleSwitchUserType}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.switchTypeIcon}>
                    {userType === 'worker' ? '💼' : '👷'}
                  </Text>
                  <Text style={styles.switchTypeText}>
                    {userType === 'worker' ? tr.employer : tr.worker}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Terms and Conditions */}
            <Text style={styles.termsText}>
              {tr.terms}
            </Text>
          </View>

          {/* Help Section */}
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  tagline: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 20,
  },
  formSection: {
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  userTypeBadge: {
    width: '100%',
    maxWidth: 200,
    borderRadius: 20,
    marginBottom: 32,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workerBadge: {
    backgroundColor: colors.warningLight,
    borderWidth: 1.5,
    borderColor: colors.warning,
  },
  employerBadge: {
    backgroundColor: colors.secondaryLight,
    borderWidth: 1.5,
    borderColor: colors.secondary,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  badgeTextContainer: {
    alignItems: 'center',
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  badgeSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  formHeader: {
    width: '100%',
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '90%',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
    height: 60,
  },
  countryCodeWrapper: {
    paddingHorizontal: 20,
    height: '100%',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
    borderRightWidth: 2,
    borderRightColor: colors.border,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 20,
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
    letterSpacing: 0.5,
  },
  otpContainer: {
    width: '100%',
    marginBottom: 24,
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
    maxWidth: 320,
    marginBottom: 20,
  },
  otpInput: {
    width: 50,
    height: 60,
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
  changeNumberButton: {
    marginTop: 16,
  },
  changeNumberText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: colors.gray400,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  resendText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 8,
  },
  resendButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  resendButtonTextDisabled: {
    color: colors.gray400,
  },
  switchTypeContainer: {
    width: '100%',
    marginBottom: 32,
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.textMuted,
  },
  switchTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 1.5,
    borderColor: colors.border,
    width: '100%',
    maxWidth: 280,
  },
  switchTypeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  switchTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  termsText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: '90%',
  },
  helpSection: {
    width: '100%',
    paddingHorizontal: 24,
    marginTop: 'auto',
    paddingTop: 32,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.info,
  },
  helpIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.info,
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 16,
  },
  helpTextContainer: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  helpSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
});