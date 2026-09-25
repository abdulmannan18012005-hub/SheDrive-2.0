import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';

export default function OtpVerificationScreen({ route, navigation }: any) {
  const { email } = route.params || { email: 'your email' };
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = () => {
    // Navigate to Reset Password in a real app after API validation
    navigation.navigate('ResetPassword', { email });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <Text style={styles.title}>Verification Code</Text>
        <Text style={styles.subtitle}>We've sent a 6-digit code to {email}</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleVerify}>
          <Text style={styles.buttonText}>Verify Code</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkButton} 
          disabled={countdown > 0}
          onPress={() => setCountdown(60)}
        >
          <Text style={[styles.linkText, countdown > 0 && { color: '#AAAAAA' }]}>
            {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
          </Text>
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
  inputContainer: { gap: 16, marginBottom: 32 },
  input: { backgroundColor: '#F8F9FA', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EEEEEE', fontSize: 24, textAlign: 'center', letterSpacing: 8 },
  button: { backgroundColor: '#E91E63', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  linkButton: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#E91E63', fontSize: 14, fontWeight: 'bold' },
});
