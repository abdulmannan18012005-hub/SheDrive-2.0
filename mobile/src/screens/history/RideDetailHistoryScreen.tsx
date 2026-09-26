import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';

interface RideDetailHistoryScreenProps {
  route: any;
  navigation: any;
  authToken: string;
}

export const RideDetailHistoryScreen: React.FC<RideDetailHistoryScreenProps> = ({ route, navigation, authToken }) => {
  const { rideId } = route.params;
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/v1/rides/${rideId}/summary`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (res.ok) setDetails(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [rideId, authToken]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  if (!details) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load receipt details.</Text>
      </View>
    );
  }

  const { date, timestamps, route: rideRoute, distance_km, duration_min, fare_breakdown, counterparty, ratings } = details;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.receiptCard}>
        <Text style={styles.receiptTitle}>Trip Receipt</Text>
        <Text style={styles.receiptId}>ID: {details.id}</Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Distance</Text>
          <Text style={styles.value}>{distance_km.toFixed(1)} km</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Duration</Text>
          <Text style={styles.value}>{duration_min} mins</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.routeContainer}>
          <View style={styles.routeTimeline}>
            <View style={styles.dotPickup} />
            <View style={styles.line} />
            <View style={styles.dotDropoff} />
          </View>
          <View style={styles.routeTextContainer}>
            <Text style={styles.routeText}>{rideRoute.pickup_address}</Text>
            <Text style={[styles.routeText, styles.dropoffText]}>{rideRoute.dropoff_address}</Text>
          </View>
        </View>
      </View>

      <View style={styles.fareCard}>
        <Text style={styles.sectionTitle}>Fare Breakdown</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Base Fare</Text>
          <Text style={styles.value}>PKR {fare_breakdown.base_fare}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Distance Fare</Text>
          <Text style={styles.value}>PKR {fare_breakdown.distance_fare}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Discount</Text>
          <Text style={[styles.value, styles.discountText]}>- PKR {fare_breakdown.discount}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.totalLabel}>Total Paid in Cash</Text>
          <Text style={styles.totalValue}>PKR {fare_breakdown.total_paid}</Text>
        </View>
      </View>

      <View style={styles.counterpartyCard}>
        <View style={styles.counterpartyHeader}>
          {counterparty.avatar_url ? (
            <Image source={{ uri: counterparty.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <View>
            <Text style={styles.name}>{counterparty.name}</Text>
            <Text style={styles.rating}>★ {counterparty.rating.toFixed(1)}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.profileLink}>
          <Text style={styles.profileLinkText}>View Profile</Text>
        </TouchableOpacity>
      </View>

      {ratings?.received && (
        <View style={styles.ratingsCard}>
          <Text style={styles.sectionTitle}>Rating Received</Text>
          <Text style={styles.stars}>{"★".repeat(ratings.received.rating)}{"☆".repeat(5 - ratings.received.rating)}</Text>
          {ratings.received.tags?.length > 0 && (
            <View style={styles.tagsContainer}>
              {ratings.received.tags.map((tag: string) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {ratings?.given && (
        <View style={styles.ratingsCard}>
          <Text style={styles.sectionTitle}>Rating Given</Text>
          <Text style={styles.stars}>{"★".repeat(ratings.given.rating)}{"☆".repeat(5 - ratings.given.rating)}</Text>
          {ratings.given.tags?.length > 0 && (
            <View style={styles.tagsContainer}>
              {ratings.given.tags.map((tag: string) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.shareBtn}>
        <Text style={styles.shareBtnText}>Share Receipt</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  receiptCard: {
    backgroundColor: '#fff',
    padding: 24,
    margin: 16,
    borderRadius: 16,
  },
  receiptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  receiptId: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    color: '#64748b',
    fontSize: 14,
  },
  value: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '500',
  },
  discountText: {
    color: '#10b981',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  routeContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  routeTimeline: {
    alignItems: 'center',
    marginRight: 16,
    paddingTop: 6,
    paddingBottom: 6,
  },
  dotPickup: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#14b8a6',
  },
  line: {
    width: 2,
    height: 30,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  dotDropoff: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E91E63',
  },
  routeTextContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  routeText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
    marginBottom: 20,
  },
  dropoffText: {
    color: '#0f172a',
    marginBottom: 0,
  },
  fareCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  counterpartyCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterpartyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
  },
  rating: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
  },
  profileLink: {
    padding: 8,
  },
  profileLinkText: {
    color: '#E91E63',
    fontWeight: 'bold',
  },
  ratingsCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  stars: {
    fontSize: 24,
    color: '#F59E0B',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  shareBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
