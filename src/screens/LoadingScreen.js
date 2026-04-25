import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const DEV_BYPASS = false;

export default function LoadingScreen({ navigation }) {
  const { user, userProfile, loading: authLoading, bypassLogin } = useAuth();
  const { isLanguageSelected, loading: langLoading, changeLanguage } = useLanguage();
  const hasNavigated = useRef(false);

  // Clear any cached dev user when normal login is enabled
  useEffect(() => {
    if (!DEV_BYPASS) {
      AsyncStorage.removeItem('current_user');
    }
  }, []);

  useEffect(() => {
    if (DEV_BYPASS) {
      if (!isLanguageSelected) {
        changeLanguage('en');
        return;
      }
      if (!userProfile || !userProfile.profileComplete) {
        console.log('🚀 DEV: Bypassing login as worker');
        bypassLogin('worker');
        return;
      }
    }

    if (authLoading || langLoading) {
      console.log('🔄 Loading...', { authLoading, langLoading });
      return;
    }

    if (hasNavigated.current) return;
    hasNavigated.current = true;

    if (!isLanguageSelected) {
      navigation.replace('Language');
      return;
    }

    if (!user && !userProfile) {
      navigation.replace('Welcome');
      return;
    }

    if (userProfile?.uid?.startsWith('dev-')) {
      const mainScreen = userProfile.userType === 'employer' ? 'EmployerMain' : 'WorkerMain';
      navigation.replace(mainScreen);
      return;
    }

    if (userProfile && !userProfile.profileComplete) {
      navigation.replace('ProfileSetup', {
        userType: userProfile.userType || 'worker',
        email: userProfile.email || user?.email || '',
      });
      return;
    }

    if (userProfile && userProfile.profileComplete) {
      const mainScreen = userProfile.userType === 'employer' ? 'EmployerMain' : 'WorkerMain';
      navigation.replace(mainScreen);
      return;
    }

    navigation.replace('Welcome');
  }, [authLoading, langLoading, isLanguageSelected, user, userProfile]);

  useEffect(() => {
    hasNavigated.current = false;
  }, [user?.uid, userProfile?.uid, isLanguageSelected]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>💼</Text>
      <Text style={styles.appName}>Udyogi</Text>
      <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
      <Text style={styles.tagline}>Connecting Skills & Opportunities</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  logo: { fontSize: 72, marginBottom: 16 },
  appName: { fontSize: 36, fontWeight: '800', color: '#007AFF', marginBottom: 32, letterSpacing: 1 },
  spinner: { marginBottom: 24 },
  tagline: { fontSize: 14, color: '#999', fontStyle: 'italic' },
});