import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';

export default function DriverVehicleManagementScreen({ navigation }: any) {
  
  const handleEdit = () => {
    Alert.alert(
      'Notice',
      'Updating vehicle details requires re-verification by SheDrive Admin.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Proceed', onPress: () => navigation.navigate('DriverVehicleSetup') }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Vehicle Management</Text>
        
        <View style={styles.statusBanner}>
          <Text style={styles.statusTitle}>Status: Pending Verification</Text>
          <Text style={styles.statusDesc}>Your documents and vehicle are currently under review by our team.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Active Vehicle</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Category</Text>
            <Text style={styles.value}>Mini (Non-AC)</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Make & Model</Text>
            <Text style={styles.value}>Suzuki Alto (2022)</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Color</Text>
            <Text style={styles.value}>White</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Plate Number</Text>
            <Text style={styles.value}>XYZ-987</Text>
          </View>

          <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
            <Text style={styles.editBtnText}>Edit Details</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#E91E63', marginBottom: 24, marginTop: 16 },
  statusBanner: { backgroundColor: '#FFF3E0', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#FFE0B2' },
  statusTitle: { color: '#F57C00', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  statusDesc: { color: '#F57C00', fontSize: 14 },
  card: { backgroundColor: '#F8F9FA', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#EEEEEE' },
  cardHeader: { fontSize: 18, fontWeight: 'bold', color: '#333333', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { color: '#666666', fontSize: 14 },
  value: { color: '#333333', fontSize: 14, fontWeight: 'bold' },
  editBtn: { marginTop: 16, backgroundColor: '#E91E63', padding: 12, borderRadius: 8, alignItems: 'center' },
  editBtnText: { color: '#FFFFFF', fontWeight: 'bold' }
});
