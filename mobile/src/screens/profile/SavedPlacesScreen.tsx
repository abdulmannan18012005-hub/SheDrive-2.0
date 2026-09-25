import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView } from 'react-native';

const dummyPlaces = [
  { id: '1', label: 'home', name: 'My House', address: '123 Main St' },
  { id: '2', label: 'work', name: 'Office', address: '456 Business Rd' }
];

export default function SavedPlacesScreen() {
  const [places, setPlaces] = useState(dummyPlaces);

  const handleDelete = (id: string) => {
    // API Call to DELETE /api/v1/places/:id
    setPlaces(places.filter(p => p.id !== id));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Saved Places</Text>
        
        <FlatList
          data={places}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.placeCard}>
              <View style={styles.placeInfo}>
                <Text style={styles.placeLabel}>{item.label.toUpperCase()}</Text>
                <Text style={styles.placeName}>{item.name}</Text>
                <Text style={styles.placeAddress}>{item.address}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
        
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>+ Add New Place</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#E91E63', marginBottom: 24, marginTop: 16 },
  placeCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#F8F9FA', borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#EEEEEE' },
  placeInfo: { flex: 1 },
  placeLabel: { fontSize: 12, color: '#E91E63', fontWeight: 'bold', marginBottom: 4 },
  placeName: { fontSize: 16, fontWeight: 'bold', color: '#333333', marginBottom: 4 },
  placeAddress: { fontSize: 14, color: '#666666' },
  deleteText: { color: '#FF5252', fontWeight: 'bold' },
  button: { backgroundColor: '#E91E63', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
