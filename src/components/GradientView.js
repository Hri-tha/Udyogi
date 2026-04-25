// src/components/GradientView.js
// Universal gradient that works in BOTH Expo Go and bare React Native
// Uses expo-linear-gradient (works in Expo Go without native linking)
import React from 'react';
import { View, StyleSheet } from 'react-native';

// Try expo-linear-gradient first (works in Expo Go)
let LinearGradient = null;

try {
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch (e1) {
  try {
    LinearGradient = require('react-native-linear-gradient').default;
  } catch (e2) {
    LinearGradient = null;
  }
}

/**
 * Drop-in replacement for LinearGradient that works everywhere.
 * Usage: <GradientView colors={['#007AFF', '#0056CC']} style={styles.header}>
 */
export default function GradientView({ colors, style, children, start, end, ...props }) {
  if (LinearGradient) {
    return (
      <LinearGradient colors={colors} style={style} start={start} end={end} {...props}>
        {children}
      </LinearGradient>
    );
  }

  // Pure JS fallback: use the first color as background
  return (
    <View style={[style, { backgroundColor: colors?.[0] || '#007AFF' }]} {...props}>
      {children}
    </View>
  );
}