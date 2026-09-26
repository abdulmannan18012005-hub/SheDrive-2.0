import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image } from 'react-native';

interface DriverPublicProfileScreenProps {
  route: any;
  authToken: string;
}

export const DriverPublicProfileScreen: React.FC<DriverPublicProfileScreenProps> = ({ route, authToken }) => {
  const { driverId } = route.params;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/v1/profiles/driver/${driverId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (res.ok) setProfile(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [driverId, authToken]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Could not load driver profile.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <Text style={styles.name}>{profile.first_name}</Text>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>⭐ {profile.rating.toFixed(2)} ({profile.total_rides} trips)</Text>
        </View>
        <Text style={styles.memberSince}>Member since {new Date(profile.member_since).getFullYear()}</Text>
      </View>

      <View style={styles.verificationCard}>
        <Text style={styles.sectionTitle}>Trust & Verification</Text>
        {profile.badges.map((badge: string, idx: number) => (
          <View key={idx} style={styles.checklistRow}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.checkText}>{badge}</Text>
          </View>
        ))}
        <View style={styles.checklistRow}>
          <Text style={styles.checkIcon}>✓</Text>
          <Text style={styles.checkText}>Identity & CNIC Verified</Text>
        </View>
        <View style={styles.checklistRow}>
          <Text style={styles.checkIcon}>✓</Text>
          <Text style={styles.checkText}>Driving License Verified</Text>
        </View>
        <View style={styles.checklistRow}>
          <Text style={styles.checkIcon}>✓</Text>
          <Text style={styles.checkText}>Vehicle Registration & Safety Checked</Text>
        </View>
      </View>

      <View style={styles.vehicleCard}>
        <Text style={styles.sectionTitle}>Vehicle Details</Text>
        {profile.vehicle.photo_url && (
          <Image source={{ uri: profile.vehicle.photo_url }} style={styles.vehiclePhoto} />
        )}
        <Text style={styles.vehicleName}>{profile.vehicle.make} {profile.vehicle.model}</Text>
        <Text style={styles.vehicleColor}>{profile.vehicle.color} • {profile.vehicle.category}</Text>
        <View style={styles.plateBadge}>
          <Text style={styles.plateText}>{profile.vehicle.plate_number}</Text>
        </View>
      </View>

      <View style={styles.tagsCard}>
        <Text style={styles.sectionTitle}>What Passengers Say</Text>
        <View style={styles.tagsGrid}>
          {profile.tag_counts.map((item: any, idx: number) => (
            <View key={idx} style={styles.tagPill}>
              <Text style={styles.tagText}>{item.tag} ({item.count})</Text>
            </View>
          ))}
        </View>
      </View>
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
  headerCard: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e2e8f0',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  ratingBadge: {
    backgroundColor: '#fffbeb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  ratingText: {
    color: '#d97706',
    fontWeight: 'bold',
    fontSize: 14,
  },
  memberSince: {
    color: '#64748b',
    fontSize: 12,
  },
  verificationCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkIcon: {
    color: '#E91E63',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 12,
  },
  checkText: {
    color: '#334155',
    fontSize: 15,
  },
  vehicleCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
  },
  vehiclePhoto: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 16,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 4,
  },
  vehicleColor: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  plateBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  plateText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 2,
  },
  tagsCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12,
    marginBottom: 24,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    backgroundColor: '#fdf2f8',
    borderColor: '#fbcfe8',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  tagText: {
    color: '#be185d',
    fontWeight: '600',
    fontSize: 13,
  }
});
