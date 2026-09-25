import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';

export default function ProfileScreen({ navigation }: any) {
  const menuItems = [
    { label: 'Edit Profile', route: 'EditProfile' },
    { label: 'Saved Places', route: 'SavedPlaces' },
    { label: 'Notification Settings', route: 'NotificationSettings' },
    { label: 'App Feedback', route: 'AppFeedback' },
    { label: 'Legal & Policies', route: 'StaticLegal' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.avatarPlaceholder} />
          <Text style={styles.name}>Jane Doe</Text>
          <Text style={styles.phone}>+92 300 1234567</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>Passenger</Text></View>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.route)}
            >
              <Text style={styles.menuText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.menuItem, styles.signOutItem]}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { alignItems: 'center', paddingVertical: 40, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E91E63', marginBottom: 16 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#333333' },
  phone: { fontSize: 16, color: '#666666', marginTop: 4 },
  badge: { marginTop: 12, backgroundColor: '#F8F9FA', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, borderWidth: 1, borderColor: '#EEEEEE' },
  badgeText: { color: '#E91E63', fontSize: 12, fontWeight: 'bold' },
  menuContainer: { paddingVertical: 16 },
  menuItem: { paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#F8F9FA' },
  menuText: { fontSize: 16, color: '#333333' },
  signOutItem: { marginTop: 24, borderBottomWidth: 0 },
  signOutText: { fontSize: 16, color: '#FF5252', fontWeight: 'bold' },
});
