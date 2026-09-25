import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';

export default function PassengerSignInScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Passenger Sign In</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email or Phone Number"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => navigation.navigate('PassengerSignUp')}
        >
          <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#E91E63', marginBottom: 32 },
  inputContainer: { gap: 16, marginBottom: 32 },
  input: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    fontSize: 16,
  },
  button: { backgroundColor: '#E91E63', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  linkButton: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#666666', fontSize: 14 },
});
