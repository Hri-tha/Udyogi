// src/navigation/WorkerBottomTabNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text } from 'react-native';
import WorkerHomeScreen from '../screens/worker/WorkerHomeScreen';
import MyJobsScreen from '../screens/worker/MyJobsScreen';
import WorkerProfileScreen from '../screens/worker/WorkerProfileScreen';
import NotificationsScreen from '../screens/common/NotificationsScreen';
import JobDetailsScreen from '../screens/worker/JobDetailsScreen';
import JobTrackingScreen from '../screens/worker/JobTrackingScreen';
import JobLocationScreen from '../screens/shared/JobLocationScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import LocationFilterScreen from '../screens/worker/LocationFilterScreen';
import { colors } from '../constants/colors';

// Import the banner
import JobTrackingBanner from '../components/JobTrackingBanner';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Simple icon component
const TabIcon = ({ name, focused }) => {
  const getIconChar = (iconName) => {
    const iconMap = {
      'home': '🏠',
      'applications': '📄',
      'profile': '👤',
      'notifications': '🔔',
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
      <Stack.Screen name="WorkerHomeMain" component={WorkerHomeScreen} />
      <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
      <Stack.Screen name="LocationFilter" component={LocationFilterScreen} />
    </Stack.Navigator>
  );
}

// My Jobs Stack Navigator
function MyJobsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyJobsMain" component={MyJobsScreen} />
      <Stack.Screen name="JobTracking" component={JobTrackingScreen} />
      <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
      <Stack.Screen name="JobLocation" component={JobLocationScreen} />
      <Stack.Screen name="ChatScreen" component={ChatScreen} />
    </Stack.Navigator>
  );
}

// Profile Stack Navigator
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkerProfileMain" component={WorkerProfileScreen} />
    </Stack.Navigator>
  );
}

// Notifications Stack Navigator
function NotificationsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NotificationsMain" component={NotificationsScreen} />
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
          name="WorkerHome" 
          component={HomeStack}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
          }}
        />
        <Tab.Screen 
          name="MyJobs" 
          component={MyJobsStack}
          options={{
            tabBarLabel: 'My Jobs',
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
          name="WorkerProfile" 
          component={ProfileStack}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
          }}
        />
      </Tab.Navigator>
      
      {/* Job Tracking Banner - Only shown on main tab screens */}
      <JobTrackingBanner />
    </View>
  );
}

export default TabNavigatorWithBanner;