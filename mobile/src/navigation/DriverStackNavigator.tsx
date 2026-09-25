import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DriverVehicleSetupScreen from '../screens/driver/DriverVehicleSetupScreen';
import DriverDocumentUploadScreen from '../screens/driver/DriverDocumentUploadScreen';
import DriverVehicleManagementScreen from '../screens/driver/DriverVehicleManagementScreen';

const Stack = createNativeStackNavigator();

export default function DriverStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverVehicleSetup" component={DriverVehicleSetupScreen} />
      <Stack.Screen name="DriverDocumentUpload" component={DriverDocumentUploadScreen} />
      <Stack.Screen name="DriverVehicleManagement" component={DriverVehicleManagementScreen} />
    </Stack.Navigator>
  );
}
