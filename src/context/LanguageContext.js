// src/context/LanguageContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create translations
const translations = {
  en: {
    login: {
      title: "Enter Mobile Number",
      titleOtp: "Enter Verification Code",
      subtitle: "We'll send you a one-time password (OTP) to verify your number",
      subtitleOtp: "We've sent a 6-digit code to +91 {phoneNumber}",
      phonePlaceholder: "99999 99999",
      sendOtp: "Send OTP",
      verifyContinue: "Verify & Continue",
      resendOtp: "↻ Resend OTP",
      changeNumber: "✏️ Change Number",
      continueAs: "Continue as",
      terms: "By continuing, you agree to our Terms of Service and Privacy Policy",
      needHelp: "Need help?",
      contactSupport: "Contact our support team",
      invalidNumber: "Invalid Number",
      invalidNumberMessage: "Please enter a valid 10-digit mobile number",
      invalidOtp: "Invalid OTP",
      invalidOtpMessage: "Please enter the 6-digit OTP",
      otpSentTitle: "OTP Sent",
      otpSentMessage: "Development Mode: OTP is",
      switchAccount: "Switch Account Type",
      switchMessage: "Are you sure you want to switch from {from} to {to} login?",
      switch: "Switch",
      cancel: "Cancel",
      verificationFailed: "Verification Failed",
      error: "Error",
      enterOtp: "Enter OTP",
      worker: "Worker",
      employer: "Employer",
      tapToSwitch: "Tap to switch"
    },
    welcome: {
      title: "Udyogi",
      subtitle: "Connect workers with opportunities.\nBuild your future today.",
      chooseRole: "Choose Your Role",
      selectRole: "Select how you want to get started",
      lookingForWork: "I'm Looking for Work",
      lookingForWorkDesc: "Find flexible jobs, earn money, and build your career",
      needWorkers: "I Need Workers", 
      needWorkersDesc: "Post jobs, hire skilled workers, and grow your business",
      trusted: "Trusted by thousands of workers and employers"
    },
    language: {
      selectLanguage: "Select Your Language",
      english: "English",
      hindi: "हिन्दी",
      continue: "Continue"
    },
    loading: {
      loadingProfile: "Loading your profile...",
      secureLogin: "Securely logging you in...",
      tagline: "Connecting Skills & Opportunities"
    },
    common: {
      loading: "Loading...",
      error: "Error",
      success: "Success",
      cancel: "Cancel",
      ok: "OK"
    }
  },
  hi: {
    login: {
      title: "मोबाइल नंबर दर्ज करें",
      titleOtp: "सत्यापन कोड दर्ज करें",
      subtitle: "हम आपके नंबर को सत्यापित करने के लिए एक वन-टाइम पासवर्ड (OTP) भेजेंगे",
      subtitleOtp: "हमने +91 {phoneNumber} पर 6-अंकीय कोड भेजा है",
      phonePlaceholder: "99999 99999",
      sendOtp: "OTP भेजें",
      verifyContinue: "सत्यापित करें और जारी रखें",
      resendOtp: "↻ OTP फिर से भेजें",
      changeNumber: "✏️ नंबर बदलें",
      continueAs: "के रूप में जारी रखें",
      terms: "जारी रखकर, आप हमारी सेवा की शर्तों और गोपनीयता नीति से सहमत होते हैं",
      needHelp: "मदद चाहिए?",
      contactSupport: "हमारी सहायता टीम से संपर्क करें",
      invalidNumber: "अमान्य नंबर",
      invalidNumberMessage: "कृपया एक वैध 10-अंकीय मोबाइल नंबर दर्ज करें",
      invalidOtp: "अमान्य OTP",
      invalidOtpMessage: "कृपया 6-अंकीय OTP दर्ज करें",
      otpSentTitle: "OTP भेजा गया",
      otpSentMessage: "डेवलपमेंट मोड: OTP है",
      switchAccount: "खाता प्रकार बदलें",
      switchMessage: "क्या आप वाकई {from} से {to} लॉगिन में बदलना चाहते हैं?",
      switch: "बदलें",
      cancel: "रद्द करें",
      verificationFailed: "सत्यापन विफल",
      error: "त्रुटि",
      enterOtp: "OTP दर्ज करें",
      worker: "मजदूर",
      employer: "नियोक्ता",
      tapToSwitch: "बदलने के लिए टैप करें"
    },
    welcome: {
      title: "उद्योगी",
      subtitle: "मजदूरों को अवसरों से जोड़ें।\nआज ही अपना भविष्य बनाएं।",
      chooseRole: "अपनी भूमिका चुनें",
      selectRole: "चुनें कि आप कैसे शुरुआत करना चाहते हैं",
      lookingForWork: "मुझे काम की तलाश है",
      lookingForWorkDesc: "लचीली नौकरियां ढूंढें, पैसा कमाएं और अपना करियर बनाएं",
      needWorkers: "मुझे मजदूर चाहिए",
      needWorkersDesc: "नौकरियां पोस्ट करें, कुशल कर्मचारियों को काम पर रखें और अपने व्यवसाय को बढ़ाएं",
      trusted: "हजारों मजदूरों और नियोक्ताओं द्वारा विश्वसनीय"
    },
    language: {
      selectLanguage: "अपनी भाषा चुनें",
      english: "अंग्रेजी",
      hindi: "हिन्दी",
      continue: "जारी रखें"
    },
    loading: {
      loadingProfile: "आपकी प्रोफाइल लोड हो रही है...",
      secureLogin: "सुरक्षित रूप से आपको लॉग इन कर रहे हैं...",
      tagline: "कौशल और अवसरों को जोड़ना"
    },
    common: {
      loading: "लोड हो रहा है...",
      error: "त्रुटि",
      success: "सफल",
      cancel: "रद्द करें",
      ok: "ठीक है"
    }
  }
};

const i18n = new I18n(translations);
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState('en');
  const [isLanguageSelected, setIsLanguageSelected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load saved language preference
  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('userLanguage');
      const languageSelected = await AsyncStorage.getItem('isLanguageSelected');

      if (savedLanguage) {
        setLocale(savedLanguage);
        i18n.locale = savedLanguage;
        setIsLanguageSelected(languageSelected === 'true');
      } else {
        setIsLanguageSelected(false);
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
      setIsLanguageSelected(false);
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = async (language) => {
    try {
      setLocale(language);
      i18n.locale = language;
      await AsyncStorage.setItem('userLanguage', language);
      await AsyncStorage.setItem('isLanguageSelected', 'true');
      setIsLanguageSelected(true);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const t = (key) => {
    return i18n.t(key) || key;
  };

  return (
    <LanguageContext.Provider value={{
      locale,
      changeLanguage,
      t,
      isLanguageSelected,
      loading
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};