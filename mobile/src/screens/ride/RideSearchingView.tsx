import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';

interface Props {
  offeredFare: number;
  onCancel: () => void;
}

export const RideSearchingView: React.FC<Props> = ({ offeredFare, onCancel }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.radarContainer}>
        <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
        <View style={styles.centerDot} />
      </View>
      
      <View style={styles.drawer}>
        <Text style={styles.title}>Broadcasting to Drivers...</Text>
        <Text style={styles.offerText}>Offered: PKR {offeredFare}</Text>
        
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancel Request</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  radarContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // Shift up from center can be handled via marginTop instead of duplicate bottom
    marginTop: -200,
  },
  pulseCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(233, 30, 99, 0.2)',
    position: 'absolute',
  },
  centerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E91E63',
  },
  drawer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  offerText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
