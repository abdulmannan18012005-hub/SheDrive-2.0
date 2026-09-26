import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SoundService } from '../services/audio/SoundService';
import { EmergencySosModal } from './EmergencySosModal';
import { DriverCashCollectionModal } from './DriverCashCollectionModal';

interface DriverActiveRideViewProps {
  rideId?: string;
  authToken?: string;
  status: string;
  passengerName: string;
  passengerPhone: string | null;
  onUpdateStatus: (newStatus: string) => Promise<void>;
}

export const DriverActiveRideView: React.FC<DriverActiveRideViewProps> = ({
  rideId,
  authToken,
  status,
  passengerName,
  passengerPhone,
  onUpdateStatus
}) => {
  const [sosVisible, setSosVisible] = useState(false);

  const handleCall = () => {
    if (passengerPhone) {
      Linking.openURL(`tel:${passengerPhone}`);
    }
  };

  const handleAction = async () => {
    if (status === 'accepted') {
      await onUpdateStatus('arrived');
      SoundService.playDriverArrivedSound();
    } else if (status === 'arrived') {
      await onUpdateStatus('in_progress');
      SoundService.playTripStartedSound();
    } else if (status === 'in_progress') {
      await onUpdateStatus('completed');
      SoundService.playTripCompletedSound();
    }
  };

  const getActionConfig = () => {
    switch (status) {
      case 'accepted': return { text: 'I Have Arrived', color: '#14b8a6' }; // Teal
      case 'arrived': return { text: 'Start Trip', color: '#E91E63' }; // Deep Pink
      case 'in_progress': return { text: 'Complete Trip', color: '#10b981' }; // Success Green
      default: return { text: 'Completed', color: '#94a3b8' };
    }
  };

  const actionConfig = getActionConfig();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.passengerRow}>
          <View style={styles.avatarPlaceholder} />
          <View style={styles.passengerInfo}>
            <Text style={styles.passengerName}>{passengerName}</Text>
          </View>
          <View style={styles.actionIcons}>
            {passengerPhone && (
              <TouchableOpacity style={styles.iconBtn} onPress={handleCall}>
                <Text style={styles.iconText}>📞</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconBtnSOS} onPress={() => setSosVisible(true)}>
              <Text style={styles.iconTextSOS}>SOS</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: actionConfig.color }]} 
          onPress={handleAction}
          disabled={status === 'completed'}
        >
          <Text style={styles.actionBtnText}>{actionConfig.text}</Text>
        </TouchableOpacity>
      </View>
      
      <EmergencySosModal 
        visible={sosVisible} 
        onClose={() => setSosVisible(false)} 
        rideId={rideId || ''} 
        authToken={authToken || ''} 
      />

      <DriverCashCollectionModal
        visible={status === 'completed'}
        fare={500} // Temporary mock fare, in a real app this would come from props
        onConfirm={() => {
          // Close modal or navigate away handled upstream usually, but for UI smoke test we render it when completed
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 10,
  },
  card: {
    paddingBottom: 8,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
    marginRight: 16,
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconBtnSOS: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  iconText: {
    fontSize: 20,
  },
  iconTextSOS: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ef4444'
  },
  actionBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  }
});
