import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import PassengerSignInScreen from '../screens/auth/PassengerSignInScreen';
import PassengerSignUpScreen from '../screens/auth/PassengerSignUpScreen';
import DriverSignInScreen from '../screens/auth/DriverSignInScreen';
import DriverSignUpScreen from '../screens/auth/DriverSignUpScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="PassengerSignIn" component={PassengerSignInScreen} />
      <Stack.Screen name="PassengerSignUp" component={PassengerSignUpScreen} />
      <Stack.Screen name="DriverSignIn" component={DriverSignInScreen} />
      <Stack.Screen name="DriverSignUp" component={DriverSignUpScreen} />
    </Stack.Navigator>
  );
}
