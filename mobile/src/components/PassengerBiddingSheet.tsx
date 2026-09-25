import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';

export interface Bid {
  bid_id: string;
  driver_id: string;
  driver_name: string;
  rating: number;
  total_rides: number;
  vehicle: {
    make: string;
    model: string;
    color: string;
    plate: string;
    category: string;
  };
  offered_fare: number;
  expires_in_seconds: number;
}

interface Props {
  bids: Bid[];
  onAccept: (bidId: string) => void;
  onDecline: (bidId: string) => void;
}

const BidCard: React.FC<{ bid: Bid; onAccept: () => void; onDecline: () => void }> = ({ bid, onAccept, onDecline }) => {
  const [timeLeft, setTimeLeft] = useState(bid.expires_in_seconds);
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onDecline());
    }
  }, [timeLeft, fadeAnim, onDecline]);

  if (timeLeft === 0) return null;

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
      <View style={styles.cardHeader}>
        <View style={styles.driverInfo}>
          <View style={styles.avatarPlaceholder} />
          <View>
            <Text style={styles.driverName}>{bid.driver_name} ✅</Text>
            <Text style={styles.ratingText}>⭐ {bid.rating.toFixed(2)} • {bid.total_rides} trips</Text>
          </View>
        </View>
        <Text style={styles.fareText}>PKR {bid.offered_fare}</Text>
      </View>
      
      <Text style={styles.vehicleText}>
        {bid.vehicle.color} {bid.vehicle.make} {bid.vehicle.model} • {bid.vehicle.plate} • {bid.vehicle.category}
      </Text>
      
      <View style={styles.timerBarBg}>
        <View style={[styles.timerBarFill, { width: `${(timeLeft / 10) * 100}%` }]} />
      </View>
      <Text style={styles.timerText}>{timeLeft}s left</Text>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
          <Text style={styles.declineBtnText}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
          <Text style={styles.acceptBtnText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export const PassengerBiddingSheet: React.FC<Props> = ({ bids, onAccept, onDecline }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Incoming Offers ({bids.length})</Text>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {bids.length === 0 ? (
          <Text style={styles.emptyText}>Waiting for drivers...</Text>
        ) : (
          bids.map(bid => (
            <BidCard 
              key={bid.bid_id} 
              bid={bid} 
              onAccept={() => onAccept(bid.bid_id)} 
              onDecline={() => onDecline(bid.bid_id)} 
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '60%',
    minHeight: 300,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 20,
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 12,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  ratingText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  fareText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  vehicleText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 12,
  },
  timerBarBg: {
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    marginBottom: 4,
  },
  timerBarFill: {
    height: '100%',
    backgroundColor: '#E91E63',
    borderRadius: 2,
  },
  timerText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  declineBtn: {
    backgroundColor: '#f1f5f9',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  declineBtnText: {
    fontSize: 20,
    color: '#64748b',
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#10b981', // Teal/Green accent
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
