import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image } from 'react-native';

interface PassengerPublicProfileScreenProps {
  route: any;
  authToken: string;
}

export const PassengerPublicProfileScreen: React.FC<PassengerPublicProfileScreenProps> = ({ route, authToken }) => {
  const { passengerId } = route.params;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/v1/profiles/passenger/${passengerId}`, {
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
  }, [passengerId, authToken]);

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
        <Text style={styles.errorText}>Could not load passenger profile.</Text>
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
        <View style={styles.checklistRow}>
          <Text style={styles.checkIcon}>✓</Text>
          <Text style={styles.checkText}>{profile.safety_badge}</Text>
        </View>
        <View style={styles.checklistRow}>
          <Text style={styles.checkIcon}>✓</Text>
          <Text style={styles.checkText}>Identity Verified</Text>
        </View>
      </View>

      <View style={styles.tagsCard}>
        <Text style={styles.sectionTitle}>Compliments Earned</Text>
        {profile.tag_counts.length === 0 ? (
          <Text style={styles.noTags}>No compliments yet.</Text>
        ) : (
          <View style={styles.tagsGrid}>
            {profile.tag_counts.map((item: any, idx: number) => (
              <View key={idx} style={styles.tagPill}>
                <Text style={styles.tagText}>{item.tag} ({item.count})</Text>
              </View>
            ))}
          </View>
        )}
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
  },
  noTags: {
    color: '#64748b',
    fontSize: 14,
    fontStyle: 'italic',
  }
});
