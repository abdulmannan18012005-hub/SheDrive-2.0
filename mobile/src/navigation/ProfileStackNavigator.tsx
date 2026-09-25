import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import NotificationSettingsScreen from '../screens/profile/NotificationSettingsScreen';
import SavedPlacesScreen from '../screens/profile/SavedPlacesScreen';
import AppFeedbackScreen from '../screens/profile/AppFeedbackScreen';
import StaticLegalScreen from '../screens/profile/StaticLegalScreen';

const Stack = createNativeStackNavigator();

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="SavedPlaces" component={SavedPlacesScreen} />
      <Stack.Screen name="AppFeedback" component={AppFeedbackScreen} />
      <Stack.Screen name="StaticLegal" component={StaticLegalScreen} />
    </Stack.Navigator>
  );
}
