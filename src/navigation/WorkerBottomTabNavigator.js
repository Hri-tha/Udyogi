// src/navigation/WorkerBottomTabNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native'; // Add this import
import WorkerHomeScreen from '../screens/worker/WorkerHomeScreen';
import MyJobScreen from '../screens/worker/MyJobsScreen';
import WorkerProfileScreen from '../screens/worker/WorkerProfileScreen';
import NotificationsScreen from '../screens/common/NotificationsScreen';
import { colors } from '../constants/colors';

const Tab = createBottomTabNavigator();

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

export default function WorkerBottomTabNavigator() {
  return (
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
        component={WorkerHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="MyJobs" 
        component={MyJobScreen}
        options={{
          tabBarLabel: 'My Jobs',
          tabBarIcon: ({ focused }) => <TabIcon name="applications" focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Notifications',
          tabBarIcon: ({ focused }) => <TabIcon name="notifications" focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="WorkerProfile" 
        component={WorkerProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}