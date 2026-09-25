import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';

interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
}

export const EmergencyContactsScreen: React.FC<{ authToken: string }> = ({ authToken }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');

  const BACKEND_URL = 'http://localhost:3018'; // Mock env

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/v1/emergency/contacts`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) fetchContacts();
  }, [authToken]);

  const addContact = async () => {
    if (!name || !phone) {
      Alert.alert('Validation Error', 'Name and phone are required.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/v1/emergency/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, phone, relationship, is_primary: contacts.length === 0 })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add contact');

      setName('');
      setPhone('');
      setRelationship('');
      fetchContacts();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteContact = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/v1/emergency/contacts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchContacts();
    } catch (err) {
      Alert.alert('Error', 'Could not delete contact');
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Contact }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.contactName}>{item.name} {item.is_primary ? '⭐' : ''}</Text>
        <Text style={styles.contactDetails}>{item.relationship} • {item.phone}</Text>
      </View>
      <TouchableOpacity onPress={() => deleteContact(item.id)} style={styles.deleteBtn}>
        <Text style={styles.deleteBtnText}>Del</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Contacts</Text>
      <Text style={styles.subtitle}>Maximum 5 contacts allowed. These contacts receive your SOS alerts.</Text>

      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Name (e.g. John Doe)" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Phone (e.g. +923000000000)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="Relationship (e.g. Brother)" value={relationship} onChangeText={setRelationship} />
        <TouchableOpacity style={styles.addBtn} onPress={addContact} disabled={loading || contacts.length >= 5}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>Add Contact</Text>}
        </TouchableOpacity>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  form: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 24, elevation: 2 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: '#f1f5f9' },
  addBtn: { backgroundColor: '#0f172a', padding: 16, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  list: { paddingBottom: 24 },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', elevation: 1 },
  cardInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  contactDetails: { fontSize: 14, color: '#64748b', marginTop: 4 },
  deleteBtn: { padding: 8, backgroundColor: '#fee2e2', borderRadius: 8 },
  deleteBtnText: { color: '#ef4444', fontWeight: 'bold' }
});
