// src/context/LanguageContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create translations
const translations = {
  en: {
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
    common: {
      loading: "Loading...",
      error: "Error",
      success: "Success",
      cancel: "Cancel",
      ok: "OK"
    }
  },
  hi: {
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
        // For first time users, show language selection
        setIsLanguageSelected(false);
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
      // Set default values on error
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
    return i18n.t(key) || key; // Return key if translation not found
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