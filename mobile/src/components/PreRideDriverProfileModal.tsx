import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

export interface DriverProfileData {
  driver_id: string;
  first_name: string;
  avatar_url: string | null;
  rating: number;
  total_rides: number;
  is_verified: boolean;
  member_since: string;
  vehicle: {
    make: string;
    model: string;
    year: number;
    color: string;
    plate_number: string;
    category: string;
    photo_url: string | null;
  };
}

interface Props {
  visible: boolean;
  profile: DriverProfileData | null;
  onClose: () => void;
}

export const PreRideDriverProfileModal: React.FC<Props> = ({ visible, profile, onClose }) => {
  if (!profile) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeHandle} onPress={onClose}>
            <View style={styles.handleBar} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.avatarPlaceholder} />
            <View>
              <Text style={styles.name}>{profile.first_name}</Text>
              {profile.is_verified && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Verified Female Driver</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.ratingText}>⭐ {profile.rating.toFixed(2)} • {profile.total_rides} rides</Text>
          <Text style={styles.memberSince}>Member since {new Date(profile.member_since).getFullYear()}</Text>

          <View style={styles.vehicleCard}>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
            <Text style={styles.vehicleText}>
              {profile.vehicle.color} {profile.vehicle.make} {profile.vehicle.model} ({profile.vehicle.year})
            </Text>
            <Text style={styles.plateText}>{profile.vehicle.plate_number}</Text>
            <Text style={styles.categoryText}>{profile.vehicle.category.toUpperCase()}</Text>
          </View>

          <View style={styles.safetyList}>
            <Text style={styles.sectionTitle}>Safety Checklist</Text>
            <Text style={styles.checkItem}>✅ CNIC Verified</Text>
            <Text style={styles.checkItem}>✅ Driving License Verified</Text>
            <Text style={styles.checkItem}>✅ Vehicle Inspected</Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: '60%',
  },
  closeHandle: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    marginTop: -10,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    marginRight: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  badge: {
    backgroundColor: '#fff0f3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#E91E63',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ratingText: {
    fontSize: 16,
    color: '#334155',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  vehicleCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  vehicleText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
    marginBottom: 4,
  },
  plateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#64748b',
  },
  safetyList: {
    marginBottom: 32,
  },
  checkItem: {
    fontSize: 15,
    color: '#334155',
    marginBottom: 8,
  },
  closeBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
