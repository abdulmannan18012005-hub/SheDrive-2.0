import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

export default function PassengerSignUpScreen({ navigation }: any) {
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Passenger Sign Up</Text>
        
        <View style={styles.inputContainer}>
          <TextInput style={styles.input} placeholder="Full Name" />
          <TextInput style={styles.input} placeholder="Email Address" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Phone Number" keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="Password" secureTextEntry />
          <Text style={styles.helperText}>* We verify gender strictly for women's safety</Text>
        </View>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('PassengerSignIn')}>
          <Text style={styles.linkText}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#E91E63', marginBottom: 32 },
  inputContainer: { gap: 16, marginBottom: 32 },
  input: { backgroundColor: '#F8F9FA', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EEEEEE', fontSize: 16 },
  helperText: { fontSize: 12, color: '#888888', marginTop: 4 },
  button: { backgroundColor: '#E91E63', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  linkButton: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#666666', fontSize: 14 },
});
