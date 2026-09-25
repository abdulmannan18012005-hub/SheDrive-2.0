import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Share, ActivityIndicator, Alert } from 'react-native';
import { SoundService } from '../services/audio/SoundService';
import { EmergencySosModal } from './EmergencySosModal';

interface PassengerActiveRideViewProps {
  rideId?: string;
  authToken?: string;
  status: string;
  driverName: string;
  driverPhone: string | null;
  driverRating: number;
  vehicleMake: string;
  vehiclePlate: string;
}

export const PassengerActiveRideView: React.FC<PassengerActiveRideViewProps> = ({
  rideId,
  authToken,
  status,
  driverName,
  driverPhone,
  driverRating,
  vehicleMake,
  vehiclePlate
}) => {
  const [isSharing, setIsSharing] = useState(false);
  const [sosVisible, setSosVisible] = useState(false);

  const handleCall = () => {
    if (driverPhone) {
      Linking.openURL(`tel:${driverPhone}`);
    }
  };

  const handleShareTrip = async () => {
    if (!rideId || !authToken) {
      Alert.alert('Error', 'Missing ride session data to share.');
      return;
    }

    try {
      setIsSharing(true);
      const BACKEND_URL = 'http://localhost:3016';
      
      const res = await fetch(`${BACKEND_URL}/api/v1/rides/${rideId}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error('Failed to generate share link');
      }

      const data = await res.json();
      const message = `Track my SheDrive ride live: ${data.share_url}\nDriver: ${driverName} (${vehiclePlate})`;
      
      await Share.share({
        message,
        url: data.share_url,
        title: 'Live Ride Tracking'
      });
    } catch (err) {
      console.warn('Share error:', err);
      Alert.alert('Error', 'Could not generate share link right now.');
    } finally {
      setIsSharing(false);
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'accepted': return 'Driver is on the way';
      case 'arrived': return 'Driver has arrived at pickup';
      case 'in_progress': return 'Heading to destination';
      case 'completed': return 'Trip completed';
      default: return 'Loading...';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusBanner}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.driverRow}>
          <View style={styles.avatarPlaceholder} />
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driverName}</Text>
            <Text style={styles.driverRating}>⭐ {driverRating.toFixed(2)}</Text>
          </View>
          {driverPhone && (
            <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
              <Text style={styles.callBtnText}>Call</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.vehicleRow}>
          <Text style={styles.vehicleInfo}>{vehicleMake} • <Text style={styles.plate}>{vehiclePlate}</Text></Text>
        </View>

        <View style={styles.safetyBar}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShareTrip} disabled={isSharing}>
            {isSharing ? (
              <ActivityIndicator color="#334155" />
            ) : (
              <Text style={styles.shareBtnText}>Share Trip</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.sosBtn} onPress={() => setSosVisible(true)}>
            <Text style={styles.sosBtnText}>Emergency SOS</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <EmergencySosModal 
        visible={sosVisible} 
        onClose={() => setSosVisible(false)} 
        rideId={rideId || ''} 
        authToken={authToken || ''} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 10,
  },
  statusBanner: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#cbd5e1',
    marginRight: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  driverRating: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  callBtn: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  callBtnText: {
    color: '#0284c7',
    fontWeight: 'bold',
  },
  vehicleRow: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  vehicleInfo: {
    fontSize: 15,
    color: '#334155',
  },
  plate: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  safetyBar: {
    flexDirection: 'row',
    gap: 12,
  },
  shareBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareBtnText: {
    color: '#334155',
    fontWeight: 'bold',
  },
  sosBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  sosBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});
