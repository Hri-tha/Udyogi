// src/navigation/EmployerBottomTabNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native'; // Add this import
import EmployerHomeScreen from '../screens/employer/EmployerHomeScreen';
import ApplicationsScreen from '../screens/employer/ApplicationsScreen';
import EmployerProfileScreen from '../screens/employer/EmployerProfileScreen';
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

export default function EmployerBottomTabNavigator() {
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
        name="EmployerHome" 
        component={EmployerHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tab.Screen 
        name="Applications" 
        component={ApplicationsScreen}
        options={{
          tabBarLabel: 'Applications',
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
        name="EmployerProfile" 
        component={EmployerProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}