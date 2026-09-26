import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

interface RideHistoryCardProps {
  ride: any;
  onPress: () => void;
}

export const RideHistoryCard: React.FC<RideHistoryCardProps> = ({ ride, onPress }) => {
  const dateStr = new Date(ride.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
  const timeStr = new Date(ride.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit'
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.dateTime}>{dateStr} • {timeStr}</Text>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{ride.category} ❄️</Text>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routeTimeline}>
          <View style={styles.dotPickup} />
          <View style={styles.line} />
          <View style={styles.dotDropoff} />
        </View>
        <View style={styles.routeTextContainer}>
          <Text style={styles.routeText} numberOfLines={1}>{ride.pickup_address}</Text>
          <Text style={[styles.routeText, styles.dropoffText]} numberOfLines={1}>{ride.dropoff_address}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.counterparty}>
          {ride.counterparty?.avatar_url ? (
            <Image source={{ uri: ride.counterparty.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <View>
            <Text style={styles.name}>{ride.counterparty?.name || 'Unknown'}</Text>
            <Text style={styles.rating}>★ {ride.counterparty?.rating?.toFixed(1) || '5.0'}</Text>
          </View>
        </View>
        <Text style={styles.fare}>PKR {ride.final_fare}</Text>
      </View>
    </TouchableOpacity>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateTime: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  categoryPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  routeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  routeTimeline: {
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 4,
    paddingBottom: 4,
  },
  dotPickup: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#14b8a6', // Teal
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  dotDropoff: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E91E63', // Deep Pink
  },
  routeTextContainer: {
    flex: 1,
    justifyContent: 'space-between',
    height: 48,
  },
  routeText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  dropoffText: {
    color: '#0f172a',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  counterparty: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
  },
  rating: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  fare: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a', // Deep slate
  }
});
