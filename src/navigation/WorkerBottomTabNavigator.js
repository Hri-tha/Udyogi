// src/navigation/WorkerBottomTabNavigator.js
// FIXED: notification badge count on tab bar + InAppNotificationBanner
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
import { useNotification } from '../context/NotificationContext';

// Import banners
import JobTrackingBanner from '../components/JobTrackingBanner';
import InAppNotificationBanner from '../components/InAppNotificationBanner';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Tab icon with optional badge
const TabIcon = ({ name, focused, badgeCount }) => {
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
    <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{
        fontSize: 24,
        color: focused ? colors.primary : colors.textSecondary,
      }}>
        {getIconChar(name)}
      </Text>
      {badgeCount > 0 && (
        <View style={{
          position: 'absolute',
          top: -2,
          right: -4,
          backgroundColor: '#ef4444',
          borderRadius: 9,
          minWidth: 18,
          height: 18,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 4,
          borderWidth: 1.5,
          borderColor: colors.white,
        }}>
          <Text style={{
            color: '#fff',
            fontSize: 10,
            fontWeight: '700',
            lineHeight: 13,
          }}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      )}
    </View>
  );
};

// ─── Stack navigators ──────────────────────────────────────────────────────────
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkerHomeMain" component={WorkerHomeScreen} />
      <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
      <Stack.Screen name="LocationFilter" component={LocationFilterScreen} />
    </Stack.Navigator>
  );
}

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

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkerProfileMain" component={WorkerProfileScreen} />
    </Stack.Navigator>
  );
}

function NotificationsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NotificationsMain" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

// ─── Main wrapper: tabs + banners ─────────────────────────────────────────────
const TabNavigatorWithBanner = () => {
  const { unreadCount } = useNotification();

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
            tabBarIcon: ({ focused }) => (
              <TabIcon name="notifications" focused={focused} badgeCount={unreadCount} />
            ),
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

      {/* Job Tracking Banner - sits above the tab bar */}
      <JobTrackingBanner />

      {/* In-app push notification banner - slides from the top */}
      <InAppNotificationBanner />
    </View>
  );
};

export default TabNavigatorWithBanner;