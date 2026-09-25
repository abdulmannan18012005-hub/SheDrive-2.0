import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';

const DOCS = [
  { id: 'cnic_front', label: 'CNIC Front', required: true },
  { id: 'cnic_back', label: 'CNIC Back', required: true },
  { id: 'license', label: 'Driving License', required: true },
  { id: 'vehicle_photo', label: 'Vehicle Photo', required: true },
  { id: 'registration_book', label: 'Registration Book', required: false },
];

export default function DriverDocumentUploadScreen({ navigation }: any) {
  const [uploads, setUploads] = useState<Record<string, boolean>>({});

  const handleUpload = (id: string) => {
    // Simulate image picker & upload
    setUploads(prev => ({ ...prev, [id]: true }));
  };

  const handleSubmit = () => {
    const missing = DOCS.filter(d => d.required && !uploads[d.id]);
    if (missing.length > 0) {
      Alert.alert('Missing Documents', 'Please upload all required documents.');
      return;
    }
    
    if (!uploads.registration_book) {
      Alert.alert(
        'Upload Registration Later?',
        'You have opted to upload the registration book later. This might delay full verification.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: () => navigation.navigate('DriverVehicleManagement') }
        ]
      );
      return;
    }

    // API Call to POST /api/v1/driver/documents/upload
    navigation.navigate('DriverVehicleManagement');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Document Upload</Text>
        <Text style={styles.subtitle}>Upload clear photos of your documents for verification.</Text>
        
        {DOCS.map(doc => (
          <View key={doc.id} style={styles.docCard}>
            <View>
              <Text style={styles.docLabel}>{doc.label} {doc.required ? '*' : '(Optional)'}</Text>
              <Text style={styles.docStatus}>{uploads[doc.id] ? 'Uploaded - Pending Review' : 'Not Uploaded'}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.uploadBtn, uploads[doc.id] && styles.uploadBtnSuccess]}
              onPress={() => handleUpload(doc.id)}
            >
              <Text style={styles.uploadBtnText}>{uploads[doc.id] ? 'Retake' : 'Upload'}</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Submit for Verification</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#E91E63', marginBottom: 8, marginTop: 16 },
  subtitle: { fontSize: 16, color: '#666666', marginBottom: 32 },
  docCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#F8F9FA', borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#EEEEEE' },
  docLabel: { fontSize: 16, fontWeight: 'bold', color: '#333333' },
  docStatus: { fontSize: 12, color: '#666666', marginTop: 4 },
  uploadBtn: { backgroundColor: '#333333', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  uploadBtnSuccess: { backgroundColor: '#4CAF50' },
  uploadBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  button: { backgroundColor: '#E91E63', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
