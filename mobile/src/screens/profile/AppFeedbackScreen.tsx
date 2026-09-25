import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';

export default function AppFeedbackScreen({ navigation }: any) {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('Bug');

  const handleSubmit = () => {
    // API Call to POST /api/v1/feedback
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          <Text style={styles.title}>App Feedback</Text>
          <Text style={styles.subtitle}>Help us improve SheDrive by sharing your thoughts.</Text>
          
          <View style={styles.categoryContainer}>
            {['Bug', 'Feature', 'Other'].map(cat => (
              <TouchableOpacity 
                key={cat} 
                style={[styles.catBadge, category === cat && styles.catBadgeActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.catText, category === cat && styles.catTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Tell us more..."
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Submit Feedback</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#E91E63', marginBottom: 8, marginTop: 16 },
  subtitle: { fontSize: 16, color: '#666666', marginBottom: 24 },
  categoryContainer: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  catBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#EEEEEE' },
  catBadgeActive: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
  catText: { color: '#666666' },
  catTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  input: { backgroundColor: '#F8F9FA', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EEEEEE', fontSize: 16, minHeight: 120, marginBottom: 32 },
  button: { backgroundColor: '#E91E63', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
