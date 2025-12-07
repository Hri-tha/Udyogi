// src/navigation/EmployerBottomTabNavigator.js - COMPLETE UPDATED
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text } from 'react-native';
import EmployerHomeScreen from '../screens/employer/EmployerHomeScreen';
import PostJobScreen from '../screens/employer/PostJobScreen';
import ApplicationsScreen from '../screens/employer/ApplicationsScreen';
import EmployerProfileScreen from '../screens/employer/EmployerProfileScreen';
import NotificationsScreen from '../screens/common/NotificationsScreen';
import EmployerJobTrackingScreen from '../screens/employer/EmployerJobTrackingScreen';
import PaymentProcessingScreen from '../screens/employer/PaymentProcessingScreen';
import CompleteJobScreen from '../screens/employer/CompleteJobScreen';
import PlatformFeePaymentScreen from '../screens/employer/PlatformFeePaymentScreen';
import PostJobSuccessScreen from '../screens/employer/PostJobSuccessScreen';
import { colors } from '../constants/colors';

// Import the employer banner
import EmployerJobTrackingBanner from '../components/EmployerJobTrackingBanner';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Simple icon component
const TabIcon = ({ name, focused }) => {
  const getIconChar = (iconName) => {
    const iconMap = {
      'home': '🏠',
      'post-job': '📤',
      'applications': '📄',
      'notifications': '🔔',
      'profile': '👤',
    };
    return iconMap[iconName] || '❓';
  };

  return (
    <Text style={{
      fontSize: 24,
      color: focused ? colors.primary : colors.textSecondary,
    }}>
      {getIconChar(name)}
    </Text>
  );
};

// Home Stack Navigator
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployerHomeMain" component={EmployerHomeScreen} />
      <Stack.Screen name="PlatformFeePayment" component={PlatformFeePaymentScreen} />
      <Stack.Screen name="PostJobSuccess" component={PostJobSuccessScreen} />
      <Stack.Screen name="EmployerJobTracking" component={EmployerJobTrackingScreen} />
      <Stack.Screen name="PaymentProcessing" component={PaymentProcessingScreen} />
      <Stack.Screen name="CompleteJob" component={CompleteJobScreen} />
    </Stack.Navigator>
  );
}

// Post Job Stack Navigator
function PostJobStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PostJobMain" component={PostJobScreen} />
      <Stack.Screen name="PlatformFeePayment" component={PlatformFeePaymentScreen} />
      <Stack.Screen name="PostJobSuccess" component={PostJobSuccessScreen} />
      <Stack.Screen name="PaymentProcessing" component={PaymentProcessingScreen} />
    </Stack.Navigator>
  );
}

// Applications Stack Navigator
function ApplicationsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ApplicationsMain" component={ApplicationsScreen} />
      <Stack.Screen name="EmployerJobTracking" component={EmployerJobTrackingScreen} />
      <Stack.Screen name="PaymentProcessing" component={PaymentProcessingScreen} />
      <Stack.Screen name="CompleteJob" component={CompleteJobScreen} />
      <Stack.Screen name="PlatformFeePayment" component={PlatformFeePaymentScreen} />
    </Stack.Navigator>
  );
}

// Profile Stack Navigator
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployerProfileMain" component={EmployerProfileScreen} />
      <Stack.Screen name="PlatformFeePayment" component={PlatformFeePaymentScreen} />
    </Stack.Navigator>
  );
}

// Notifications Stack Navigator
function NotificationsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NotificationsMain" component={NotificationsScreen} />
      <Stack.Screen name="Applications" component={ApplicationsScreen} />
      <Stack.Screen name="EmployerJobTracking" component={EmployerJobTrackingScreen} />
      <Stack.Screen name="PaymentProcessing" component={PaymentProcessingScreen} />
    </Stack.Navigator>
  );
}

// Create a wrapper component that includes the banner
const TabNavigatorWithBanner = () => {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.white,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeStack}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
          }}
        />
        <Tab.Screen 
          name="PostJob" 
          component={PostJobStack}
          options={{
            tabBarLabel: 'Post Job',
            tabBarIcon: ({ focused }) => <TabIcon name="post-job" focused={focused} />,
          }}
        />
        <Tab.Screen 
          name="Applications" 
          component={ApplicationsStack}
          options={{
            tabBarLabel: 'Applications',
            tabBarIcon: ({ focused }) => <TabIcon name="applications" focused={focused} />,
          }}
        />
        <Tab.Screen 
          name="Notifications" 
          component={NotificationsStack}
          options={{
            tabBarLabel: 'Notifications',
            tabBarIcon: ({ focused }) => <TabIcon name="notifications" focused={focused} />,
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileStack}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
          }}
        />
      </Tab.Navigator>
      
      {/* Employer Job Tracking Banner - Only shown on main tab screens */}
      <EmployerJobTrackingBanner />
    </View>
  );
}

export default TabNavigatorWithBanner;