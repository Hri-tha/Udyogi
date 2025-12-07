// App.js – Updated Version with Platform Fee Payment Screen and PostJobSuccessScreen

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet, Text, Image } from 'react-native';

// Context Providers
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { JobProvider } from './src/context/JobContext';
import { NotificationProvider, useNotification } from './src/context/NotificationContext';
import NotificationToast from './src/components/NotificationToast';

// Screens - Auth
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import LanguageScreen from './src/screens/auth/LanguageScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import ProfileSetupScreen from './src/screens/auth/ProfileSetupScreen';

// Screens - Worker
import JobDetailsScreen from './src/screens/worker/JobDetailsScreen';
import LocationFilterScreen from './src/screens/worker/LocationFilterScreen';
import JobTrackingScreen from './src/screens/worker/JobTrackingScreen';

// Screens - Employer
import PostJobScreen from './src/screens/employer/PostJobScreen';
import ApplicationsScreen from './src/screens/employer/ApplicationsScreen';
import EmployerProfileScreen from './src/screens/employer/EmployerProfileScreen';
import PaymentProcessingScreen from './src/screens/employer/PaymentProcessingScreen';
import CompleteJobScreen from './src/screens/employer/CompleteJobScreen';
import EmployerJobTrackingScreen from './src/screens/employer/EmployerJobTrackingScreen';
import PlatformFeePaymentScreen from './src/screens/employer/PlatformFeePaymentScreen';
import PostJobSuccessScreen from './src/screens/employer/PostJobSuccessScreen';

// Screens - Shared
import JobLocationScreen from './src/screens/shared/JobLocationScreen';
import ChatScreen from './src/screens/shared/ChatScreen';
import NotificationsScreen from './src/screens/common/NotificationsScreen';

// Navigators
import WorkerBottomTabNavigator from './src/navigation/WorkerBottomTabNavigator';
import EmployerBottomTabNavigator from './src/navigation/EmployerBottomTabNavigator';

// Components
import JobTrackingBanner from './src/components/JobTrackingBanner';
import EmployerJobTrackingBanner from './src/components/EmployerJobTrackingBanner';

const Stack = createStackNavigator();

// Splash Screen Component
function SplashScreen({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.splashContainer}>
      <Image
        source={require('./assets/Sls.png')}
        style={styles.splashImage}
        resizeMode="cover"
      />
    </View>
  );
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const { user, userProfile, loading: authLoading } = useAuth();
  const { isLanguageSelected, loading: languageLoading } = useLanguage();
  const { toastNotification, hideToast } = useNotification();

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Show loading spinner while initializing language & auth
  if (authLoading || languageLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* 1️⃣ Show Language Selection for first-time users */}
        {!isLanguageSelected ? (
          <Stack.Screen name="Language" component={LanguageScreen} />

        // 2️⃣ If language selected but no user logged in
        ) : !user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>

        // 3️⃣ If user logged in but no profile set up
        ) : !userProfile?.name ? (
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />

        // 4️⃣ Worker User Flow
        ) : userProfile?.userType === 'worker' ? (
          <>
            <Stack.Screen name="WorkerMain" component={WorkerBottomTabNavigator} />
            <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
            <Stack.Screen name="JobTracking" component={JobTrackingScreen} />
            <Stack.Screen name="LocationFilter" component={LocationFilterScreen} />
            <Stack.Screen name="JobLocation" component={JobLocationScreen} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
          </>

        // 5️⃣ Employer User Flow
        ) : (
          <>
            <Stack.Screen name="EmployerMain" component={EmployerBottomTabNavigator} />
            <Stack.Screen name="PostJob" component={PostJobScreen} />
            <Stack.Screen name="Applications" component={ApplicationsScreen} />
            <Stack.Screen name="EmployerProfile" component={EmployerProfileScreen} />
            <Stack.Screen name="PaymentProcessing" component={PaymentProcessingScreen} />
            <Stack.Screen name="CompleteJob" component={CompleteJobScreen} />
            <Stack.Screen name="EmployerJobTracking" component={EmployerJobTrackingScreen} />
            <Stack.Screen name="PlatformFeePayment" component={PlatformFeePaymentScreen} />
            <Stack.Screen name="PostJobSuccess" component={PostJobSuccessScreen} />
            <Stack.Screen name="JobLocation" component={JobLocationScreen} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
          </>
        )}
      </Stack.Navigator>

      {/* Global Job Tracking Banner - Only for Workers */}
      {user && userProfile?.userType === 'worker' && (
        <JobTrackingBanner />
      )}

      {/* Global Employer Job Tracking Banner - Only for Employers */}
      {user && userProfile?.userType === 'employer' && (
        <EmployerJobTrackingBanner />
      )}

      <NotificationToast
        notification={toastNotification}
        onHide={hideToast}
        onPress={(notification) => {
          hideToast();
        }}
      />
    </>
  );
}

// ✅ Main App with all Providers (correct order)
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

// Styles
const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  splashImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
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