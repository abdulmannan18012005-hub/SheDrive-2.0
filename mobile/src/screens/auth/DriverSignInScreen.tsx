import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';

export default function DriverSignInScreen({ navigation }: any) {
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <Text style={styles.title}>Driver Sign In</Text>
        
        <View style={styles.inputContainer}>
          <TextInput style={styles.input} placeholder="Phone Number or CNIC" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Password" secureTextEntry />
        </View>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('DriverSignUp')}>
          <Text style={styles.linkText}>Want to drive? Apply Now</Text>
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
  input: { backgroundColor: '#F8F9FA', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EEEEEE', fontSize: 16 },
  button: { backgroundColor: '#E91E63', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  linkButton: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#666666', fontSize: 14 },
});
