import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';

export default function RoleSelectionScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to SheDrive</Text>
        <Text style={styles.subtitle}>Safe Rides for Women</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('PassengerSignIn')}
          >
            <Text style={styles.primaryButtonText}>Ride as Passenger</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('DriverSignIn')}
          >
            <Text style={styles.secondaryButtonText}>Drive with SheDrive</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 48,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#E91E63',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E91E63',
  },
  secondaryButtonText: {
    color: '#E91E63',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
