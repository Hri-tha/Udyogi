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
  Image,
} from 'react-native';
import GradientView from '../../components/GradientView';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import { useLanguage } from '../../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';

const { width, height } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  brand:        '#1A6BFF',
  brandDark:    '#0D4FCC',
  brandLight:   '#E8F0FF',
  brandMid:     '#4D8DFF',
  surface:      '#FFFFFF',
  bg:           '#F4F7FF',
  text:         '#0D1B3E',
  textSub:      '#5A6B8A',
  textMuted:    '#9AAABB',
  border:       '#DDE4F0',
  borderFocus:  '#1A6BFF',
  error:        '#E53935',
  errorBg:      '#FFF0F0',
  devOrange:    '#FF6D00',
  devOrangeDark:'#E65100',
  white:        '#FFFFFF',
  shadow:       'rgba(26, 107, 255, 0.15)',
};

export default function LoginScreen({ navigation, route }) {
  const { userType = 'worker' } = route.params || {};
  const { locale } = useLanguage();
  const { signInWithCustomToken, bypassLogin } = useAuth();

  const [email, setEmail]               = useState('');
  const [otp, setOtp]                   = useState('');
  const [loading, setLoading]           = useState(false);
  const [otpSent, setOtpSent]           = useState(false);
  const [resendTimer, setResendTimer]   = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  const otpInputRefs = useRef([]);
  const emailInputRef = useRef(null);
  const timerRef = useRef(null);

  const tr = ({
    en: {
      title:               otpSent ? 'Check your inbox' : 'Sign in',
      subtitle:            otpSent ? `We sent a 6-digit code to` : 'Enter your email to continue',
      emailPlaceholder:    'you@example.com',
      sendOtp:             'Send verification code',
      verifyContinue:      'Verify & continue',
      resendOtp:           'Resend code',
      resendIn:            'Resend in',
      seconds:             's',
      changeEmail:         'Use a different email',
      terms:               'By continuing you agree to our Terms & Privacy Policy',
      needHelp:            'Need help?',
      contactSupport:      'Contact support',
      invalidEmailMessage: 'Please enter a valid email address',
      invalidOtpMessage:   'Please enter the 6-digit code',
      otpSentTitle:        'Code sent!',
      otpSentMessage:      'Check your inbox for the verification code',
      enterOtp:            'Enter the 6-digit code',
      worker:              'Worker',
      employer:            'Employer',
      signingIn:           'Signing you in…',
    },
    hi: {
      title:               otpSent ? 'इनबॉक्स जांचें' : 'साइन इन करें',
      subtitle:            otpSent ? `हमने 6-अंकीय कोड भेजा है` : 'जारी रखने के लिए ईमेल दर्ज करें',
      emailPlaceholder:    'आपका@ईमेल.com',
      sendOtp:             'सत्यापन कोड भेजें',
      verifyContinue:      'सत्यापित करें और जारी रखें',
      resendOtp:           'कोड फिर भेजें',
      resendIn:            'फिर भेजें',
      seconds:             'से',
      changeEmail:         'दूसरा ईमेल उपयोग करें',
      terms:               'जारी रखकर आप हमारे नियम और गोपनीयता नीति से सहमत हैं',
      needHelp:            'मदद चाहिए?',
      contactSupport:      'सहायता से संपर्क करें',
      invalidEmailMessage: 'कृपया वैध ईमेल पता दर्ज करें',
      invalidOtpMessage:   'कृपया 6-अंकीय कोड दर्ज करें',
      otpSentTitle:        'कोड भेजा गया!',
      otpSentMessage:      'सत्यापन कोड के लिए इनबॉक्स देखें',
      enterOtp:            '6-अंकीय कोड दर्ज करें',
      worker:              'मजदूर',
      employer:            'नियोक्ता',
      signingIn:           'साइन इन हो रहा है…',
    },
  }[locale] || {});

  // ── Mount animation ────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1,    duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0,    duration: 600, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
    ]).start();

    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    AsyncStorage.getItem('last_used_email')
      .then(saved => { if (saved) setEmail(saved); })
      .catch(() => {});

    return () => {
      show.remove();
      hide.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDevBypass = async () => {
    try {
      const result = await bypassLogin(userType);
      if (result.success) {
        navigation.replace(userType === 'worker' ? 'WorkerMain' : 'EmployerMain');
      }
    } catch {
      navigation.replace(userType === 'worker' ? 'WorkerMain' : 'EmployerMain');
    }
  };

  const handleSendOTP = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage(tr.invalidEmailMessage);
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      await AsyncStorage.setItem('last_used_email', email);
      const result = await authService.sendOTP(email);
      if (result.success) {
        setOtpSent(true);
        startResendTimer();
        setTimeout(() => Alert.alert(tr.otpSentTitle, tr.otpSentMessage), 300);
        setOtp('');
        otpInputRefs.current.forEach(ref => ref?.clear());
      } else {
        setErrorMessage(result.error || 'Failed to send verification code');
      }
    } catch (error) {
      setErrorMessage(error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setErrorMessage(tr.invalidOtpMessage);
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const result = await authService.verifyOTP(email, otp, userType);
      if (result.success && result.customToken) {
        const signInResult = await signInWithCustomToken(result.customToken);
        if (signInResult.success) {
          await AsyncStorage.setItem('current_user', JSON.stringify({
            uid: result.uid, email: result.email,
            userType: result.userType, isNewUser: result.isNewUser,
            needsProfile: result.needsProfile, emailVerified: true,
          }));
          if (result.needsProfile || result.isNewUser) {
            navigation.replace('ProfileSetup', { userType: result.userType, email: result.email });
          } else {
            navigation.replace(result.userType === 'worker' ? 'WorkerMain' : 'EmployerMain');
          }
        } else {
          setErrorMessage('Failed to sign in');
        }
      } else {
        setErrorMessage(result.error || 'Verification failed');
      }
    } catch (error) {
      setErrorMessage(error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const startResendTimer = () => {
    setResendTimer(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (text, index) => {
    const arr = otp.split('');
    arr[index] = text;
    const next = arr.join('');
    setOtp(next);
    if (text && index < 5) otpInputRefs.current[index + 1]?.focus();
    if (next.length === 6 && index === 5) setTimeout(handleVerifyOTP, 300);
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderRoleBadge = () => (
    <View style={styles.roleBadge}>
      <Text style={styles.roleBadgeIcon}>{userType === 'worker' ? '👷' : '🏭'}</Text>
      <Text style={styles.roleBadgeText}>
        {userType === 'worker' ? tr.worker : tr.employer}
      </Text>
    </View>
  );

  const renderDevBypass = () => (
    <Animatable.View animation="fadeInDown" duration={500} delay={100} style={styles.devCard}>
      <View style={styles.devCardHeader}>
        <View style={styles.devBadge}>
          <Text style={styles.devBadgeText}>DEV</Text>
        </View>
        <Text style={styles.devCardTitle}>Developer bypass</Text>
      </View>
      <Text style={styles.devCardSub}>Harsh Kumar · dev@udyogi.com · 9999999999</Text>
      <TouchableOpacity style={styles.devButton} onPress={handleDevBypass} activeOpacity={0.85}>
        <Text style={styles.devButtonIcon}>{userType === 'worker' ? '👷' : '🏭'}</Text>
        <Text style={styles.devButtonText}>
          Continue as {userType === 'worker' ? 'Worker' : 'Employer'}
        </Text>
        <Text style={styles.devButtonArrow}>→</Text>
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderDivider = () => (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>or sign in with email</Text>
      <View style={styles.dividerLine} />
    </View>
  );

  const renderEmailStep = () => (
    <Animatable.View animation="fadeInUp" duration={500} delay={100}>
      {/* Label */}
      <Text style={styles.fieldLabel}>Email address</Text>

      {/* Input */}
      <View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused, !!errorMessage && styles.inputWrapperError]}>
        <Text style={styles.inputIcon}>✉️</Text>
        <TextInput
          ref={emailInputRef}
          style={styles.textInput}
          placeholder={tr.emailPlaceholder}
          placeholderTextColor={C.textMuted}
          value={email}
          onChangeText={t => { setEmail(t); setErrorMessage(''); }}
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          editable={!loading}
          returnKeyType="done"
          onSubmitEditing={handleSendOTP}
        />
        {email.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => { setEmail(''); setErrorMessage(''); emailInputRef.current?.focus(); }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error */}
      {!!errorMessage && (
        <Animatable.View animation="fadeInDown" duration={250} style={styles.errorRow}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </Animatable.View>
      )}

      {/* CTA */}
      <TouchableOpacity
        style={[styles.primaryBtn, (!email || loading) && styles.primaryBtnDisabled]}
        onPress={handleSendOTP}
        disabled={!email || loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={C.white} size="small" />
        ) : (
          <Text style={styles.primaryBtnText}>{tr.sendOtp}</Text>
        )}
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderOtpStep = () => (
    <Animatable.View animation="fadeInUp" duration={500}>
      {/* Destination label */}
      <View style={styles.otpDestinationRow}>
        <Text style={styles.otpDestinationText}>{tr.subtitle}</Text>
        <Text style={styles.otpEmail}>{email}</Text>
      </View>

      {/* OTP boxes */}
      <Text style={styles.fieldLabel}>{tr.enterOtp}</Text>
      <View style={styles.otpBoxRow}>
        {[0,1,2,3,4,5].map(i => (
          <TextInput
            key={i}
            ref={r => (otpInputRefs.current[i] = r)}
            style={[
              styles.otpBox,
              otp[i] && styles.otpBoxFilled,
              !!errorMessage && styles.otpBoxError,
            ]}
            value={otp[i] || ''}
            onChangeText={t => handleOtpChange(t, i)}
            onKeyPress={e => handleOtpKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            caretHidden
          />
        ))}
      </View>

      {/* Error */}
      {!!errorMessage && (
        <Animatable.View animation="fadeInDown" duration={250} style={styles.errorRow}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </Animatable.View>
      )}

      {/* Verify CTA */}
      <TouchableOpacity
        style={[styles.primaryBtn, (otp.length !== 6 || loading) && styles.primaryBtnDisabled]}
        onPress={handleVerifyOTP}
        disabled={otp.length !== 6 || loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <>
            <ActivityIndicator color={C.white} size="small" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>{tr.signingIn}</Text>
          </>
        ) : (
          <Text style={styles.primaryBtnText}>{tr.verifyContinue}</Text>
        )}
      </TouchableOpacity>

      {/* Resend / change email */}
      <View style={styles.otpFooterRow}>
        {resendTimer > 0 ? (
          <Text style={styles.resendCountdown}>
            {tr.resendIn} <Text style={styles.resendCountdownBold}>{resendTimer}{tr.seconds}</Text>
          </Text>
        ) : (
          <TouchableOpacity onPress={handleSendOTP} disabled={loading} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
            <Text style={styles.resendLink}>{tr.resendOtp}</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.otpFooterDot}>·</Text>
        <TouchableOpacity
          onPress={() => { setOtpSent(false); setErrorMessage(''); setOtp(''); }}
          hitSlop={{ top:8,bottom:8,left:8,right:8 }}
        >
          <Text style={styles.changeEmailLink}>{tr.changeEmail}</Text>
        </TouchableOpacity>
      </View>
    </Animatable.View>
  );

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.brandDark} />

      {/* ── Header gradient ──────────────────────────────────────────────── */}
      <GradientView
        colors={[C.brandDark, C.brand]}
        style={[styles.header, keyboardVisible && styles.headerCollapsed]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative circles */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        <View style={styles.headerInner}>
          <Image
            source={require('../../assets/images/UdyogiLogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          {!keyboardVisible && (
            <Text style={styles.tagline}>Connecting Talent with Opportunity</Text>
          )}
        </View>
      </GradientView>

      {/* ── Scrollable card body ──────────────────────────────────────────── */}
      {/* On Android, behavior="height" collapses the view and blocks input taps.
          We use undefined behavior on Android and let ScrollView handle it. */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        enabled={Platform.OS === 'ios'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            {/* Role badge */}
            {renderRoleBadge()}

            {/* Page heading */}
            <Text style={styles.cardTitle}>{tr.title}</Text>
            {!otpSent && (
              <Text style={styles.cardSubtitle}>{tr.subtitle}</Text>
            )}

            {/* ── DEV BYPASS section ──────────────────────────────────── */}
            {renderDevBypass()}
            {renderDivider()}

            {/* ── Auth form ───────────────────────────────────────────── */}
            {otpSent ? renderOtpStep() : renderEmailStep()}

            {/* Terms */}
            <Text style={styles.terms}>{tr.terms}</Text>
          </Animated.View>

          {/* ── Help footer ─────────────────────────────────────────────── */}
          {!keyboardVisible && (
            <TouchableOpacity
              style={styles.helpRow}
              activeOpacity={0.7}
              onPress={() =>
                Alert.alert(
                  locale === 'hi' ? 'मदद' : 'Help',
                  'Email: udyogitechnology@gmail.com\nPhone: +91 9137-532-150'
                )
              }
            >
              <Text style={styles.helpText}>
                {tr.needHelp}{' '}
                <Text style={styles.helpLink}>{tr.contactSupport} →</Text>
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.bg },
  flex:  { flex: 1 },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    height: height * 0.26,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  headerCollapsed: {
    height: height * 0.14,
  },
  headerInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.52,
    height: 52,
    tintColor: '#FFFFFF',
  },
  tagline: {
    marginTop: 8,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
  // Decorative background circles
  decorCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -40,
    right: -40,
  },
  decorCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -30,
    left: 20,
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120, // extra space so inputs scroll above keyboard on Android
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 24,
    marginTop: -24,              // pull up over header gradient
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 12,
    zIndex: 10,                  // ensure card sits above gradient on Android
  },

  // ── Role badge ────────────────────────────────────────────────────────────
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: C.brandLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    marginBottom: 20,
  },
  roleBadgeIcon: { fontSize: 16, marginRight: 6 },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.brand,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Card heading
  cardTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 15,
    color: C.textSub,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },

  // ── DEV Bypass card ───────────────────────────────────────────────────────
  devCard: {
    backgroundColor: '#FFF8F0',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFD599',
    padding: 16,
    marginBottom: 20,
  },
  devCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  devBadge: {
    backgroundColor: C.devOrange,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 8,
  },
  devBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: C.white,
    letterSpacing: 1,
  },
  devCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.devOrangeDark,
  },
  devCardSub: {
    fontSize: 12,
    color: '#A0622A',
    marginBottom: 12,
    lineHeight: 18,
  },
  devButton: {
    backgroundColor: C.devOrange,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  devButtonIcon:  { fontSize: 18, marginRight: 10 },
  devButtonText:  { flex: 1, fontSize: 15, fontWeight: '700', color: C.white },
  devButtonArrow: { fontSize: 18, color: C.white, opacity: 0.8 },

  // ── Divider ───────────────────────────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '500',
  },

  // ── Form fields ───────────────────────────────────────────────────────────
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textSub,
    marginBottom: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: C.bg,
    paddingHorizontal: 14,
    height: 56,
    marginBottom: 6,
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    borderColor: C.borderFocus,
    backgroundColor: '#F0F5FF',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputWrapperError: {
    borderColor: C.error,
    backgroundColor: C.errorBg,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: C.text,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearBtn: {
    paddingLeft: 10,
    paddingVertical: 6,
  },
  clearBtnText: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: '700',
  },

  // ── Error ─────────────────────────────────────────────────────────────────
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.errorBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorIcon: { fontSize: 14, marginRight: 8 },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: C.error,
    fontWeight: '500',
    lineHeight: 18,
  },

  // ── Primary button ────────────────────────────────────────────────────────
  primaryBtn: {
    backgroundColor: C.brand,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 6,
    shadowColor: C.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnDisabled: {
    backgroundColor: '#C0CCDD',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 0.3,
  },

  // ── OTP step ──────────────────────────────────────────────────────────────
  otpDestinationRow: {
    alignItems: 'center',
    marginBottom: 22,
    backgroundColor: C.brandLight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  otpDestinationText: {
    fontSize: 13,
    color: C.textSub,
    marginBottom: 3,
  },
  otpEmail: {
    fontSize: 15,
    fontWeight: '700',
    color: C.brand,
  },
  otpBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  otpBox: {
    width: (width - 32 - 48 - 10 * 5) / 6,   // full width minus card padding minus gaps
    aspectRatio: 0.9,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: C.text,
  },
  otpBoxFilled: {
    borderColor: C.brand,
    backgroundColor: C.brandLight,
    color: C.brand,
  },
  otpBoxError: {
    borderColor: C.error,
    backgroundColor: C.errorBg,
  },
  otpFooterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  otpFooterDot:        { color: C.textMuted, fontSize: 16 },
  resendCountdown:     { fontSize: 14, color: C.textSub },
  resendCountdownBold: { fontWeight: '700', color: C.brand },
  resendLink:          { fontSize: 14, color: C.brand, fontWeight: '700' },
  changeEmailLink:     { fontSize: 14, color: C.textSub, fontWeight: '600' },

  // ── Terms & help ──────────────────────────────────────────────────────────
  terms: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 20,
    paddingHorizontal: 8,
  },
  helpRow: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  helpText:  { fontSize: 14, color: C.textSub },
  helpLink:  { color: C.brand, fontWeight: '700' },
});