import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';

export default function StaticLegalScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Legal & Policies</Text>
        
        <Text style={styles.heading}>Terms of Service</Text>
        <Text style={styles.paragraph}>By using SheDrive, you agree to our terms of service which prioritize the safety and security of all our female riders and drivers. You must verify your identity...</Text>
        
        <Text style={styles.heading}>Privacy Policy</Text>
        <Text style={styles.paragraph}>We collect location data only when the app is in use to provide accurate routing and safety tracking. Your data is encrypted and never sold to third parties.</Text>
        
        <Text style={styles.heading}>Women Safety Guidelines</Text>
        <Text style={styles.paragraph}>Always verify the driver's details before entering the vehicle. Use the SOS button in case of any emergency, which will immediately alert local authorities and your emergency contacts.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#E91E63', marginBottom: 32, marginTop: 16 },
  heading: { fontSize: 18, fontWeight: 'bold', color: '#333333', marginTop: 24, marginBottom: 8 },
  paragraph: { fontSize: 16, color: '#666666', lineHeight: 24 },
});
