import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import { AuthContext } from '../store/AuthContext';
import SplashScreen from '../screens/auth/SplashScreen';
import { View, Text, TouchableOpacity } from 'react-native';

import ProfileStackNavigator from './ProfileStackNavigator';
import DriverStackNavigator from './DriverStackNavigator';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const auth = useContext(AuthContext);

  if (auth?.isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {auth?.isAuthenticated ? (
          <>
            <Stack.Screen name="App" component={ProfileStackNavigator} />
            <Stack.Screen name="DriverFlow" component={DriverStackNavigator} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
