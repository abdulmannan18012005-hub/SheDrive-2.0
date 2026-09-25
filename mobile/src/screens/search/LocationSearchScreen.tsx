import React, { useState, useEffect } from 'react';
import { View, SafeAreaView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import PlaceSearchInput from '../../components/PlaceSearchInput';
import { apiClient as api } from '../../services/apiClient';

export default function LocationSearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isDropoff = route.params?.isDropoff || false;
  
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);

  useEffect(() => {
    api.get('/places').then((res: any) => {
      setSavedPlaces(res.data.places || []);
    }).catch((err: any) => {
      console.error('Failed to load saved places:', err);
    });
  }, []);

  const handlePlaceSelected = (details: { address: string; latitude: number; longitude: number }) => {
    // Navigate back to home/map screen with the selected data
    navigation.navigate('Home', {
      selectedLocation: details,
      isDropoff
    });
  };

  const handleChooseOnMap = () => {
    navigation.navigate('Home', {
      chooseOnMap: true,
      isDropoff
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.title}>{isDropoff ? 'Where to?' : 'Pickup Location'}</Text>
      </View>
      
      <View style={styles.content}>
        <PlaceSearchInput 
          placeholder={isDropoff ? 'Enter drop-off location' : 'Enter pickup location'}
          onPlaceSelected={handlePlaceSelected}
          savedPlaces={savedPlaces}
          autoFocus={true}
        />
        
        <TouchableOpacity style={styles.mapBtn} onPress={handleChooseOnMap}>
          <Ionicons name="map-outline" size={20} color="#E91E63" />
          <Text style={styles.mapBtnText}>Choose on Map</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#fff0f5',
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#fbcfe8',
  },
  mapBtnText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E91E63',
  },
});
