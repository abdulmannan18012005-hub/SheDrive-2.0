import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Modal, ActivityIndicator, Alert } from 'react-native';

interface EmergencySosModalProps {
  visible: boolean;
  onClose: () => void;
  rideId: string;
  authToken: string;
  currentLat?: number;
  currentLng?: number;
}

export const EmergencySosModal: React.FC<EmergencySosModalProps> = ({
  visible,
  onClose,
  rideId,
  authToken,
  currentLat = 31.5,
  currentLng = 74.3
}) => {
  const [isDispatching, setIsDispatching] = useState(false);

  const callPolice = () => Linking.openURL('tel:15');
  const callRescue = () => Linking.openURL('tel:1122');
  const callSupport = () => Linking.openURL('tel:+923000000000');

  const handleBroadcast = async () => {
    try {
      setIsDispatching(true);
      const BACKEND_URL = 'http://localhost:3018'; // Mock env
      const res = await fetch(`${BACKEND_URL}/api/v1/rides/${rideId}/sos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: currentLat,
          longitude: currentLng,
          reason: 'Emergency triggered from app'
        })
      });

      if (!res.ok) throw new Error('SOS Dispatch Failed');
      const data = await res.json();
      
      Alert.alert('SOS Dispatched', `Emergency contacts (${data.contacts_notified}) and SheDrive Safety Team alerted.`);
      onClose();
    } catch (err) {
      console.warn('SOS Error:', err);
      Alert.alert('Error', 'Failed to dispatch SOS. Please call 15 directly.');
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>EMERGENCY SOS</Text>
          <Text style={styles.subtitle}>Are you in immediate danger?</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.redBtn} onPress={callPolice}>
              <Text style={styles.btnText}>Call Police (15)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.redBtn} onPress={callRescue}>
              <Text style={styles.btnText}>Call Rescue (1122)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.darkBtn} onPress={handleBroadcast} disabled={isDispatching}>
              {isDispatching ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Broadcast SOS to Contacts</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.outlineBtn} onPress={callSupport}>
              <Text style={styles.outlineText}>Call SheDrive Safety Team</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isDispatching}>
            <Text style={styles.cancelText}>Cancel / False Alarm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 4,
    borderColor: '#DC2626'
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 24
  },
  actions: {
    gap: 12,
    marginBottom: 24
  },
  redBtn: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  darkBtn: {
    backgroundColor: '#334155',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#64748b'
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  outlineText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold'
  },
  cancelBtn: {
    padding: 16,
    alignItems: 'center'
  },
  cancelText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
