// src/screens/LoadingScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { colors } from '../constants/colors';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/UdyogiLogo.png')} // Adjust path to your logo
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>SkillConnect</Text>
        <Text style={styles.appTagline}>Connecting Skills & Opportunities</Text>
      </View>

      {/* Loading Indicator */}
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.white} />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Securely logging you in...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    maxWidth: 300,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: 16,
    marginTop: 20,
    opacity: 0.9,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
});