import React from 'react';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/store/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
