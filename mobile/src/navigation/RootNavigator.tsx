import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import { AuthContext } from '../store/AuthContext';
import SplashScreen from '../screens/auth/SplashScreen';
import { View, Text, TouchableOpacity } from 'react-native';

const Stack = createNativeStackNavigator();

function DummyHomeScreen() {
  const auth = useContext(AuthContext);
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Home Screen - Welcome {auth?.role}</Text>
      <TouchableOpacity onPress={() => auth?.signOut()} style={{ marginTop: 20, padding: 10, backgroundColor: '#E91E63', borderRadius: 8 }}>
        <Text style={{ color: '#fff' }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootNavigator() {
  const auth = useContext(AuthContext);

  if (auth?.isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {auth?.isAuthenticated ? (
          <Stack.Screen name="App" component={DummyHomeScreen} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
