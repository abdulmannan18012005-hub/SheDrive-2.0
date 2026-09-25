import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';

const CATEGORIES = [
  { id: 'bike_scooty', name: 'Bike / Scooty', hasAC: false },
  { id: 'mini', name: 'Mini', hasAC: false },
  { id: 'car_ac', name: 'Car AC', hasAC: true },
  { id: 'comfort_ac', name: 'Comfort AC', hasAC: true },
  { id: 'family_xl', name: 'Family XL', hasAC: true }
];

interface Props {
  pickupLabel: string;
  dropoffLabel: string;
  distanceKm: number;
  durationMins: number;
  estimates: Record<string, number>;
  onRequestRide: (category: string, offer: number) => void;
}

export const RideEstimateSheet: React.FC<Props> = ({
  pickupLabel,
  dropoffLabel,
  distanceKm,
  durationMins,
  estimates,
  onRequestRide
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('car_ac');
  const [offer, setOffer] = useState<number>(estimates['car_ac'] || 250);

  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id);
    setOffer(estimates[id] || 0);
  };

  const adjustOffer = (amount: number) => {
    setOffer((prev) => Math.max(0, prev + amount));
  };

  return (
    <View style={styles.container}>
      <View style={styles.summaryContainer}>
        <Text style={styles.addressText} numberOfLines={1}>From: {pickupLabel}</Text>
        <Text style={styles.addressText} numberOfLines={1}>To: {dropoffLabel}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{distanceKm.toFixed(1)} km • {durationMins} min</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat.id;
          const estPrice = estimates[cat.id] || 0;
          return (
            <TouchableOpacity 
              key={cat.id} 
              style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
              onPress={() => handleCategorySelect(cat.id)}
            >
              <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>
                {cat.name} {cat.hasAC && <Text style={styles.acBadge}>❄️</Text>}
              </Text>
              <Text style={[styles.categoryPrice, isSelected && styles.categoryPriceSelected]}>
                Rs {estPrice}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.offerContainer}>
        <Text style={styles.offerLabel}>Your Offer (PKR)</Text>
        <View style={styles.offerControls}>
          <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustOffer(-50)}>
            <Text style={styles.adjustBtnText}>-50</Text>
          </TouchableOpacity>
          <TextInput 
            style={styles.offerInput}
            value={offer.toString()}
            keyboardType="numeric"
            onChangeText={(t) => setOffer(Number(t.replace(/[^0-9]/g, '')))}
          />
          <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustOffer(50)}>
            <Text style={styles.adjustBtnText}>+50</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.requestBtn} onPress={() => onRequestRide(selectedCategory, offer)}>
        <Text style={styles.requestBtnText}>Find Driver</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 10,
  },
  summaryContainer: {
    marginBottom: 16,
  },
  addressText: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  badge: {
    backgroundColor: '#f1f5f9',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  badgeText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  categoryScroll: {
    marginBottom: 20,
  },
  categoryCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 100,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  categoryCardSelected: {
    borderColor: '#E91E63',
    backgroundColor: '#fff0f3',
  },
  categoryName: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryNameSelected: {
    color: '#E91E63',
  },
  acBadge: {
    fontSize: 12,
  },
  categoryPrice: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  categoryPriceSelected: {
    color: '#be123c',
  },
  offerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  offerLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  offerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adjustBtn: {
    backgroundColor: '#f1f5f9',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustBtnText: {
    fontSize: 18,
    color: '#334155',
    fontWeight: 'bold',
  },
  offerInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginHorizontal: 16,
    textAlign: 'center',
    minWidth: 100,
  },
  requestBtn: {
    backgroundColor: '#E91E63',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  requestBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
