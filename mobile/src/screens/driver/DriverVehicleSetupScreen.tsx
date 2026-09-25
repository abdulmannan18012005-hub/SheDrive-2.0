import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';

const CATEGORIES = [
  { id: 'bike_scooty', label: 'Bike/Scooty' },
  { id: 'mini', label: 'Mini' },
  { id: 'car_ac', label: 'Car AC' },
  { id: 'comfort_ac', label: 'Comfort AC' },
  { id: 'family_xl', label: 'Family XL' }
];

export default function DriverVehicleSetupScreen({ navigation }: any) {
  const [category, setCategory] = useState('mini');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plate, setPlate] = useState('');

  const handleSubmit = () => {
    // API Call to POST /api/v1/driver/vehicle
    navigation.navigate('DriverDocumentUpload');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Vehicle Setup</Text>
          <Text style={styles.subtitle}>Select your vehicle category</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.catCard, category === cat.id && styles.catCardActive]}
                onPress={() => setCategory(cat.id)}
              >
                <Text style={[styles.catText, category === cat.id && styles.catTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput style={styles.input} placeholder="Make (e.g. Suzuki)" value={make} onChangeText={setMake} />
            <TextInput style={styles.input} placeholder="Model (e.g. Alto)" value={model} onChangeText={setModel} />
            <TextInput style={styles.input} placeholder="Year (e.g. 2022)" value={year} onChangeText={setYear} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Color" value={color} onChangeText={setColor} />
            <TextInput style={styles.input} placeholder="Registration / Plate Number" value={plate} onChangeText={setPlate} autoCapitalize="characters" />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Continue to Documents</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#E91E63', marginBottom: 8, marginTop: 16 },
  subtitle: { fontSize: 16, color: '#666666', marginBottom: 24 },
  categoryContainer: { flexDirection: 'row', marginBottom: 32 },
  catCard: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#EEEEEE', marginRight: 12 },
  catCardActive: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
  catText: { color: '#666666', fontWeight: 'bold' },
  catTextActive: { color: '#FFFFFF' },
  inputContainer: { gap: 16, marginBottom: 32 },
  input: { backgroundColor: '#F8F9FA', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EEEEEE', fontSize: 16 },
  button: { backgroundColor: '#E91E63', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
