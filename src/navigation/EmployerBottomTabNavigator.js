// src/navigation/EmployerBottomTabNavigator.js
// FIXED: safe area insets so tab bar clears the Android system nav bar / iPhone home indicator
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import SubscriptionScreen from '../screens/employer/SubscriptionScreen';
import { colors } from '../constants/colors';
import { useNotification } from '../context/NotificationContext';

// Import banners
import EmployerJobTrackingBanner from '../components/EmployerJobTrackingBanner';
import InAppNotificationBanner from '../components/InAppNotificationBanner';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── Tab icon with optional badge ────────────────────────────────────────────
const TabIcon = ({ name, focused, badgeCount }) => {
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

// ─── Stack navigators ─────────────────────────────────────────────────────────
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployerHomeMain" component={EmployerHomeScreen} />
      <Stack.Screen name="PlatformFeePayment" component={PlatformFeePaymentScreen} />
      <Stack.Screen name="PostJobSuccess" component={PostJobSuccessScreen} />
      <Stack.Screen name="EmployerJobTracking" component={EmployerJobTrackingScreen} />
      <Stack.Screen name="PaymentProcessing" component={PaymentProcessingScreen} />
      <Stack.Screen name="CompleteJob" component={CompleteJobScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
    </Stack.Navigator>
  );
}

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

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployerProfileMain" component={EmployerProfileScreen} />
      <Stack.Screen name="PlatformFeePayment" component={PlatformFeePaymentScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
    </Stack.Navigator>
  );
}

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

// ─── Main Tab Navigator ───────────────────────────────────────────────────────
// useSafeAreaInsets() returns the bottom inset (Android nav bar / iPhone home
// indicator height). We add it to paddingBottom and height so the tab bar
// always sits above the system navigation zone — exactly like Zomato/Swiggy do.
function MainTabNavigator() {
  const { unreadCount } = useNotification();
  const insets = useSafeAreaInsets();

  // Base tab bar height is 60. Grow it by the bottom inset so icons are never
  // hidden under the gesture bar or 3-button nav bar.
  const tabBarHeight = 60 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: tabBarHeight,
          // Push icons/labels up by the inset so they're centred in the
          // visible 60 px region, not half-hidden behind the system bar.
          paddingBottom: insets.bottom + 8,
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
          tabBarIcon: ({ focused }) => (
            <TabIcon name="notifications" focused={focused} badgeCount={unreadCount} />
          ),
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
  );
}

// ─── Root: tab navigator + both banners layered on top ────────────────────────
const TabNavigatorWithBanner = () => {
  return (
    <View style={{ flex: 1 }}>
      <MainTabNavigator />
      {/* Job tracking banner – sits above the tab bar at the bottom */}
      <EmployerJobTrackingBanner />
      {/* In-app push notification banner – slides in from the top */}
      <InAppNotificationBanner />
    </View>
  );
};

export default TabNavigatorWithBanner;