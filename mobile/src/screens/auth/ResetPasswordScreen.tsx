import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';

export default function ResetPasswordScreen({ navigation }: any) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Basic strength indicator
  const getStrengthColor = () => {
    if (password.length === 0) return '#EEEEEE';
    if (password.length < 6) return '#FF5252';
    if (password.length >= 8 && /\d/.test(password) && /[a-zA-Z]/.test(password)) return '#4CAF50';
    return '#FFC107';
  };

  const handleReset = () => {
    // After reset, navigate back to role selection or sign in
    navigation.navigate('RoleSelection');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your new password below.</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="New Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <View style={{ height: 4, backgroundColor: getStrengthColor(), borderRadius: 2, marginBottom: 8 }} />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showPassword}
          />
        </View>

        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ marginBottom: 32, alignItems: 'flex-end' }}>
          <Text style={styles.linkText}>{showPassword ? 'Hide Password' : 'Show Password'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleReset}>
          <Text style={styles.buttonText}>Update Password</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#E91E63', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666666', marginBottom: 32 },
  inputContainer: { gap: 8, marginBottom: 8 },
  input: { backgroundColor: '#F8F9FA', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EEEEEE', fontSize: 16 },
  button: { backgroundColor: '#E91E63', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  linkText: { color: '#666666', fontSize: 14 },
});
