// src/screens/LoadingScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, BackHandler } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const DEV_BYPASS = false;

export default function LoadingScreen({ navigation }) {
  const { user, userProfile, loading: authLoading, bypassLogin } = useAuth();
  const { isLanguageSelected, loading: langLoading, changeLanguage } = useLanguage();
  const hasNavigated = useRef(false);

  // Block hardware back ONLY on this screen — there's nothing to go back to
  // from the loading/splash screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // DEV bypass (only when DEV_BYPASS = true)
  useEffect(() => {
    if (!DEV_BYPASS) return;
    if (!isLanguageSelected) {
      changeLanguage('en');
      return;
    }
    if (!userProfile || !userProfile.profileComplete) {
      console.log('🚀 DEV: Bypassing login as worker');
      bypassLogin('worker');
    }
  }, [DEV_BYPASS, isLanguageSelected, userProfile]);

  useEffect(() => {
    if (authLoading || langLoading) {
      console.log('🔄 Loading...', { authLoading, langLoading });
      return;
    }

    if (hasNavigated.current) return;

    if (!isLanguageSelected) {
      hasNavigated.current = true;
      navigation.replace('Language');
      return;
    }

    if (!user && !userProfile) {
      hasNavigated.current = true;
      navigation.replace('Welcome');
      return;
    }

    if (userProfile?.uid?.startsWith('dev-')) {
      hasNavigated.current = true;
      const mainScreen = userProfile.userType === 'employer' ? 'EmployerMain' : 'WorkerMain';
      navigation.replace(mainScreen);
      return;
    }

    if (userProfile && !userProfile.profileComplete) {
      hasNavigated.current = true;
      navigation.replace('ProfileSetup', {
        userType: userProfile.userType || 'worker',
        email:    userProfile.email || user?.email || '',
      });
      return;
    }

    if (userProfile && userProfile.profileComplete) {
      hasNavigated.current = true;
      const mainScreen = userProfile.userType === 'employer' ? 'EmployerMain' : 'WorkerMain';
      navigation.replace(mainScreen);
      return;
    }

    hasNavigated.current = true;
    navigation.replace('Welcome');
  }, [authLoading, langLoading, isLanguageSelected, user, userProfile]);

  // Reset guard when identity changes (e.g. after logout → re-login)
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
  container:  { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  logo:       { fontSize: 72, marginBottom: 16 },
  appName:    { fontSize: 36, fontWeight: '800', color: '#007AFF', marginBottom: 32, letterSpacing: 1 },
  spinner:    { marginBottom: 24 },
  tagline:    { fontSize: 14, color: '#999', fontStyle: 'italic' },
});