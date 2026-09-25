import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, SafeAreaView } from 'react-native';

export default function NotificationSettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [rideUpdatesEnabled, setRideUpdatesEnabled] = useState(true);

  const toggleSetting = (setting: string, value: boolean) => {
    // Immediate API Call to PUT /api/v1/profile/settings
    if (setting === 'push') setPushEnabled(value);
    if (setting === 'sound') setSoundEnabled(value);
    if (setting === 'ride') setRideUpdatesEnabled(value);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Notifications</Text>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Push Notifications</Text>
          <Switch 
            trackColor={{ false: '#EEEEEE', true: '#E91E63' }}
            value={pushEnabled} 
            onValueChange={(val) => toggleSetting('push', val)} 
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Ride Status Audio Cues</Text>
          <Switch 
            trackColor={{ false: '#EEEEEE', true: '#E91E63' }}
            value={soundEnabled} 
            onValueChange={(val) => toggleSetting('sound', val)} 
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Promotional Alerts</Text>
          <Switch 
            trackColor={{ false: '#EEEEEE', true: '#E91E63' }}
            value={rideUpdatesEnabled} 
            onValueChange={(val) => toggleSetting('ride', val)} 
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#E91E63', marginBottom: 32, marginTop: 16 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F8F9FA' },
  settingLabel: { fontSize: 16, color: '#333333' }
});
