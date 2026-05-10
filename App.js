// App.js – COMPLETE FIXED VERSION
// KEY FIX 1: SafeAreaProvider added so useSafeAreaInsets works in navigators
// KEY FIX 2: ToastProvider added so toast notifications work throughout the app
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet, Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Context Providers
import { LanguageProvider } from './src/context/LanguageContext';
import { AuthProvider } from './src/context/AuthContext';
import { JobProvider } from './src/context/JobContext';
import { NotificationProvider, useNotification } from './src/context/NotificationContext';

// Components
import NotificationSync from './src/components/NotificationSync';
import NotificationToast from './src/components/NotificationToast';
import { ToastProvider } from './src/components/Toast';

// Screens
import LoadingScreen from './src/screens/LoadingScreen';
import LanguageScreen from './src/screens/auth/LanguageScreen';
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import ProfileSetupScreen from './src/screens/auth/ProfileSetupScreen';

// Worker Screens
import WorkerHomeScreen from './src/screens/worker/WorkerHomeScreen';
import JobDetailsScreen from './src/screens/worker/JobDetailsScreen';
import LocationFilterScreen from './src/screens/worker/LocationFilterScreen';
import JobTrackingScreen from './src/screens/worker/JobTrackingScreen';

// Employer Screens
import EmployerHomeScreen from './src/screens/employer/EmployerHomeScreen';
import PostJobScreen from './src/screens/employer/PostJobScreen';
import ApplicationsScreen from './src/screens/employer/ApplicationsScreen';
import EmployerProfileScreen from './src/screens/employer/EmployerProfileScreen';
import PaymentProcessingScreen from './src/screens/employer/PaymentProcessingScreen';
import CompleteJobScreen from './src/screens/employer/CompleteJobScreen';
import EmployerJobTrackingScreen from './src/screens/employer/EmployerJobTrackingScreen';
import PlatformFeePaymentScreen from './src/screens/employer/PlatformFeePaymentScreen';
import PostJobSuccessScreen from './src/screens/employer/PostJobSuccessScreen';
import SubscriptionScreen from './src/screens/employer/SubscriptionScreen';

// Shared Screens
import JobLocationScreen from './src/screens/shared/JobLocationScreen';
import ChatScreen from './src/screens/shared/ChatScreen';
import NotificationsScreen from './src/screens/common/NotificationsScreen';

// ── NEW: Help & Support screen (shared by both employer and worker) ────────────
import HelpSupportScreen from './src/screens/common/HelpSupportScreen';

// Navigators
import WorkerBottomTabNavigator from './src/navigation/WorkerBottomTabNavigator';
import EmployerBottomTabNavigator from './src/navigation/EmployerBottomTabNavigator';

const Stack = createStackNavigator();

// ─── Splash Screen ────────────────────────────────────────────────────────────
function SplashScreen({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.splashContainer}>
      <Image
        source={require('./assets/Sls.png')}
        style={styles.splashImage}
        resizeMode="contain"
      />
    </View>
  );
}

// ─── App Stack Navigator ──────────────────────────────────────────────────────
function AppNavigator() {
  return (
    <>
      <NotificationSync />

      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
        }}
        initialRouteName="Loading">

        {/* Loading */}
        <Stack.Screen name="Loading" component={LoadingScreen} />

        {/* Auth */}
        <Stack.Screen name="Language" component={LanguageScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />

        {/* Worker */}
        <Stack.Screen name="WorkerMain" component={WorkerBottomTabNavigator} />
        <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
        <Stack.Screen name="JobTracking" component={JobTrackingScreen} />
        <Stack.Screen name="LocationFilter" component={LocationFilterScreen} />
        <Stack.Screen name="JobLocation" component={JobLocationScreen} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />

        {/* Employer */}
        <Stack.Screen name="EmployerMain" component={EmployerBottomTabNavigator} />
        <Stack.Screen name="PostJob" component={PostJobScreen} />
        <Stack.Screen name="Applications" component={ApplicationsScreen} />
        <Stack.Screen name="EmployerProfile" component={EmployerProfileScreen} />
        <Stack.Screen name="PaymentProcessing" component={PaymentProcessingScreen} />
        <Stack.Screen name="CompleteJob" component={CompleteJobScreen} />
        <Stack.Screen name="EmployerJobTracking" component={EmployerJobTrackingScreen} />
        <Stack.Screen name="PlatformFeePayment" component={PlatformFeePaymentScreen} />
        <Stack.Screen name="PostJobSuccess" component={PostJobSuccessScreen} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />

        {/* Common — accessible from both worker and employer profiles */}
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />

      </Stack.Navigator>
    </>
  );
}

// ─── App Wrapper ──────────────────────────────────────────────────────────────
function AppWrapper() {
  const { toastNotification, hideToast } = useNotification();

  return (
    <ToastProvider>
      <View style={styles.container}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>

        <NotificationToast
          notification={toastNotification}
          onHide={hideToast}
        />
      </View>
    </ToastProvider>
  );
}

// ─── Root App Component ───────────────────────────────────────────────────────
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [appInitialized, setAppInitialized] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAppInitialized(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <SafeAreaProvider>
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </SafeAreaProvider>
    );
  }

  if (!appInitialized) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <JobProvider>
            <NotificationProvider>
              <AppWrapper />
            </NotificationProvider>
          </JobProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashImage: {
    width: '80%',
    height: '80%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});