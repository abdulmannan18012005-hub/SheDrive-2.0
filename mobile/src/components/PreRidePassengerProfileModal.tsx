import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

export interface PassengerProfileData {
  passenger_id: string;
  first_name: string;
  avatar_url: string | null;
  is_phone_verified: boolean;
  member_since: string;
  safety_badge: string;
}

interface Props {
  visible: boolean;
  profile: PassengerProfileData | null;
  onClose: () => void;
}

export const PreRidePassengerProfileModal: React.FC<Props> = ({ visible, profile, onClose }) => {
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
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{profile.safety_badge}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.memberSince}>Member since {new Date(profile.member_since).getFullYear()}</Text>

          <View style={styles.safetyList}>
            <Text style={styles.sectionTitle}>Safety Checks</Text>
            {profile.is_phone_verified && (
              <Text style={styles.checkItem}>✅ Phone Number Verified</Text>
            )}
            <Text style={styles.checkItem}>✅ Account Active</Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Return to Bidding</Text>
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
    minHeight: '40%',
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
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  memberSince: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
  },
  safetyList: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  checkItem: {
    fontSize: 15,
    color: '#334155',
    marginBottom: 8,
  },
  closeBtn: {
    backgroundColor: '#E91E63',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
