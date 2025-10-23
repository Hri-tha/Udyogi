// src/navigation/WorkerNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WorkerHomeScreen from '../screens/worker/WorkerHomeScreen';
import WorkerProfileScreen from '../screens/worker/WorkerProfileScreen';
import JobDetailsScreen from '../screens/worker/JobDetailsScreen';
import LocationFilterScreen from '../screens/worker/LocationFilterScreen';
import MyJobsScreen from '../screens/worker/MyJobsScreen';

const Stack = createStackNavigator();

const WorkerNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="WorkerHome">
      <Stack.Screen 
        name="WorkerHome" 
        component={WorkerHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="WorkerProfile" 
        component={WorkerProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="JobDetails" 
        component={JobDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="LocationFilter" 
        component={LocationFilterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="MyJobs" 
        component={MyJobsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default WorkerNavigator;