import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient as api } from '../services/apiClient';

interface PlaceSearchInputProps {
  placeholder: string;
  onPlaceSelected: (details: { address: string; latitude: number; longitude: number }) => void;
  savedPlaces?: any[];
  autoFocus?: boolean;
}

export default function PlaceSearchInput({ placeholder, onPlaceSelected, savedPlaces = [], autoFocus = false }: PlaceSearchInputProps) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (query.trim().length === 0) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await api.get('/places/autocomplete', {
          params: { query, session_token: 'search_session_' + Date.now() }
        });
        setPredictions(response.data.predictions || []);
      } catch (error) {
        console.error('Failed to fetch predictions:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelectPlace = async (placeId: string, addressText: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/places/details/${placeId}`);
      const { place } = response.data;
      onPlaceSelected({
        address: place.address || addressText,
        latitude: place.latitude,
        longitude: place.longitude,
      });
    } catch (error) {
      console.error('Failed to fetch place details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSavedPlace = (place: any) => {
    onPlaceSelected({
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Ionicons name="search" size={20} color="#64748b" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={query}
          onChangeText={setQuery}
          autoFocus={autoFocus}
          placeholderTextColor="#94a3b8"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {loading && query.length > 0 && (
        <ActivityIndicator size="small" color="#E91E63" style={styles.loader} />
      )}

      {query.length === 0 && savedPlaces.length > 0 && (
        <FlatList
          data={savedPlaces}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => handleSelectSavedPlace(item)}>
              <Ionicons name={item.label === 'Home' ? 'home' : item.label === 'Work' ? 'briefcase' : 'bookmark'} size={20} color="#E91E63" style={styles.rowIcon} />
              <View style={styles.rowTextContainer}>
                <Text style={styles.mainText}>{item.name}</Text>
                <Text style={styles.secondaryText}>{item.address}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {query.length > 0 && (
        <FlatList
          data={predictions}
          keyExtractor={(item) => item.place_id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => handleSelectPlace(item.place_id, item.main_text)}>
              <Ionicons name="location-outline" size={20} color="#64748b" style={styles.rowIcon} />
              <View style={styles.rowTextContainer}>
                <Text style={styles.mainText}>{item.main_text}</Text>
                <Text style={styles.secondaryText}>{item.secondary_text}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  loader: {
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowIcon: {
    marginRight: 12,
  },
  rowTextContainer: {
    flex: 1,
  },
  mainText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  secondaryText: {
    fontSize: 13,
    color: '#64748b',
  },
});
