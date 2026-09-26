import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

interface PassengerRideSummaryModalProps {
  visible: boolean;
  pickup: string;
  dropoff: string;
  durationMins: number;
  fare: number;
  onRateDriver: () => void;
}

export const PassengerRideSummaryModal: React.FC<PassengerRideSummaryModalProps> = ({
  visible,
  pickup,
  dropoff,
  durationMins,
  fare,
  onRateDriver
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.successBanner}>
            <Text style={styles.bannerIcon}>🎉</Text>
            <Text style={styles.bannerText}>You've arrived safely!</Text>
          </View>
          
          <View style={styles.receiptCard}>
            <View style={styles.routeRow}>
              <View style={styles.dot} />
              <Text style={styles.addressText} numberOfLines={1}>{pickup}</Text>
            </View>
            <View style={styles.line} />
            <View style={styles.routeRow}>
              <View style={[styles.dot, styles.dropoffDot]} />
              <Text style={styles.addressText} numberOfLines={1}>{dropoff}</Text>
            </View>
            
            <View style={styles.statsRow}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>{durationMins} mins</Text>
            </View>
            
            <View style={styles.statsRow}>
              <Text style={styles.statLabel}>Total Paid</Text>
              <Text style={styles.statValue}>PKR {fare.toFixed(2)}</Text>
            </View>
            
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>Paid in Cash</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.rateBtn} onPress={onRateDriver}>
            <Text style={styles.rateBtnText}>Rate Your Driver</Text>
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
    backgroundColor: '#f8fafc',
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 24,
  },
  bannerIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  bannerText: {
    color: '#166534',
    fontWeight: 'bold',
    fontSize: 16,
  },
  receiptCard: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    marginRight: 12,
  },
  dropoffDot: {
    backgroundColor: '#ef4444',
  },
  line: {
    width: 2,
    height: 20,
    backgroundColor: '#cbd5e1',
    marginLeft: 5,
  },
  addressText: {
    flex: 1,
    fontSize: 16,
    color: '#334155',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  statLabel: {
    fontSize: 16,
    color: '#64748b',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  badgeContainer: {
    alignSelf: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 16,
  },
  badgeText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  rateBtn: {
    backgroundColor: '#e11d48', // Rose 600
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  rateBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
