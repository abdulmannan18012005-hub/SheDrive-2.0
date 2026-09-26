import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

interface DriverCashCollectionModalProps {
  visible: boolean;
  fare: number;
  onConfirm: () => void;
}

export const DriverCashCollectionModal: React.FC<DriverCashCollectionModalProps> = ({
  visible,
  fare,
  onConfirm
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>💵</Text>
          </View>
          
          <Text style={styles.title}>Collect Cash Fare</Text>
          <Text style={styles.fareAmount}>PKR {fare.toFixed(2)}</Text>
          
          <View style={styles.breakdown}>
            <Text style={styles.breakdownText}>Base Fare + Distance Fare = Total Negotiated Fare</Text>
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
            <Text style={styles.confirmBtnText}>Confirm Cash Received</Text>
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
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  fareAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#10b981', // Emerald 500
    marginBottom: 16,
  },
  breakdown: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
  },
  breakdownText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
  confirmBtn: {
    backgroundColor: '#14b8a6', // Teal 500
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
