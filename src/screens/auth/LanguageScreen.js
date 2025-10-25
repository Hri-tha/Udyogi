// src/screens/auth/LanguageScreen.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';

const { width, height } = Dimensions.get('window');

export default function LanguageScreen({ navigation }) {
  const { changeLanguage, t } = useLanguage();

  const handleLanguageSelect = (language) => {
    changeLanguage(language);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#007AFF', '#0056CC']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>💼</Text>
          <Text style={styles.appName}>Udyogi</Text>
          <Text style={styles.appSubtitle}>
            Connect workers with opportunities.{'\n'}Build your future today.
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.title}>Select Your Language</Text>
        <Text style={styles.subtitle}>
          कृपया अपनी पसंदीदा भाषा चुनें / Please select your preferred language
        </Text>

        <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
          {/* Hindi Option */}
          <TouchableOpacity
            style={styles.languageCard}
            onPress={() => handleLanguageSelect('hi')}
          >
            <View style={styles.languageContent}>
              <Text style={styles.languageFlag}>🇮🇳</Text>
              <View style={styles.languageInfo}>
                <Text style={styles.languageName}>हिन्दी</Text>
                <Text style={styles.languageNameEnglish}>Hindi</Text>
              </View>
              <Text style={styles.selectArrow}>→</Text>
            </View>
          </TouchableOpacity>

          {/* English Option */}
          <TouchableOpacity
            style={styles.languageCard}
            onPress={() => handleLanguageSelect('en')}
          >
            <View style={styles.languageContent}>
              <Text style={styles.languageFlag}>🇺🇸</Text>
              <View style={styles.languageInfo}>
                <Text style={styles.languageName}>English</Text>
                <Text style={styles.languageNameEnglish}>अंग्रेजी</Text>
              </View>
              <Text style={styles.selectArrow}>→</Text>
            </View>
          </TouchableOpacity>

          {/* More languages coming soon */}
          <View style={[styles.languageCard, styles.comingSoonCard]}>
            <View style={styles.languageContent}>
              <Text style={styles.languageFlag}>🌍</Text>
              <View style={styles.languageInfo}>
                <Text style={styles.languageName}>More languages</Text>
                <Text style={styles.comingSoonText}>जल्द ही आ रहा है / Coming soon</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            आप बाद में सेटिंग्स में भाषा बदल सकते हैं{'\n'}
            You can change language later in settings
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  gradient: {
    height: height * 0.35,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  header: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 60,
    marginBottom: 15,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    flex: 1,
    padding: 25,
    paddingTop: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  languageList: {
    flex: 1,
  },
  languageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  comingSoonCard: {
    opacity: 0.6,
  },
  languageFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  languageNameEnglish: {
    fontSize: 14,
    color: '#666',
  },
  comingSoonText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  selectArrow: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});