import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';

export interface FeedRide {
  ride_id: string;
  passenger_name: string;
  rating: number;
  total_rides: number;
  pickup_label: string;
  dropoff_label: string;
  distance_km: number;
  duration_min: number;
  offered_fare: number;
}

interface Props {
  ride: FeedRide;
  onAcceptFare: (rideId: string, fare: number) => void;
  onOpenCounter: (rideId: string) => void;
}

export const DriverRideFeedCard: React.FC<Props> = ({ ride, onAcceptFare, onOpenCounter }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.passengerInfo}>
          <View style={styles.avatarPlaceholder} />
          <View>
            <Text style={styles.name}>{ride.passenger_name}</Text>
            <Text style={styles.rating}>⭐ {ride.rating ? ride.rating.toFixed(2) : 'New'} • {ride.total_rides} trips</Text>
          </View>
        </View>
        <View style={styles.fareBadge}>
          <Text style={styles.fareBadgeText}>PKR {ride.offered_fare}</Text>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routeDot} />
        <View style={styles.routeLine} />
        <View style={[styles.routeDot, { backgroundColor: '#E91E63' }]} />
        <View style={styles.routeAddresses}>
          <Text style={styles.addressText} numberOfLines={1}>{ride.pickup_label}</Text>
          <Text style={[styles.addressText, { marginTop: 16 }]} numberOfLines={1}>{ride.dropoff_label}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <Text style={styles.metricsText}>{ride.distance_km.toFixed(1)} km</Text>
        <Text style={styles.metricsText}>•</Text>
        <Text style={styles.metricsText}>{ride.duration_min} min</Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.counterBtn} onPress={() => onOpenCounter(ride.ride_id)}>
          <Text style={styles.counterBtnText}>Counter Offer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={() => onAcceptFare(ride.ride_id, ride.offered_fare)}>
          <Text style={styles.acceptBtnText}>Accept PKR {ride.offered_fare}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  passengerInfo: {
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
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  rating: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  fareBadge: {
    backgroundColor: '#fff0f3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  fareBadgeText: {
    color: '#E91E63',
    fontWeight: 'bold',
    fontSize: 16,
  },
  routeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    position: 'relative',
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    position: 'absolute',
    left: 0,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#cbd5e1',
    position: 'absolute',
    left: 4,
    top: 10,
  },
  routeAddresses: {
    marginLeft: 24,
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: '#334155',
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    gap: 8,
  },
  metricsText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  counterBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  counterBtnText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: 'bold',
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  }
});
