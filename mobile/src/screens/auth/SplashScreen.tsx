import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SheDrive</Text>
      <ActivityIndicator size="large" color="#E91E63" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E91E63',
    marginBottom: 24,
  },
});
