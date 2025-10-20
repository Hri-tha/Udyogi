import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { JobProvider } from './src/context/JobContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Import Screens
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import ProfileSetupScreen from './src/screens/auth/ProfileSetupScreen';
import WorkerHomeScreen from './src/screens/worker/WorkerHomeScreen';
import JobDetailScreen from './src/screens/worker/JobDetailsScreen';
import MyJobScreen from './src/screens/worker/MyJobsScreen';
import WorkerProfileScreen from './src/screens/worker/WorkerProfileScreen';
import EmployerHomeScreen from './src/screens/employer/EmployerHomeScreen';
import PostJobScreen from './src/screens/employer/PostJobScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Auth Screens
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : !userProfile?.name ? (
          // Profile Setup
          <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        ) : userProfile?.userType === 'worker' ? (
          // Worker Screens
          <>
            <Stack.Screen name="WorkerHome" component={WorkerHomeScreen} />
            <Stack.Screen name="JobDetails" component={JobDetailScreen} />
            <Stack.Screen name="MyJobs" component={MyJobScreen} />
            <Stack.Screen name="WorkerProfile" component={WorkerProfileScreen} />
          </>
        ) : (
          // Employer Screens
          <>
            <Stack.Screen name="EmployerHome" component={EmployerHomeScreen} />
            <Stack.Screen name="PostJob" component={PostJobScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <JobProvider>
        <AppNavigator />
      </JobProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});