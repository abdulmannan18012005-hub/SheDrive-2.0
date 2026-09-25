import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

export default function DriverSignUpScreen({ navigation }: any) {
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Driver Application</Text>
        
        <View style={styles.inputContainer}>
          <TextInput style={styles.input} placeholder="Full Name" />
          <TextInput style={styles.input} placeholder="Phone Number" keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="CNIC Number" keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Vehicle Category (e.g. Mini, AC)" />
          <TextInput style={styles.input} placeholder="Password" secureTextEntry />
        </View>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Submit Application</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('DriverSignIn')}>
          <Text style={styles.linkText}>Already a driver? Sign In</Text>
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
  button: { backgroundColor: '#E91E63', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  linkButton: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#666666', fontSize: 14 },
});
