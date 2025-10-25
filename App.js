// App.js - Corrected Version (Language screen only once)
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { JobProvider } from './src/context/JobContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';

// Import Screens
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import LanguageScreen from './src/screens/auth/LanguageScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import ProfileSetupScreen from './src/screens/auth/ProfileSetupScreen';
import JobDetailScreen from './src/screens/worker/JobDetailsScreen';
import LocationFilterScreen from './src/screens/worker/LocationFilterScreen';
import ApplicationsScreen from './src/screens/employer/ApplicationsScreen';
import NotificationsScreen from './src/screens/common/NotificationsScreen';
import PostJobScreen from './src/screens/employer/PostJobScreen';
import EmployerProfileScreen from './src/screens/employer/EmployerProfileScreen';

// Import Bottom Tab Navigators
import WorkerBottomTabNavigator from './src/navigation/WorkerBottomTabNavigator';
import EmployerBottomTabNavigator from './src/navigation/EmployerBottomTabNavigator';

const Stack = createStackNavigator();

function AppContent() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { isLanguageSelected, loading: languageLoading } = useLanguage();

  // Show loading while checking auth and language status
  if (authLoading || languageLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLanguageSelected ? (
        // Language Selection Screen (First time users only)
        <Stack.Screen name="Language" component={LanguageScreen} />
      ) : !user ? (
        // Auth Screens (After language selection, no user logged in)
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
        </>
      ) : !userProfile?.name ? (
        // Profile Setup (User logged in but no profile)
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      ) : userProfile?.userType === 'worker' ? (
        // Worker Screens (Worker with complete profile)
        <>
          <Stack.Screen name="WorkerMain" component={WorkerBottomTabNavigator} />
          <Stack.Screen name="JobDetails" component={JobDetailScreen} />
          <Stack.Screen name="LocationFilter" component={LocationFilterScreen} />
        </>
      ) : (
        // Employer Screens (Employer with complete profile)
        <>
          <Stack.Screen name="EmployerMain" component={EmployerBottomTabNavigator} />
          <Stack.Screen name="PostJob" component={PostJobScreen} />
          <Stack.Screen name="Applications" component={ApplicationsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

// Main App component with all providers
export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <JobProvider>
          <NotificationProvider>
            <NavigationContainer>
              <AppContent />
            </NavigationContainer>
          </NotificationProvider>
        </JobProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});